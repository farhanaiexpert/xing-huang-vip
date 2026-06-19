---
name: i18n dynamic strings (dates + team names)
description: Why dynamically-generated strings can't be caught by the static DOM dictionary, and the two correct fixes (render-time localization vs curated dict).
---

The EN+ZH DOM translator only matches whole text nodes against the static dict
(plus number-templating: digits collapse to a NUL-wrapped placeholder). It enriches
uncovered strings via DeepL — but DeepL has a MONTHLY quota that, once exhausted,
makes every uncovered string fall back to English until the next billing cycle.

Two classes of dynamic strings, two fixes:

1. **Variable date/time labels** (e.g. kickoff "Today, 22:00" / "Tomorrow, ..." /
   "Sat, 15 Jun, ..."). Can't be enumerated. **Fix:** localize at RENDER time from
   the raw ISO commence time using the current `lang` from `useI18n()`, not via dict
   entries. Number-templated labels with a fixed shape (e.g. "Updated 5m ago") DO work
   via a templated dict key; fixed phrases just need a plain dict entry.

2. **Dynamic proper nouns from live feeds** (team/player names — thousands, rotating).
   No render-time trick helps; only curated dict entries or DeepL. With DeepL exhausted,
   curate a HIGH-CONFIDENCE subset (national teams, Chinese pro clubs) and accept the
   obscure long tail stays English — most have no standard Chinese name anyway.

**Gotchas for curated team names:**
- The translator matches the WHOLE text node, so suffixed feed variants need their own
  keys: " (W)" → 女足, " U20/U23" → keep appended, " Reserves" → 预备队. Generate the exact
  variants that appear in the feed.
- Filter new keys against existing dict keys in BOTH quoted (`"X":`) and unquoted
  (`X:`) identifier form, or you get TS1117 duplicate-key compile errors.
- Bare ambiguous tokens (province/country words like "Henan") translate anywhere they
  appear as a standalone node — fine in a sportsbook, but a real caveat for generic UI.

**Why:** matches found that some times rendered Chinese (exact static key existed)
while others stayed English — the tell that the value is dynamic and must be handled
by one of the two fixes above, not patched key-by-key.
