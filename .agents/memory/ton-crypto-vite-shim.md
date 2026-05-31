---
name: TON crypto Vite shim
description: @ton/core requires @ton/crypto as a peer dep for sha256_sync; must be shimmed for browser builds.
---

`@ton/core` calls `sha256_sync` from `@ton/crypto` during cell construction (`wonderCalculator.js`) — this is eager, happening on every `beginCell()...endCell()` call. `@ton/crypto` is not installed in the sportsbook and has no browser build.

**Fix:** Create `artifacts/sportsbook/src/lib/ton-crypto-shim.ts` with a pure-JS SHA-256 + stub `sign`/`signVerify`, then alias in `vite.config.ts`:
```ts
"@ton/crypto": path.resolve(import.meta.dirname, "src/lib/ton-crypto-shim.ts"),
```

**Why:** `@ton/crypto` depends on Node.js crypto modules and isn't browser-safe. The shim provides only `sha256_sync` (needed for cell hash computation) using FIPS 180-4 pure JS. `sign`/`signVerify` are stubs — they throw if called, which is safe since deposit flows never sign cells.

**Also needed:** `define: { global: "globalThis" }` and `"buffer": "buffer"` alias in vite.config.ts, plus `import { Buffer } from "buffer"` polyfill at top of `main.tsx`.
