/**
 * BetsAPI routes
 *
 * GET /betsapi/all                    — all upcoming sports from DB betsapi_cache (primary)
 * GET /betsapi/upcoming               — alias for /betsapi/all (backwards compat)
 * GET /betsapi/live                   — live inplay events (DB cache, 30 s TTL)
 * GET /betsapi/markets/:fixtureId     — rich market flags for a specific fixture (cache-only, 0 extra credits)
 */
import { Router } from 'express';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { captureBetsApiNames } from '../lib/translationQueue.js';
import {
  BETSAPI_KEY,
  BETSAPI_SPORT_IDS,
  BETSAPI_SPORT_MAP,
  fetchBetsApiInplay,
  fetchPrematchData,
  type BetsApiEventRaw,
} from '../lib/betsapi.js';

const router = Router();

// ─── Shared cache reader ──────────────────────────────────────────────────────

async function readUpcomingCache(): Promise<{
  sports:          Record<string, BetsApiEventRaw[]>;
  sportMeta:       Record<string, typeof BETSAPI_SPORT_MAP[number]>;
  countBySportId:  Record<string, number>;
  updatedAt:       string | null;
  stale:           boolean;
}> {
  // Fetch ALL rows (fresh + expired) so we can fall back to stale data when the
  // cron hasn't been able to refresh yet (credits exhausted, key error, etc.).
  const result = await db.execute(sql`
    SELECT cache_key, data, fetched_at, (expires_at <= NOW()) AS is_stale
    FROM betsapi_cache
  `);

  const sports: Record<string, BetsApiEventRaw[]> = {};
  let latestFetchedAt: Date | null = null;
  let hasStaleData = false;

  for (const row of result.rows) {
    const key  = row.cache_key as string;
    if (key === 'live') continue;  // skip live cache row
    const data = Array.isArray(row.data) ? (row.data as BetsApiEventRaw[]) : [];
    // Only include non-empty rows — preserves the "genuinely no events" case
    // where an empty [] was intentionally written for off-season sports.
    if (data.length > 0 || !(row.is_stale as boolean)) {
      sports[key] = data;
    }
    if (data.length > 0 && (row.is_stale as boolean)) {
      hasStaleData = true;
    }
    const fetchedAt = row.fetched_at ? new Date(row.fetched_at as string) : null;
    if (fetchedAt && (!latestFetchedAt || fetchedAt > latestFetchedAt)) {
      latestFetchedAt = fetchedAt;
    }
  }

  const sportMeta: Record<string, typeof BETSAPI_SPORT_MAP[number]> = {};
  for (const id of BETSAPI_SPORT_IDS) {
    const meta = BETSAPI_SPORT_MAP[id];
    if (meta) sportMeta[String(id)] = meta;
  }

  // countBySportId: total raw event count per sport_id (including countOnly sports)
  const countBySportId: Record<string, number> = {};
  for (const [key, events] of Object.entries(sports)) {
    countBySportId[key] = events.length;
  }

  return { sports, sportMeta, countBySportId, updatedAt: latestFetchedAt?.toISOString() ?? null, stale: hasStaleData };
}

// ─── GET /betsapi/all — primary endpoint ─────────────────────────────────────

router.get('/betsapi/all', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }
  try {
    const { sports, sportMeta, countBySportId, updatedAt, stale } = await readUpcomingCache();
    res.json({ sports, sportMeta, countBySportId, updatedAt, cached: true, stale, sportCount: Object.keys(sports).length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to read upcoming cache');
    res.status(500).json({ error: 'Failed to fetch BetsAPI data' });
  }
});

// ─── GET /homepage/matches — cache-only homepage feed (Task #243) ────────────
// Serves ONLY cached prematch matches (never an on-request BetsAPI call), with a
// 30-minute time-seeded shuffle applied to each sport's ordering and already-started
// matches removed. The homepage points here instead of /betsapi/all.

const SHUFFLE_WINDOW_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.HOMEPAGE_SHUFFLE_WINDOW_MS) || 30 * 60 * 1000,
); // default 30 min

// Cumulative count of homepage requests served entirely from cache. Each one is a
// batch of upstream calls (≈ one per sport) that we avoided by serving the cache.
let homepageCacheServes = 0;

