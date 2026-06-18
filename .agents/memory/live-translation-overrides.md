---
name: Live translation overrides
description: DB-backed manual EN→ZH overrides editable in admin that apply to the live site without rebuild.
---

# Live translation overrides

Operators manage EN→ZH translation fixes in admin (System → Translations); they
apply to the live sportsbook + admin with no redeploy.

## Priority decision
DB override (exact match) wins over the curated static dict, which wins over DeepL.
**Why:** the site is force-locked to zh-CN and the DeepL quota is exhausted, so
operators need the final say on Chinese strings without touching code.
**How to apply:** any new lookup path must check overrides FIRST, then the runtime
dict — keep override checks above all dictionary/templating logic in both translators.

## No-rebuild propagation
Clients cache overrides for first paint, then poll a public endpoint on a short
interval (stale-while-revalidate) and FULL-REPLACE the override map so deletions
take effect. Treat the override cache as separate from the DeepL cache — never
reuse/bump the DeepL cache keys when touching overrides.
**Why:** the whole point of the feature is "edit in admin → visible in seconds";
a merge (not replace) would make deletions impossible.

## Constraints
- Overrides are exact whole-string matches only (no templating/number substitution).
- Writes are audit-logged; the unique key is (lang, source) and concurrent
  create/rename races must surface as a clean 409, not a 500.
- Schema lives in `lib/db`; this repo applies idempotent hand-written
  `CREATE ... IF NOT EXISTS` SQL migrations that are NOT registered in the drizzle
  journal (see existing 0003) — add new tables the same way so SQL-based deploys
  pick them up.
