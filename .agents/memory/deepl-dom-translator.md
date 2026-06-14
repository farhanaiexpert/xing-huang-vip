---
name: DeepL DOM translator
description: How Chinese translation works in both sportsbook and admin (replaced Google Translate)
---

Both apps (sportsbook + admin) translate to Chinese via a client-side DOM-walking translator, NOT Google Translate (fully removed) and NOT a key-based i18n library at runtime.

**Mechanism (per app, in `src/i18n/translator.ts`):**
- A static English→Chinese dictionary is applied instantly: a `TreeWalker` over text nodes swaps any node whose trimmed text matches a dict key. A `MutationObserver` re-applies on SPA navigation / async content.
- Strings the static dict misses are collected from the live DOM and sent to the server `POST /api/translate` (DeepL proxy), then merged into the runtime dict and cached in `localStorage` (7-day TTL).
- Boot order matters: `startChineseTranslation()` is called in `main.tsx` BEFORE React renders to set up the dict + `MutationObserver`. **But that alone leaves an English flash** — `startChineseTranslation`'s own `walkAndApply()` runs against an empty `<body>` (React hasn't mounted), so React paints English first and the observer only swaps to Chinese asynchronously (visible delay, worse on slow phones). **Fix:** also call the exported `applyChineseTranslations()` (a `walkAndApply()` wrapper) SYNCHRONOUSLY right after `createRoot(...).render(...)` in `main.tsx`. React's initial mount is synchronous, so the DOM is fully committed when `render()` returns; translating in the same task → before the browser paints → zero English flash. Requires no Suspense/lazy on the initial route (true for both apps). Gate it on the same `zhActive` flag used to start the translator.
- Language switch just persists the choice and `window.location.reload()`s; English = translator simply never starts, so original text shows.

**Skip rules:** nodes under `SCRIPT/STYLE/INPUT/...` or any ancestor with `translate="no"` are never touched — this is why curated terms and the `<SportName/>` lock survive (see sportname-i18n-lock).

**Server:** `POST /api/translate` is PUBLIC (no auth) in `api-server/src/routes/translate.ts` — the sportsbook is a public site, so it must NOT reuse an admin-authenticated route. Auto-detects DeepL free (`:fx` key → api-free.deepl.com) vs pro. Caps 100 texts/req, 500 chars each; client chunks 50/req.

**Why public, not /admin/translate:** an earlier admin-only `/admin/translate` (requireAdmin) was removed — public pages have no token, and admin 2FA blocks curl testing anyway.

**Reuse note:** sportsbook reuses its existing `src/i18n/zh.ts` (English→Chinese map) as the static dict; admin has its own `zh-CN.json`.

**Route code-splitting constraint:** the sportsbook splits secondary routes via `React.lazy` + `<Suspense>` for faster initial load, but the `Home`/`/` route MUST stay eagerly imported (no lazy, no Suspense suspension on first paint). If Home were lazy, its first render would be the Suspense fallback and the synchronous `applyChineseTranslations()` would translate an empty shell → English flash returns once the chunk resolves. Keep initial route eager whenever changing routing.

**Number-templating + protected-term masking (both translators, kept in lockstep):**
- Strings with digits collapse to one cache key: digits are masked to `\u0000idx\u0000` and mapped back. `makeTemplatePair` MUST map each translated number to the next *unused* source occurrence of that value (per-index `used[]`), NOT `indexOf` — `indexOf` collides on repeated numbers ("10 ... 10") and caches a corrupt template that mis-renders later instances with different values.
- Allowlisted tokens (tickers/codes/brand/payment-provider names in `PROTECTED`) are masked with sentinel `@@P{idx}@@` before the DeepL POST and restored after, so they stay verbatim even when embedded in a phrase. **Empirical DeepL behavior (not derivable from code):** `@@N@@` and `<x>N</x>` survive verbatim; smart/straight quotes get reformatted (don't use quotes as sentinels). Restore is fail-closed: if the sentinel count is wrong or any `@@P\d+@@` remnant survives, skip caching that entry → string stays English rather than rendering mangled.
- **Why:** any change to how templates/values are stored must bump `CACHE_KEY` (`*_zh_deepl_vN`) in lockstep or stale localStorage entries serve the old/corrupt shape.
