# =============================================================================
# Xing Huang — Production Dockerfile (multi-stage)
# =============================================================================
# Stage 1 (builder): installs all deps + builds both Vite frontends.
# Stage 2 (runner):  production deps only + server source + built static files.
#
# tsx runs TypeScript directly — no tsc compile step needed.
# @workspace/db exports its TS source (main: src/index.ts) — tsx resolves it.
#
# Serves: /        → sportsbook  |  /admin → admin panel  |  /api → Express
# =============================================================================


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Full install (devDeps included) so Vite can build both frontends.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

# Copy workspace manifests first — Docker caches this layer until any
# package.json or lock file changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json                  ./lib/db/
COPY artifacts/api-server/package.json    ./artifacts/api-server/
COPY artifacts/sportsbook/package.json    ./artifacts/sportsbook/
COPY artifacts/admin/package.json         ./artifacts/admin/
COPY scripts/package.json                 ./scripts/

# Install everything (including devDeps needed for Vite builds).
RUN pnpm install --frozen-lockfile

# Copy source files.
COPY . .

# Build sportsbook SPA — served at /.
RUN pnpm --filter @workspace/sportsbook run build

# Build admin SPA — BASE_PATH prefixes all asset URLs and the router base.
RUN BASE_PATH=/admin/ pnpm --filter @workspace/admin run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner
# All deps installed (drizzle-zod/zod live in lib/db devDeps but are required
# at runtime by schema files — --prod would strip them and crash the server).
# Builder-only tools (Vite, React, heavy @types/*) are still excluded because
# only api-server + lib/db package.json files are copied here.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

# Workspace manifests needed so pnpm understands the monorepo layout.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/db/package.json                  ./lib/db/
COPY artifacts/api-server/package.json    ./artifacts/api-server/
COPY artifacts/sportsbook/package.json    ./artifacts/sportsbook/
COPY artifacts/admin/package.json         ./artifacts/admin/
COPY scripts/package.json                 ./scripts/

# Install all deps (no --prod): drizzle-zod and zod are in lib/db devDeps but
# imported at runtime by every schema file — omitting them crashes the server.
# Vite/React/etc. are not installed because their package.json files aren't
# present in this stage — only api-server and lib/db manifests are copied.
RUN pnpm install --frozen-lockfile

# Copy TypeScript source for the server and its shared DB library.
COPY lib/db/src/            ./lib/db/src/
COPY lib/db/tsconfig.json   ./lib/db/
COPY artifacts/api-server/src/          ./artifacts/api-server/src/
COPY artifacts/api-server/tsconfig.json ./artifacts/api-server/

# Copy the pre-built frontend static files from the builder stage.
COPY --from=builder /app/artifacts/sportsbook/dist/ ./artifacts/sportsbook/dist/
COPY --from=builder /app/artifacts/admin/dist/      ./artifacts/admin/dist/

# The server defaults to port 5000; PORT=3000 aligns with the compose mapping.
ENV PORT=3000
ENV NODE_ENV=production
ENV BASE_PATH=/api

EXPOSE 3000

# Start the Express + cron server via tsx (TypeScript-native, no compile step).
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
