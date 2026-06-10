---
name: API usage instrumentation
description: How external-API call tracking feeds the admin "API Status" dashboard, and the rule for instrumenting call sites.
---

# API usage instrumentation

The admin **API Status** page reads from an `api_usage_daily` rollup table (one row per `provider`,`day`), populated by a fire-and-forget `recordApiCall(provider, ok, statusLabel?, errorMsg?)` helper in `artifacts/api-server/src/lib/apiUsage.ts`. The `GET /admin/api-status` endpoint derives a human status (operational/degraded/throttled/down/idle) from today's `calls`/`errors`/`last_status`, plus Odds-API credits from `platform_settings.odds_credits_remaining` and a BetsAPI cron-disabled flag.

**Rule:** instrument *every* exit path of an external fetch — success, non-OK HTTP, AND the network/timeout `catch` block. Recording only the HTTP-response branches silently undercounts failures, so the dashboard shows "working" while calls are actually timing out.

**Why:** the first pass only recorded HTTP-response paths; thrown fetch errors (timeout/DNS) bypassed `recordApiCall` entirely, making degraded/down detection unreliable.

**How to apply:** for each `fetch`, wrap in try/catch and call `recordApiCall(..., "network", ...)` in the catch; record exactly one outcome per attempt (early-return after a 429/error record so you don't double-count). Record the `true,"ok"` only *after* a successful JSON parse, not right after `response.ok`, to avoid false-positive "ok" on malformed bodies. The helper is DB-only — it adds zero upstream API calls, so it's safe even while conserving quota (e.g. BetsAPI trial volume).
