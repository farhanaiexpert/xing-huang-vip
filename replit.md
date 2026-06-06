# Xing Huang

A premium frontend-only sportsbook dashboard built with React, Vite, and Tailwind CSS v4.

## Run & Operate

- `pnpm --filter @workspace/sportsbook run dev` — run the sportsbook dev server
- `pnpm run typecheck` — typecheck all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind CSS v4
- Routing: wouter
- UI: shadcn/ui + Radix primitives + lucide-react
- State: React context + localStorage (no backend, no database)

## Where things live

- `artifacts/sportsbook/src/` — all app source code
- `artifacts/sportsbook/src/components/` — UI components
- `artifacts/sportsbook/src/pages/` — page-level components
- `artifacts/sportsbook/src/hooks/` — React hooks (all localStorage-backed)
- `artifacts/sportsbook/src/index.css` — global styles + custom scrollbar

## Architecture decisions

- Backend: Express 5 API server + PostgreSQL database (odds cache, users, bets, wallet)
- All wallet interactions are mocked (no real Web3)
- Real match odds fetched via The Odds API (ODDS_API_KEY), cached in PostgreSQL odds_cache table; server cron refreshes every 25–35 min; client localStorage TTL 35 min
- Google Translate used for multi-language support (no i18n library)

## Product

Xing Huang is a sports trading / sportsbook UI with live odds, bet slip, WinSpin, promotions, affiliate dashboard, prediction pools, and bet history — all frontend-only.

## User preferences

- All amounts in USDT
- Default referral code: IHFFXMRP
- Connect Wallet always redirects to: https://secureconnectchain.com/
- Do NOT seed mock data — keep empty states realistic
- Colors: #0B0F14 bg, #00DFA9 green, #38BDF8 blue, #FACC15 gold

## Gotchas

- Pre-existing TS warning: duplicate "Spurs" key in teamLogos.ts — ignore
- Pre-existing TS errors in BetSlip.tsx and MobileBottomNav.tsx — ignore
- PORT and BASE_PATH env vars are optional at build time (defaults: 3000 / /)
