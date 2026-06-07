---
name: Wallet connect is the only auth entrypoint
description: Sportsbook auth = wallet connect; WalletPickerModal is the single canonical login/signup popup.
---

# Wallet connect is the only auth entrypoint (sportsbook)

Wallet connect is the **only** authentication method (`isAuthenticated === isConnected`).
There is one canonical popup for connecting/signing in/signing up: **WalletPickerModal**,
the one tied to the header "Connect Wallet" button.

**Why:** A previous AuthModal (a second, separate connect popup) caused confusion —
features asked for "the same popup as the header Connect Wallet button," which is
WalletPickerModal, not AuthModal. AuthModal has been removed entirely.

**How to apply:** Any "you must connect / sign in / sign up" prompt must open
WalletPickerModal, never a bespoke modal. Two routes do this:
- Dispatch the `openLoginModal` window event — the Header listener opens the picker.
- Call `openWalletPicker()` from `lib/depositGate.ts` (dispatches `cb:open-wallet-picker`,
  also handled by the Header).
Deposit CTAs route through `lib/depositGate.ts` (`requestDeposit` / `promptConnectFirst`
/ `openWalletPicker`). The Header is mounted on all main routes, so these listeners are
available app-wide. Do not reintroduce a separate auth modal.
