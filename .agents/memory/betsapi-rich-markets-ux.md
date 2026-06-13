---
name: BetsAPI rich-markets UX (drawer / featured)
description: marketId dedupe rule across row/carousel/drawer, and the single featured predicate, for the BetsAPI expandable-markets UI.
---

# BetsAPI rich-markets UX

Three surfaces render the same BetsAPI match: the compact `MatchRow`, the
`FeaturedMatchesCarousel`, and the expandable `BetsApiMarketDrawer`. They all
let users add the **Match Result / 1X2** selection to the bet slip.

## Rule: Match Result marketId must be identical across all three surfaces
Bet-slip selection identity is `${marketId}-${selectionType}`. So the Match
Result marketId scheme must match exactly everywhere or the same outcome added
from a row vs the drawer becomes two separate selections instead of toggling one.

Canonical scheme (keyed by `match.sportId`):
- soccer (`sp_soccer`) → `mkt_${id}_mr`
- horse racing (`sp_horse_racing`) → `mkt_${id}_wo`
- everything else → `mkt_${id}_mw`

**Why:** the drawer originally used `mkt_${id}_1x2`, which silently broke dedupe.
**How to apply:** any new surface that exposes 1X2 for a BetsAPI match must reuse
this exact scheme, not invent a `_1x2`/`_h2h` suffix.

## Rule: one "featured" predicate
"Featured" = `Match.featuredMatch` (computed in `useOddsApi` normalise from
`marketScore`). Both the Featured carousel inclusion and the "Show Featured
only" filter must use `featuredMatch`, NOT an ad-hoc inline comparison.
**Why:** the gate value has been re-tuned over time (was `>= 4`, then `>= 2`,
now `>= 1` to maximise cross-sport coverage) — centralising on `featuredMatch`
keeps every surface in sync when the threshold moves.
**How to apply:** to change how aggressive "featured" is, edit ONLY the
`marketScore >= N` line in `useOddsApi` and bump `STORAGE_KEY` so cached
`featuredMatch` flags recompute; never re-derive featured from `marketScore`
elsewhere. The carousel is uncapped and sorts by `marketScore` desc, so a low
gate just lengthens the tail rather than hiding the richest matches.
Coverage also depends on the **server enrichment window** (cron in api-server
`index.ts`): only events kicking off within that window (currently 48h, cap
30/sport) get a `marketScore` at all, so sports with no near-term fixtures
contribute zero featured matches until the window reaches them.

## Other notes
- Drawer fetches `/api/betsapi/markets/:fixtureId` (cache-only, 0 extra credits);
  strip the `betsapi_` prefix from `Match.id` to get the numeric fixtureId.
- `useOddsApi` slims richMarkets in the localStorage cache (drops heavy
  correctScore[]); the drawer re-fetches full detail on demand. Changing the
  stored richMarkets shape requires bumping `STORAGE_KEY` (oddschain_vN).
