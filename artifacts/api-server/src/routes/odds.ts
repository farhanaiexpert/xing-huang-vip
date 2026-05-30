import { Router } from "express";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, sportControlsTable, platformSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

// ─── In-memory cache — live endpoints only (30s TTL) ─────────────────────────
const liveCache = new Map<string, { data: unknown; expiresAt: number }>();
const LIVE_CACHE_TTL = 30 * 1000;

// ─── All sport keys the server cron will refresh ──────────────────────────────
export const ALL_ODDS_SPORT_KEYS: string[] = [
  // Soccer
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
  'soccer_france_ligue_one', 'soccer_germany_bundesliga',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_usa_mls', 'soccer_turkey_super_league',
  'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato',
  'soccer_mexico_ligamx', 'soccer_efl_champ', 'soccer_scotland_premiership',
  'soccer_portugal_primeira_liga', 'soccer_belgium_first_div',
  'soccer_argentina_primera_division', 'soccer_conmebol_copa_libertadores',
  'soccer_korea_kleague1', 'soccer_japan_j_league', 'soccer_australia_aleague',
  // American Football
  'americanfootball_nfl', 'americanfootball_ncaaf', 'americanfootball_ufl',
  // Aussie Rules
  'aussierules_afl',
  // Basketball
  'basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl',
  // Tennis
  'tennis_atp_french_open', 'tennis_wta_french_open',
  // Cricket
  'cricket_ipl', 'cricket_international_t20', 'cricket_big_bash',
  'cricket_psl', 'cricket_test_match',
  // Baseball
  'baseball_mlb', 'baseball_npb', 'baseball_kbo',
  // Ice Hockey
  'icehockey_nhl', 'icehockey_sweden_hockey_league', 'icehockey_nhl_championship_winner',
  // Rugby League
  'rugbyleague_nrl', 'rugbyleague_super_league', 'rugbyleague_nrl_premiership_winner',
  // Rugby Union
  'rugbyunion_premiership', 'rugbyunion_super_rugby', 'rugbyunion_six_nations', 'rugbyunion_world_cup',
  // Golf
  'golf_masters_tournament_winner', 'golf_pga_championship_winner',
  'golf_us_open_winner', 'golf_the_open_championship_winner', 'golf_pga_tour_winner',
  // Handball
  'handball_ehf_champions_league',
  // Volleyball
  'volleyball_brazil_superliga',
  // Darts
  'darts_betway_premier_league', 'darts_world_championship',
  // Boxing
  'boxing_event',
  // MMA
  'mma_mixed_martial_arts',
];

// Live sports (in-play events polling) — all newly wired sports included
const LIVE_SPORTS = [
  // Soccer
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
  'soccer_france_ligue_one', 'soccer_germany_bundesliga',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_usa_mls', 'soccer_turkey_super_league',
  'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato',
  'soccer_mexico_ligamx', 'soccer_efl_champ', 'soccer_scotland_premiership',
  'soccer_portugal_primeira_liga', 'soccer_belgium_first_div',
  'soccer_argentina_primera_division', 'soccer_conmebol_copa_libertadores',
  'soccer_korea_kleague1', 'soccer_japan_j_league', 'soccer_australia_aleague',
  // American Football
  'americanfootball_nfl', 'americanfootball_ncaaf', 'americanfootball_ufl',
  // Aussie Rules
  'aussierules_afl',
  // Basketball
  'basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl',
  // Tennis
  'tennis_atp_french_open', 'tennis_wta_french_open',
  // Cricket
  'cricket_ipl', 'cricket_international_t20', 'cricket_big_bash',
  'cricket_psl', 'cricket_test_match',
  // Baseball
  'baseball_mlb', 'baseball_npb', 'baseball_kbo',
  // Ice Hockey
  'icehockey_nhl', 'icehockey_sweden_hockey_league',
  // Rugby League
  'rugbyleague_nrl', 'rugbyleague_super_league',
  // Rugby Union
  'rugbyunion_premiership', 'rugbyunion_super_rugby', 'rugbyunion_six_nations',
  // Handball
  'handball_ehf_champions_league',
  // Volleyball
  'volleyball_brazil_superliga',
  // Darts
  'darts_betway_premier_league', 'darts_world_championship',
  // Boxing & MMA
  'boxing_event', 'mma_mixed_martial_arts',
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

// ─── Apply odds multiplier ────────────────────────────────────────────────────
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
    await db.insert(sportControlsTable)
      .values({ sportKey, leagueName })
      .onConflictDoNothing();
  } catch { /* already exists */ }
}

