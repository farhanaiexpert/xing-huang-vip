/**
 * useOddsApi — fetches real pre-match odds from The Odds API (via API server).
 *
 * Cache strategy (server-cron aligned):
 *  - Server cron refreshes the PostgreSQL odds_cache every 25–35 minutes.
 *  - Client localStorage TTL matches the server cron max (35 min) so users
 *    always see data at most one cron-cycle stale without a manual refresh.
 *  - Module-level cache provides instant hydration within the same session.
 *  - Server responses are served from DB cache (no extra Odds API credits).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { League } from '../types';
import { ODDS_API_SPORTS, fetchAllOdds } from '../lib/oddsApi';
import { normalizeEvents, buildLeague } from '../lib/normalizeOdds';

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'oddschain_v3'; // bumped to v3 — forces cache bust after API key swap + bulk endpoint migration
const QUOTA_KEY    = 'oddschain_quota_exhausted';
const CACHE_TTL_MS = 35 * 60 * 1000; // 35 min — matches server cron max interval

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

const QUOTA_TTL_MS = 24 * 60 * 60 * 1000; // auto-clear after 24 h

interface QuotaEntry { ts: number }

function isQuotaExhausted(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return false;
    // Legacy flag stored as plain '1' — treat as immediately expired
    if (raw === '1') { localStorage.removeItem(QUOTA_KEY); return false; }
    const entry = JSON.parse(raw) as QuotaEntry;
    if (Date.now() - entry.ts >= QUOTA_TTL_MS) {
      localStorage.removeItem(QUOTA_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

function setQuotaExhausted(): void {
  try { localStorage.setItem(QUOTA_KEY, JSON.stringify({ ts: Date.now() })); } catch {}
}

function clearQuotaExhausted(): void {
  try { localStorage.removeItem(QUOTA_KEY); } catch {}
}

// ─── Filter past matches out of cached league data ────────────────────────────

function filterCurrentLeagues(leagues: League[]): League[] {
  const now = Date.now();
  return leagues
    .map(league => ({
      ...league,
      matches: league.matches.filter(m =>
        // Keep mock matches (no commenceIso) and future API matches
        !m.commenceIso || new Date(m.commenceIso).getTime() > now,
      ),
    }))
    .filter(league => league.matches.length > 0);
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

async function fetchAllLeagues(): Promise<{ leagues: League[]; error: string | null }> {
  // One request to /api/odds/all instead of 78 individual sport fetches.
  // The server reads from PostgreSQL cache only — zero Odds API calls triggered.
  let sportsMap: Record<string, import('../lib/oddsApi').OddsApiEvent[]>;
  try {
    sportsMap = await fetchAllOdds();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'QUOTA_EXHAUSTED') return { leagues: [], error: 'QUOTA_EXHAUSTED' };
    return { leagues: [], error: msg };
  }

  const leagues: League[] = [];

  for (const config of ODDS_API_SPORTS) {
    const events = sportsMap[config.key];
    if (!Array.isArray(events) || events.length === 0) continue;
    const matches = normalizeEvents(events, config);
    if (matches.length > 0) leagues.push(buildLeague(matches, config));
  }

  return { leagues, error: leagues.length === 0 ? 'No cached data yet — server is warming up' : null };
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

  const [realLeagues, setRealLeagues] = useState<League[]>(
    stored ? filterCurrentLeagues(stored.leagues) : [],
  );
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fetchedAt,   setFetchedAt]   = useState<Date | null>(
    stored ? new Date(stored.fetchedAt) : null,
  );

  const isMounted = useRef(true);

  const doFetch = useCallback(async (background: boolean) => {
    background ? setRefreshing(true) : setLoading(true);
    setError(null);

    const { leagues, error: fetchError } = await fetchAllLeagues();

    if (!isMounted.current) return;

    if (leagues.length > 0) {
      clearQuotaExhausted();
      const now: StoredEntry = { leagues, fetchedAt: Date.now() };
      _sessionCache = now;
      saveToStorage(now);
      setRealLeagues(leagues);
      setFetchedAt(new Date(now.fetchedAt));
      setError(null);
    } else if (fetchError) {
      if (fetchError === 'QUOTA_EXHAUSTED') setQuotaExhausted();
      setError(fetchError);
    }

    background ? setRefreshing(false) : setLoading(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // If quota is known to be exhausted, surface the error immediately without
    // making any API calls (saves credits when user revisits the page).
    if (isQuotaExhausted()) {
      setError('QUOTA_EXHAUSTED');
      return () => { isMounted.current = false; };
    }

    const cached = _sessionCache ?? loadFromStorage();

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      // Cache is fresh — hydrate without network call, but drop any matches
      // whose kick-off time has already passed (stale cache issue).
      _sessionCache = cached;
      setRealLeagues(filterCurrentLeagues(cached.leagues));
      setFetchedAt(new Date(cached.fetchedAt));
    } else {
      // Cache stale or absent — fetch through API server
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
      // Clear quota flag so a manual refresh always retries
      // (user may have topped up their credits)
      clearQuotaExhausted();
      _sessionCache = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setError(null);
      void doFetch(realLeagues.length > 0);
    },
  };
}
