/**
 * useWorldCupOdds — dedicated near-real-time data hook for the World Cup 2026
 * section ONLY. Talks to the WC-scoped `/api/odds/worldcup` endpoint (via
 * fetchWorldCupMatches) and never touches the shared odds pipeline.
 *
 * Refresh strategy:
 *  - Server keeps a 2-min fresh window; the client polls every 90s so the
 *    section stays close to real-time (live status, scores, odds, markets).
 *  - localStorage (wc_odds_v1) hydrates instantly on load; a short 2-min TTL
 *    means at most one server window stale before a background refresh.
 *  - On a fetch error the previously shown matches are kept (fallback), so the
 *    section stays stable when the provider temporarily fails.
 *  - Stored matches are re-filtered against "now" on read so finished/stale
 *    fixtures never linger across reloads.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Match } from '../types';
import { fetchWorldCupMatches, getLastUpdatedLabelWc } from '../lib/worldCupOdds';

const STORAGE_KEY = 'wc_odds_v1';
const CACHE_TTL_MS = 2 * 60 * 1000;   // align with server fresh window
const POLL_MS      = 90 * 1000;       // background refresh cadence
/** Drop any match that kicked off > 3.5h ago and is not flagged live. */
const STALE_AFTER_MS = 3.5 * 60 * 60 * 1000;

interface StoredEntry {
  matches:   Match[];
  fetchedAt: number;
  stale?:    boolean;
}

let _session: StoredEntry | null = null;

function load(): StoredEntry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntry;
    if (!Array.isArray(parsed.matches) || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(entry: StoredEntry): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entry)); } catch { /* quota — skip */ }
}

/** Re-filter cached matches so genuinely-finished/stale ones never linger. */
function pruneStale(matches: Match[]): Match[] {
  const now = Date.now();
  return matches.filter(m => {
    if (m.isLive) return true;
    if (!m.commenceIso) return true;
    const started = now - new Date(m.commenceIso).getTime();
    return started <= STALE_AFTER_MS;
  });
}

export interface UseWorldCupOddsResult {
  matches:          Match[];
  loading:          boolean;
  refreshing:       boolean;
  error:            string | null;
  stale:            boolean;
  lastUpdatedLabel: string;
  refresh:          () => void;
}

export function useWorldCupOdds(): UseWorldCupOddsResult {
  const stored = _session ?? load();

  const [matches,   setMatches]   = useState<Match[]>(stored ? pruneStale(stored.matches) : []);
  const [loading,   setLoading]   = useState(!stored);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [stale,     setStale]     = useState<boolean>(stored?.stale ?? false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(stored ? new Date(stored.fetchedAt) : null);

  const mounted = useRef(true);

  const doFetch = useCallback(async (background: boolean) => {
    background ? setRefreshing(true) : setLoading(true);
    try {
      const data = await fetchWorldCupMatches();
      if (!mounted.current) return;
      // Use the server's own timestamp so a stale fallback payload is never
      // presented as "just updated" and never gets a fresh client TTL.
      const entry: StoredEntry = { matches: data.matches, fetchedAt: data.updatedAt, stale: data.stale };
      _session = entry;
      save(entry);
      setMatches(pruneStale(data.matches));
      setFetchedAt(new Date(entry.fetchedAt));
      setStale(data.stale);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      // Keep previously shown matches (fallback); only surface error if empty.
      setError(err instanceof Error ? err.message : 'Failed to load World Cup matches');
    } finally {
      if (mounted.current) background ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    const cached = _session ?? load();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      _session = cached;
      setMatches(pruneStale(cached.matches));
      setFetchedAt(new Date(cached.fetchedAt));
      setStale(cached.stale ?? false);
      setLoading(false);
      void doFetch(true);
    } else {
      void doFetch(cached != null);
    }

    const timer = setInterval(() => void doFetch(true), POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [doFetch]);

  return {
    matches,
    loading,
    refreshing,
    error,
    stale,
    lastUpdatedLabel: stale ? 'Showing recent data' : getLastUpdatedLabelWc(fetchedAt),
    refresh: () => {
      _session = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      void doFetch(matches.length > 0);
    },
  };
}
