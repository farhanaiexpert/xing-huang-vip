---
name: BetsAPI credit-efficient architecture
description: How the homepage/live/on-demand BetsAPI flow is split to minimise upstream credit spend
---

# Credit-efficient BetsAPI architecture

The BetsAPI flow is split into four cost tiers so the prematch batch is the only
broad upstream spend:

- **Prematch cron** fetches at most once / 6h into `betsapi_cache` with a long
  data TTL and bounded per-sport enrichment. Homepage NEVER triggers it.
- **Homepage** is cache-only via `GET /api/homepage/matches`: reads the cache,
  drops already-started matches, applies a 30-min time-seeded shuffle per sport,
  returns the full grouped pool + metadata (`callsSaved`, `windowIndex`,
  `droppedStarted`, `cacheAgeMs`). Frontend rotates on a 30-min timer; the MAIN
  list shows a bounded 20–50 match subset while rails keep the full pool.
- **Live** is bet-scoped: only fixtures with an OPEN `bet_selections` row
  (`betsapi_*`) are polled. Zero active bets ⇒ zero upstream calls. The per-sport
  `inplay_filter` fan-out is further constrained to only the sports those active
  fixtures belong to (sport ids resolved by scanning cache rows).
- **On-demand single-match** via `GET /api/betsapi/refresh/:fixtureId` enriches
  ONE fixture (credit-limited) when match-detail opens and rich markets are missing.

## Two non-obvious correctness rules

- `/betsapi/refresh/:fixtureId` must short-circuit (serve cached, no upstream)
  ONLY when BOTH `prematchOdds` AND `richMarkets.marketScore > 0` are present.
  **Why:** match-detail calls this exactly when rich markets are absent (odds are
  usually already present), so short-circuiting on odds alone makes the on-demand
  enrichment a no-op for the one case it exists to fix.

- The refresh writeback must re-read the owner cache row fresh and merge ONLY the
  one fixture, never blind-overwrite the snapshot read at the start of the handler.
  **Why:** the 6h cron can land between the initial read and the write; a full-row
  overwrite would clobber every other fixture's fresher cron data.
