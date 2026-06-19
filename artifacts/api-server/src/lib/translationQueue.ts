import { sql } from "drizzle-orm";
import { db, translationQueueTable, translationOverridesTable } from "@workspace/db";
import { logger } from "./logger.js";

// ─── Auto-collected "needs translation" queue (Task #254) ────────────────────
// Capture proper-noun names (team / league / country / player) coming off the
// live sports feeds that have NO Chinese override yet, so an operator can
// translate each one once. Capture must be cheap and NON-BLOCKING: it must never
// slow down or break the odds/live responses, so every entry point is
// fire-and-forget with its own try/catch.

export type QueueCategory = "team" | "league" | "country" | "player";
export interface CaptureItem {
  source: string;
  category: QueueCategory;
}

const QUEUE_LANG = "zh-CN";

// In-memory snapshot of names that already have a Chinese override (the curated
// seed loads into translation_overrides, so seeded names live here too). Used to
// skip re-queuing covered names without a per-name DB lookup on the hot path.
let coveredSet = new Set<string>();
let coveredExpiresAt = 0;
const COVERED_TTL_MS = 60 * 1000;
let coveredRefreshInFlight: Promise<void> | null = null;

async function refreshCovered(): Promise<void> {
  try {
    const rows = await db
      .select({ source: translationOverridesTable.source })
      .from(translationOverridesTable)
      .where(sql`${translationOverridesTable.lang} = ${QUEUE_LANG}`);
    coveredSet = new Set(rows.map((r) => r.source));
    coveredExpiresAt = Date.now() + COVERED_TTL_MS;
  } catch (err) {
    // Keep the stale set on failure; never throw into the caller's response path.
    logger.warn({ err }, "translationQueue: failed to refresh covered set");
    coveredExpiresAt = Date.now() + 10_000; // short backoff
  }
}

async function ensureCovered(): Promise<void> {
  if (coveredExpiresAt !== 0 && Date.now() < coveredExpiresAt) return;
  if (!coveredRefreshInFlight) {
    coveredRefreshInFlight = refreshCovered().finally(() => {
      coveredRefreshInFlight = null;
    });
  }
  await coveredRefreshInFlight;
}

/** A name worth queuing: must contain a letter and be a sane length. Filters
 *  out pure numbers, blanks, separators ("vs"), and absurdly long strings. */
function isCapturableName(s: string): boolean {
  if (s.length < 2 || s.length > 100) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  // Names that are ALL CJK already are display-ready — never queue them.
  if (!/[a-zA-Z]/.test(s.replace(/[\u4e00-\u9fff]+/g, ""))) return false;
  return true;
}

/**
 * Capture a batch of feed names into the queue. Fire-and-forget — callers should
 * NOT await this in a request path; use `void captureNames(...)`. Insert new
 * names as `pending`; bump seen_count + last_seen on names already pending. Names
 * that already have an override (covered set) are skipped entirely.
 */
export async function captureNames(items: CaptureItem[]): Promise<void> {
  try {
    if (!items.length) return;
    await ensureCovered();

    // Dedupe within the batch (first category wins), drop covered/uncapturable.
    const bySource = new Map<string, QueueCategory>();
    for (const it of items) {
      const source = (it.source ?? "").trim();
      if (!source || coveredSet.has(source)) continue;
      if (!isCapturableName(source)) continue;
      if (!bySource.has(source)) bySource.set(source, it.category);
    }
    if (bySource.size === 0) return;

    const values = [...bySource.entries()].map(([source, category]) => ({
      lang: QUEUE_LANG,
      source,
      category,
    }));

    await db
      .insert(translationQueueTable)
      .values(values)
      .onConflictDoUpdate({
        target: [translationQueueTable.lang, translationQueueTable.source],
        set: {
          seenCount: sql`${translationQueueTable.seenCount} + 1`,
          lastSeen: sql`NOW()`,
        },
        // Only bump still-pending rows; ignored/translated rows stay untouched.
        setWhere: sql`${translationQueueTable.status} = 'pending'`,
      });
  } catch (err) {
    logger.warn({ err }, "translationQueue: capture failed (ignored)");
  }
}

/** Drop a name from the covered cache so it is re-evaluated on next capture.
 *  Call after an override is created so the queue stops surfacing it promptly. */
export function markCovered(source: string): void {
  coveredSet.add(source);
}

// ── Provider-shaped convenience wrappers (fire-and-forget) ───────────────────

/** Capture team + league names from BetsAPI-shaped events. Non-blocking. */
export function captureBetsApiNames(
  events: ReadonlyArray<{ home?: { name?: string }; away?: { name?: string }; league?: { name?: string } }>,
): void {
  const items: CaptureItem[] = [];
  for (const ev of events) {
    if (ev?.home?.name) items.push({ source: ev.home.name, category: "team" });
    if (ev?.away?.name) items.push({ source: ev.away.name, category: "team" });
    if (ev?.league?.name) items.push({ source: ev.league.name, category: "league" });
  }
  void captureNames(items);
}

/** Capture team + league names from The Odds API-shaped events. Non-blocking. */
export function captureOddsApiNames(
  events: ReadonlyArray<{ home_team?: string; away_team?: string; sport_title?: string }>,
): void {
  const items: CaptureItem[] = [];
  for (const ev of events) {
    if (ev?.home_team) items.push({ source: ev.home_team, category: "team" });
    if (ev?.away_team) items.push({ source: ev.away_team, category: "team" });
    if (ev?.sport_title) items.push({ source: ev.sport_title, category: "league" });
  }
  void captureNames(items);
}
