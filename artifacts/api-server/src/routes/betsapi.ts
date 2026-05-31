/**
 * BetsAPI routes
 *
 * GET /betsapi/upcoming  — returns all sports from DB betsapi_cache
 * GET /betsapi/live      — returns live inplay events (30 s in-memory cache)
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

// ─── In-memory live cache (30 s TTL) ─────────────────────────────────────────
let liveCache: { data: BetsApiEventRaw[]; expiresAt: number } | null = null;
const LIVE_TTL_MS = 30 * 1_000;

// ─── GET /betsapi/upcoming — bulk read from DB cache ─────────────────────────
router.get('/betsapi/upcoming', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  try {
    const result = await db.execute(sql`
      SELECT cache_key, data FROM betsapi_cache WHERE expires_at > NOW()
    `);

    const sports: Record<string, BetsApiEventRaw[]> = {};
    for (const row of result.rows) {
      const key  = row.cache_key as string;
      const data = Array.isArray(row.data) ? (row.data as BetsApiEventRaw[]) : [];
      sports[key] = data;
    }

    // Attach sport meta for client normalisation
    const sportMeta: Record<string, { name: string; sportId: string; hasDraw: boolean; fallbackOdds: { home: number; draw?: number; away: number } }> = {};
    for (const id of BETSAPI_SPORT_IDS) {
      const meta = BETSAPI_SPORT_MAP[id];
      if (meta) sportMeta[String(id)] = meta;
    }

    res.json({ sports, sportMeta, cached: true, sportCount: Object.keys(sports).length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to read upcoming cache');
    res.status(500).json({ error: 'Failed to fetch BetsAPI upcoming' });
  }
});

// ─── GET /betsapi/live — inplay events ────────────────────────────────────────
router.get('/betsapi/live', async (_req, res): Promise<void> => {
  if (!BETSAPI_KEY) {
    res.status(503).json({ error: 'BetsAPI not configured' });
    return;
  }

  const now = Date.now();
  if (liveCache && liveCache.expiresAt > now) {
    res.json({ events: liveCache.data, cached: true, count: liveCache.data.length });
    return;
  }

  try {
    const events = await fetchBetsApiInplay();

    // Attach sport meta to each event for easy client normalisation
    const enriched = events.map(ev => ({
      ...ev,
      _meta: BETSAPI_SPORT_MAP[Number(ev.sport_id)] ?? null,
    }));

    liveCache = { data: enriched as BetsApiEventRaw[], expiresAt: now + LIVE_TTL_MS };
    res.json({ events: enriched, cached: false, count: enriched.length });
  } catch (err) {
    logger.error({ err }, 'BetsAPI: failed to fetch inplay');
    res.status(500).json({ error: 'Failed to fetch live events' });
  }
});

export { router as betsapiRouter };
