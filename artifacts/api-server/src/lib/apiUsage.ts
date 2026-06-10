import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** External API providers whose usage we track for the admin status dashboard. */
export type ApiProvider = "odds_api" | "betsapi" | "api_football" | "nowpayments";

/**
 * Record a single external API call into the api_usage_daily rollup table.
 *
 * Fire-and-forget: never throws and never blocks the caller. One row per
 * (provider, day); each call increments `calls` (and `errors` on failure) and
 * stamps the latest status so the admin panel can show today's usage at a glance.
 */
export function recordApiCall(
  provider: ApiProvider,
  ok: boolean,
  statusLabel?: string,
  errorMsg?: string,
): void {
  const status = statusLabel ?? (ok ? "ok" : "error");
  const err = ok ? null : (errorMsg ?? statusLabel ?? "error");
  const errInc = ok ? 0 : 1;
  db.execute(sql`
    INSERT INTO api_usage_daily (provider, day, calls, errors, last_status, last_error, last_at)
    VALUES (${provider}, CURRENT_DATE, 1, ${errInc}, ${status}, ${err}, NOW())
    ON CONFLICT (provider, day) DO UPDATE SET
      calls       = api_usage_daily.calls + 1,
      errors      = api_usage_daily.errors + ${errInc},
      last_status = ${status},
      last_error  = CASE WHEN ${ok} THEN api_usage_daily.last_error ELSE ${err} END,
      last_at     = NOW()
  `).catch(() => {});
}
