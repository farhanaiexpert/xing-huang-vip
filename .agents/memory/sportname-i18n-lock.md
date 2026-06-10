---
name: SportName i18n lock
description: How locked Chinese sport/league terms survive Google Translate in the sportsbook
---

Sport/league display names that must show EXACT user-specified Chinese terms (not Google Translate's auto-translation) are rendered via the `SportName` component (`artifacts/sportsbook/src/components/SportName.tsx`).

**Rule:** Any new UI surface that renders a sport or league name must use `<SportName name={...}/>` instead of raw text/`{label}`, or the locked term will silently drift back to Google Translate's wording.

**Why:** The app has no i18n library — it relies on Google Translate (googtrans cookie) for the 11 non-English languages PLUS a local `zh` dictionary for Chinese. To stop Google from overriding the curated Chinese terms, `SportName` wraps the dictionary value in `translate="no"`. It only does this when `lang` is `zh`/`zh-CN` AND `t(name) !== name` (a real dict hit); otherwise it renders raw English so the other languages and untracked names behave exactly as before (zero regression).

**How to apply:**
- Display-label variants that differ from canonical names need their own alias keys in `artifacts/sportsbook/src/i18n/zh.ts` (e.g. "MMA / UFC", "Rugby", "Aussie Rules" alias the canonical "MMA"/"American Football"/"Australian Rules").
- Header (`Header.tsx`) drives both mechanisms together: `setLang(code)` (code is `'zh-CN'`) AND `document.cookie = googtrans=/en/zh-CN`. `SportName`'s `isZh` check therefore accepts both `'zh'` and `'zh-CN'`.
- Don't wrap plain English sentences (e.g. promo descriptions built as JS template strings) — those stay on Google Translate.
