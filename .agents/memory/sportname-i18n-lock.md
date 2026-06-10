---
name: SportName i18n lock
description: How locked Chinese sport/league terms survive Google Translate in the sportsbook
---

The sportsbook has no i18n library: the 11 non-English languages rely on Google Translate (googtrans cookie), while Chinese ALSO has a curated local `zh` dictionary. To stop Google from overriding the curated Chinese wording, sport/league names render through a shared `SportName` component that wraps the dictionary value in `translate="no"`.

**Rule:** Any UI that displays a sport or league name (sport categories, A–Z sidebar, highlight headers, carousels, quick-nav, footer sport links, header search results, live-page filter chips, league/competition labels) MUST render it via `<SportName name={...}/>` instead of raw text/`{label}`. Otherwise the curated Chinese term silently drifts back to Google Translate's wording.

**Why:** The locked-terms task requires exact curated Chinese terms everywhere a sport/league name appears. `SportName` only overrides when the language is Chinese AND there's a real dictionary hit; for every other language or any untracked name it renders raw English, so Google Translate behaves exactly as before (zero regression for other languages). Matching is exact, so display-label variants that differ from a canonical key need their own alias entry in the `zh` dictionary.

**How to apply:**
- The language switch sets both `setLang('zh-CN')` and the googtrans cookie together, so `SportName`'s Chinese check must accept both `zh` and `zh-CN`.
- Don't wrap plain English sentences built as JS template strings (e.g. promo descriptions) — leave those to Google Translate.
- Skip non-sport labels (odds-format toggles, nav items, promo pills, filter tabs, market/outcome names, network/wallet/tier names) — wrapping them is harmless but unnecessary.
- When adding a new sport/league render surface, route it through `SportName` from the start.
