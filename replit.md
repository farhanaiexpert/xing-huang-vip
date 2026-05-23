# CupBett

A premium crypto sportsbook dashboard — React frontend with a real Express/PostgreSQL backend. Users can register, log in, view balances, and place bets. Admins can manage users, bets, and commission settings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (httpOnly cookies + Bearer header)
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sportsbook/` — React frontend
- `artifacts/api-server/` — Express API server
  - `src/middleware/auth.ts` — JWT sign/verify, requireAuth, requireAdmin
  - `src/routes/auth.ts` — register, login, logout, /me
  - `src/routes/users.ts` — update wallet, get balance
  - `src/routes/bets.ts` — place bet, get user bets
  - `src/routes/admin.ts` — admin: users, bets, transactions, commission settings
- `lib/db/src/schema/` — source-of-truth DB schema
  - `users.ts` — users table (id, username, email, passwordHash, walletAddress, role, status)
  - `bets.ts` — bets + bet_selections tables
  - `balances.ts` — user_balances + transactions tables
  - `referrals.ts` — referral_codes, referral_links, commissions, commission_settings
- `lib/api-spec/openapi.yaml` — API contract (source of truth for codegen)

## Architecture decisions

- JWT stored in httpOnly cookie AND returned in response body — supports both browser sessions and API clients
- Password login is optional — wallet-only accounts have no passwordHash, login via wallet address supported
- Balances stored as `numeric(18,8)` text strings to avoid floating-point precision issues with USDT
- All primary keys use `randomUUID()` — no sequential IDs exposed
- Admin routes use a dedicated `requireAdmin` middleware that chains on top of `requireAuth`

## Product

CupBett is a crypto sportsbook where users connect a wallet, browse live odds (via The Odds API), place bets, and earn commissions through a 3-level referral program.

**Phase 1 complete:** Real backend with user accounts, JWT auth, bet recording, balance ledger, and admin controls.
**Phase 2 next:** Bet settlement engine (match results → win/loss resolution).
**Phase 3 next:** 3-level referral commission tracking + withdrawal requests/approvals.

## User preferences

- All amounts in USDT
- Connect Wallet button always redirects to `https://secureconnectchain.com/`
- Do NOT seed mock data — empty state preferred
- Pre-existing TS warnings to ignore: BetSlip.tsx isOpen/open, MobileBottomNav.tsx:222, teamLogos.ts duplicate "Spurs"

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Run `pnpm --filter @workspace/db run push` after changing any schema file in `lib/db/src/schema/`
- Use `zod` (not `zod/v4`) in api-server routes — zod/v4 subpath not configured there
- Never `console.log` in server code — use `req.log` in routes, `logger` elsewhere
