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
- Schema lives in `lib/db`. The deploy configs (render.yaml / Replit publish) do
  NOT run a migration step, so production schema is created by the API's
  idempotent boot-time `runMigrations()` (a long chain of `... IF NOT EXISTS`
  blocks in the api-server entrypoint). Any NEW table this feature relies on must
  be added BOTH as a boot migration block there AND as a hand-written
  `CREATE ... IF NOT EXISTS` drizzle SQL file (not in the journal, see 0003) — the
  boot block is what actually guarantees the table on every deploy path.
