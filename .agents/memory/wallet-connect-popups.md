---
name: Two distinct wallet-connect popups
description: The sportsbook has TWO separate "connect wallet" modals triggered by different events — easy to confuse.
---

# Two distinct wallet-connect popups (sportsbook)

There are two different wallet-connect surfaces, opened by different mechanisms:

- **AuthModal** — opened by the `openLoginModal` window event (used by the
  AccountLayout auth guard, bet-slip place-bet, promo claim, etc.).
- **WalletPickerModal** — the popup tied to the **header "Connect Wallet" button**
  (`setIsWalletPickerOpen`). This is the one most "connect first" UX should open.

**Why:** A feature asked the deposit "connect first" alert to open "the same popup
as the header Connect Wallet button" — that is WalletPickerModal, NOT AuthModal.
Reaching for the familiar `openLoginModal` event would have opened the wrong modal.

**How to apply:** Deposit CTAs route through `lib/depositGate.ts`
(`requestDeposit` / `promptConnectFirst` / `openWalletPicker`) using window events
`cb:connect-first` (→ global ConnectFirstDialog in App) and `cb:open-wallet-picker`
(→ Header opens WalletPickerModal). Header is mounted on all main routes, so the
picker listener is available app-wide. When you need the header's picker from
elsewhere, dispatch `cb:open-wallet-picker`; do not reuse `openLoginModal`.
