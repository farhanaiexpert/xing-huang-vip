---
name: express-rate-limit custom keyGenerator + IPv6
description: Why a custom keyGenerator that touches req.ip must use the ipKeyGenerator helper, or the app crashes at startup.
---

express-rate-limit v8 throws `ValidationError: ERR_ERL_KEY_GEN_IPV6` at module-eval time (when `rateLimit({...})` is constructed) if a custom `keyGenerator` references `req.ip` directly without the library's `ipKeyGenerator` helper.

**Why:** raw `req.ip` lets IPv6 users bypass limits (each address in a /64 looks unique). v8 promoted this from a warning to a hard throw, and because the limiter is built at import time, the throw can take down the whole route module on boot.

**How to apply:** import the helper and wrap the IP fallback:
```ts
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
keyGenerator: (req) => {
  const uid = req.user?.userId;            // primary: per-user key (place limiter AFTER authenticate)
  return uid != null ? String(uid) : ipKeyGenerator(req.ip ?? "");
}
```
For a per-user limiter, mount it after the `authenticate` middleware so `req.user` is populated; keying on userId sidesteps the IP issue entirely except for the unauthenticated fallback path.
