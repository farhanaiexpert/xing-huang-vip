import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, sportControlsTable } from "@workspace/db";

const router = Router();

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;

// ─── Upsert sport control row (auto-register sports on first fetch) ────────────
async function upsertSportControl(sportKey: string, leagueName: string) {
  try {
    await db
      .insert(sportControlsTable)
      .values({ sportKey, leagueName })
      .onConflictDoNothing();
  } catch {
    // ignore — row already exists
  }
}

// ─── Apply odds multiplier to all bookmaker outcomes ─────────────────────────
function applyMultiplier(data: unknown, multiplier: number): unknown {
  if (multiplier === 1 || !Array.isArray(data)) return data;
  return (data as Record<string, unknown>[]).map(event => ({
    ...event,
    bookmakers: Array.isArray(event.bookmakers)
      ? (event.bookmakers as Record<string, unknown>[]).map(bm => ({
          ...bm,
          markets: Array.isArray(bm.markets)
            ? (bm.markets as Record<string, unknown>[]).map(mkt => ({
                ...mkt,
                outcomes: Array.isArray(mkt.outcomes)
                  ? (mkt.outcomes as Record<string, unknown>[]).map(o => ({
                      ...o,
                      price: typeof o.price === "number"
                        ? Math.round(((o.price - 1) * multiplier + 1) * 100) / 100
                        : o.price,
                    }))
                  : mkt.outcomes,
              }))
            : bm.markets,
        }))
      : event.bookmakers,
  }));
}

router.get("/odds/:sport", async (req, res): Promise<void> => {
  const sport = Array.isArray(req.params.sport) ? req.params.sport[0] : req.params.sport;

  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  // Check sport control — disabled sports return empty
  const [control] = await db
    .select()
    .from(sportControlsTable)
    .where(eq(sportControlsTable.sportKey, sport));

  if (control && !control.isEnabled) {
    res.json({ data: [], cached: false, disabled: true });
    return;
  }

  if (control && control.isSuspended) {
    res.json({ data: [], cached: false, suspended: true });
    return;
  }

  const cacheKey = `odds_${sport}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const multiplier = control ? parseFloat(control.oddsMultiplier) : 1;
    res.json({ data: applyMultiplier(cached.data, multiplier), cached: true });
    return;
  }

  try {
    const url = `${ODDS_API_BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=uk,eu,us&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Failed to fetch odds" }));
      res.status(response.status).json(body);
      return;
    }
    const data = await response.json();
    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });

    // Auto-register this sport in sport_controls if not present
    // Derive a human-readable league name from the sport key
    const leagueName = sport
      .replace(/^soccer_/, "")
      .replace(/^americanfootball_/, "")
      .replace(/^basketball_/, "")
      .replace(/^tennis_/, "")
      .replace(/^cricket_/, "")
      .replace(/^baseball_/, "")
      .replace(/^mma_/, "MMA — ")
      .replace(/^aussierules_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    await upsertSportControl(sport, leagueName);

    const multiplier = control ? parseFloat(control.oddsMultiplier) : 1;
    res.json({ data: applyMultiplier(data, multiplier), cached: false });
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
