/**
 * MATCH & MARKET DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Mock match data has been removed. All match/odds data now comes exclusively
 * from The Odds API via the API server cache (useOddsData / useLiveOdds).
 *
 * API_HOOK (primary): GET /api/matches?sportId=...&date=...&status=...
 * API_HOOK (markets): GET /api/matches/:matchId/markets
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MatchEntity, MarketEntity } from './types';

export const ALL_MATCHES: MatchEntity[] = [];
export const ALL_MARKETS: MarketEntity[] = [];
