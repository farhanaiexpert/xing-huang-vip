/**
 * BetsAPI Result Fetcher  (v1)
 *
 * Retrieves final match scores via the /v1/bet365/result endpoint.
 * Used exclusively by the settlement worker to settle bets on BetsAPI
 * (Bet365) matches — these have event IDs like "betsapi_195939064".
 *
 * Endpoint:  GET /v1/bet365/result?token={key}&FI={fixtureId}
 *
 * Key design decisions:
 *  - Rate-limited via the shared reserveBetsApiCredit() guard (counts against
 *    the same 3-hour window as the odds/upcoming calls).
 *  - Results are cached in-memory: 30 min for completed, 5 min for pending.
 *  - The returned CompletedEvent.id is always the full stored event_id
 *    (e.g. "betsapi_195939064") so the settlement worker's DB lookup
 *    against bet_selections.event_id matches exactly.
 *  - Score parsing supports: simple "H-A", OT parentheses "2-1(1-0)",
 *    and comma-delimited multi-set format "6-3,6-2,7-5" (tennis / TT).
 *    If `ss` is absent, period scores from the `scores` map are summed.
 */

import { recordApiCall } from './apiUsage.js';
import { reserveBetsApiCredit } from './betsApiRateLimiter.js';
import { BETSAPI_KEY } from './betsapi.js';
import { logger } from './logger.js';
import type { CompletedEvent } from './scoreTypes.js';

const BETSAPI_BASE = 'https://api.betsapi.com';

// ─── BetsAPI result response shape ────────────────────────────────────────────

interface BetsApiResultItem {
  FI?:          string;
  id?:          string;
  sport_id?:    string;
  /**
   * time_status values:
   *  "0" = not started
   *  "1" = in-play
   *  "2" = ended (used by some sports like tennis, TT)
   *  "3" = settled / fully confirmed
   *  "4" = postponed
   *  "5" = cancelled
   *  "6" = walkover
   *  "7" = interrupted
   *  "8" = abandoned
   *  "9" = retired
   */
  time_status?: string;
  home?:        { name: string };
  away?:        { name: string };
  /**
   * Final score in "H-A" format, e.g.:
   *  Soccer:       "2-1"
   *  Basketball:   "110-98"
   *  Tennis sets:  "2-0"  or  "6-3,6-2"  (sets then per-set games)
   *  Table Tennis: "3-1"  or  "11-9,11-7,9-11,11-8"
   */
  ss?:          string | null;
  /**
   * Period-level breakdown. Key = period number ("1", "2", "HT", …).
   * Used as fallback when `ss` is missing or unparseable.
   * e.g. { "1": { home: "1", away: "0" }, "2": { home: "1", away: "1" } }
   */
  scores?:      Record<string, { home: string; away: string }>;
}

interface BetsApiResultResponse {
  success: number;
  results?: BetsApiResultItem[];
  error?:   string;
}

// ─── In-memory result cache ───────────────────────────────────────────────────

interface ResultCacheEntry {
  /** null  = match confirmed still in progress / no parseable score */
  result:    CompletedEvent | null;
  expiresAt: number;
}

const resultCache = new Map<string, ResultCacheEntry>();
const TTL_COMPLETED_MS = 30 * 60 * 1000;  // 30 min — final results don't change
const TTL_PENDING_MS   =  5 * 60 * 1000;  // 5 min  — re-try in the next cron tick

/** Returns the cached value (including `null`), or `undefined` if not cached / expired. */
function getCached(fixtureId: string): CompletedEvent | null | undefined {
  const entry = resultCache.get(fixtureId);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    resultCache.delete(fixtureId);
    return undefined;
  }
  return entry.result;
}

function setCache(fixtureId: string, result: CompletedEvent | null): void {
  resultCache.set(fixtureId, {
    result,
    expiresAt: Date.now() + (result !== null ? TTL_COMPLETED_MS : TTL_PENDING_MS),
  });
}

