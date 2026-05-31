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

// ─── BetsAPI sport_id → internal sp_* mapping ────────────────────────────────
// Must match BETSAPI_SPORT_MAP on the server (src/lib/betsapi.ts).
const BETSAPI_ID_TO_SPORT_ID: Record<string, string> = {
  '1':  'sp_soccer',
  '2':  'sp_horse_racing',
  '3':  'sp_cricket',
  '4':  'sp_greyhounds',
  '8':  'sp_rugby_union',
  '12': 'sp_american_football',
  '13': 'sp_baseball',
  '14': 'sp_ice_hockey',
  '16': 'sp_basketball',
  '17': 'sp_tennis',
  '18': 'sp_golf',
  '19': 'sp_handball',
  '92': 'sp_table_tennis',
  '94': 'sp_snooker',
  '95': 'sp_darts',
};

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
  betsApiCountById: {},
  matchCountBySportId: {},
};

const OddsDataContext = createContext<OddsDataContextValue>(DEFAULT);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OddsDataProvider({ children }: { children: React.ReactNode }) {
  const oddsApi = useOddsApi();

  const matchCountBySportId = useMemo<Record<string, number>>(() => {
    // Start from Odds API + BetsAPI league match counts
    const counts: Record<string, number> = {};
    for (const league of oddsApi.realLeagues) {
      counts[league.sportId] = (counts[league.sportId] ?? 0) + league.matches.length;
    }
    // Overlay BetsAPI raw counts — this covers countOnly sports (Horse Racing,
    // Greyhounds) which never produce League entries but do have real event counts.
    for (const [betsId, count] of Object.entries(oddsApi.betsApiCountById)) {
      const sportId = BETSAPI_ID_TO_SPORT_ID[betsId];
      if (!sportId || count === 0) continue;
      // Use whichever is larger: Odds API match rows vs raw BetsAPI event total
      counts[sportId] = Math.max(counts[sportId] ?? 0, count);
    }
    return counts;
  }, [oddsApi.realLeagues, oddsApi.betsApiCountById]);

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
