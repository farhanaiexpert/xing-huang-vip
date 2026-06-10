---
name: BetsAPI Bet365 prematch market tree structure
description: Shape of the /v1/bet365/prematch response and which sp keys map to the 9 secondary market types.
---

# BetsAPI Bet365 prematch market tree

Endpoint: `GET /v1/bet365/prematch?FI=<id>&token=<key>` → `{success:1, results:[ tree ]}`.
The `FI` is the upcoming event's `id` field (NOT a field literally called "FI" — bet365
`/v1/bet365/upcoming` results use key `id`, e.g. "195895058").

`results[0]` is grouped into **section objects**, each with an `sp` sub-object whose keys
are the individual markets. Observed section groups: `main`, `asian_lines`, `goals`,
`half`, `corners`, `schedule` (+ scalar fields FI/event_id/sport_id).

Mapping to the app's 9 secondary market types (verified on a real Brazilian league fixture):
- Handicap / Asian Handicap → `asian_lines.sp`: asian_handicap, alternative_asian_handicap,
  goal_line, 1st_half_asian_handicap; `main.sp.draw_no_bet`.
- Over/Under → `main.sp.goals_over_under`, `goals.sp.goals_over_under`, `asian_lines.sp.goal_line`.
- Half-Time → `half.sp`: half_time_result, half_time_correct_score, half_time_double_chance,
  1st/2nd_half_goals_odd_even; `main.sp.half_time_full_time`.
- Goals/BTTS/Next Goal → `goals.sp`: first_team_to_score (= next goal), goals_odd_even,
  goals_over_under. (BTTS only appears on larger/major matches.)
- Correct Score → `main.sp.correct_score`, `half.sp.half_time_correct_score`.
- Featured Combinations → `main.sp`: half_time_full_time, double_chance.
- Corners → `corners.sp`: corners, 1st_half_corners, corners_2_way, asian_corners;
  `asian_lines.sp.asian_total_corners`.
- Time/Minute and Specials → NOT present on small fixtures; only major matches carry them.
  Treat their absence as "no market", not an error.

**Why this matters:** the app only parsed the 1X2 line before; the full secondary-market
data lives under these section→sp keys. Each section's `sp.<market>` typically holds an
`odds` array of {id, odds, name/header, handicap}.

**Credit/latency caveat:** upstream latency from the Replit env is very high (10–96s per
call). prematch must be fetched on-demand per match and cached (not bulk-fetched for every
event) or the 500/hr cap is exhausted instantly. Reserve a credit via reserveBetsApiCredit()
before every prematch fetch.