/** Deterministic PRNG (mulberry32) — same seed ⇒ same sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates shuffle driven by a seeded PRNG (pure for a given seed). */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

router.get('/homepage/matches', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }
  try {
    const { sports, sportMeta, countBySportId, updatedAt, stale } = await readUpcomingCache();

    // 30-minute shuffle window: the seed is stable within a window and changes each
    // window, so ordering rotates ~every 30 min with zero upstream calls.
    const windowIndex = Math.floor(Date.now() / SHUFFLE_WINDOW_MS);
    const nowSec = Math.floor(Date.now() / 1000);

    const shuffledSports: Record<string, BetsApiEventRaw[]> = {};
    let totalMatches = 0;
    let droppedStarted = 0;
    for (const [sportId, events] of Object.entries(sports)) {
      // Never re-surface matches that have already kicked off.
      const upcoming = events.filter(ev => {
        const ts = parseInt(ev.time, 10);
        if (Number.isNaN(ts)) return true; // keep entries without a parseable start time
        if (ts <= nowSec) { droppedStarted++; return false; }
        return true;
      });
      // Per-sport seed mixes the window with the sport id so sports rotate independently.
      const seed = (windowIndex * 2654435761) ^ Number(sportId);
      shuffledSports[sportId] = seededShuffle(upcoming, seed >>> 0);
      totalMatches += shuffledSports[sportId].length;
    }

    const recountBySportId: Record<string, number> = {};
    for (const [key, events] of Object.entries(shuffledSports)) {
      recountBySportId[key] = events.length;
    }

    homepageCacheServes++;
    const cacheAgeMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : null;

    logger.info(
      {
        windowIndex,
        shuffleWindowMs: SHUFFLE_WINDOW_MS,
        totalMatches,
        droppedStarted,
        cacheAgeMs,
        stale,
        callsSaved: homepageCacheServes,
      },
      'BetsAPI homepage: served from cache (0 upstream calls)',
    );

    res.json({
      sports: shuffledSports,
      sportMeta,
      countBySportId: Object.keys(recountBySportId).length ? recountBySportId : countBySportId,
      updatedAt,
      cached: true,
      stale,
      sportCount: Object.keys(shuffledSports).length,
      meta: {
        shuffleWindowMs: SHUFFLE_WINDOW_MS,
        windowIndex,
        cacheAgeMs,
        totalMatches,
        droppedStarted,
        callsSaved: homepageCacheServes,
      },
    });
  } catch (err) {
    logger.error({ err }, 'BetsAPI homepage: failed to read cache');
    res.status(500).json({ error: 'Failed to fetch homepage matches' });
  }
});

// ─── GET /betsapi/upcoming — alias for backwards compatibility ────────────────

router.get('/betsapi/upcoming', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }
  try {
    const { sports, sportMeta, countBySportId, updatedAt, stale } = await readUpcomingCache();
    res.json({ sports, sportMeta, countBySportId, updatedAt, cached: true, stale, sportCount: Object.keys(sports).length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to read upcoming cache');
    res.status(500).json({ error: 'Failed to fetch BetsAPI upcoming' });
  }
});

// ─── GET /betsapi/live — inplay events (DB-backed, 3 min TTL) ────────────────

const LIVE_CACHE_KEY = 'live';
// Bet-scoped live refresh (Task #243): live odds are only polled for fixtures with
// an active user bet, so the refresh cadence can be much slower. Env-overridable so
// the live host can tune without a code change. Default 35 min.
const LIVE_TTL_SECS  = Math.max(
  60,
  Number(process.env.BETSAPI_LIVE_TTL_SECS) || 35 * 60,
);
// If the upstream refresh takes longer than this, serve the last-known (stale)
// cache instead of blocking the request. The refresh keeps running in the
// background and populates the cache for the next caller.
const LIVE_FETCH_TIMEOUT_MS = 9_000;
const LIVE_TIMEOUT = Symbol('live-fetch-timeout');

// Singleflight guard: coalesce concurrent cache-miss refreshes into a single
// upstream fetch so we don't stampede BetsAPI (and burn credits) when the
// 30 s cache expires while several clients are polling at once.
let liveFetchInFlight: Promise<BetsApiEventRaw[]> | null = null;

