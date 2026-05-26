import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, sportControlsTable, platformSettingsTable } from "@workspace/db";

const router = Router();

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000;
const LIVE_CACHE_TTL = 30 * 1000;

const LIVE_SPORTS = [
  "soccer_epl",
  "soccer_uefa_champs_league",
  "soccer_spain_la_liga",
  "soccer_germany_bundesliga",
  "americanfootball_nfl",
  "basketball_nba",
  "mma_mixed_martial_arts",
  "tennis_atp_french_open",
  "cricket_test_match",
];

// ─── Returns the merged set of live sport keys (seed + DB-enabled) ────────────
async function getActiveLiveSports(): Promise<string[]> {
  try {
    const controls = await db.select().from(sportControlsTable);
    const dbKeys = controls.filter(c => c.isEnabled && !c.isSuspended).map(c => c.sportKey);
    return [...new Set([...LIVE_SPORTS, ...dbKeys])];
  } catch {
    return [...LIVE_SPORTS];
  }
}

// ─── Read global margin % from platform_settings ──────────────────────────────
async function getGlobalMarginPct(): Promise<number> {
  try {
    const [row] = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "global_margin_pct"))
      .limit(1);
    return row ? Math.max(0, Math.min(100, parseFloat(row.value) || 0)) : 0;
  } catch {
    return 0;
  }
}

// ─── Apply margin: displayedOdds = trueOdds * (1 - margin/100) ───────────────
// "true odds 2.00 @ 5% margin → displayed as 1.90"
function applyMargin(data: unknown, marginPct: number): unknown {
  if (marginPct <= 0 || !Array.isArray(data)) return data;
  const factor = 1 - marginPct / 100;
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
                        ? Math.max(1.01, Math.round(o.price * factor * 100) / 100)
                        : o.price,
                    }))
                  : mkt.outcomes,
              }))
            : bm.markets,
        }))
      : event.bookmakers,
  }));
}

// ─── Apply odds multiplier (legacy pricing adjustment) ────────────────────────
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

  // Effective margin: per-sport override > global
  const globalMargin = await getGlobalMarginPct();
  const effectiveMargin = control?.marginOverride != null
    ? Math.max(0, Math.min(100, parseFloat(control.marginOverride)))
    : globalMargin;
  const multiplier = control ? parseFloat(control.oddsMultiplier) : 1;

  if (cached && cached.expiresAt > Date.now()) {
    const adjusted = applyMultiplier(applyMargin(cached.data, effectiveMargin), multiplier);
    res.json({ data: adjusted, cached: true });
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

    const adjusted = applyMultiplier(applyMargin(data, effectiveMargin), multiplier);
    res.json({ data: adjusted, cached: false });
  } catch {
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

// ─── Live Events — polls curated sports for in-play events (30s server cache) ──
router.get("/live/events", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  const cacheKey = "live_events";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    // Load all sport controls for multipliers + suspension status
    const controls = await db.select().from(sportControlsTable);
    const controlMap = new Map(controls.map(c => [c.sportKey, c]));

    // Read global margin once
    const globalMargin = await getGlobalMarginPct();

    // Merge seed list with any additional enabled sports from DB
    const activeSports = await getActiveLiveSports();

    const now = new Date().toISOString();

    const results = await Promise.allSettled(
      activeSports.map(async (sportKey) => {
        const ctrl = controlMap.get(sportKey);
        if (ctrl && (!ctrl.isEnabled || ctrl.isSuspended)) return [];

        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=uk,eu,us&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = (await response.json()) as Record<string, unknown>[];
        if (!Array.isArray(data)) return [];

        // Filter: commenced (commence_time in past) and has bookmakers
        const liveEvents = data.filter(ev =>
          typeof ev.commence_time === "string" &&
          ev.commence_time < now &&
          Array.isArray(ev.bookmakers) &&
          (ev.bookmakers as unknown[]).length > 0
        );

        const effectiveMargin = ctrl?.marginOverride != null
          ? Math.max(0, parseFloat(ctrl.marginOverride))
          : globalMargin;
        const multiplier = ctrl ? parseFloat(ctrl.oddsMultiplier) : 1;

        const adjusted = applyMultiplier(applyMargin(liveEvents, effectiveMargin), multiplier);
        return (adjusted as Record<string, unknown>[]).map(ev => ({
          ...ev,
          sport_key: sportKey,
        }));
      })
    );

    const events: Record<string, unknown>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        events.push(...result.value);
      }
    }

    const payload = { events, count: events.length, cached: false };
    cache.set(cacheKey, { data: payload, expiresAt: Date.now() + LIVE_CACHE_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live events" });
  }
});

// ─── Live Scores — in-progress match scores (30s server cache) ───────────────
router.get("/live/scores", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  const cacheKey = "live_scores";
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    const activeSports = await getActiveLiveSports();
    const results = await Promise.allSettled(
      activeSports.map(async (sportKey) => {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=1&dateFormat=iso`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = (await response.json()) as Record<string, unknown>[];
        if (!Array.isArray(data)) return [];

        // Only in-progress (not completed, has scores)
        return data
          .filter(ev => !ev.completed && Array.isArray(ev.scores) && (ev.scores as unknown[]).length > 0)
          .map(ev => ({ ...ev, sport_key: sportKey }));
      })
    );

    const scores: Record<string, unknown>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        scores.push(...result.value);
      }
    }

    const payload = { scores, count: scores.length, cached: false };
    cache.set(cacheKey, { data: payload, expiresAt: Date.now() + LIVE_CACHE_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live scores" });
  }
});

export default router;
