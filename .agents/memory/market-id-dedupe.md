---
name: Market primary-id dedupe
description: Why card 1X2 odds and the detail/drawer "Match Result" market must share one market id
---

# Primary market id must be consistent per match across surfaces

The bet-slip selection identity is `${marketId}-${selectionType}`. A match's
primary 1X2/Match-Result market is rendered on TWO kinds of surface:

- Compact cards/rows (FeaturedMatchesCarousel, MoreMarkets, MatchRow, …) build
  the `OddsButton` `marketId` from `marketMeta()` → `mkt_${id}_mr` (soccer) /
  `mkt_${id}_mw` (everything else).
- The full detail page (MatchDetail) and the inline `GenericMarketDrawer` build
  markets from `generateDetailMarkets(matchToEntity(match))`, whose primary
  market id = `matchToEntity().primaryMarket.id`.

**Rule:** `matchToEntity()`'s `primaryMarketId` MUST use the same `_mr`/`_mw`
convention as `marketMeta()`. If they diverge (it once used `mkt_${id}_primary`),
the *same* logical 1/X/2 pick gets added to the bet slip twice as two distinct
selections.

**Why:** this is only exercised for non-BetsAPI (Odds API) matches, because
BetsAPI matches route through `BetsApiMarketDrawer` (which already aligns to
`_mr`/`_mw`). The bug is invisible until a card and its expandable drawer are
shown on the same surface for an Odds API match.

**How to apply:** any change to `marketMeta()` or `matchToEntity()`'s primary id
must be mirrored in the other. Keep both keyed on `sportId === 'sp_soccer'`.
