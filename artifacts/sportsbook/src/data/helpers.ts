/**
 * DATA HELPER FUNCTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure functions over the data layer. No side effects, fully testable.
 * These are the primary interface between components and the data layer.
 *
 * When replacing mock data with API calls, swap these function bodies to call
 * fetch/axios/react-query without changing any call sites in components.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { SPORTS_CATALOG, LEAGUES_CATALOG } from './catalog';
import { ALL_MATCHES, ALL_MARKETS }        from './matches';
import { FEATURED_PROMOS }                 from './featured';

import type {
  SportEntity, LeagueEntity, MatchEntity,
  MarketEntity, SelectionEntity, FeaturedPromoEntity, DateTag,
} from './types';

// ── Sports ────────────────────────────────────────────────────────────────────

/**
 * Returns all active sports, sorted by sortOrder.
 * API_HOOK: GET /api/catalog/sports?status=active
 */
export function getSports(): SportEntity[] {
  return SPORTS_CATALOG.filter(s => s.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Returns only sports flagged as popular (sidebar "Most Used").
 */
export function getPopularSports(): SportEntity[] {
  return getSports().filter(s => s.isPopular);
}

/**
 * Look up a single sport by its ID.
 */
export function getSportById(sportId: string): SportEntity | undefined {
  return SPORTS_CATALOG.find(s => s.id === sportId);
}

// ── Leagues ───────────────────────────────────────────────────────────────────

/**
 * Returns all active leagues for a sport, sorted by priority.
 * API_HOOK: GET /api/catalog/leagues?sportId=...&isActive=true
 */
export function getLeaguesBySport(sportId: string): LeagueEntity[] {
  return LEAGUES_CATALOG
    .filter(l => l.sportId === sportId && l.isActive)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Returns all active leagues marked as featured.
 */
export function getFeaturedLeagues(): LeagueEntity[] {
  return LEAGUES_CATALOG.filter(l => l.isFeatured && l.isActive);
}

/**
 * Look up a single league by its ID.
 */
export function getLeagueById(leagueId: string): LeagueEntity | undefined {
  return LEAGUES_CATALOG.find(l => l.id === leagueId);
}

// ── Matches ───────────────────────────────────────────────────────────────────

/**
 * Returns all matches for a sport.
 * API_HOOK: GET /api/matches?sportId=...
 */
export function getMatchesBySport(sportId: string): MatchEntity[] {
  return ALL_MATCHES.filter(m => m.sportId === sportId);
}

/**
 * Returns all matches for a specific league.
 * API_HOOK: GET /api/matches?leagueId=...
 */
export function getMatchesByLeague(leagueId: string): MatchEntity[] {
  return ALL_MATCHES.filter(m => m.leagueId === leagueId);
}

/**
 * Returns all matches for a date bucket.
 * API_HOOK: GET /api/matches?date=today|tomorrow|upcoming
 */
export function getMatchesByDate(dateTag: DateTag): MatchEntity[] {
  return ALL_MATCHES.filter(m => m.dateTag === dateTag);
}

/**
 * Returns all currently live matches.
 * API_HOOK: GET /api/matches?status=live (or WebSocket subscription)
 */
export function getLiveMatches(): MatchEntity[] {
  return ALL_MATCHES.filter(m => m.isLive && m.status === 'live');
}

/**
 * Returns matches marked as featured.
 * API_HOOK: GET /api/matches?isFeatured=true
 */
export function getFeaturedMatches(): MatchEntity[] {
  return ALL_MATCHES.filter(m => m.isFeatured);
}

/**
 * Look up a single match by its ID.
 * API_HOOK: GET /api/matches/:matchId
 */
export function getMatchById(matchId: string): MatchEntity | undefined {
  return ALL_MATCHES.find(m => m.id === matchId);
}

/**
 * Search matches by team name (case-insensitive substring).
 * API_HOOK: GET /api/matches/search?q=...
 */
export function searchMatches(query: string): MatchEntity[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_MATCHES;
  return ALL_MATCHES.filter(
    m =>
      m.homeTeamName.toLowerCase().includes(q) ||
      m.awayTeamName.toLowerCase().includes(q)
  );
}

// ── Markets ───────────────────────────────────────────────────────────────────

/**
 * Returns all markets for a match (primary + secondary).
 * API_HOOK: GET /api/matches/:matchId/markets
 */
export function getMarketsByMatch(matchId: string): MarketEntity[] {
  return ALL_MARKETS.filter(mkt => mkt.matchId === matchId);
}

/**
 * Returns only the primary market for a match (fastest path for table renders).
 */
export function getPrimaryMarket(matchId: string): MarketEntity | undefined {
  const match = getMatchById(matchId);
  return match?.primaryMarket;
}

/**
 * Look up a selection by its globally-unique ID.
 */
export function getSelectionById(selectionId: string): SelectionEntity | undefined {
  for (const market of ALL_MARKETS) {
    const sel = market.selections.find(s => s.id === selectionId);
    if (sel) return sel;
  }
  return undefined;
}

// ── Featured Promotions ────────────────────────────────────────────────────────

/**
 * Returns active promotions sorted by priority.
 * API_HOOK: GET /api/promotions?isActive=true&sort=priority
 */
export function getFeaturedPromos(): FeaturedPromoEntity[] {
  return FEATURED_PROMOS.filter(p => p.isActive).sort((a, b) => a.priority - b.priority);
}

// ── Formatting / Calculation ───────────────────────────────────────────────────

/**
 * Format an odds value to a fixed decimal display string.
 * Extend here for fractional / American odds format switching.
 */
export function formatOdds(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Calculate estimated return for a single bet.
 * Returns 0 if stake or odds are invalid.
 */
export function calculatePotentialReturn(stake: number, odds: number): number {
  if (!stake || !odds || stake <= 0 || odds <= 0) return 0;
  return stake * odds;
}

/**
 * Calculate estimated return for an accumulator bet.
 * API_HOOK: POST /api/bets/calculate — server-side validation before placing.
 */
export function calculateAccaReturn(
  stake: number,
  selections: Array<{ odds: number }>
): number {
  if (!stake || stake <= 0 || selections.length === 0) return 0;
  const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  return stake * combinedOdds;
}

/**
 * Calculate combined odds for an accumulator (product of all odds).
 */
export function calculateAccaOdds(selections: Array<{ odds: number }>): number {
  if (selections.length === 0) return 1;
  return selections.reduce((acc, s) => acc * s.odds, 1);
}

/**
 * Returns the total number of live matches across all sports.
 */
export function getLiveMatchCount(): number {
  return getLiveMatches().length;
}

/**
 * Returns match count for a given dateTag across all sports (or one sport).
 */
export function getMatchCountByDate(dateTag: DateTag, sportId?: string): number {
  return ALL_MATCHES.filter(
    m => m.dateTag === dateTag && (!sportId || m.sportId === sportId)
  ).length;
}

// ── UI Adapter ── Group matches by league for the odds table render ────────────

export interface LeagueWithMatches {
  league: LeagueEntity;
  matches: MatchEntity[];
}

/**
 * Returns leagues that have at least one match, optionally filtered by sport
 * and/or dateTag. Each entry contains the league metadata + filtered matches.
 * This is the primary data source for the LeagueSection component tree.
 *
 * API_HOOK: GET /api/leagues/with-matches?sportId=...&date=...
 */
export function getLeaguesWithMatches(opts?: {
  sportId?: string;
  dateTag?: DateTag;
  search?: string;
}): LeagueWithMatches[] {
  const { sportId, dateTag, search } = opts ?? {};

  return LEAGUES_CATALOG
    .filter(l => l.isActive)
    .map(league => {
      let matches = getMatchesByLeague(league.id);

      if (sportId && !['all','early-payout','acca-boost'].includes(sportId)) {
        matches = matches.filter(m => m.sportId === sportId);
      }
      if (dateTag && dateTag !== 'all' as unknown as DateTag) {
        matches = matches.filter(m => m.dateTag === dateTag);
      }
      if (search) {
        const q = search.toLowerCase();
        matches = matches.filter(
          m =>
            m.homeTeamName.toLowerCase().includes(q) ||
            m.awayTeamName.toLowerCase().includes(q) ||
            league.name.toLowerCase().includes(q)
        );
      }

      return { league, matches };
    })
    .filter(entry => entry.matches.length > 0);
}
