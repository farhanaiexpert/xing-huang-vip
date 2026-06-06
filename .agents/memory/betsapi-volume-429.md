---
name: BetsAPI out-of-volume signalling
description: How BetsAPI (Bet365 data provider) reports an exhausted request-volume account, and why a valid key still returns no data.
---

# BetsAPI request-volume exhaustion

BetsAPI (betsapi.com / b365api) is the provider behind all "Bet365" live/upcoming
data. A **valid, recognised token is not enough** — the account must also have
purchased **Volume Packages** (request credits). With zero volume, the bet365
endpoints return data-less responses, NOT an auth error.

Observed exhaustion responses:
- `HTTP 429` with body `{"success":0,"error":"TOO_MANY_REQUESTS","error_detail":"buy Volume Packages from https://betsapi.com/mm/pricing_table"}`
- BetsAPI can also return `HTTP 200` with `{"success":0,"error":...}` for the same condition.

**Why this matters:** "the key is valid" ≠ "live data will flow." If every sport
(including soccer, which always has worldwide fixtures) comes back with 0 events,
suspect volume exhaustion before suspecting an off-season / empty feed.

**How to apply / diagnose:**
- The BETSAPI_KEY secret is available to the shell and node, so probe upstream
  directly without exposing it (split the response on the token before printing).
- Treat 401/403 **and** 429 (and HTTP-200 `success:0` with an `error` string) as a
  *recoverable* condition so the cache uses a short retry TTL (15 min), never the
  long "off-season empty" TTL (hours). Otherwise the site stays blank for hours
  after the user tops up volume. Re-check the recoverable flag after pagination,
  not just on page 1.
- The fix only matters once the user actually buys volume — the empty feed itself
  is a billing issue on BetsAPI's side that no code change can work around.
