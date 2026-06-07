---
name: Referral code → wallet verify coupling
description: Why the AuthModal referral input must write to sessionStorage, not just component state
---

The wallet auth handlers (EVM/Tron/Phantom/TON `verify` calls) read the referral
code from `sessionStorage.getItem('cb_ref')` — NOT from any React state.

**Rule:** Any UI that lets a user enter/choose a referral code for wallet signup
must persist the sanitized code to `sessionStorage['cb_ref']` (and clear it when
empty). Updating component state alone will silently drop the referral on wallet
login.

**Why:** Email/password signup used to pass `referralCode` from `refCode` state in
the request body; wallet signup never used that state — it always read `cb_ref`.
After email/password login was removed (wallet-only), the referral input's
`onChange` had to start writing to `cb_ref` or typed referral codes would never
reach the wallet verify endpoints.

**How to apply:** When touching referral entry in AuthModal or any future
wallet-login surface, keep the sessionStorage write in sync with the input.