/**
 * Build the set of BetsAPI fixture ids (numeric, prefix stripped) that currently
 * have at least one OPEN user bet selection. Used to bet-scope the live refresh so
 * no credits are spent polling live odds for matches nobody has wagered on.
 */
async function readActiveBetFixtureIds(): Promise<Set<string>> {
  const rows = await db.execute(sql`
    SELECT DISTINCT event_id
    FROM bet_selections
    WHERE status = 'open' AND event_id LIKE 'betsapi_%'
  `);
  const ids = new Set<string>();
  for (const row of rows.rows) {
    const eventId = row.event_id as string | null;
    if (eventId) ids.add(eventId.replace(/^betsapi_/, ''));
  }
  return ids;
}

/**
 * Resolve which BetsAPI sport ids the given fixtures belong to by scanning the
 * cache rows (prematch sport rows + the live row). Lets the live poll fan out
 * only to the sports that actually have an active bet (Task #243). Returns an
 * empty set when none resolve, in which case the caller polls all live sports.
 */
async function readSportIdsForFixtures(fixtureIds: Set<string>): Promise<Set<number>> {
  const sportIds = new Set<number>();
  if (fixtureIds.size === 0) return sportIds;
  const rows = await db.execute(sql`SELECT data FROM betsapi_cache`);
  for (const row of rows.rows) {
    if (!Array.isArray(row.data)) continue;
    for (const ev of row.data as BetsApiEventRaw[]) {
      if (fixtureIds.has(String(ev.id))) {
        const sid = Number(ev.sport_id);
        if (Number.isFinite(sid)) sportIds.add(sid);
      }
    }
  }
  return sportIds;
}

async function refreshLiveCache(): Promise<BetsApiEventRaw[]> {
  // Bet-scoped (Task #243): only poll live odds for fixtures with an active bet.
  // Empty set ⇒ fetchBetsApiInplay short-circuits with zero upstream calls.
  const allowedIds = await readActiveBetFixtureIds();
  if (allowedIds.size === 0) {
    logger.info('BetsAPI live: no active-bet fixtures — skipping upstream poll (0 credits)');
  } else {
    logger.info({ activeBetFixtures: allowedIds.size }, 'BetsAPI live: bet-scoped refresh');
  }
  // Constrain the per-sport inplay fan-out to only the sports with active bets.
  const allowedSportIds = await readSportIdsForFixtures(allowedIds);
  const events = await fetchBetsApiInplay(allowedIds, allowedSportIds);

  const enriched = events.map(ev => ({
    ...ev,
    _meta: BETSAPI_SPORT_MAP[Number(ev.sport_id)] ?? null,
  }));

  await db.execute(sql`
    INSERT INTO betsapi_cache (cache_key, data, fetched_at, expires_at)
    VALUES (
      ${LIVE_CACHE_KEY},
      ${JSON.stringify(enriched)}::jsonb,
      NOW(),
      NOW() + INTERVAL '${sql.raw(String(LIVE_TTL_SECS))} seconds'
    )
    ON CONFLICT (cache_key) DO UPDATE
      SET data       = EXCLUDED.data,
          fetched_at = EXCLUDED.fetched_at,
          expires_at = EXCLUDED.expires_at
  `);

  // Capture any new team/league names into the translation queue (non-blocking).
  captureBetsApiNames(enriched);

  return enriched;
}

function getLiveEventsSingleflight(): Promise<BetsApiEventRaw[]> {
  if (liveFetchInFlight) return liveFetchInFlight;
  liveFetchInFlight = refreshLiveCache().finally(() => {
    liveFetchInFlight = null;
  });
  return liveFetchInFlight;
}

// Last-known live cache, ignoring the TTL — used as a fast fallback when the
// fresh upstream fetch is slow or fails.
async function readStaleLive(): Promise<BetsApiEventRaw[] | null> {
  const stale = await db.execute(sql`
    SELECT data FROM betsapi_cache WHERE cache_key = ${LIVE_CACHE_KEY} LIMIT 1
  `);
  if (stale.rows.length > 0 && Array.isArray(stale.rows[0].data)) {
    return stale.rows[0].data as BetsApiEventRaw[];
  }
  return null;
}

