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
# Lean runtime image: production deps only + server source + pre-built static.
# No Vite, no React, no @types/* — those are left behind in the builder.
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

# Install production dependencies only — skips devDeps (Vite, React, @types/*).
# tsx IS a production dep of api-server, so it is included.
RUN pnpm install --frozen-lockfile --prod

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
