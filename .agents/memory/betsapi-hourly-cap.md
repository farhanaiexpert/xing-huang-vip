---
name: BetsAPI system-wide hourly credit cap
description: How the hard per-hour BetsAPI request cap is enforced so the system never exceeds purchased volume.
---

# BetsAPI hourly credit cap

Every upstream BetsAPI (Bet365) request must reserve a credit via
`reserveBetsApiCredit()` (artifacts/api-server/src/lib/betsApiRateLimiter.ts)
BEFORE the fetch. If it returns false, the caller skips the fetch and treats it
as a recoverable condition (short retry TTL), recording status `"rate_limited"`.

**Rule:** the cap is a **fixed clock-hour** window (`date_trunc('hour', now())`),
NOT a rolling window — this matches how BetsAPI meters its own per-hour volume
and resets at the top of each hour. Default limit 1000, override via
`BETSAPI_HOURLY_LIMIT`.

**Why fixed-hour + DB-backed (table `api_usage_hourly`, migration v31):**
- A rolling in-memory window resets on every process restart, letting a restart
  burst past the cap. The counter must live in Postgres so it survives restarts
  (and any future multi-instance deploy).
- The reserve is a single atomic statement:
  `INSERT ... ON CONFLICT (provider,hour) DO UPDATE SET calls=calls+1 WHERE calls < LIMIT RETURNING calls`.
  A returned row = reserved/allowed; zero rows = cap hit/denied. No race can overshoot.

**Fail CLOSED:** if the DB is unreachable the reserve returns false (denies the
call). Protecting the credit budget outweighs feature availability — but it means
a DB outage silently stops ALL BetsAPI data until the DB recovers.

**How to apply:**
- All gating lives in `betsapi.ts` at the 5 fetch sites (upcoming, prematch x2,
  inplay, inplay_filter). Any NEW BetsAPI fetch must also call
  `reserveBetsApiCredit()` first or it bypasses the cap.
- Failed upstream calls (e.g. 429) STILL consume a reserve — we cap attempts, not
  successes, so an exhausted key burns the hourly budget on retries. Acceptable
  by design; keep the cron disabled (`BETSAPI_CRON_DISABLED=1`) to avoid waste.
- Admin `/admin/api-status` surfaces `hourlyLimit/hourlyUsed/hourlyRemaining`
  for the betsapi provider via `getBetsApiHourlyUsage()`.
