---
name: World Cup near-real-time path
description: Why the WC 2026 section uses a dedicated isolated odds path, and the credit-safe fallback rule for its endpoint.
---

# World Cup 2026 near-real-time section

The WC section has its OWN end-to-end data path, fully isolated from the shared
odds pipeline:
- backend `GET /api/odds/worldcup` (registered BEFORE `/odds/:sport`)
- frontend `lib/worldCupOdds.ts` (`normalizeWorldCup`) + `hooks/useWorldCupOdds.ts`
- consumed only by `pages/WorldCupPage.tsx`

**Why a separate path:** the shared normalizer (`normalizeOdds`) hard-filters out
any already-started match and always sets `isLive=false`, so the WC section could
never show in-play matches or live scores. The dedicated `normalizeWorldCup` KEEPS
started fixtures (isLive while within ~3.5h and not completed), attaches live
scores, and drops only genuinely finished/stale ones. Match ids stay
`api_${event.id}` so settlement and `/match/:id` detail still resolve.

**Credit-safety rule (do not regress):** the endpoint serves a 2-min in-memory
fresh window + in-flight dedup. `/scores` is fetched ONLY when a fixture is
plausibly in-play. On upstream failure it serves the last good payload
(memory → DB cache) with `stale:true`. CRITICAL: stale/fallback payloads MUST be
memoized with a SHORT backoff TTL (WC_STALE_BACKOFF_MS ~30s), not skipped —
otherwise once the fresh window expires every request re-enters `buildWcPayload`
and re-hits the upstream during an outage. Fresh success keeps the full 2-min TTL;
stale keeps only the backoff TTL so we re-probe upstream at most once per window.

**How to apply:** any change to the WC payload caching must keep fresh vs stale
TTLs distinct and never leave a failure path uncached.
