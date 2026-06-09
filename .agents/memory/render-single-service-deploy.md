---
name: Render single-service deploy
description: Production hosting model — one Express service serves both frontends + the API.
---

# Render single-service deployment

Production (Render, and any single-host deploy) runs **one** Node web service, not three.
The Express `api-server` serves the built frontends in addition to the API:

- `/`        → `artifacts/sportsbook/dist/public`
- `/admin`   → `artifacts/admin/dist/public` (built with `BASE_PATH=/admin/`)
- `/api/*`   → the API + cron jobs

**Why:** a non-technical owner could not manage 3 separate Render services (API + 2 static
sites) plus CORS + per-frontend `VITE_API_BASE_URL`. Collapsing to one service removes CORS
entirely (same origin) and gives one URL.

**How to apply:**
- Frontends MUST be built **without** `VITE_API_BASE_URL` so `apiBase.ts` resolves to `''` and
  calls go to same-origin `/api`. Setting it re-introduces cross-origin + CORS.
- Static serving in `app.ts` is guarded by `existsSync` of each `dist/public/index.html`, so dev
  (no build present) is unaffected; it activates only when builds exist.
- SPA fallback is an `app.use` middleware (NOT `app.get("*")` — Express 5 / path-to-regexp v8
  throws on bare `*`). It excludes `BASE` so API paths never get HTML.
- Helmet **CSP stays disabled** even though HTML is now served: the web3 wallet connectors
  (WalletConnect/Reown, injected providers) need inline/eval + many origins; a strict CSP breaks
  them. Static hosts (nginx/Vercel) applied no CSP either, so this is not a regression.
- Render service: build = install + build sportsbook + build admin (`BASE_PATH=/admin/`);
  start = `pnpm --filter @workspace/api-server run start` (tsx runs TS from source, no compile).
  Must be a paid/always-on instance or the odds/settlement cron jobs stop. `render.yaml` holds
  the blueprint.
