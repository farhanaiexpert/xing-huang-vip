---
name: Dev test-login bypass
description: How to log into the sportsbook as a test account without a real wallet signature.
---
The sportsbook frontend login is wallet-only (SIWE via WalletPickerModal); there is no
email/password UI even though backend POST /auth/login + /auth/register exist. So creating
a DB user alone does NOT let you "enter" the app — you need a valid session.

**Pattern used:** a dev-only bypass, gated the same way as the existing bootstrap route.
- Backend: `POST /setup/test-login` in `setup.ts`, mounted only when `NODE_ENV !== "production"`
  (routes/index.ts removes setupRouter in prod). Finds-or-creates a fixed test wallet
  (`0x...deadbeef`, isTestAccount=true), ensures a wallets row (onConflictDoNothing) with
  starting balance, issues access+refresh JWTs via signAccessToken/signRefreshToken, inserts
  a sessions row, returns the tokens.
- Frontend: dev-only `/dev-login` route (gated `import.meta.env.DEV`) → DevLogin.tsx calls the
  endpoint, `setTokens(access, refresh)`, then **full-page** `window.location.assign` to the
  target. The full reload is required so AuthProvider's mount-time restore runs and fetches
  /auth/me — an SPA navigation leaves user=null.

**Why:** lets you demo authed pages (Bet History at /account/bets) without connecting a wallet,
with zero prod-exposure risk. Tokens: sessionStorage['cb_access'] + localStorage['cb_refresh'].