// ─── Score parsing ────────────────────────────────────────────────────────────

/**
 * Parse the BetsAPI `ss` field into { home, away } numeric scores.
 *
 * Handles:
 *  "2-1"           → { home: 2, away: 1 }                (soccer / simple)
 *  "110-98"        → { home: 110, away: 98 }              (basketball)
 *  "2-1(1-0)"      → { home: 2, away: 1 }                (strip OT/HT suffix)
 *  "6-3,6-2"       → { home: 2, away: 0 }                (count set wins)
 *  "6-3,4-6,7-5"   → { home: 2, away: 1 }                (tennis 3-set match)
 *  "11-9,11-7,9-11,11-8" → { home: 3, away: 1 }          (table tennis)
 */
function parseSs(ss: string | null | undefined): { home: number; away: number } | null {
  if (!ss || typeof ss !== 'string') return null;

  // Strip trailing parenthetical annotations like "(1-0)" for HT or OT
  const clean = ss.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (!clean) return null;

  // ── Multi-set format: "6-3,6-2,7-5" ──────────────────────────────────────
  if (clean.includes(',')) {
    const sets = clean.split(',');
    let homeWins = 0, awayWins = 0;
    for (const s of sets) {
      const parts = s.trim().split('-');
      if (parts.length < 2) continue;
      const h = parseFloat(parts[0]);
      const a = parseFloat(parts[1]);
      if (!isNaN(h) && !isNaN(a) && h !== a) {
        if (h > a) homeWins++;
        else awayWins++;
      }
    }
    // If we parsed at least one set, return the set count
    if (homeWins > 0 || awayWins > 0) return { home: homeWins, away: awayWins };
    return null;
  }

  // ── Simple "H-A" format ────────────────────────────────────────────────────
  const parts = clean.split('-');
  if (parts.length < 2) return null;
  // Guard against negative-number confusion (e.g. "-1-0"): take first two tokens
  const home = parseFloat(parts[0]);
  const away = parseFloat(parts[1]);
  if (isNaN(home) || isNaN(away)) return null;
  return { home, away };
}

/**
 * Fallback score extractor: sum period scores from the `scores` map.
 * Only used when `ss` is absent or unparseable.
 *
 * Skips non-numeric period keys like "HT" if they break the sum.
 */
