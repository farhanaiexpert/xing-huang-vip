---
name: TON deposit verifier fail-closed
description: tonVerify.ts helper functions must return false (not true) when TONapi metadata fields are absent.
---

`isUsdtJetton` and `destinationMatches` in `tonVerify.ts` were originally fail-open (returned `true` when `jetton` metadata or `destination` was missing from the TONapi response). This was flagged as a critical security issue: any Jetton transfer with incomplete decoded metadata could pass auto-verification.

**Rule:** Both functions must be fail-closed:
- `isUsdtJetton`: return `false` when `msg.decoded_body?.jetton` is absent → routes to manual review
- `destinationMatches`: return `false` when `body` is null, `body.destination` is absent, or destStr is empty → routes to manual review

**Why:** Auto-credit risk — fail-open allows unrelated Jetton transfers or transfers to wrong addresses to be credited if TONapi doesn't decode the body fully. Fail-closed means partial/missing data → manual review rather than auto-credit.

**How to apply:** Whenever editing tonVerify.ts helper functions, keep the "if missing info → return false" pattern as the first guard in each helper.
