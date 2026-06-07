---
name: Route guards must wait for auth restore
description: Why client-side auth/connection route guards must gate on isLoading
---

Client-side guards that redirect un-authenticated/un-connected users (e.g. the
`/account/wallet` gate in AccountLayout) must wait for the auth session to finish
restoring before deciding to redirect.

**Rule:** Gate the redirect on `!isLoading` from AuthContext, e.g.
`blocked = !isLoading && needsAuth && !isConnected`. Never redirect while auth is
still loading.

**Why:** `AuthProvider` restores the session asynchronously on mount, so on a hard
refresh or deep-link, `isConnected` (derived from `isAuthenticated`) is briefly
false before tokens are restored. A guard that ignores `isLoading` will wrongly
redirect a genuinely connected user to home and fire the "connect first" toast.

**How to apply:** Any new protected route/section in the sportsbook should follow
this pattern. `useWallet().isConnected` === AuthContext `isAuthenticated`; both
settle only after `isLoading` flips false.
