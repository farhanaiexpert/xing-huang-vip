import { Router } from "express";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, sportControlsTable, platformSettingsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { recordApiCall } from "../lib/apiUsage.js";
import { captureOddsApiNames } from "../lib/translationQueue.js";

const router = Router();

const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

// ─── In-memory cache — live endpoints only (30s TTL) ─────────────────────────
const liveCache = new Map<string, { data: unknown; expiresAt: number }>();
const LIVE_CACHE_TTL = 30 * 1000;

// ─── In-flight deduplicator — one Odds API call per sport at a time ──────────
// Prevents burst 429s when multiple clients request the same uncached sport
const inFlight = new Map<string, Promise<unknown[]>>();

// ─── All sport keys the server cron will refresh ──────────────────────────────
// Trimmed to sports active in June–July 2026 to minimise Odds API credit usage.
// Off-season keys (NFL, NCAAF, NCAAB, Euroleague, NBL, AO/USO tennis, Big Bash,
// PSL, Swedish hockey, rugby futures, handball, snooker, etc.) removed until in-season.
export const ALL_ODDS_SPORT_KEYS: string[] = [
  // Soccer — FIFA World Cup 2026 (June–July 2026, top priority)
  'soccer_fifa_world_cup', 'soccer_fifa_world_cup_winner',
  // Soccer — year-round / summer leagues (active now)
  'soccer_usa_mls', 'soccer_conmebol_copa_libertadores',
  'soccer_conmebol_copa_sudamericana', 'soccer_brazil_campeonato',
  'soccer_brazil_serie_b', 'soccer_chile_campeonato',
  'soccer_mexico_ligamx', 'soccer_argentina_primera_division',
  'soccer_korea_kleague1', 'soccer_japan_j_league', 'soccer_australia_aleague',
  // Soccer — Nordic summer leagues (May–Nov)
  'soccer_sweden_allsvenskan', 'soccer_norway_eliteserien',
  'soccer_denmark_superliga', 'soccer_finland_veikkausliiga',
  // Soccer — major European leagues (kept for breadth; mostly post-season)
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
  'soccer_france_ligue_one', 'soccer_germany_bundesliga',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_efl_champ', 'soccer_scotland_premiership',
  'soccer_portugal_primeira_liga', 'soccer_belgium_first_div',
  'soccer_turkey_super_league', 'soccer_netherlands_eredivisie',
  'soccer_spain_segunda_division', 'soccer_england_league1', 'soccer_england_league2',
  'soccer_china_superleague', 'soccer_india_superleague',
  // American Football — UFL (May–June); NFL/NCAAF off until Aug/Sep
  'americanfootball_ufl',
  // Aussie Rules — AFL (March–September)
  'aussierules_afl',
  // Basketball — NBA Finals (June 2026) + WNBA season; NCAAB/Euroleague/NBL off-season
  'basketball_nba', 'basketball_wnba',
  // Tennis — French Open (early June) + Wimbledon (late June–July)
  'tennis_atp_french_open', 'tennis_wta_french_open',
  'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
  // Cricket — T20 internationals, Test matches, IPL wrap-up
  'cricket_ipl', 'cricket_international_t20', 'cricket_test_match',
  // Baseball — MLB, NPB, KBO (all in season)
  'baseball_mlb', 'baseball_npb', 'baseball_kbo',
  // Ice Hockey — NHL Finals (June 2026); Swedish league off-season removed
  'icehockey_nhl',
  // Rugby League — NRL + Super League (both active)
  'rugbyleague_nrl', 'rugbyleague_super_league',
  // Rugby Union — Premiership + Super Rugby (active)
  'rugbyunion_premiership', 'rugbyunion_super_rugby',
  // Golf — US Open (June) + The Open Championship (July) + PGA Tour
  'golf_us_open_winner', 'golf_the_open_championship_winner', 'golf_pga_tour_winner',
  // MMA & Boxing
  'mma_mixed_martial_arts', 'boxing_event',
  // Darts — Premier League (wrapping up)
  'darts_betway_premier_league',
];

