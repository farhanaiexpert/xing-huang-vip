---
name: Name-translation queue
description: How new API team/league/country/player names get surfaced and translated to Chinese on the always-Chinese sportsbook.
---

The sportsbook is always Chinese. Names from feeds (Odds API, BetsAPI) that aren't
yet translated must (a) render in Chinese once translated and (b) be surfaced to an
operator. There is NO live machine translation of names — operators curate them.

## Pipeline
- `translation_queue` table (lib/db) holds uncovered names: unique(lang, source),
  seen_count, status pending|translated|ignored, category.
- `artifacts/api-server/src/lib/translationQueue.ts` captures at ingest:
  - covered-set = current `translation_overrides` (zh-CN), cached ~60s.
  - non-blocking batched upsert that bumps seen_count WHERE status='pending'.
  - hooked into odds.ts (setDbCachedOdds), betsapi.ts refreshLiveCache, BetsAPI cron.
- Admin resolves via `/admin/translation-queue/:id/resolve` (tx: insert override +
  mark queue translated; 409 on unique race still marks translated).
- Sportsbook reads overrides two ways: DOM translator (team names) AND
  `I18nContext.t()` → `getOverrides()` (league names via `<SportName>`), re-rendering
  on the translator's `cb-overrides-changed` event fired each 20s poll.

## Gotchas
- **markCovered after resolve.** The covered-set cache is ~60s; the resolve endpoint
  (both success AND unique-violation paths) must call `markCovered(source)` or a
  just-translated name re-surfaces in the queue until the cache expires.
- **Seed encoding.** `scripts/src/seed-name-translations.ts` parses the curated
  zh-CN block from `artifacts/sportsbook/src/i18n/custom.ts` and upserts
  (onConflictDoNothing) into translation_overrides. It MUST filter control chars +
  lone surrogates — custom.ts contains `\u0000`-sentinel number-template keys that
  Postgres rejects as invalid UTF-8 (error 22021). Idempotent; re-run after adding
  names to custom.ts. `pnpm --filter @workspace/scripts run seed:name-translations`.
- **Why seed into overrides, not just static dict:** the covered-set only consults
  translation_overrides, so curated custom.ts names must live in the DB or they'd
  wrongly surface as "needs translation".
