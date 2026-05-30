/**
 * OddsDataContext — single source of truth for real API leagues only.
 *
 * Wraps useOddsApi so any component in the tree can read:
 *   - allLeagues          (real API data only — no mock fallback)
 *   - realLeagues         (same as allLeagues, API-sourced)
 *   - matchCountBySportId (real match count per sportId, for sidebar badges)
 *   - loading/error/refresh state
 */
import { createContext, useContext, useMemo } from 'react';
import type { League } from '../types';
import { useOddsApi, type UseOddsApiResult } from './useOddsApi';

// ─── Context value ────────────────────────────────────────────────────────────

export interface OddsDataContextValue extends UseOddsApiResult {
  /** All leagues: real API data only — no mock fallback */
  allLeagues: League[];
  /** Real match count keyed by sportId — used for sidebar badges */
  matchCountBySportId: Record<string, number>;
}

const DEFAULT: OddsDataContextValue = {
  realLeagues: [], allLeagues: [],
  loading: false, refreshing: false, error: null, fetchedAt: null,
  hasRealData: false, isStale: false, lastUpdatedLabel: '', refresh: () => {},
  matchCountBySportId: {},
};

const OddsDataContext = createContext<OddsDataContextValue>(DEFAULT);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OddsDataProvider({ children }: { children: React.ReactNode }) {
  const oddsApi = useOddsApi();

  const matchCountBySportId = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    for (const league of oddsApi.realLeagues) {
      counts[league.sportId] = (counts[league.sportId] ?? 0) + league.matches.length;
    }
    return counts;
  }, [oddsApi.realLeagues]);

  return (
    <OddsDataContext.Provider value={{
      ...oddsApi,
      allLeagues: oddsApi.realLeagues,
      matchCountBySportId,
    }}>
      {children}
    </OddsDataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOddsData(): OddsDataContextValue {
  return useContext(OddsDataContext);
}