// Live sports (in-play events polling) — kept in sync with ALL_ODDS_SPORT_KEYS
// Futures/outright-winner keys excluded (no in-play match events).
const LIVE_SPORTS = [
  // Soccer — World Cup + year-round leagues
  'soccer_fifa_world_cup',
  'soccer_usa_mls', 'soccer_conmebol_copa_libertadores',
  'soccer_conmebol_copa_sudamericana', 'soccer_brazil_campeonato',
  'soccer_brazil_serie_b', 'soccer_chile_campeonato',
  'soccer_mexico_ligamx', 'soccer_argentina_primera_division',
  'soccer_korea_kleague1', 'soccer_japan_j_league', 'soccer_australia_aleague',
  'soccer_sweden_allsvenskan', 'soccer_norway_eliteserien',
  'soccer_denmark_superliga', 'soccer_finland_veikkausliiga',
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
  'soccer_france_ligue_one', 'soccer_germany_bundesliga',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_efl_champ', 'soccer_scotland_premiership',
  'soccer_portugal_primeira_liga', 'soccer_belgium_first_div',
  'soccer_turkey_super_league', 'soccer_netherlands_eredivisie',
  'soccer_spain_segunda_division', 'soccer_england_league1', 'soccer_england_league2',
  'soccer_china_superleague', 'soccer_india_superleague',
  // American Football
  'americanfootball_ufl',
  // Aussie Rules
  'aussierules_afl',
  // Basketball
  'basketball_nba', 'basketball_wnba',
  // Tennis
  'tennis_atp_french_open', 'tennis_wta_french_open',
  'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
  // Cricket
  'cricket_ipl', 'cricket_international_t20', 'cricket_test_match',
  // Baseball
  'baseball_mlb', 'baseball_npb', 'baseball_kbo',
  // Ice Hockey
  'icehockey_nhl',
  // Rugby League
  'rugbyleague_nrl', 'rugbyleague_super_league',
  // Rugby Union
  'rugbyunion_premiership', 'rugbyunion_super_rugby',
  // MMA & Boxing
  'mma_mixed_martial_arts', 'boxing_event',
  // Darts
  'darts_betway_premier_league',
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

/** Returns milliseconds until this sport's cache expires (0 = expired or missing). */
export async function getDbCacheRemainingMs(sportKey: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT EXTRACT(EPOCH FROM (expires_at - NOW())) * 1000 AS remaining_ms
      FROM odds_cache WHERE sport_key = ${sportKey}
    `);
    if (result.rows.length > 0) {
      return Math.max(0, Number(result.rows[0].remaining_ms));
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Write odds data to the DB cache.
 * @param ttlMinutes cache lifetime — use 40 for active sports, 360 for empty/off-season.
 */
async function setDbCachedOdds(sportKey: string, data: unknown[], ttlMinutes = 40): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO odds_cache (sport_key, data, fetched_at, expires_at)
      VALUES (
        ${sportKey},
        ${JSON.stringify(data)}::jsonb,
        NOW(),
        NOW() + (${ttlMinutes} * INTERVAL '1 minute')
      )
      ON CONFLICT (sport_key) DO UPDATE SET
        data       = EXCLUDED.data,
        fetched_at = NOW(),
        expires_at = NOW() + (${ttlMinutes} * INTERVAL '1 minute')
    `);
    // Capture any new team/league names into the translation queue (non-blocking).
    captureOddsApiNames(data as Array<{ home_team?: string; away_team?: string; sport_title?: string }>);
  } catch { /* silently ignore cache write failures */ }
}

/**
 * Fetch one sport from Odds API and write to DB cache.
 * Returns the number of events cached (0 for off-season sports).
 * Empty sports are cached with a 6-hour TTL to avoid wasting credits.
 */
/** Returns the extra market query string for a given sport key.
 *  Odds API silently ignores markets a sport doesn't support, so it's safe
 *  to request totals for everything — zero extra credits, free extra data. */
function getExtraMarkets(sportKey: string): string {
  if (
    sportKey.startsWith('americanfootball_') ||
    sportKey.startsWith('basketball_') ||
    sportKey.startsWith('baseball_') ||
    sportKey.startsWith('icehockey_')
  ) return ',totals,spreads';
  // All other sports (soccer, tennis, cricket, golf, etc.) get totals.
  // If the sport doesn't support it the API just omits it — no error, no credit cost.
  return ',totals';
}

