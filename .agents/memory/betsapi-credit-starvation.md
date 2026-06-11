---
name: BetsAPI credit cap starvation + featured gate calibration
description: Two non-obvious gates that keep the homepage "Matches With More Markets" section empty even after the BetsAPI cron is enabled.
---

# BetsAPI: enabling live data vs the featured section actually filling

Enabling the BetsAPI cron is necessary but NOT sufficient for the featured carousel to
populate. Two independent gates must both be right.

## 1. Hourly credit cap can starve enrichment
The per-clock-hour credit limiter fails CLOSED and is shared across ALL BetsAPI calls.
Continuous live polling can consume the entire hourly budget, leaving zero credits for
upcoming/prematch enrichment — so the cache fills with empty rows and the featured
section stays empty even though the key itself is healthy.

**Why:** an over-conservative limit override starves the rest of the system.
**How to apply:** symptom is empty cache rows on the short recoverable TTL + a
"credit cap reached" error, NOT an upstream 429. Confirm the key is in-volume by hitting
the upstream endpoint directly; if it returns data, the limiter is the blocker, so relax
it toward the documented default. (A genuinely out-of-volume key looks different — see
betsapi-volume-429.md.)

## 2. Featured "marketScore" gate must match real feed depth
Real Bet365 upcoming feeds rarely expose 4+ extra market families on the soonest matches
(typical depth is 2–3), and only the soonest events per sport get enriched. A high
gate therefore leaves the section permanently empty.

**Why:** the carousel already sorts by marketScore desc and shows only the top 8, so the
gate is effectively just an on/off switch for the whole section — keep it low (~2) and
let the sort surface the richest matches.
**How to apply:** `featuredMatch` is a DERIVED field baked into each localStorage-
persisted Match. Any change to how it (or any derived Match field) is computed must bump
the client STORAGE_KEY, or existing clients serve stale values until the cache TTL lapses.

## 3. Selector must fall back so the section never fully vanishes
The shared selector (`selectFeaturedEntries`, the single source of truth for BOTH the
homepage carousel and the /more-markets page) returns featured fixtures when any exist,
but falls back to ALL bettable BetsAPI matches (valid teams + home/away odds > 1) when
none are flagged.

**Why:** gating the entire section on `featuredMatch` means a momentarily-empty
enrichment pass makes the whole "Matches With More Markets" block + its hero-adjacent
slot disappear, which users notice. Fallback keeps the section present (clickable,
bettable) and featured matches still lead via the marketScore→marketCount sort.
**How to apply:** never let a section's existence depend solely on an intermittently-empty
derived flag — prefer-but-fall-back. Keep carousel/page copy ("more markets") honest: the
fallback is a degraded state, not the steady state.
