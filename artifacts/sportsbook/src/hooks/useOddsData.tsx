/**
 * OddsDataContext — single source of truth for merged real + mock leagues.
 *
 * Wraps useOddsApi so any component in the tree can read:
 *   - allLeagues   (real API + mock fallback, merged)
 *   - realLeagues  (API-only, may be empty)
 *   - loading/error/refresh state
 *
 * This also lets pages like MatchDetail look up real API matches by ID
 * without re-fetching or prop-drilling.
 */
import { createContext, useContext, useMemo } from 'react';
import type { League } from '../types';
import { LEAGUES } from '../data/mockData';
import { useOddsApi, type UseOddsApiResult } from './useOddsApi';

// ─── Context value ────────────────────────────────────────────────────────────

export interface OddsDataContextValue extends UseOddsApiResult {
  /** All leagues: real API first, mock fallback for uncovered sports */
  allLeagues: League[];
}

const DEFAULT: OddsDataContextValue = {
  realLeagues: [], allLeagues: LEAGUES,
  loading: false, refreshing: false, error: null, fetchedAt: null,
  hasRealData: false, isStale: false, lastUpdatedLabel: '', refresh: () => {},
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

  return (
    <OddsDataContext.Provider value={{ ...oddsApi, allLeagues }}>
      {children}
    </OddsDataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOddsData(): OddsDataContextValue {
  return useContext(OddsDataContext);
}

