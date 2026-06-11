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
import {
  BETSAPI_KEY,
  BETSAPI_SPORT_IDS,
  BETSAPI_SPORT_MAP,
  fetchBetsApiInplay,
  type BetsApiEventRaw,
} from '../lib/betsapi.js';

const router = Router();

// ─── Shared cache reader ──────────────────────────────────────────────────────

async function readUpcomingCache(): Promise<{
  sports:          Record<string, BetsApiEventRaw[]>;
  sportMeta:       Record<string, typeof BETSAPI_SPORT_MAP[number]>;
  countBySportId:  Record<string, number>;
  updatedAt:       string | null;
}> {
  const result = await db.execute(sql`
    SELECT cache_key, data, fetched_at FROM betsapi_cache WHERE expires_at > NOW()
  `);

  const sports: Record<string, BetsApiEventRaw[]> = {};
  let latestFetchedAt: Date | null = null;

  for (const row of result.rows) {
    const key  = row.cache_key as string;
    if (key === 'live') continue;  // skip live cache row
    const data = Array.isArray(row.data) ? (row.data as BetsApiEventRaw[]) : [];
    sports[key] = data;
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

  return { sports, sportMeta, countBySportId, updatedAt: latestFetchedAt?.toISOString() ?? null };
}

// ─── GET /betsapi/all — primary endpoint ─────────────────────────────────────

router.get('/betsapi/all', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }
  try {
    const { sports, sportMeta, countBySportId, updatedAt } = await readUpcomingCache();
    res.json({ sports, sportMeta, countBySportId, updatedAt, cached: true, sportCount: Object.keys(sports).length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to read upcoming cache');
    res.status(500).json({ error: 'Failed to fetch BetsAPI data' });
  }
});

// ─── GET /betsapi/upcoming — alias for backwards compatibility ────────────────

router.get('/betsapi/upcoming', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }
  try {
    const { sports, sportMeta, countBySportId, updatedAt } = await readUpcomingCache();
    res.json({ sports, sportMeta, countBySportId, updatedAt, cached: true, sportCount: Object.keys(sports).length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to read upcoming cache');
    res.status(500).json({ error: 'Failed to fetch BetsAPI upcoming' });
  }
});

// ─── GET /betsapi/live — inplay events (DB-backed, 30 s TTL) ─────────────────

const LIVE_CACHE_KEY = 'live';
const LIVE_TTL_SECS  = 30;
// If the upstream refresh takes longer than this, serve the last-known (stale)
// cache instead of blocking the request. The refresh keeps running in the
// background and populates the cache for the next caller.
const LIVE_FETCH_TIMEOUT_MS = 9_000;
const LIVE_TIMEOUT = Symbol('live-fetch-timeout');

// Singleflight guard: coalesce concurrent cache-miss refreshes into a single
// upstream fetch so we don't stampede BetsAPI (and burn credits) when the
// 30 s cache expires while several clients are polling at once.
let liveFetchInFlight: Promise<BetsApiEventRaw[]> | null = null;

async function refreshLiveCache(): Promise<BetsApiEventRaw[]> {
  const events = await fetchBetsApiInplay();

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

export { router as betsapiRouter };