// ─── Format a sport key into a readable league name ──────────────────────────
function formatLeagueName(sport: string): string {
  return sport
    .replace(/^soccer_/, "").replace(/^americanfootball_/, "")
    .replace(/^basketball_/, "").replace(/^tennis_/, "")
    .replace(/^cricket_/, "").replace(/^baseball_/, "")
    .replace(/^mma_/, "MMA — ").replace(/^aussierules_/, "")
    .replace(/^icehockey_/, "").replace(/^rugbyleague_/, "")
    .replace(/^rugbyunion_/, "").replace(/^golf_/, "")
    .replace(/^handball_/, "").replace(/^volleyball_/, "")
    .replace(/^darts_/, "").replace(/^boxing_/, "Boxing — ")
    .replace(/_winner$/, "").replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

// ─── PostgreSQL odds cache helpers ───────────────────────────────────────────

async function getDbCachedOdds(sportKey: string): Promise<unknown[] | null> {
  try {
    const result = await db.execute(sql`
      SELECT data FROM odds_cache
      WHERE sport_key = ${sportKey} AND expires_at > NOW()
    `);
    if (result.rows.length > 0) {
      const data = result.rows[0].data;
      return Array.isArray(data) ? (data as unknown[]) : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function setDbCachedOdds(sportKey: string, data: unknown[]): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO odds_cache (sport_key, data, fetched_at, expires_at)
      VALUES (${sportKey}, ${JSON.stringify(data)}::jsonb, NOW(), NOW() + INTERVAL '40 minutes')
      ON CONFLICT (sport_key) DO UPDATE SET
        data       = EXCLUDED.data,
        fetched_at = NOW(),
        expires_at = NOW() + INTERVAL '40 minutes'
    `);
  } catch { /* silently ignore cache write failures */ }
}

// ─── Exported: fetch one sport from Odds API and populate DB cache ────────────
export async function fetchAndCacheOdds(sportKey: string): Promise<void> {
  if (!ODDS_API_KEY) return;
  try {
    const extraMarkets = sportKey.startsWith('soccer_') ? ',totals,btts' : '';
    const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=uk,eu,us&markets=h2h${extraMarkets}&oddsFormat=decimal&dateFormat=iso`;
    const response = await fetch(url);
    if (!response.ok) return; // skip non-existent / out-of-season sports silently
    const data = await response.json() as unknown[];
    if (!Array.isArray(data)) return;
    await setDbCachedOdds(sportKey, data);
    await upsertSportControl(sportKey, formatLeagueName(sportKey));
  } catch (err) {
    logger.warn({ err, sportKey }, "Odds cron: failed to fetch sport");
  }
}

// ─── GET /odds/:sport ─────────────────────────────────────────────────────────
router.get("/odds/:sport", async (req, res): Promise<void> => {
  const sport = Array.isArray(req.params.sport) ? req.params.sport[0] : req.params.sport;

  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  // Check sport control
  const [control] = await db.select().from(sportControlsTable)
    .where(eq(sportControlsTable.sportKey, sport));

  if (control && !control.isEnabled) {
    res.json({ data: [], cached: false, disabled: true }); return;
  }
  if (control && control.isSuspended) {
    res.json({ data: [], cached: false, suspended: true }); return;
  }

  // Effective margin
  const globalMargin    = await getGlobalMarginPct();
  const effectiveMargin = control?.marginOverride && parseFloat(control.marginOverride) > 0
    ? Math.max(0, Math.min(100, parseFloat(control.marginOverride)))
    : globalMargin;
  const multiplier = control ? parseFloat(control.oddsMultiplier) : 1;

  // ── Try DB cache first ────────────────────────────────────────────────────
  const cachedData = await getDbCachedOdds(sport);
  if (cachedData !== null) {
    const adjusted = applyMultiplier(applyMargin(cachedData, effectiveMargin), multiplier);
    res.json({ data: adjusted, cached: true });
    return;
  }

  // ── Cache miss — fetch from Odds API ─────────────────────────────────────
  try {
    const extraMarkets = sport.startsWith('soccer_') ? ',totals,btts' : '';
    const url = `${ODDS_API_BASE}/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=uk,eu,us&markets=h2h${extraMarkets}&oddsFormat=decimal&dateFormat=iso`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Failed to fetch odds" }));
      res.status(response.status).json(body);
      return;
    }
    const data = await response.json() as unknown[];
    await setDbCachedOdds(sport, Array.isArray(data) ? data : []);
    await upsertSportControl(sport, formatLeagueName(sport));

    const adjusted = applyMultiplier(applyMargin(data, effectiveMargin), multiplier);
    res.json({ data: adjusted, cached: false });
  } catch {
    res.status(500).json({ error: "Failed to fetch odds" });
  }
});

// ─── GET /odds/sports/list ────────────────────────────────────────────────────
router.get("/odds/sports/list", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }
  const cached = liveCache.get("sports_list");
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ data: cached.data, cached: true }); return;
  }
  try {
    const url = `${ODDS_API_BASE}/sports?apiKey=${ODDS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    liveCache.set("sports_list", { data, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    res.json({ data, cached: false });
  } catch {
    res.status(500).json({ error: "Failed to fetch sports" });
  }
});

// ─── GET /live/events ─────────────────────────────────────────────────────────
router.get("/live/events", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" }); return;
  }

  const cacheKey = "live_events";
  const cached   = liveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data); return;
  }

  try {
    const controls    = await db.select().from(sportControlsTable);
    const controlMap  = new Map(controls.map(c => [c.sportKey, c]));
    const globalMargin = await getGlobalMarginPct();
    const activeSports = await getActiveLiveSports();
    const now          = new Date().toISOString();

    const results = await Promise.allSettled(
      activeSports.map(async (sportKey) => {
        const ctrl = controlMap.get(sportKey);
        if (ctrl && (!ctrl.isEnabled || ctrl.isSuspended)) return [];

        const extraMarkets = sportKey.startsWith('soccer_') ? ',totals,btts' : '';
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=uk,eu,us&markets=h2h${extraMarkets}&oddsFormat=decimal&dateFormat=iso`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = (await response.json()) as Record<string, unknown>[];
        if (!Array.isArray(data)) return [];

        const liveEvents = data.filter(ev =>
          typeof ev.commence_time === "string" &&
          ev.commence_time < now &&
          Array.isArray(ev.bookmakers) &&
          (ev.bookmakers as unknown[]).length > 0
        );

        const effectiveMargin = ctrl?.marginOverride && parseFloat(ctrl.marginOverride) > 0
          ? Math.max(0, parseFloat(ctrl.marginOverride)) : globalMargin;
        const multiplier = ctrl ? parseFloat(ctrl.oddsMultiplier) : 1;

        const adjusted = applyMultiplier(applyMargin(liveEvents, effectiveMargin), multiplier);
        return (adjusted as Record<string, unknown>[]).map(ev => ({ ...ev, sport_key: sportKey }));
      })
    );

    const events: Record<string, unknown>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") events.push(...result.value);
    }

    const payload = { events, count: events.length, cached: false };
    liveCache.set(cacheKey, { data: payload, expiresAt: Date.now() + LIVE_CACHE_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live events" });
  }
});

// ─── GET /live/scores ─────────────────────────────────────────────────────────
router.get("/live/scores", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" }); return;
  }

  const cacheKey = "live_scores";
  const cached   = liveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data); return;
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
        return data
          .filter(ev => !ev.completed && Array.isArray(ev.scores) && (ev.scores as unknown[]).length > 0)
          .map(ev => ({ ...ev, sport_key: sportKey }));
      })
    );

    const scores: Record<string, unknown>[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") scores.push(...result.value);
    }

    const payload = { scores, count: scores.length, cached: false };
    liveCache.set(cacheKey, { data: payload, expiresAt: Date.now() + LIVE_CACHE_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live scores" });
  }
});

export default router;
