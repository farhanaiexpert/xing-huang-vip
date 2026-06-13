---
name: Translation bake script
description: How the static Chinese dictionaries get pre-filled so text is Chinese on first paint (no DeepL flash)
---

# Pre-baking Chinese translations

The runtime DOM translator (`artifacts/*/src/i18n/translator.ts`) translates instantly
from a static dictionary, then falls back to a live DeepL call for anything uncovered.
That live call causes a brief English "flash" the first time a phrase appears.

To get **instant Chinese on load with no flash**, hardcoded UI strings are pre-extracted
and translated once into the static dictionaries:
- sportsbook → `artifacts/sportsbook/src/i18n/zh.ts`
- admin → `artifacts/admin/src/i18n/zh-CN.json`

**Run:** `pnpm --filter @workspace/scripts run bake:translations`
(script: `scripts/src/bake-translations.ts`). Requires the **api-server workflow running**
— it POSTs to the public `/api/translate` proxy (server-side `DEEPL_API_KEY`).

**Rule:** re-run after adding new UI text. It is idempotent (only translates keys not
already in the dict) and appends an `// ── Auto-baked (DeepL) <date> ──` block to `zh.ts`.

**Why some strings stay English:** the script (and runtime) skip "identity" results —
when DeepL returns the input unchanged (proper nouns, codes, ambiguous single tokens).
This is expected, not a failure ("nothing translated" for the residual = those are
genuinely unchanged).

**Gotchas:**
- The script mirrors the runtime's `isTranslatable` / `isOnlyProtected` / protected-term
  masking. If you change `PROTECTED` or those rules in the translator, update the script too.
- Extraction matches how the runtime reads the DOM: JSX text (whitespace-collapsed),
  plus `placeholder`/`title`/`aria-label`/`alt` attributes. Junk keys are harmless —
  the runtime only swaps DOM text/attrs that exactly equal a key.
- Lowercase single-word JSX fragments (e.g. `"match"`) can get context-wrong machine
  translations; same behavior the runtime already had, so no regression — curate in the
  hand-written section of `zh.ts` if a specific one renders wrongly.
- Piping the run through `tail`/`head` can hide output if the process is killed at the
  end; the writes still land. Check `git diff --stat` on the dict files to confirm.
