---
name: i18n dynamic date/label translation
description: Why dynamically-generated strings (kickoff times, "updated N ago") need render-time localization, not the static DOM dictionary.
---

The EN+ZH DOM translator only matches whole text nodes against the static dict
(plus number-templating: digits collapse to `\u0000idx\u0000`). Dynamically
generated strings that vary per render — kickoff labels like "Today, 22:00" /
"Tomorrow, ..." / "Sat, 15 Jun, ..." — can't be enumerated in the dict, so with
DeepL exhausted they stay English.

**Rule:** localize variable date/time labels at RENDER time from the raw ISO
(`match.commenceIso`) using the current `lang` from `useI18n()`, not by adding
dict entries. See `formatKickoff()` in WorldCupPage.tsx.

**Number-templated labels** (fixed shape, variable number) like "Updated 5m ago"
DO work via the dict: add the templated key `Updated \u00000\u0000m ago` (NUL+0+NUL
placeholder). Hour variant needs its own `...\u00000\u0000h ago` key. Fixed phrases
("Live · just updated", "Showing recent data") just need a plain dict entry.

**Why:** matches found that some times rendered Chinese (exact static key existed,
e.g. "Today, 19:00") while others stayed English ("Today, 22:00") — the tell that
the value is dynamic and must be localized at the source, not patched key-by-key.
