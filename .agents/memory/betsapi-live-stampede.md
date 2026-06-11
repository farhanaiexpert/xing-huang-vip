---
name: BetsAPI live cache stampede
description: Why /betsapi/live uses singleflight + stale-while-revalidate, and the constraints behind it.
---

# BetsAPI /betsapi/live cache stampede

The live inplay endpoint has a 30s DB cache (`betsapi_cache` row `cache_key='live'`). When that
TTL expires, multiple concurrently-polling clients can all miss at once. The original handler made
each missing request run its own full upstream refresh (`fetchBetsApiInplay` → per-sport fetch +
odds enrichment), which routinely took 20–42s and burned credits in parallel bursts.

**Fix (process-local):**
- **Singleflight** — one shared in-flight refresh promise; concurrent cache-miss callers await the
  same promise instead of each launching upstream work.
- **Stale-while-revalidate** — on cache miss, if a last-known (TTL-ignored) row exists, return it
  immediately and kick the refresh in the background. Only a truly cold start (no row at all) waits,
  and even then it races a ~9s timeout and returns empty rather than hanging.

**Why:** the win is bounded latency (~ms instead of tens of seconds) AND credit conservation — the
two are coupled, so don't "simplify" by dropping either half.

**How to apply / constraints:**
- The singleflight guard is in-memory, so it's per-process. If this API ever runs multiple
  instances, the coalescing no longer dedupes across processes — move to a DB/Redis lock then.
- Keep the background refresh writing the cache row (fetched_at=NOW, expires_at=NOW+30s) or the
  stale path never gets fresh data.
- Don't await the background refresh on the stale path — that reintroduces the latency you removed.