function sumPeriodScores(
  scores: Record<string, { home: string; away: string }> | undefined,
): { home: number; away: number } | null {
  if (!scores) return null;
  let home = 0, away = 0, found = false;
  for (const v of Object.values(scores)) {
    const h = parseFloat(v.home);
    const a = parseFloat(v.away);
    if (!isNaN(h) && !isNaN(a)) {
      home += h;
      away += a;
      found = true;
    }
  }
  return found ? { home, away } : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the final result for one BetsAPI (Bet365) fixture.
 *
 * @param betsapiEventId  Full stored event_id, e.g. "betsapi_195939064".
 *                        The numeric fixture ID is extracted automatically.
 * @param homeTeam        Stored home-team name used as fallback label.
 * @param awayTeam        Stored away-team name used as fallback label.
 *
 * @returns A `CompletedEvent` whose `.id` equals `betsapiEventId` so the
 *          settlement worker's `bet_selections` lookup matches exactly.
 *          Returns `null` if the match is still in progress, the API call
 *          fails, or the score cannot be parsed.
 */
export async function fetchBetsApiResult(
  betsapiEventId: string,
  homeTeam:        string,
  awayTeam:        string,
): Promise<CompletedEvent | null> {
  const fixtureId = betsapiEventId.startsWith('betsapi_')
    ? betsapiEventId.slice('betsapi_'.length)
    : betsapiEventId;

  // 1. In-memory cache check — avoid duplicate API calls within the same window
  const cached = getCached(fixtureId);
  if (cached !== undefined) return cached;

  if (!BETSAPI_KEY) return null;

  // 2. Rate-limit gate — uses the shared 3-hour window credit counter
  if (!(await reserveBetsApiCredit())) {
    recordApiCall('betsapi', false, 'rate_limited', `result ${fixtureId} → credit cap reached`);
    return null;
  }

  // 3. API call
  try {
    const url = `${BETSAPI_BASE}/v1/bet365/result?token=${BETSAPI_KEY}&FI=${fixtureId}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(12_000) });

    if (!res.ok) {
      recordApiCall('betsapi', false, `HTTP ${res.status}`, `result ${fixtureId} → HTTP ${res.status}`);
      setCache(fixtureId, null);
      return null;
    }

    const json = await res.json() as BetsApiResultResponse;

    if (json.success !== 1 || !Array.isArray(json.results) || json.results.length === 0) {
      recordApiCall(
        'betsapi', false,
        json.error ?? 'empty',
        `result ${fixtureId} → success=${json.success} error=${json.error ?? 'none'}`,
      );
      setCache(fixtureId, null);
      return null;
    }

    const item = json.results[0];

    // 4. Only treat as completed when time_status is "2" (ended) or "3" (settled).
    //    "6" = walkover → still count as a settled result.
    //    Everything else (postponed=4, cancelled=5, abandoned=8, retired=9) → null.
    const status = item.time_status ?? '';
    const isCompleted = status === '2' || status === '3' || status === '6';

    if (!isCompleted) {
      recordApiCall(
        'betsapi', true, 'ok',
        `result ${fixtureId} → time_status=${status} (match not finished)`,
      );
      setCache(fixtureId, null);
      return null;
    }

    // 5. Parse score: ss first, then period-score sum as fallback
    const parsed = parseSs(item.ss) ?? sumPeriodScores(item.scores);

    if (!parsed) {
      logger.warn(
        { fixtureId, betsapiEventId, ss: item.ss },
        'BetsAPI result: match finished but score unparseable — will retry next tick',
      );
      recordApiCall('betsapi', false, 'no_score', `result ${fixtureId} → ss="${item.ss ?? 'null'}" not parseable`);
      // Short TTL so we retry — sometimes BetsAPI populates ss a few minutes late
      setCache(fixtureId, null);
      return null;
    }

    // 6. Prefer API-returned team names; fall back to names stored at bet placement
    const resolvedHome = item.home?.name || homeTeam;
    const resolvedAway = item.away?.name || awayTeam;

    const event: CompletedEvent = {
      // CRITICAL: id must equal the stored bet_selections.event_id so the
      // settlement worker's DB UPDATE finds the right rows.
      id:        betsapiEventId,
      sport_key: '',
      home_team: resolvedHome,
      away_team: resolvedAway,
      completed: true,
      scores: [
        { name: resolvedHome, score: String(parsed.home) },
        { name: resolvedAway, score: String(parsed.away) },
      ],
    };

    recordApiCall(
      'betsapi', true, 'ok',
      `result ${fixtureId} → ${parsed.home}-${parsed.away} (${resolvedHome} vs ${resolvedAway})`,
    );
    logger.info(
      {
        fixtureId,
        betsapiEventId,
        homeTeam:  resolvedHome,
        awayTeam:  resolvedAway,
        homeScore: parsed.home,
        awayScore: parsed.away,
        timeStatus: status,
      },
      'BetsAPI result: final score fetched for settlement',
    );

    setCache(fixtureId, event);
    return event;

  } catch (err) {
    recordApiCall('betsapi', false, 'network', `result ${fixtureId} → network/timeout`);
    logger.warn({ err, fixtureId }, 'BetsAPI result: fetch error');
    return null;
  }
}

/**
 * Evict a specific fixture from the in-memory result cache.
 * Useful in tests or if a result needs to be re-fetched immediately.
 */
export function evictBetsApiResultCache(betsapiEventId: string): void {
  const fixtureId = betsapiEventId.startsWith('betsapi_')
    ? betsapiEventId.slice('betsapi_'.length)
    : betsapiEventId;
  resultCache.delete(fixtureId);
}
