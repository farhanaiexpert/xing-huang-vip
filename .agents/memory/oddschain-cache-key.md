---
name: oddschain localStorage cache key
description: When to bump the sportsbook odds cache key so density/shape changes take effect for returning users.
---

# oddschain odds cache key

The sportsbook homepage caches fetched leagues/matches in localStorage under a versioned key (`oddschain_vN`, ~35 min TTL, also a module-level session cache). Returning users hydrate from this cache before any network fetch.

**Rule:** any change that alters the *shape* or *density* of cached matches — e.g. the BetsAPI per-league `.slice(0, N)` cap in `normaliseBetsApiLeagues`, the stored `Match` fields, or how many matches are kept — must bump `STORAGE_KEY` (`oddschain_vN` → `vN+1`) in lockstep.

**Why:** without a bump, returning users keep serving the *old* cached payload until TTL expiry, so the change silently appears not to work (e.g. the homepage still shows the old, smaller match count). New visitors see it immediately, which makes the bug look intermittent.

**How to apply:** edit the cap/shape AND the key in the same change. Bigger per-league slices also enlarge the payload — `saveToStorage` swallows quota overflow (cache silently disabled), so keep the stored `Match` lean (heavy detail markets are intentionally dropped before caching).
