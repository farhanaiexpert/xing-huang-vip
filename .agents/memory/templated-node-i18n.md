---
name: Templated-node i18n
description: Why interpolated/templated strings leak English on the zh-CN-forced sportsbook and must be source-hardcoded, not dict-translated.
---

The sportsbook is force-locked to zh-CN. Translation is a DOM walker + static dict (`src/i18n/custom.ts` > `zh.ts`) plus a DeepL enrichment pass. **DeepL quota is exhausted**, so anything not in the static dict stays English.

The dict matches **whole text nodes only**. Any string built by interpolation renders as one node the dict can't key on. These must be **source-hardcoded** to Chinese in the data layer:

- Generated market names: `` `亚洲让球 ${ht} ${fmt(line)}` ``, `` `欧洲让球 ...` `` (not `Asian Handicap ...`).
- Scorer selection names: home/away suffix → `（主队）` / `（客队）`, not `(${team})` (team name in a composite node never translates).
- Fallback player names → `球员 A..E`, not `Player A..E`.

**Why:** the dict can't split a composite node, and DeepL can't fill the gap (out of quota). Real player proper names stay Latin — that is acceptable, only translatable English words must go.

**How to apply:** when auditing `/match/:id`, check render paths in `MarketGroup.tsx`: `SectionLabel` always shows `market.name`; cells show `sel.shortName` EXCEPT `PlayerListLayout` (mt_first_scorer / mt_anytime_scorer / mt_win_only / mt_place / mt_each_way) shows `sel.name`, and `WideLayout` shows `sel.name` only when `shortName.length > 6`. Audit every literal that lands on those paths. shortNames like `1/X`, `O 1.5`, `Eq` are universal notation — leave them.
