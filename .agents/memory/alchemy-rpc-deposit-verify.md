---
name: Alchemy RPC for deposit verification
description: How Alchemy is wired into the EVM/Solana deposit verifiers, the per-app network-enablement gotcha, and the log-redaction rule.
---

The deposit verifiers (evmVerify.ts, solanaVerify.ts) prefer Alchemy RPC (server-side `ALCHEMY_API_KEY`) with public RPCs as ordered fallback. `alchemyOrFallback(slug, ...fallbacks)` builds `[https://<slug>.g.alchemy.com/v2/<key>, ...fallbacks]` and returns only the fallbacks when the key is absent.

**Per-app network enablement gotcha:** an Alchemy API key is scoped to an *app*, and each app only answers for the networks enabled in the Alchemy dashboard. A key with only Ethereum enabled returns `HTTP 403 "<CHAIN>_MAINNET is not enabled for this app"` for every other chain. The verify loop treats 403 like any failure and falls through to the public RPC, so deposits still verify — but the chain gets no Alchemy benefit (plus one wasted round-trip) until the user enables it in the dashboard (App → Networks → enable BNB/Polygon/Arbitrum/Optimism/Base/Linea/Solana).
**How to apply:** if non-ETH deposits look slow or flaky after wiring Alchemy, probe each `<slug>.g.alchemy.com/v2/<key>` for 403 before assuming a code bug.

**Never log full RPC URLs.** Alchemy URLs embed the key in the path after `/v2/`. Both verifiers use a `redactRpc(url)` helper that logs only `new URL(url).host`. Any new RPC log site must redact the same way.
