/**
 * BetsAPI hourly credit limiter.
 *
 * Enforces a hard ceiling on how many BetsAPI (Bet365) requests the entire
 * system may make per clock hour, so we can never exceed the key's purchased
 * request volume. EVERY upstream BetsAPI fetch must reserve a credit here first.
 *
 * Design:
 *  - Fixed clock-hour window (date_trunc('hour', now())) — matches how BetsAPI
 *    meters its per-hour volume, and resets at the top of each hour.
 *  - Counter lives in Postgres (api_usage_hourly), so the cap holds across
 *    process restarts and any future multi-instance deployment.
 *  - reserveBetsApiCredit() is atomic: it increments only if still under the
 *    limit, returning whether the call is permitted. No race can overshoot.
 *  - Fails CLOSED: if the DB is unreachable we deny the call rather than risk
 *    blowing the credit budget.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Hard per-hour ceiling.
 * Override with BETSAPI_HOURLY_LIMIT env var.
 * Default is 2500 — a conservative hard cap well below the purchased volume limit.
 */
export const BETSAPI_HOURLY_LIMIT: number = (() => {
  const raw = Number(process.env.BETSAPI_HOURLY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2500;
})();

/**
 * Atomically reserve ONE BetsAPI credit for the current clock hour.
 * Returns true when the call is permitted (credit reserved), false when making
 * the call would exceed BETSAPI_HOURLY_LIMIT for this hour.
 */
export async function reserveBetsApiCredit(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      INSERT INTO api_usage_hourly (provider, hour, calls)
      VALUES ('betsapi', date_trunc('hour', NOW()), 1)
      ON CONFLICT (provider, hour) DO UPDATE
        SET calls = api_usage_hourly.calls + 1
        WHERE api_usage_hourly.calls < ${BETSAPI_HOURLY_LIMIT}
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

/** Current-hour BetsAPI usage snapshot for admin/status display. */
export async function getBetsApiHourlyUsage(): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  try {
    const result = await db.execute(sql`
      SELECT calls FROM api_usage_hourly
      WHERE provider = 'betsapi' AND hour = date_trunc('hour', NOW())
    `);
    const used = result.rows?.[0] ? Number((result.rows[0] as { calls: number }).calls) : 0;
    return { used, limit: BETSAPI_HOURLY_LIMIT, remaining: Math.max(0, BETSAPI_HOURLY_LIMIT - used) };
  } catch {
    return { used: 0, limit: BETSAPI_HOURLY_LIMIT, remaining: BETSAPI_HOURLY_LIMIT };
  }
}
