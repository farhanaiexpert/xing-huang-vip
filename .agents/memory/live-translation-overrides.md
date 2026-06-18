---
name: Live translation overrides
description: DB-backed manual EN→ZH overrides editable in admin that apply to the live site without rebuild.
---

# Live translation overrides

Operator-managed EN→ZH translation overrides stored in the `translation_overrides`
table (unique on `(lang, source)`, lang defaults to `zh-CN`). Editable in admin
under System → Translations.

## Priority (highest first)
DB override (exact match) > runtime dict (curated static zh.ts / zh-CN.json) > DeepL cache.
`translateString()` in BOTH translators checks `overrides[trimmed]` FIRST.

**Why:** site is force-locked to zh-CN and DeepL quota is exhausted; operators need
a way to fix/add Chinese strings on the live site with no redeploy.

## How it propagates without rebuild
- Public no-auth `GET /api/translations/:lang` returns `{ version, translations:{en:zh} }`
  where version = `"<maxUpdatedAtEpochMs>-<count>"`.
- Both translators load an override cache synchronously for first paint, then poll
  every 20s (stale-while-revalidate). `refreshOverrides()` short-circuits on unchanged
  `version` to avoid re-walking the DOM; on change it FULL-REPLACES overrides (so
  deletions take effect) + `walkAndApply()`.
- Override cache keys: sportsbook `sportsbook_zh_overrides_v1`, admin `admin_zh_overrides_v1`
  (separate from the DeepL cache keys — do NOT bump DeepL keys when touching overrides).

## Admin CRUD
- In `admin.ts` under `authenticate + requireAdmin`; every write goes through
  `logAdminAction` (actions: create/update/delete_translation, entity `translation_override`).
- POST pre-checks duplicate AND catches Postgres 23505 unique_violation → clean 409
  (concurrent create / PATCH source-rename race).
