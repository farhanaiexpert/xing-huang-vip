---
name: BTTS fallback for unsupported soccer competitions
description: World Cup and some Odds API soccer competitions return HTTP 422 for the btts market. The fix retries without btts on 400/422.
---

The Odds API returns HTTP **422** (not 400) with `error_code: INVALID_MARKET` when `btts` is
requested for competitions that don't support it (e.g. `soccer_fifa_world_cup`).

**Fix:** `fetchOddsFromApi(sportKey, extraMarkets)` in `odds.ts`:
- First request includes all extra markets (e.g. `,totals,btts`).
- On 400 or 422 response when `btts` is in the market string, retries with btts stripped.
- Both `fetchAndCacheOdds()` (cron) and the inline `/:sport` handler use this function.

**Why:** Without this fallback, `soccer_fifa_world_cup` silently returns 0 events,
blocking all soccer World Cup markets from appearing in the sportsbook.

**How to apply:** Any time a new soccer competition is added to `ALL_ODDS_SPORT_KEYS`,
no code change needed — the fallback handles it automatically at fetch time.