// ─── Typed result for Odds API fetch ─────────────────────────────────────────
type OddsApiResult =
  | { data: unknown[] }        // success
  | { quota: true }            // 429 — quota exhausted, caller should halt
  | { fetchError: true };      // other non-ok response

/** Fetch from Odds API — single EU region to minimise credit usage.
 *  Reads x-requests-remaining header after every call for quota visibility.
 *  Returns a typed discriminated union so callers can distinguish 429 from other errors. */
async function fetchOddsFromApi(sportKey: string, extraMarkets: string): Promise<OddsApiResult> {
  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h${extraMarkets}&oddsFormat=decimal&dateFormat=iso`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch {
    recordApiCall("odds_api", false, "network", `${sportKey} → network/timeout`);
    return { fetchError: true };
  }

  // ── Credit visibility ────────────────────────────────────────────────────
  const remaining = Number(response.headers.get('x-requests-remaining') ?? -1);
  const used      = Number(response.headers.get('x-requests-used') ?? 0);
  if (remaining >= 0) {
    if (remaining < 50) {
      logger.error({ sportKey, remaining, used }, 'Odds API: CRITICAL — credits nearly exhausted');
    } else if (remaining < 200) {
      logger.warn({ sportKey, remaining, used }, 'Odds API: credits running low');
    } else {
      logger.debug({ sportKey, remaining, used }, 'Odds API: credits ok');
    }
    // Persist to DB so the admin panel can display it (fire-and-forget)
    const now = new Date().toISOString();
    db.execute(sql`
      INSERT INTO platform_settings (key, value)
      VALUES ('odds_credits_remaining', ${String(remaining)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `).catch(() => {});
    db.execute(sql`
      INSERT INTO platform_settings (key, value)
      VALUES ('odds_credits_updated_at', ${now})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `).catch(() => {});
  }

  // ── 429: quota exhausted ─────────────────────────────────────────────────
  if (response.status === 429) {
    logger.error({ sportKey }, 'Odds API: 429 quota exhausted — caller should halt batch');
    recordApiCall("odds_api", false, "429 quota exhausted", `${sportKey} → 429 quota exhausted`);
    return { quota: true };
  }

  if (response.ok) {
    const data = await response.json() as unknown[];
    recordApiCall("odds_api", true, "ok");
    return { data: Array.isArray(data) ? data : [] };
  }

  logger.warn({ sportKey, status: response.status }, 'Odds API: non-ok response');
  recordApiCall("odds_api", false, `HTTP ${response.status}`, `${sportKey} → HTTP ${response.status}`);
  return { fetchError: true };
}

/** Fetch one sport's odds and persist to DB cache.
 *  Returns event count (≥0 on success) or -1 if the API returned 429 (quota exhausted).
 *  Callers that receive -1 should halt the current batch to avoid wasting remaining credits. */
export async function fetchAndCacheOdds(sportKey: string): Promise<number> {
  if (!ODDS_API_KEY) return 0;
  try {
    const extraMarkets = getExtraMarkets(sportKey);
    const result = await fetchOddsFromApi(sportKey, extraMarkets);

    if ('quota' in result) return -1;          // signal to halt batch
    if ('fetchError' in result) return 0;      // non-quota error, keep going

    const { data } = result;
    // Empty sports (off-season) get a 6-hour TTL so we don't re-hit the API next cycle.
    // Active sports use a 60-minute TTL — matches the new ~60 min batch interval.
    const ttlMinutes = data.length > 0 ? 60 : 360;
    await setDbCachedOdds(sportKey, data, ttlMinutes);
    await upsertSportControl(sportKey, formatLeagueName(sportKey));
    return data.length;
  } catch (err) {
    logger.warn({ err, sportKey }, "Odds cron: failed to fetch sport");
    return 0;
  }
}

// ─── GET /odds/all — single bulk endpoint (reads DB cache only, zero API calls)
router.get("/odds/all", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }
  try {
    const controls    = await db.select().from(sportControlsTable);
    const controlMap  = new Map(controls.map(c => [c.sportKey, c]));
    const globalMargin = await getGlobalMarginPct();

    const result = await db.execute(sql`
      SELECT sport_key, data FROM odds_cache WHERE expires_at > NOW()
    `);

    const sports: Record<string, unknown[]> = {};
    for (const row of result.rows) {
      const sportKey = row.sport_key as string;
      const ctrl     = controlMap.get(sportKey);
      if (ctrl && (!ctrl.isEnabled || ctrl.isSuspended)) continue;

      const data            = Array.isArray(row.data) ? (row.data as unknown[]) : [];
      const effectiveMargin = ctrl?.marginOverride && parseFloat(ctrl.marginOverride) > 0
        ? Math.max(0, parseFloat(ctrl.marginOverride)) : globalMargin;
      const multiplier = ctrl ? parseFloat(ctrl.oddsMultiplier) : 1;

      sports[sportKey] = applyMultiplier(applyMargin(data, effectiveMargin), multiplier) as unknown[];
    }

    res.json({ sports, cached: true, sportCount: Object.keys(sports).length });
  } catch {
    res.status(500).json({ error: "Failed to fetch all odds" });
  }
});

// ─── World Cup 2026 — dedicated near-real-time endpoint ──────────────────────
// ISOLATED from the shared odds pipeline. Only soccer_fifa_world_cup is touched.
//  - 2-minute in-memory fresh window keeps the section near real-time.
//  - In-flight dedup prevents burst Odds API calls under concurrent traffic.
//  - Scores are fetched ONLY when an in-play WC fixture exists (credit saving).
//  - Odds are written back to odds_cache with the normal 60-min TTL so the
//    homepage WC entry and /match/:id detail stay populated (no regression).
//  - On upstream quota/failure the last good payload (memory → DB cache) is
//    served with `stale: true` so the section never goes blank.
const WC_SPORT_KEY      = "soccer_fifa_world_cup";
const WC_FRESH_TTL_MS   = 2 * 60 * 1000;          // near-real-time window
const WC_STALE_BACKOFF_MS = 30 * 1000;            // outage backoff — re-probe upstream at most this often
const WC_INPLAY_WINDOW_MS = 3.5 * 60 * 60 * 1000; // a match can be in-play up to ~3.5h

interface WcPayload {
  events:    unknown[];
  scores:    unknown[];
  updatedAt: string;
  stale:     boolean;
}

let wcMemCache: { payload: WcPayload; expiresAt: number } | null = null;
let wcInFlight: Promise<WcPayload> | null = null;

async function fetchWcScores(): Promise<unknown[]> {
  const url = `${ODDS_API_BASE}/sports/${WC_SPORT_KEY}/scores?apiKey=${ODDS_API_KEY}&daysFrom=1&dateFormat=iso`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    recordApiCall("odds_api", false, "network", `wc scores → network/timeout`);
    return [];
  }
  if (!response.ok) {
    recordApiCall("odds_api", false, `HTTP ${response.status}`, `wc scores → HTTP ${response.status}`);
    return [];
  }
  const raw = (await response.json()) as Record<string, unknown>[];
  recordApiCall("odds_api", true, "ok");
  if (!Array.isArray(raw)) return [];
  // Keep both live and just-completed so the client can settle/clear finished rows.
  return raw.filter(ev => Array.isArray(ev.scores) && (ev.scores as unknown[]).length > 0);
}

async function buildWcPayload(): Promise<WcPayload> {
  const globalMargin = await getGlobalMarginPct();
  const [control] = await db.select().from(sportControlsTable)
    .where(eq(sportControlsTable.sportKey, WC_SPORT_KEY));
  const effectiveMargin = control?.marginOverride && parseFloat(control.marginOverride) > 0
    ? Math.max(0, Math.min(100, parseFloat(control.marginOverride)))
    : globalMargin;
  const multiplier = control ? parseFloat(control.oddsMultiplier) : 1;
  const adjust = (data: unknown[]) =>
    applyMultiplier(applyMargin(data, effectiveMargin), multiplier) as unknown[];

  // ── 1. Fresh odds from Odds API (h2h + totals) ──────────────────────────────
  const oddsResult = await fetchOddsFromApi(WC_SPORT_KEY, ",totals");

  if ("data" in oddsResult) {
    const oddsData = oddsResult.data;
    // Persist for homepage WC + /match/:id detail + settlement (normal TTL).
    await setDbCachedOdds(WC_SPORT_KEY, oddsData, 60);
    await upsertSportControl(WC_SPORT_KEY, formatLeagueName(WC_SPORT_KEY));

    // Only spend score credits when at least one fixture is plausibly in-play.
    const now = Date.now();
    const hasInPlay = oddsData.some(ev => {
      const ct = (ev as { commence_time?: string }).commence_time;
      if (typeof ct !== "string") return false;
      const t = new Date(ct).getTime();
      return t <= now && now - t <= WC_INPLAY_WINDOW_MS;
    });
    const scores = hasInPlay ? await fetchWcScores() : [];

    return { events: adjust(oddsData), scores, updatedAt: new Date().toISOString(), stale: false };
  }

  // ── 2. Upstream failure (quota / network / non-ok) — fall back ──────────────
  if (wcMemCache) {
    return { ...wcMemCache.payload, stale: true };
  }
  const dbCached = await getDbCachedOdds(WC_SPORT_KEY);
  return {
    events:    dbCached ? adjust(dbCached) : [],
    scores:    [],
    updatedAt: new Date().toISOString(),
    stale:     true,
  };
}

// ─── GET /odds/worldcup ──────────────────────────────────────────────────────
// Must be registered BEFORE /odds/:sport or "worldcup" is treated as a sport key.
router.get("/odds/worldcup", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" });
    return;
  }

  // Respect admin sport controls — disabled/suspended returns empty (no upstream).
  const [control] = await db.select().from(sportControlsTable)
    .where(eq(sportControlsTable.sportKey, WC_SPORT_KEY));
  if (control && (!control.isEnabled || control.isSuspended)) {
    res.json({ events: [], scores: [], updatedAt: new Date().toISOString(), stale: false, disabled: true });
    return;
  }

  // Fresh in-memory window — near-real-time without hammering the upstream.
  if (wcMemCache && wcMemCache.expiresAt > Date.now()) {
    res.json(wcMemCache.payload);
    return;
  }

  try {
    if (!wcInFlight) {
      wcInFlight = buildWcPayload();
      wcInFlight.finally(() => { wcInFlight = null; });
    }
    const payload = await wcInFlight;
    // Fresh success → hold for the full near-real-time window.
    // Stale fallback → memoize briefly so an upstream outage doesn't re-trigger a
    // fresh upstream fetch on every request (credit-safe backoff); we re-probe
    // once the short window lapses.
    wcMemCache = {
      payload,
      expiresAt: Date.now() + (payload.stale ? WC_STALE_BACKOFF_MS : WC_FRESH_TTL_MS),
    };
    res.json(payload);
  } catch (err) {
    logger.warn({ err }, "WC odds: build failed");
    const fallback: WcPayload = wcMemCache
      ? { ...wcMemCache.payload, stale: true }
      : { events: [], scores: [], updatedAt: new Date().toISOString(), stale: true };
    // Brief backoff so a hard failure doesn't rebuild (and re-hit upstream/DB) on every request.
    wcMemCache = { payload: fallback, expiresAt: Date.now() + WC_STALE_BACKOFF_MS };
    res.json(fallback);
  }
});

// ─── GET /odds/margin — read current global margin % ─────────────────────────
// Must be registered BEFORE /odds/:sport or "margin" is treated as a sport key.
router.get("/odds/margin", async (_req, res): Promise<void> => {
  try {
    const margin = await getGlobalMarginPct();
    res.json({ margin });
  } catch {
    res.status(500).json({ error: "Failed to read margin setting" });
  }
});

// ─── POST /odds/margin — update global margin % (admin convenience) ───────────
router.post("/odds/margin", async (req, res): Promise<void> => {
  const val = parseFloat(req.body?.margin ?? req.body?.value ?? "");
  if (isNaN(val) || val < 0 || val > 100) {
    res.status(400).json({ error: "margin must be a number between 0 and 100" });
    return;
  }
  try {
    await db.execute(sql`
      INSERT INTO platform_settings (key, value)
      VALUES ('global_margin_pct', ${String(val)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
    res.json({ margin: val, updated: true });
  } catch {
    res.status(500).json({ error: "Failed to update margin setting" });
  }
});

// ─── GET /odds/multiplier — per-sport multipliers summary ─────────────────────
// Must be registered BEFORE /odds/:sport or "multiplier" is treated as a sport key.
router.get("/odds/multiplier", async (_req, res): Promise<void> => {
  try {
    const controls = await db.select().from(sportControlsTable);
    const multipliers = controls.map(c => ({
      sportKey:   c.sportKey,
      multiplier: parseFloat(c.oddsMultiplier),
    }));
    res.json({ multipliers });
  } catch {
    res.status(500).json({ error: "Failed to read multiplier settings" });
  }
});

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

  // ── Cache miss — fetch from Odds API (deduplicated) ──────────────────────
  try {
    // Reuse an already in-flight fetch for this sport to avoid burst 429s
    if (!inFlight.has(sport)) {
      const promise = (async (): Promise<unknown[]> => {
        const extraMarkets = getExtraMarkets(sport);
        const result = await fetchOddsFromApi(sport, extraMarkets);
        if ('quota' in result) {
          return [{ __err: 429, __body: { error: "Odds API quota exhausted" } }] as unknown[];
        }
        if ('fetchError' in result) {
          return [{ __err: 502, __body: { error: "Failed to fetch odds from upstream" } }] as unknown[];
        }
        await setDbCachedOdds(sport, result.data);
        await upsertSportControl(sport, formatLeagueName(sport));
        return result.data;
      })();
      inFlight.set(sport, promise);
      promise.finally(() => inFlight.delete(sport));
    }

    const result = await inFlight.get(sport)!;

    // Check for error sentinel
    if (result.length === 1 && typeof result[0] === 'object' && result[0] !== null && '__err' in (result[0] as object)) {
      const { __err, __body } = result[0] as { __err: number; __body: unknown };
      res.status(__err).json(__body);
      return;
    }

    const adjusted = applyMultiplier(applyMargin(result, effectiveMargin), multiplier);
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
    if (!response.ok) {
      recordApiCall("odds_api", false, `HTTP ${response.status}`, `sports/list → HTTP ${response.status}`);
      res.status(502).json({ error: "Failed to fetch sports" });
      return;
    }
    const data = await response.json();
    recordApiCall("odds_api", true, "ok");
    liveCache.set("sports_list", { data, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    res.json({ data, cached: false });
  } catch {
    recordApiCall("odds_api", false, "network", "sports/list → network/timeout");
    res.status(500).json({ error: "Failed to fetch sports" });
  }
});

// ─── GET /live/events — reads from DB cache only (zero direct Odds API calls) ──
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
    const now          = new Date().toISOString();

    // Read all cached sport data from DB — no Odds API calls at all
    const dbResult = await db.execute(sql`
      SELECT sport_key, data FROM odds_cache WHERE expires_at > NOW()
    `);

    const events: Record<string, unknown>[] = [];

    for (const row of dbResult.rows) {
      const sportKey = row.sport_key as string;
      const ctrl     = controlMap.get(sportKey);
      if (ctrl && (!ctrl.isEnabled || ctrl.isSuspended)) continue;

      const data = Array.isArray(row.data) ? (row.data as Record<string, unknown>[]) : [];

      const liveEvents = data.filter(ev =>
        typeof ev.commence_time === "string" &&
        ev.commence_time < now &&
        Array.isArray(ev.bookmakers) &&
        (ev.bookmakers as unknown[]).length > 0
      );

      if (liveEvents.length === 0) continue;

      const effectiveMargin = ctrl?.marginOverride && parseFloat(ctrl.marginOverride) > 0
        ? Math.max(0, parseFloat(ctrl.marginOverride)) : globalMargin;
      const multiplier = ctrl ? parseFloat(ctrl.oddsMultiplier) : 1;

      const adjusted = applyMultiplier(applyMargin(liveEvents, effectiveMargin), multiplier);
      (adjusted as Record<string, unknown>[]).forEach(ev =>
        events.push({ ...ev, sport_key: sportKey })
      );
    }

    const payload = { events, count: events.length, cached: true };
    liveCache.set(cacheKey, { data: payload, expiresAt: Date.now() + LIVE_CACHE_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live events" });
  }
});

// ─── GET /live/scores ─────────────────────────────────────────────────────────
// Per-sport DB cache with 10-minute TTL (persists across server restarts).
// 30-second in-memory short-circuit avoids DB round-trips on every request.
// Each sport is fetched independently — only expired entries hit the Odds API.
// This cuts score API calls from ~1,100/hour (old 3-min fan-out) to ~6/hour per sport.
const LIVE_SCORES_DB_TTL_MIN = 10;    // 10-minute DB cache per sport
const LIVE_SCORES_MEM_TTL    = 30 * 1000; // 30-second in-memory short-circuit

router.get("/live/scores", async (_req, res): Promise<void> => {
  if (!ODDS_API_KEY) {
    res.status(503).json({ error: "Odds API not configured" }); return;
  }

  // 30-second in-memory short-circuit — serves all users hitting the endpoint within
  // the same 30-second window without any DB or API traffic.
  const memKey = "live_scores";
  const memHit = liveCache.get(memKey);
  if (memHit && memHit.expiresAt > Date.now()) {
    res.json(memHit.data); return;
  }

  try {
    const activeSports = await getActiveLiveSports();

    // Per-sport: check DB cache first; only call Odds API for expired entries.
    const sportResults = await Promise.allSettled(
      activeSports.map(async (sportKey): Promise<Record<string, unknown>[]> => {
        const dbKey = `scores:${sportKey}`;

        // DB cache hit — no API call needed
        const dbHit = await getDbCachedOdds(dbKey);
        if (dbHit !== null) return dbHit as Record<string, unknown>[];

        // DB cache miss — fetch from Odds API
        const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=1&dateFormat=iso`;
        let response: Response;
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        } catch {
          recordApiCall("odds_api", false, "network", `scores ${sportKey} → network/timeout`);
          await setDbCachedOdds(dbKey, [], LIVE_SCORES_DB_TTL_MIN);
          return [];
        }

        // Log credit usage from scores calls too
        const remaining = Number(response.headers.get('x-requests-remaining') ?? -1);
        if (remaining >= 0 && remaining < 200) {
          logger.warn({ sportKey, remaining }, 'Odds API (scores): credits running low');
        }

        if (!response.ok) {
          recordApiCall("odds_api", false, `HTTP ${response.status}`, `scores ${sportKey} → HTTP ${response.status}`);
          // Cache empty array so we don't re-hit this sport next request
          await setDbCachedOdds(dbKey, [], LIVE_SCORES_DB_TTL_MIN);
          return [];
        }

        const raw = (await response.json()) as Record<string, unknown>[];
        recordApiCall("odds_api", true, "ok");
        if (!Array.isArray(raw)) {
          await setDbCachedOdds(dbKey, [], LIVE_SCORES_DB_TTL_MIN);
          return [];
        }

        const liveScores = raw
          .filter(ev => !ev.completed && Array.isArray(ev.scores) && (ev.scores as unknown[]).length > 0)
          .map(ev => ({ ...ev, sport_key: sportKey }));

        // Cache filtered results in DB — persists across restarts
        await setDbCachedOdds(dbKey, liveScores, LIVE_SCORES_DB_TTL_MIN);
        return liveScores;
      })
    );

    const scores: Record<string, unknown>[] = [];
    for (const result of sportResults) {
      if (result.status === "fulfilled") scores.push(...result.value);
    }

    const payload = { scores, count: scores.length, cached: true };
    // Short-circuit in-memory cache so concurrent requests don't all hit DB
    liveCache.set(memKey, { data: payload, expiresAt: Date.now() + LIVE_SCORES_MEM_TTL });
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Failed to fetch live scores" });
  }
});

export default router;
