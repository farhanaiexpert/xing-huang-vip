/**
 * BetsAPI routes
 *
 * GET /betsapi/all       — all upcoming sports from DB betsapi_cache (primary)
 * GET /betsapi/upcoming  — alias for /betsapi/all (backwards compat)
 * GET /betsapi/live      — live inplay events (DB cache, 30 s TTL)
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

router.get('/betsapi/live', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  try {
    // Check DB cache first
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

    // Fetch fresh live data
    const events = await fetchBetsApiInplay();

    const enriched = events.map(ev => ({
      ...ev,
      _meta: BETSAPI_SPORT_MAP[Number(ev.sport_id)] ?? null,
    }));

    // Persist to DB with 30 s TTL
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

    res.json({ events: enriched, cached: false, count: enriched.length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to fetch/cache inplay');
    res.status(500).json({ error: 'Failed to fetch live events' });
  }
});

export { router as betsapiRouter };
