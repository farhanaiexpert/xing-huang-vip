---
name: Same-game-multi odds drift
description: Why ODDS_CHANGED reconciliation must key on eventId + selection, not matchId alone
---

# Same-game-multi (SGM) selections & odds-drift reconciliation

Multiple bet-slip selections can share one `matchId` (e.g. Bet Builder player
props, or 1X2 + Over/Under from the same fixture). Each must have a **unique
`marketId`** — that is the dedupe key in `addSelection`. Bet Builder cells use
`bb_<matchId>_<playerId>_<tab>_<colIdx>` so picks from one match coexist.

**Rule:** When the server returns `409 ODDS_CHANGED`, its `changedSelections[]`
entries carry `{ eventId, eventName, selection, submittedOdds, currentOdds }`.
Reconcile each by `matchId === eventId && selectionName === selection`, falling
back to matchId-only. Matching on `matchId` alone updates only the first pick
and leaves other same-match legs stale.

**Why:** Before SGM this was latent (rare to hold two legs from one match);
mounting Bet Builder on the homepage made it common, turning a silent staleness
bug into a real drift-confirmation correctness issue.

**How to apply:** Any new surface that adds multiple selections from one fixture
must give each a unique marketId, and any code that maps server-side event data
back onto slip selections must disambiguate by selection, not just event.
