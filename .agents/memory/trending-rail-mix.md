---
name: Trending Now rail mix
description: How the homepage "Trending Now" rail builds a randomised BetsAPI + Odds API match mix and keeps cards clickable without hijacking odds buttons.
---

The "Trending Now" rail lives in `components/SportHighlights.tsx` (TrendingRail/TrendingCard), fed from `useOddsData().allLeagues` which already merges both feeds.

**Source split:** BetsAPI events have ids prefixed `betsapi_`; everything else is Odds API. Build the rail by picking ~half from each source's richest events (by `marketCount`), then Fisher–Yates `shuffle()` so order is random each refresh. If one pool is thin/empty, top up from remaining eligible events so the rail still fills `TRENDING_TARGET` (8). Eligible = both team names present and home/away odds > 1.

**Why:** users perceived the old marketCount-sorted rail as "random irrelevant matches" and wanted a visible blend of both data sources in random order.

**How to apply (clickable card gotcha):** the whole card is `role=button` and navigates to `/match/:id` on click AND on Enter/Space (onKeyDown). The inner odds container therefore must stop BOTH events — `onClick={e=>e.stopPropagation()}` is not enough; add `onKeyDown={e=>e.stopPropagation()}` too, or pressing Enter/Space on a focused odds button navigates away instead of adding to the slip.
