/**
 * useOddsApi — fetches real pre-match odds from two sources:
 *   1. The Odds API (via /api/odds/all) — primary source for major leagues
 *   2. BetsAPI (via /api/betsapi/upcoming) — Table Tennis, extra leagues, etc.
 *
 * Cache strategy (server-cron aligned):
 *  - Server cron refreshes odds_cache every 25–35 min, betsapi_cache every 30 min.
 *  - Client localStorage TTL 35 min — at most one cron-cycle stale without refresh.
 *  - Module-level cache provides instant hydration within the same session.
 *  - Server responses are served from DB cache — no extra API calls triggered.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { League, Match } from '../types';
import { ODDS_API_SPORTS, fetchAllOdds } from '../lib/oddsApi';
import { normalizeEvents, buildLeague } from '../lib/normalizeOdds';
import { fetchBetsApiUpcoming, type BetsApiEvent, type BetsApiSportMeta } from '../lib/betsApi';

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'oddschain_v4'; // v4 — two-source merge (Odds API + BetsAPI)
const QUOTA_KEY    = 'oddschain_quota_exhausted';
const CACHE_TTL_MS = 35 * 60 * 1000;

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

const QUOTA_TTL_MS = 24 * 60 * 60 * 1000;

interface QuotaEntry { ts: number }

function isQuotaExhausted(): boolean {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return false;
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

// ─── Filter past matches ──────────────────────────────────────────────────────

function filterCurrentLeagues(leagues: League[]): League[] {
  const now = Date.now();
  return leagues
    .map(league => ({
      ...league,
      matches: league.matches.filter(m =>
        !m.commenceIso || new Date(m.commenceIso).getTime() > now,
      ),
    }))
    .filter(league => league.matches.length > 0);
}

// ─── Module-level session cache ───────────────────────────────────────────────

let _sessionCache: StoredEntry | null = null;

// ─── "Last updated" label helper ──────────────────────────────────────────────

export function getLastUpdatedLabel(fetchedAt: Date | null): string {
  if (!fetchedAt) return '';
  const diffMs   = Date.now() - fetchedAt.getTime();
  const diffMin  = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);

  if (diffMin  <  1)  return 'Just updated';
  if (diffMin  <  60) return `Updated ${diffMin}m ago`;
  if (diffHour <  24) return `Updated ${diffHour}h ago`;

  const sameDay = fetchedAt.toDateString() === new Date().toDateString();
  return sameDay ? 'Updated today' : `Updated ${fetchedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

// ─── BetsAPI normalisation helpers ────────────────────────────────────────────

function toDisplayDate(unixTs: number): string {
  const d        = new Date(unixTs * 1000);
  const now      = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const hhmm     = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d < todayEnd) return `Today, ${hhmm}`;
  if (d < tomEnd)   return `Tomorrow, ${hhmm}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${hhmm}`;
}

function toDateTag(unixTs: number): 'today' | 'tomorrow' | 'upcoming' {
  const d        = new Date(unixTs * 1000);
  const now      = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  if (d < todayEnd) return 'today';
  if (d < tomEnd)   return 'tomorrow';
  return 'upcoming';
}

/**
 * Sports already covered by The Odds API.
 * For these, BetsAPI data still contributes to sidebar counts but does NOT
 * create new AllSportsHighlights sections (Odds API section takes precedence).
 */
const ODDS_API_COVERED_SPORTS = new Set([
  'sp_soccer', 'sp_cricket', 'sp_baseball', 'sp_basketball',
  'sp_tennis', 'sp_rugby_union', 'sp_rugby_league', 'sp_american_football',
  'sp_ice_hockey', 'sp_golf', 'sp_handball', 'sp_darts', 'sp_snooker',
  'sp_aussie_rules', 'sp_mma', 'sp_boxing', 'sp_volleyball',
]);

