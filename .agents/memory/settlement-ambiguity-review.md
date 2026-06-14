---
name: Ambiguous grading guard
description: When match-result grading can't confidently identify the winner, hold the bet for a human instead of guessing.
---

`mapSelectionOutcome` (h2h only) returns a fourth outcome `"review"` when:
- the selection matches BOTH teams and word-overlap is tied
  (`selIsHome && selIsAway && homeMatchCount === awayMatchCount`), e.g. a
  shared token like "City"/"United"; or
- the selection can't be matched to either team or a draw (previously fell
  through to "void" or wrongly returned "lost").

`processEvent` collects review selections, sets every OPEN bet touching those
`(eventId, marketType, selection)` tuples to `status='manual_review'` (leaving
its selections open for an admin), writes a `settlement_log` row, and
**excludes** those selections from the outcomes passed to `settleBetsForEvent`.

**Why:** fuzzy team-name matching could otherwise pay the wrong side on
generic names — a real-money correctness risk. Safe default is human review.

**How to apply:** only h2h produces "review" (totals/spreads/btts stay
won/lost/void). manual_review bets are skipped by settleBetsForEvent's
`bet.status==='open'` guard, so non-review legs of the same bet may get their
selection status updated but the bet itself is never auto-resolved/paid — safe
across cron re-runs.
