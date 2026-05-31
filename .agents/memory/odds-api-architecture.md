---
name: Odds API architecture
description: How the odds data pipeline works — API key, caching, rate-limit prevention, and the bulk endpoint.
---

## Rule
Frontend makes ONE request to `/api/odds/all`; server serves from PostgreSQL cache only.

**Why:** The Odds API free/standard tier rate-limits when you fire 78 parallel requests.
Old code fired one request per sport key at page load → instant 429s.

## How it works
1. Server cron runs every 25-35 min, fetches all 81 sport keys sequentially
   with 300ms gaps → populates `odds_cache` table (40 min TTL per row)
2. `GET /api/odds/all` reads all valid cache rows in one SQL query → returns
   `{sports: {[sportKey]: OddsApiEvent[]}}`. Zero Odds API calls.
3. `GET /live/events` also reads from DB cache and filters `commence_time < now`.
   No parallel Odds API calls. 30s in-memory liveCache.
4. `GET /api/odds/:sport` still exists for single-sport deep links (MatchDetail).

## Key files
- `artifacts/api-server/src/routes/odds.ts` — all three endpoints + fetchAndCacheOdds cron helper
- `artifacts/sportsbook/src/lib/oddsApi.ts` — fetchAllOdds() + fetchSportOdds()
- `artifacts/sportsbook/src/hooks/useOddsApi.ts` — calls fetchAllOdds() once; STORAGE_KEY=oddschain_v3

## Cache key bumping
Bump `STORAGE_KEY` in `useOddsApi.ts` (e.g. `oddschain_v4`) whenever a change
would make the old localStorage cache invalid (key swap, data format change, etc).

**How to apply:** Any time the odds data pipeline changes or users report stale empty data.
