/**
 * BetsAPI 3-hour window credit limiter — with in-memory exhaustion flag.
 *
 * Enforces a hard ceiling on how many BetsAPI (Bet365) requests the entire
 * system may make per 3-hour clock window. EVERY upstream BetsAPI fetch must
 * call reserveBetsApiCredit() first and only proceed if it returns true.
 *
 * Two-layer protection:
 *  Layer 1 — In-memory flag (this module)
 *    Once the window is exhausted, windowExhaustedUntil is set to the next
 *    3-hour boundary. All subsequent reserveBetsApiCredit() calls return false
 *    immediately with ZERO database or network I/O until the boundary passes.
 *    Resets automatically at the exact moment the new window opens.
 *
 *  Layer 2 — Postgres atomic counter (api_usage_hourly table)
 *    The primary source of truth. Survives process restarts and multi-instance
 *    deployments. The in-memory flag is rebuilt automatically: the first call
 *    after a restart hits the DB; if the window is already exhausted the DB
 *    returns no rows → flag is set → all further calls skip the DB.
 *
 *  Fails CLOSED: DB unreachable → deny the call (never risk overspend).
 *
 * Daily worst-case at 3 200/window:
 *   8 windows × 3 200 = 25 600 calls/day
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Hard ceiling per 3-hour window.
 * Override with BETSAPI_HOURLY_LIMIT env var (name kept for backwards compat).
 */
export const BETSAPI_WINDOW_LIMIT: number = (() => {
  const raw = Number(process.env.BETSAPI_HOURLY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3200;
})();

/** Backwards-compat alias so existing imports keep working. */
export const BETSAPI_HOURLY_LIMIT = BETSAPI_WINDOW_LIMIT;

// ─── In-memory exhaustion flag ────────────────────────────────────────────────

/**
 * Unix timestamp (ms) of the next 3-hour window boundary.
 * While Date.now() < windowExhaustedUntil, ALL credit reservations are denied
 * without touching the database. Set to 0 (= never exhausted / cleared).
 */
let windowExhaustedUntil = 0;

/**
 * Computes the Unix timestamp (ms) at which the NEXT 3-hour window opens.
 * Buckets are fixed UTC clock windows: 00–02, 03–05, 06–08, …, 21–23.
 * Example: called at 10:47 UTC → current bucket = 09:00 → next = 12:00 UTC.
 */
function nextWindowBoundaryMs(): number {
  const now       = new Date();
  const hourUtc   = now.getUTCHours();
  const bucketHour = hourUtc - (hourUtc % 3);           // start of current bucket
  const bucketStartMs = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    bucketHour, 0, 0, 0,
  );
  return bucketStartMs + 3 * 60 * 60 * 1000;            // + 3 hours
}

/** SQL expression for the current 3-hour bucket start (used in DB upsert). */
const CURRENT_WINDOW_SQL = sql`
  date_trunc('hour', NOW()) - ((EXTRACT(HOUR FROM NOW())::integer % 3) * INTERVAL '1 hour')
`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Atomically reserve ONE BetsAPI credit for the current 3-hour window.
 *
 * Returns true  → call is permitted, credit reserved.
 * Returns false → window exhausted; caller must NOT make any BetsAPI request.
 *
 * Fast path: once the window is exhausted the in-memory flag lets us return
 * false in <1 µs with no DB round-trip until the window boundary passes.
 */
export async function reserveBetsApiCredit(): Promise<boolean> {
  // ── Layer 1: in-memory short-circuit ──────────────────────────────────────
  const now = Date.now();
  if (windowExhaustedUntil > 0 && now < windowExhaustedUntil) {
    return false;   // window still exhausted — skip DB entirely
  }
  // Past the boundary → clear the flag so we re-enter normal DB checks.
  if (windowExhaustedUntil > 0 && now >= windowExhaustedUntil) {
    windowExhaustedUntil = 0;
  }

  // ── Layer 2: atomic Postgres counter ──────────────────────────────────────
  try {
    const result = await db.execute(sql`
      INSERT INTO api_usage_hourly (provider, hour, calls)
      VALUES ('betsapi', ${CURRENT_WINDOW_SQL}, 1)
      ON CONFLICT (provider, hour) DO UPDATE
        SET calls = api_usage_hourly.calls + 1
        WHERE api_usage_hourly.calls < ${BETSAPI_WINDOW_LIMIT}
      RETURNING calls
    `);

    if ((result.rows?.length ?? 0) > 0) {
      return true;    // credit reserved
    }

    // DB confirmed the window is exhausted — arm the in-memory flag so all
    // further calls in this window skip the DB entirely.
    windowExhaustedUntil = nextWindowBoundaryMs();
    return false;
  } catch {
    // DB unreachable — fail closed (protect the credit budget).
    return false;
  }
}

/**
 * Current 3-hour window usage snapshot for admin/status display.
 * Includes exhaustedUntil (ISO string) when the window is currently blocked.
 */
export async function getBetsApiWindowUsage(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  windowHours: number;
  exhaustedUntil: string | null;   // ISO timestamp when window resets, or null
}> {
  const exhaustedUntil =
    windowExhaustedUntil > 0 && Date.now() < windowExhaustedUntil
      ? new Date(windowExhaustedUntil).toISOString()
      : null;

  try {
    const result = await db.execute(sql`
      SELECT calls FROM api_usage_hourly
      WHERE provider = 'betsapi' AND hour = ${CURRENT_WINDOW_SQL}
    `);
    const used = result.rows?.[0]
      ? Number((result.rows[0] as { calls: number }).calls)
      : 0;
    return {
      used,
      limit: BETSAPI_WINDOW_LIMIT,
      remaining: Math.max(0, BETSAPI_WINDOW_LIMIT - used),
      windowHours: 3,
      exhaustedUntil,
    };
  } catch {
    return {
      used: 0,
      limit: BETSAPI_WINDOW_LIMIT,
      remaining: BETSAPI_WINDOW_LIMIT,
      windowHours: 3,
      exhaustedUntil,
    };
  }
}

/** Backwards-compat alias — existing callers still work unchanged. */
export const getBetsApiHourlyUsage = getBetsApiWindowUsage;
