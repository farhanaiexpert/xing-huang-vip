---
name: Brand rename (CupBett era) — display vs technical tokens
description: How to safely rebrand the sportsbook without breaking sessions, logins, or payments
---

When rebranding this project, the brand token appears in two casings with different meaning:

- **Capitalized `CupBett`** = user-facing display text (titles, meta, JSX copy, toasts, alt text, wallet-connect dApp name, wallet sign-in message, comments, log tags). Safe to rename.
- **Lowercase `cupbett`** = technical identifiers that must NOT be renamed casually:
  - `sessionStorage`/`localStorage` keys (e.g. `cupbett_lang`, `cupbett_deposit_method`, `cupbett_wallet_tab`, `cupbett_npp_payment`) — renaming resets users' saved state.
  - seeded/admin emails `@cupbett.com` and the seed default `superadmin@cupbett.com` — renaming can lock out existing admin login.
  - NOWPayments `orderId` prefix `cupbett-...` — correlation identifier.
  - CSV export filenames, fallback domain `https://cupbett.com`.

**Why:** a blanket replace of every "cupbett" would silently break sessions, admin auth, and payment correlation. Splitting by case lets a single `sed 's/CupBett/<NewName>/g'` rename only display strings.

**How to apply:** rename capitalized token only; leave lowercase technical IDs. Logos/favicon are hot-linked CDN URLs (swap the URL string separately — note logo filename was lowercase `cupbetlogo-1.webp`, not the brand token). The wallet sign-in message lives in `api-server` `auth.ts` (single source used for verification) plus a standalone test — rename both together so signature verification stays consistent. Hero/promo banner images have the brand baked into the artwork and require new image files, not code edits.
