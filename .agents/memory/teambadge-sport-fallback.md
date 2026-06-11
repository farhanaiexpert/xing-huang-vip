---
name: TeamBadge sport fallback
description: How team avatars degrade across the sportbook so no broken images / bare initials appear when the sport is known.
---

`components/TeamBadge.tsx` is the single source of truth for team avatars. Fallback chain: club logo (ESPN CDN) → country flag (flagcdn) → sport emoji → styled initials.

**Rule:** every place that renders a team avatar must give TeamBadge sport context — either `sportId` (preferred; resolved centrally via `sportIconFor()` in `lib/featuredMarkets.ts`) or an explicit `sportIcon`. With sport context, step 3 (emoji) catches teams that have no logo/flag, so bare initials only appear when no sport is known at all.

**Why:** the original per-component badges showed only `name.charAt(0)` initials and some passed bet365 flag *URLs* as the sport icon, which render as broken `<img>` when the CDN fails.

**How to apply:**
- Prefer `sportId={...}` over hardcoded `sportIcon` maps so all icon logic stays in `sportIconFor()`.
- `sportIconFor(raw)` strips `sp_`/`betsapi_` prefixes, tries collapsed token then first token, defaults `🏆`.
- If a caller still passes a URL `sportIcon` (e.g. UpcomingMatchesCarousel's `sp_nba` USA.svg), ALSO pass `sportId` — TeamBadge's URL branch has an `onError` that degrades a failed URL icon to the sportId-resolved emoji (else `🏆`), never a broken image.
