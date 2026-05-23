import { Router } from "express";

const router = Router();

const ODDS_API_KEY = process.env.VITE_ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;

router.get("/odds/:sport", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.sport) ? req.params.sport[0] : req.params.sport;
  const sport = raw;

  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  const cacheKey = `odds_${sport}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ data: cached.data, cached: true });
    return;
  }

  try {
    const url = `${ODDS_API_BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).json({ error: "Failed to fetch odds" });
      return;
    }
    const data = await response.json();
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
    res.json({ data, cached: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch odds" });
  }
});

router.get("/odds/sports/list", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }
  const cacheKey = "sports_list";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ data: cached.data, cached: true });
    return;
  }
  try {
    const url = `${ODDS_API_BASE}/sports?apiKey=${ODDS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });
    res.json({ data, cached: false });
  } catch {
    res.status(500).json({ error: "Failed to fetch sports" });
  }
});

export default router;
