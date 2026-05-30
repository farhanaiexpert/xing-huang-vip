/**
 * OddsDataContext — single source of truth for merged real + mock leagues.
 *
 * Wraps useOddsApi so any component in the tree can read:
 *   - allLeagues          (real API + mock fallback, merged)
 *   - realLeagues         (API-only, may be empty)
 *   - matchCountBySportId (real match count per sportId, for sidebar badges)
 *   - loading/error/refresh state
 */
import { createContext, useContext, useMemo } from 'react';
import type { League } from '../types';
import { LEAGUES } from '../data/mockData';
import { useOddsApi, type UseOddsApiResult } from './useOddsApi';

// ─── Context value ────────────────────────────────────────────────────────────

export interface OddsDataContextValue extends UseOddsApiResult {
  /** All leagues: real API first, mock fallback for uncovered sports */
  allLeagues: League[];
  /** Real match count keyed by sportId — used for sidebar badges */
  matchCountBySportId: Record<string, number>;
}

const DEFAULT: OddsDataContextValue = {
  realLeagues: [], allLeagues: LEAGUES,
  loading: false, refreshing: false, error: null, fetchedAt: null,
  hasRealData: false, isStale: false, lastUpdatedLabel: '', refresh: () => {},
  matchCountBySportId: {},
};

const OddsDataContext = createContext<OddsDataContextValue>(DEFAULT);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OddsDataProvider({ children }: { children: React.ReactNode }) {
  const oddsApi = useOddsApi();

  const allLeagues = useMemo<League[]>(() => {
    if (!oddsApi.hasRealData) return LEAGUES;
    const coveredSportIds = new Set(oddsApi.realLeagues.map(l => l.sportId));
    const mockFallback = LEAGUES.filter(l => !coveredSportIds.has(l.sportId));
    return [...oddsApi.realLeagues, ...mockFallback];
  }, [oddsApi.hasRealData, oddsApi.realLeagues]);

  const matchCountBySportId = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const league of oddsApi.realLeagues) {
      counts[league.sportId] = (counts[league.sportId] ?? 0) + league.matches.length;
    }
    return counts;
  }, [oddsApi.realLeagues]);

  return (
    <OddsDataContext.Provider value={{ ...oddsApi, allLeagues, matchCountBySportId }}>
      {children}
    </OddsDataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOddsData(): OddsDataContextValue {
  return useContext(OddsDataContext);
}