router.get('/betsapi/live', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  try {
    // Fresh cache hit — fast path.
    const cached = await db.execute(sql`
      SELECT data FROM betsapi_cache
      WHERE cache_key = ${LIVE_CACHE_KEY} AND expires_at > NOW()
      LIMIT 1
    `);

    if (cached.rows.length > 0) {
      const data = cached.rows[0].data as BetsApiEventRaw[];
      res.json({ events: Array.isArray(data) ? data : [], cached: true, count: Array.isArray(data) ? data.length : 0 });
      return;
    }

    // Cache expired. Stale-while-revalidate: if we have last-known data, serve
    // it immediately and refresh in the background. Concurrent callers share
    // one upstream fetch (singleflight), so the cache stays warm without
    // stampeding BetsAPI or making anyone wait on a slow upstream.
    const stale = await readStaleLive();
    if (stale) {
      void getLiveEventsSingleflight().catch((err) => {
        logger.error({ err }, 'BetsAPI: background live refresh failed');
      });
      res.json({ events: stale, cached: true, stale: true, count: stale.length });
      return;
    }

    // Cold start — no data at all. Refresh, but race a timeout so a slow
    // upstream can't hang the request indefinitely.
    const fetchPromise = getLiveEventsSingleflight();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<typeof LIVE_TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(LIVE_TIMEOUT), LIVE_FETCH_TIMEOUT_MS);
    });

    let winner: BetsApiEventRaw[] | typeof LIVE_TIMEOUT;
    try {
      winner = await Promise.race([fetchPromise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (winner === LIVE_TIMEOUT) {
      // Still nothing to serve and upstream is slow — return empty rather than
      // blocking; the background refresh continues for the next caller.
      void fetchPromise.catch((err) => {
        logger.error({ err }, 'BetsAPI: background live refresh failed');
      });
      res.json({ events: [], cached: false, count: 0 });
      return;
    }

    const events = winner;
    res.json({ events, cached: false, count: events.length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to fetch/cache inplay');
    // Last resort: serve stale cache rather than erroring out the UI.
    try {
      const stale = await readStaleLive();
      if (stale) {
        res.json({ events: stale, cached: true, stale: true, count: stale.length });
        return;
      }
    } catch {
      // ignore — fall through to error response
    }
    res.status(500).json({ error: 'Failed to fetch live events' });
  }
});

// ─── GET /betsapi/markets/:fixtureId — rich market flags from cache ───────────
// Returns the BetsApiRichMarkets object stored on the event during cron enrichment.
// Cache-only — no extra API credits consumed. Returns 404 if event not cached.

router.get('/betsapi/markets/:fixtureId', async (req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  const { fixtureId } = req.params;
  if (!fixtureId || !/^\d+$/.test(fixtureId)) {
    res.status(400).json({ error: 'Invalid fixtureId' });
    return;
  }

  try {
    // Search all sport cache keys for the event
    const rows = await db.execute(sql`
      SELECT data FROM betsapi_cache WHERE expires_at > NOW()
    `);

    for (const row of rows.rows) {
      if (!Array.isArray(row.data)) continue;
      const events = row.data as BetsApiEventRaw[];
      const ev = events.find(e => String(e.id) === fixtureId);
      if (ev) {
        res.json({
          fixtureId,
          richMarkets:   ev.richMarkets   ?? null,
          prematchOdds:  ev.prematchOdds  ?? null,
          home:          ev.home.name,
          away:          ev.away.name,
          commenceTime:  ev.time,
          cached:        true,
        });
        return;
      }
    }

    res.status(404).json({ error: 'Fixture not found in cache', fixtureId });
  } catch (err) {
    logger.error({ err, fixtureId }, 'BetsAPI markets: failed to read cache');
    res.status(500).json({ error: 'Failed to look up fixture markets' });
  }
});

// ─── GET /betsapi/refresh/:fixtureId — on-demand single-match refresh ─────────
// Used by the match detail page. Returns the cached fixture immediately when it
// already has odds; otherwise fetches fresh data for THAT ONE fixture (through
// reserveBetsApiCredit) and writes it back into its sport's cache row. Never
// triggers a global refresh.

router.get('/betsapi/refresh/:fixtureId', async (req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  const { fixtureId } = req.params;
  if (!fixtureId || !/^\d+$/.test(fixtureId)) {
    res.status(400).json({ error: 'Invalid fixtureId' });
    return;
  }

  try {
    // Locate the fixture and its owning sport cache row (search all rows incl. stale).
    const rows = await db.execute(sql`SELECT cache_key, data FROM betsapi_cache`);
    let ownerKey: string | null = null;
    let ownerEvents: BetsApiEventRaw[] | null = null;
    let target: BetsApiEventRaw | null = null;

    for (const row of rows.rows) {
      const key = row.cache_key as string;
      if (key === 'live') continue;
      if (!Array.isArray(row.data)) continue;
      const events = row.data as BetsApiEventRaw[];
      const ev = events.find(e => String(e.id) === fixtureId);
      if (ev) { ownerKey = key; ownerEvents = events; target = ev; break; }
    }

    // Already fully enriched (odds AND rich markets) → serve as-is, no upstream
    // call. We intentionally do NOT short-circuit on odds alone: the frontend
    // opens this endpoint precisely when rich markets are missing, so returning
    // early on odds-only would defeat the on-demand enrichment (Task #243).
    if (target && target.prematchOdds && target.richMarkets && target.richMarkets.marketScore > 0) {
      res.json({
        fixtureId,
        richMarkets:  target.richMarkets  ?? null,
        prematchOdds: target.prematchOdds ?? null,
        home:         target.home.name,
        away:         target.away.name,
        commenceTime: target.time,
        cached:       true,
        refreshed:    false,
      });
      return;
    }

    if (!target || !ownerKey || !ownerEvents) {
      res.status(404).json({ error: 'Fixture not found in cache', fixtureId });
      return;
    }

    // Cache miss on odds → refresh just this one fixture (credit-limited upstream).
    const meta = BETSAPI_SPORT_MAP[Number(target.sport_id)];
    const hasDraw = meta?.hasDraw ?? false;
    const { odds, richMarkets } = await fetchPrematchData(fixtureId, hasDraw);

    if (odds) target.prematchOdds = odds;
    if (richMarkets.marketScore > 0) target.richMarkets = richMarkets;

    if (odds || richMarkets.marketScore > 0) {
      // Persist the enriched fixture back into its sport row (preserve TTL/expiry).
      // Re-read the row fresh and merge ONLY this fixture so a concurrent cron
      // refresh that landed between our initial read and now is not clobbered.
      const fresh = await db.execute(sql`
        SELECT data FROM betsapi_cache WHERE cache_key = ${ownerKey}
      `);
      const freshEvents = Array.isArray(fresh.rows[0]?.data)
        ? (fresh.rows[0].data as BetsApiEventRaw[])
        : ownerEvents;
      const idx = freshEvents.findIndex(e => String(e.id) === fixtureId);
      if (idx >= 0) {
        if (odds) freshEvents[idx].prematchOdds = odds;
        if (richMarkets.marketScore > 0) freshEvents[idx].richMarkets = richMarkets;
      } else {
        // Fixture no longer in the fresh row (e.g. expired/rotated) — re-add it.
        freshEvents.push(target);
      }
      await db.execute(sql`
        UPDATE betsapi_cache
        SET data = ${JSON.stringify(freshEvents)}::jsonb
        WHERE cache_key = ${ownerKey}
      `);
      logger.info({ fixtureId, ownerKey }, 'BetsAPI refresh: single-match enriched on demand');
    } else {
      logger.info({ fixtureId }, 'BetsAPI refresh: no fresh odds available for fixture');
    }

    res.json({
      fixtureId,
      richMarkets:  target.richMarkets  ?? null,
      prematchOdds: target.prematchOdds ?? null,
      home:         target.home.name,
      away:         target.away.name,
      commenceTime: target.time,
      cached:       false,
      refreshed:    Boolean(odds || richMarkets.marketScore > 0),
    });
  } catch (err) {
    logger.error({ err, fixtureId }, 'BetsAPI refresh: failed to refresh fixture');
    res.status(500).json({ error: 'Failed to refresh fixture' });
  }
});

export { router as betsapiRouter };
