import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db, translationOverridesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Translation is EN→ZH only (product scope). Allowlist guards the upstream key.
const ALLOWED_TARGET_LANGS = new Set(["ZH"]);

// Public endpoint proxying a paid upstream — throttle hard per IP to cap cost.
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many translation requests — please slow down" },
});

// ── Public DeepL translation endpoint ──────────────────────────────────────
// POST /api/translate  { texts: string[], targetLang: string }
// Calls DeepL free/pro API and returns { translations: string[] }
// Public (no auth) so the sportsbook's public pages can translate.
router.post("/translate", translateLimiter, async (req, res): Promise<void> => {
  const { texts, targetLang } = req.body as { texts?: unknown; targetLang?: unknown };

  if (!Array.isArray(texts) || texts.length === 0) {
    res.status(400).json({ error: "texts must be a non-empty array" });
    return;
  }
  if (texts.length > 100) {
    res.status(400).json({ error: "too many texts (max 100 per request)" });
    return;
  }
  if (!texts.every((t) => typeof t === "string" && t.length <= 500)) {
    res.status(400).json({ error: "each text must be a string of <= 500 chars" });
    return;
  }
  if (typeof targetLang !== "string" || !ALLOWED_TARGET_LANGS.has(targetLang.toUpperCase())) {
    res.status(400).json({ error: "targetLang must be one of: ZH" });
    return;
  }

  const apiKey = process.env.DEEPL_API_KEY ?? "";
  if (!apiKey) {
    res.status(503).json({ error: "DEEPL_API_KEY not configured" });
    return;
  }

  // DeepL free keys end with ":fx", pro keys do not
  const baseUrl = apiKey.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  try {
    const params = new URLSearchParams();
    params.append("target_lang", targetLang.toUpperCase());
    params.append("source_lang", "EN");
    for (const t of texts as string[]) {
      params.append("text", t);
    }

    const resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      req.log.error({ status: resp.status, err }, "DeepL API error");
      res.status(502).json({ error: "DeepL API error", detail: err });
      return;
    }

    const data = await resp.json() as { translations: Array<{ text: string }> };
    const translations = data.translations.map((t: { text: string }) => t.text);
    res.json({ translations });
  } catch (err) {
    req.log.error({ err }, "DeepL fetch failed");
    res.status(502).json({ error: "DeepL request failed" });
  }
});

// ── Public manual-translation overrides ────────────────────────────────────
// GET /api/translations/:lang
// Returns all database-backed overrides for a language as a compact
// { source: target } map plus a version marker (max updatedAt epoch ms + count)
// so clients can cache and cheaply detect changes. Public (no auth) so the
// sportsbook's public pages can fetch their live overrides.
// This endpoint is polled by EVERY visitor every ~20s (≈3 req/min/client).
// `trust proxy` is enabled in app.ts so express-rate-limit keys off the real
// client IP, but a single shared/NAT IP can front many users, so the cap is set
// generously. Real DB protection is the short-lived in-memory cache below (one
// query per lang per CACHE_TTL_MS regardless of traffic); the limiter is only a
// coarse flood guard.
const overridesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
});

type OverridesPayload = { version: string; translations: Record<string, string> };
const OVERRIDES_CACHE_TTL_MS = 5_000;
const overridesCache = new Map<string, { payload: OverridesPayload; expiresAt: number }>();

router.get("/translations/:lang", overridesLimiter, async (req, res): Promise<void> => {
  const lang = String(req.params.lang ?? "").trim();
  if (!lang || lang.length > 20) {
    res.status(400).json({ error: "invalid lang" });
    return;
  }
  // Never let a CDN/proxy/browser cache this — clients rely on fresh polling to
  // pick up operator edits "within seconds". DB load is bounded server-side.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");

  const now = Date.now();
  const cached = overridesCache.get(lang);
  if (cached && cached.expiresAt > now) {
    res.json(cached.payload);
    return;
  }
  try {
    const rows = await db
      .select({
        source: translationOverridesTable.source,
        target: translationOverridesTable.target,
        updatedAt: translationOverridesTable.updatedAt,
      })
      .from(translationOverridesTable)
      .where(eq(translationOverridesTable.lang, lang))
      .orderBy(desc(translationOverridesTable.updatedAt));

    const translations: Record<string, string> = {};
    let maxTs = 0;
    for (const r of rows) {
      translations[r.source] = r.target;
      const ts = r.updatedAt instanceof Date ? r.updatedAt.getTime() : new Date(r.updatedAt).getTime();
      if (ts > maxTs) maxTs = ts;
    }
    const payload: OverridesPayload = { version: `${maxTs}-${rows.length}`, translations };
    overridesCache.set(lang, { payload, expiresAt: now + OVERRIDES_CACHE_TTL_MS });
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "translation overrides fetch failed");
    res.status(500).json({ error: "Failed to load translation overrides" });
  }
});

export default router;
