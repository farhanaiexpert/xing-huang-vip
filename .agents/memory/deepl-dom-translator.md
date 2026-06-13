---
name: DeepL DOM translator
description: How Chinese translation works in both sportsbook and admin (replaced Google Translate)
---

Both apps (sportsbook + admin) translate to Chinese via a client-side DOM-walking translator, NOT Google Translate (fully removed) and NOT a key-based i18n library at runtime.

**Mechanism (per app, in `src/i18n/translator.ts`):**
- A static English→Chinese dictionary is applied instantly: a `TreeWalker` over text nodes swaps any node whose trimmed text matches a dict key. A `MutationObserver` re-applies on SPA navigation / async content.
- Strings the static dict misses are collected from the live DOM and sent to the server `POST /api/translate` (DeepL proxy), then merged into the runtime dict and cached in `localStorage` (7-day TTL).
- Boot order matters: `startChineseTranslation()` is called in `main.tsx` BEFORE React renders so the first paint (incl. login page) is already Chinese.
- Language switch just persists the choice and `window.location.reload()`s; English = translator simply never starts, so original text shows.

**Skip rules:** nodes under `SCRIPT/STYLE/INPUT/...` or any ancestor with `translate="no"` are never touched — this is why curated terms and the `<SportName/>` lock survive (see sportname-i18n-lock).

**Server:** `POST /api/translate` is PUBLIC (no auth) in `api-server/src/routes/translate.ts` — the sportsbook is a public site, so it must NOT reuse an admin-authenticated route. Auto-detects DeepL free (`:fx` key → api-free.deepl.com) vs pro. Caps 100 texts/req, 500 chars each; client chunks 50/req.

**Why public, not /admin/translate:** an earlier admin-only `/admin/translate` (requireAdmin) was removed — public pages have no token, and admin 2FA blocks curl testing anyway.

**Reuse note:** sportsbook reuses its existing `src/i18n/zh.ts` (English→Chinese map) as the static dict; admin has its own `zh-CN.json`.
