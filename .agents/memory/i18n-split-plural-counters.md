---
name: i18n split-plural counters
description: Why "s" leaks English in the zh-CN DOM translator and how to fix counter/plural strings
---

# Split-plural & templated counters in the DOM translator

The sportsbook is forced to zh-CN; gaps are filled manually in the static dict
(`custom.ts` wins over `zh.ts`). Two counter idioms defeat per-node dictionary
lookup and leak English even when the base word is translated:

## 1. JSX split-plural — leaves a standalone "s" node
`{n} word{cond ? 's' : ''}` renders the base word and the `'s'` suffix as
SEPARATE DOM text nodes. The base word translates, but the lone `s` node stays
English (e.g. "0 开放投注s").

**Fix:** one global dict entry `s: ""` in custom.ts clears every stray suffix
(Chinese has no plurals).
**Why safe:** `walkAndApply` calls `applyToTextNode` directly (NOT gated by
`isTranslatable`, which would reject length<2), and applies any result where
`translated !== trimmed` — so `""` applies. `translateString` returns
`dict["s"]` via a `!= null` check, so empty values resolve. A standalone `s`
text node only ever comes from these ternaries; single-node tokens like `59s`
timers are unaffected.

## 2. Template-literal counters — single node, number-templated
`` `${n} word` `` / `` `of ${n} total` `` render as ONE node like "0 open".
Number-templating means the dict would need the templated key (`⟦0⟧ open`), not
the plain word — so a plain `"open"` entry never matches.

**Fix:** source-hardcode these to Chinese (the site is always zh-CN, no English
mode, so hardcoding is acceptable). Don't rely on adding `word` to the dict.

**How to find them:** `rg "? 's' : ''"` for the JSX form; for templated
counters grep the component's stat/sub/`label` arrays and toast strings.