function normaliseBetsApiLeagues(
  sports:    Record<string, BetsApiEvent[]>,
  sportMeta: Record<string, BetsApiSportMeta>,
): League[] {
  const now     = Date.now();
  const leagues: League[] = [];

  for (const [sportIdStr, events] of Object.entries(sports)) {
    const meta = sportMeta[sportIdStr];
    if (!meta || events.length === 0) continue;

    const isOddsApiCovered = ODDS_API_COVERED_SPORTS.has(meta.sportId);

    // Group by league
    const byLeague = new Map<string, { leagueName: string; evs: BetsApiEvent[] }>();
    for (const ev of events) {
      const leagueKey = ev.league.id ?? ev.league.name;
      if (!byLeague.has(leagueKey)) {
        byLeague.set(leagueKey, { leagueName: ev.league.name, evs: [] });
      }
      byLeague.get(leagueKey)!.evs.push(ev);
    }

    for (const [leagueKey, { leagueName, evs }] of byLeague) {
      const leagueId = `betsapi_${sportIdStr}_${leagueKey}`;

      // For Odds-API-covered sports: use no sportKey so AllSportsHighlights
      // won't pick these up (sidebar count is enough; Odds API section already exists).
      // For new sports (e.g. Table Tennis): use betsapi_ prefix → new section.
      const sportKey = isOddsApiCovered
        ? undefined
        : `betsapi_${meta.sportId.replace('sp_', '')}`;

      // Skip match card generation for count-only sports (Horse Racing, Greyhounds)
      if (meta.countOnly) {
        // Still create a minimal league entry so sidebar counts work
        leagues.push({
          id:          leagueId,
          name:        leagueName,
          sportId:     meta.sportId,
          sportKey:    undefined,   // no AllSportsHighlights section
          countryCode: 'GL',
          matches:     [{
            id:          `betsapi_count_${leagueId}`,
            team1:       '—',
            team2:       '—',
            date:        '',
            dateTag:     'upcoming' as const,
            leagueId,
            sportId:     meta.sportId,
            sportKey:    undefined,
            isLive:      false,
            marketCount: 0,
            odds:        { home: 0, away: 0 },
          }],
        });
        continue;
      }

      const matches: Match[] = evs
        .filter(ev => {
          const ts = parseInt(ev.time, 10);
          return !isNaN(ts) && ts * 1000 > now;
        })
        .slice(0, 10)
        .map((ev): Match => {
          const ts = parseInt(ev.time, 10);
          // Use real prematch odds if available, else fall back
          const realOdds = ev.prematchOdds;
          const fallback = meta.fallbackOdds;
          const home = realOdds?.home  ?? fallback.home;
          const away = realOdds?.away  ?? fallback.away;
          const draw = realOdds?.draw  ?? (meta.hasDraw ? fallback.draw : undefined);
          return {
            id:          `betsapi_${ev.id}`,
            team1:       ev.home.name,
            team2:       ev.away.name,
            date:        toDisplayDate(ts),
            dateTag:     toDateTag(ts),
            leagueId,
            sportId:     meta.sportId,
            sportKey,
            isLive:      false,
            marketCount: 10,
            commenceIso: new Date(ts * 1000).toISOString(),
            odds: {
              home,
              ...(meta.hasDraw && draw != null ? { draw } : {}),
              away,
            },
          };
        });

      if (matches.length === 0) continue;

      leagues.push({
        id:          leagueId,
        name:        leagueName,
        sportId:     meta.sportId,
        sportKey,
        countryCode: 'GL',
        matches,
      });
    }
  }

  return leagues;
}

// ─── Shared fetch logic ───────────────────────────────────────────────────────

async function fetchAllLeagues(): Promise<{ leagues: League[]; error: string | null }> {
  const [oddsResult, betsResult] = await Promise.allSettled([
    fetchAllOdds(),
    fetchBetsApiUpcoming().catch(() => null),
  ]);

  const leagues: League[] = [];
  let oddsError: string | null = null;

  // 1. The Odds API — primary source
  if (oddsResult.status === 'fulfilled') {
    const sportsMap = oddsResult.value;
    for (const config of ODDS_API_SPORTS) {
      const events = sportsMap[config.key];
      if (!Array.isArray(events) || events.length === 0) continue;
      const matches = normalizeEvents(events, config);
      if (matches.length > 0) leagues.push(buildLeague(matches, config));
    }
  } else {
    const msg = oddsResult.reason instanceof Error ? oddsResult.reason.message : String(oddsResult.reason);
    if (msg === 'QUOTA_EXHAUSTED') return { leagues: [], error: 'QUOTA_EXHAUSTED' };
    oddsError = msg;
  }

  // 2. BetsAPI — supplemental source
  if (betsResult.status === 'fulfilled' && betsResult.value) {
    const { sports, sportMeta } = betsResult.value;
    const betsLeagues = normaliseBetsApiLeagues(sports, sportMeta);
    leagues.push(...betsLeagues);
  }

  if (leagues.length === 0) {
    return { leagues: [], error: oddsError ?? 'No cached data yet — server is warming up' };
  }

  return { leagues, error: null };
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

    if (isQuotaExhausted()) {
      setError('QUOTA_EXHAUSTED');
      return () => { isMounted.current = false; };
    }

    const cached = _sessionCache ?? loadFromStorage();

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      _sessionCache = cached;
      setRealLeagues(filterCurrentLeagues(cached.leagues));
      setFetchedAt(new Date(cached.fetchedAt));
    } else {
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
    refresh: () => {
      clearQuotaExhausted();
      _sessionCache = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setError(null);
      void doFetch(realLeagues.length > 0);
    },
  };
}
