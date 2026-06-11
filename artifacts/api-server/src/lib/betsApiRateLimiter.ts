/**
 * BetsAPI 3-hour window credit limiter.
 *
 * Enforces a hard ceiling on how many BetsAPI (Bet365) requests the entire
 * system may make per 3-hour clock window, so we can never exhaust the key's
 * purchased request volume. EVERY upstream BetsAPI fetch must reserve a credit
 * here first.
 *
 * Design:
 *  - Fixed 3-hour clock window (00–02, 03–05, 06–08, 09–11, 12–14, 15–17,
 *    18–20, 21–23 UTC) — resets 8 times per day, giving a maximum of
 *    8 × BETSAPI_WINDOW_LIMIT calls/day.
 *  - Counter lives in Postgres (api_usage_hourly), so the cap holds across
 *    process restarts and any future multi-instance deployment.
 *  - reserveBetsApiCredit() is atomic: it increments only if still under the
 *    limit, returning whether the call is permitted. No race can overshoot.
 *  - Fails CLOSED: if the DB is unreachable we deny the call rather than risk
 *    blowing the credit budget.
 *
 * Daily worst-case at 3 200/window:
 *   8 windows × 3 200 = 25 600 calls/day  (vs 76 800 with the old hourly cap)
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Hard ceiling per 3-hour window.
 * Override with BETSAPI_HOURLY_LIMIT env var (name kept for backwards compat).
 * Default is 3 200 — spread across 3 hours that is ≈ 1 067 calls/hour, well
 * within any sensible purchased volume package.
 */
export const BETSAPI_WINDOW_LIMIT: number = (() => {
  const raw = Number(process.env.BETSAPI_HOURLY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 3200;
})();

/** Backwards-compat alias so existing imports keep working. */
export const BETSAPI_HOURLY_LIMIT = BETSAPI_WINDOW_LIMIT;

/**
 * Returns the start timestamp of the current 3-hour bucket (UTC).
 * Buckets: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00
 */
const CURRENT_WINDOW_SQL = sql`
  date_trunc('hour', NOW()) - ((EXTRACT(HOUR FROM NOW())::integer % 3) * INTERVAL '1 hour')
`;

/**
 * Atomically reserve ONE BetsAPI credit for the current 3-hour window.
 * Returns true when the call is permitted (credit reserved), false when making
 * the call would exceed BETSAPI_WINDOW_LIMIT for this window.
 */
export async function reserveBetsApiCredit(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      INSERT INTO api_usage_hourly (provider, hour, calls)
      VALUES ('betsapi', ${CURRENT_WINDOW_SQL}, 1)
      ON CONFLICT (provider, hour) DO UPDATE
        SET calls = api_usage_hourly.calls + 1
        WHERE api_usage_hourly.calls < ${BETSAPI_WINDOW_LIMIT}
      RETURNING calls
    `);
    // A returned row means the insert/update happened → credit reserved.
    // No row means the WHERE guard blocked it → limit already reached.
    return (result.rows?.length ?? 0) > 0;
  } catch {
    // Fail closed — protecting the credit budget takes priority.
    return false;
  }
}

/** Current 3-hour window BetsAPI usage snapshot for admin/status display. */
export async function getBetsApiWindowUsage(): Promise<{
  used: number;
  limit: number;
  remaining: number;
  windowHours: number;
}> {
  try {
    const result = await db.execute(sql`
      SELECT calls FROM api_usage_hourly
      WHERE provider = 'betsapi' AND hour = ${CURRENT_WINDOW_SQL}
    `);
    const used = result.rows?.[0] ? Number((result.rows[0] as { calls: number }).calls) : 0;
    return { used, limit: BETSAPI_WINDOW_LIMIT, remaining: Math.max(0, BETSAPI_WINDOW_LIMIT - used), windowHours: 3 };
  } catch {
    return { used: 0, limit: BETSAPI_WINDOW_LIMIT, remaining: BETSAPI_WINDOW_LIMIT, windowHours: 3 };
  }
}

/** Backwards-compat alias — existing callers still work unchanged. */
export const getBetsApiHourlyUsage = getBetsApiWindowUsage;
