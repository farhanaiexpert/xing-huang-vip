/**
 * useOddsApi — fetches real pre-match odds from The Odds API.
 *
 * Cache strategy (free-tier friendly):
 *  - localStorage: persists 24 h across page reloads / new tabs
 *  - Module-level: instant hydration within the same session
 *  - No automatic polling — user can manually refresh any time
 *  - 24 h TTL means ~360 API requests / month (well inside free quota)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { League } from '../types';
import { ODDS_API_SPORTS, fetchSportOdds } from '../lib/oddsApi';
import { normalizeEvents, buildLeague } from '../lib/normalizeOdds';

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'oddschain_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredEntry {
  leagues:   League[];
  fetchedAt: number;
}

function loadFromStorage(): StoredEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntry;
    if (!Array.isArray(parsed.leagues) || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(entry: StoredEntry): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch { /* storage quota exceeded — silently skip */ }
}

// ─── Module-level session cache (faster than localStorage) ───────────────────

let _sessionCache: StoredEntry | null = null;

// ─── "Last updated" label helper ─────────────────────────────────────────────

export function getLastUpdatedLabel(fetchedAt: Date | null): string {
  if (!fetchedAt) return '';
  const diffMs   = Date.now() - fetchedAt.getTime();
  const diffMin  = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin  <  1)  return 'Just updated';
  if (diffMin  <  60) return `Updated ${diffMin}m ago`;
  if (diffHour <  24) return `Updated ${diffHour}h ago`;

  const sameDay =
    fetchedAt.toDateString() === new Date().toDateString();
  return sameDay ? 'Updated today' : `Updated ${fetchedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

// ─── Shared fetch logic ───────────────────────────────────────────────────────

async function fetchAllLeagues(
  apiKey: string,
): Promise<{ leagues: League[]; error: string | null }> {
  const fetches = ODDS_API_SPORTS.map(config =>
    fetchSportOdds(config.key, apiKey)
      .then(events => ({ config, events, ok: true  as const }))
      .catch((err: Error) => ({ config, events: [], ok: false as const, err })),
  );

  const resolved = await Promise.all(fetches.map(p => p.catch(() => null)));

  const leagues: League[]   = [];
  let   anyError: string | null = null;

  for (const item of resolved) {
    if (!item) continue;
    if (!item.ok) {
      if (!anyError && 'err' in item) anyError = (item as { err: Error }).err.message;
      continue;
    }
    const matches = normalizeEvents(item.events, item.config);
    if (matches.length > 0) leagues.push(buildLeague(matches, item.config));
  }

  return { leagues, error: leagues.length === 0 ? anyError : null };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseOddsApiResult {
  realLeagues:       League[];
  loading:           boolean;
  /** True when a background refresh is running (data already shown) */
  refreshing:        boolean;
  error:             string | null;
  fetchedAt:         Date | null;
  hasRealData:       boolean;
  /** True when cached data is ≥ 24 h old */
  isStale:           boolean;
  /** e.g. "Updated 3h ago" / "Updated today" */
  lastUpdatedLabel:  string;
  /** Bust cache and re-fetch immediately */
  refresh:           () => void;
}

export function useOddsApi(): UseOddsApiResult {
  const stored = _sessionCache ?? loadFromStorage();

  const [realLeagues, setRealLeagues] = useState<League[]>(stored?.leagues ?? []);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fetchedAt,   setFetchedAt]   = useState<Date | null>(
    stored ? new Date(stored.fetchedAt) : null,
  );

  const isMounted = useRef(true);

  const doFetch = useCallback(async (background: boolean) => {
    const apiKey = import.meta.env.VITE_ODDS_API_KEY as string | undefined;
    if (!apiKey) return;

    background ? setRefreshing(true) : setLoading(true);
    setError(null);

    const { leagues, error: fetchError } = await fetchAllLeagues(apiKey);

    if (!isMounted.current) return;

    if (leagues.length > 0) {
      const now: StoredEntry = { leagues, fetchedAt: Date.now() };
      _sessionCache = now;
      saveToStorage(now);
      setRealLeagues(leagues);
      setFetchedAt(new Date(now.fetchedAt));
      setError(null);
    } else if (fetchError) {
      setError(fetchError);
    }

    background ? setRefreshing(false) : setLoading(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const apiKey = import.meta.env.VITE_ODDS_API_KEY as string | undefined;
    if (!apiKey) return;

    const cached = _sessionCache ?? loadFromStorage();

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      // Cache is fresh — hydrate without network call
      _sessionCache = cached;
      setRealLeagues(cached.leagues);
      setFetchedAt(new Date(cached.fetchedAt));
    } else {
      // Cache stale or absent — fetch (initial load → show spinner)
      void doFetch(false);
    }

    return () => { isMounted.current = false; };
  }, [doFetch]);

  const isStale = fetchedAt
    ? Date.now() - fetchedAt.getTime() >= CACHE_TTL_MS
    : false;

  return {
    realLeagues,
    loading,
    refreshing,
    error,
    fetchedAt,
    hasRealData:      realLeagues.length > 0,
    isStale,
    lastUpdatedLabel: getLastUpdatedLabel(fetchedAt),
    refresh:          () => {
      _sessionCache = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      void doFetch(realLeagues.length > 0);
    },
  };
}
