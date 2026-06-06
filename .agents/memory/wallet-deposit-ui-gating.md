---
name: Wallet deposit UI gating
description: How the WalletPage deposit card's connect/connected/success states must be gated to avoid stale views.
---

# Wallet deposit card state gating (Reown EVM flow)

The deposit card in `WalletPage.tsx` renders three mutually-exclusive subviews. Gate them so they cannot get stuck:

- Not-connected (Connect Wallet CTA): gate ONLY on `!w3Connected`. Do NOT also require `walletPhase === 'idle'` — otherwise a disconnect during an error/success phase leaves no view to return to.
- Connected deposit form: `w3Connected && walletPhase !== 'success'`.
- Success card: `w3Connected && walletPhase === 'success' && walletResult`.

Also reset the deposit phase on disconnect: an effect on `[w3Connected]` calling `resetWalletDeposit()` when `!w3Connected`, so a reconnect never lands on a stale error/success.

**Why:** without `w3Connected` on the success gate + the reset effect, disconnecting after a deposit left the success card visible with no wallet connected.

**How to apply:** any change to these three blocks must keep them keyed on `w3Connected` first, then `walletPhase`.

Detection of supported network is driven by `chainCfg = EVM_CHAINS[connectedChainId] ?? null` (from `useAutoDeposit`), NOT by any pre-connect tab selection. Supported chains: Ethereum(1), BSC(56), Polygon(137), Arbitrum(42161), Optimism(10), Base(8453), Linea(59144) — kept in sync across `EVM_CHAINS`, `SUPPORTED_CHAIN_IDS`, and reown `networks`. "Change Wallet" must use `evmWallet.openWalletModal()` (not `connect()`, which early-returns when already connected).
