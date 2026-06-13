import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

// Translation is EN→ZH only (product scope). Allowlist guards the upstream key.
const ALLOWED_TARGET_LANGS = new Set(["ZH"]);

// Public endpoint proxying a paid upstream — throttle hard per IP to cap cost.
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
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

export default router;
