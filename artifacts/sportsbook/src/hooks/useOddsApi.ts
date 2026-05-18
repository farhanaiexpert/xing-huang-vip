/**
 * useOddsApi — fetches real pre-match odds from The Odds API.
 *
 * Features:
 *  - Parallel fetches for all configured sport keys
 *  - Module-level 5-minute cache (survives re-renders, cleared on page reload)
 *  - Graceful per-sport failure (one broken sport doesn't kill the rest)
 *  - Falls back to empty array when API key is absent
 */
import { useState, useEffect } from 'react';
import type { League } from '../types';
import { ODDS_API_SPORTS, fetchSportOdds } from '../lib/oddsApi';
import { normalizeEvents, buildLeague } from '../lib/normalizeOdds';

// ─── Module-level cache ───────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  leagues:   League[];
  fetchedAt: number;
}

let _cache: CacheEntry | null = null;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseOddsApiResult {
  /** Real leagues from the API (empty while loading or on error) */
  realLeagues: League[];
  /** True while the initial fetch is in-flight */
  loading: boolean;
  /** Non-null when all fetches failed or the API key is invalid */
  error: string | null;
  /** When data was last successfully fetched */
  fetchedAt: Date | null;
  /** Whether any real data is available */
  hasRealData: boolean;
}

export function useOddsApi(): UseOddsApiResult {
  const [realLeagues, setRealLeagues] = useState<League[]>(_cache?.leagues ?? []);
  const [loading,     setLoading]     = useState<boolean>(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fetchedAt,   setFetchedAt]   = useState<Date | null>(
    _cache ? new Date(_cache.fetchedAt) : null,
  );

  useEffect(() => {
    const apiKey = import.meta.env.VITE_ODDS_API_KEY as string | undefined;

    // No key → silently skip; mock data will be used
    if (!apiKey) return;

    // Cache still fresh → use it immediately, no fetch
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
      setRealLeagues(_cache.leagues);
      setFetchedAt(new Date(_cache.fetchedAt));
      return;
    }

    setLoading(true);
    setError(null);

    const fetches = ODDS_API_SPORTS.map(config =>
      fetchSportOdds(config.key, apiKey)
        .then(events => ({ config, events, ok: true as const }))
        .catch((err: Error) => ({ config, events: [], ok: false as const, err })),
    );

    Promise.allSettled(fetches).then(async results => {
      const resolved = await Promise.all(fetches.map(p => p.catch(() => null)));
      void results; // already handled via resolved

      const leagues: League[] = [];
      let anyError: string | null = null;

      for (const item of resolved) {
        if (!item) continue;
        if (!item.ok) {
          // Capture first meaningful error
          if (!anyError && 'err' in item) {
            anyError = (item as { err: Error }).err.message;
          }
          continue;
        }
        const matches = normalizeEvents(item.events, item.config);
        if (matches.length > 0) {
          leagues.push(buildLeague(matches, item.config));
        }
      }

      if (leagues.length > 0) {
        const now = Date.now();
        _cache = { leagues, fetchedAt: now };
        setRealLeagues(leagues);
        setFetchedAt(new Date(now));
        setError(null);
      } else if (anyError) {
        setError(anyError);
      }
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  return {
    realLeagues,
    loading,
    error,
    fetchedAt,
    hasRealData: realLeagues.length > 0,
  };
}
