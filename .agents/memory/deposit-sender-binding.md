---
name: EVM deposit sender binding
description: Why on-chain deposit auto-credit must bind the tx sender to the user's account wallet, and how to scope it.
---

# EVM deposit sender binding

EVM USDT deposit auto-credit must require the on-chain `from` address to match the
wallet address bound to the account at SIWE login (`users.walletAddress`, unique,
compared case-insensitively). On mismatch — or when the account has no bound wallet —
do NOT auto-credit; route to manual review.

**Why:** duplicate-txHash protection alone does not stop theft. Without sender binding,
user A can submit user B's still-unclaimed txHash and get credited first; the
duplicate guard then blocks the rightful owner. The spec rule is "Sender must match
connected user wallet."

**How to apply:**
- Scope the check by **network membership in the EVM set**, NOT by the mere presence of
  `fromAddress` on the verifier result — the Tron verifier (`verifyTronDeposit`) also
  returns `fromAddress`, so a presence-based gate wrongly forces legit TRC-20 deposits
  into manual review.
- Keep duplicate-hash protection (unique partial index on `tx_hash` + `onConflictDoNothing`)
  and atomic credit inside the same DB transaction unchanged.
