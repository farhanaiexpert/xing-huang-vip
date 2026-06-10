# =============================================================================
# Xing Huang — Production Dockerfile
# =============================================================================
# Single-stage build that mirrors the Render.com build/start commands exactly.
# tsx runs TypeScript directly at runtime — no separate tsc compile step needed.
# @workspace/db exports its TS source (main: src/index.ts) — tsx resolves it.
#
# Build:  docker compose up -d --build
# Serves: /          → sportsbook frontend
#         /admin     → admin panel frontend
#         /api/*     → Express API + cron jobs
# =============================================================================

FROM node:22-slim

# corepack ships with Node 22 — use it to activate the exact pnpm version
# declared in package.json#packageManager.
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

# ── Dependency layer (cached unless manifests change) ────────────────────────
# Copy workspace config + lock file first so Docker can cache the install layer
# independently of source changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Every package.json must be present so pnpm can resolve the full workspace.
COPY lib/db/package.json                  ./lib/db/
COPY artifacts/api-server/package.json    ./artifacts/api-server/
COPY artifacts/sportsbook/package.json    ./artifacts/sportsbook/
COPY artifacts/admin/package.json         ./artifacts/admin/
COPY scripts/package.json                 ./scripts/

RUN pnpm install --frozen-lockfile

# ── Source layer ─────────────────────────────────────────────────────────────
COPY . .

# ── Build both Vite frontends ─────────────────────────────────────────────────
# Sportsbook is served at / (no BASE_PATH override needed).
RUN pnpm --filter @workspace/sportsbook run build

# Admin panel is served at /admin/ — BASE_PATH tells Vite to prefix all asset
# URLs and the router base accordingly.
RUN BASE_PATH=/admin/ pnpm --filter @workspace/admin run build

# ── Runtime config ────────────────────────────────────────────────────────────
# The server defaults to port 5000; PORT=3000 overrides that.
# BASE_PATH=/api tells the Express router its path prefix.
ENV PORT=3000
ENV NODE_ENV=production
ENV BASE_PATH=/api

EXPOSE 3000

# Start the Express server via tsx (TypeScript-native, no compile step).
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
