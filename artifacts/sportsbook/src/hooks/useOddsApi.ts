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

const STORAGE_KEY  = 'oddschain_v6'; // v6 — adds soccer_fifa_world_cup to ODDS_API_SPORTS
const QUOTA_KEY    = 'oddschain_quota_exhausted';
const CACHE_TTL_MS = 35 * 60 * 1000;

interface StoredEntry {
  leagues:        League[];
  fetchedAt:      number;
  countBySportId?: Record<string, number>;
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
 * Sports where BetsAPI data should NOT create any AllSportsHighlights section.
 * Soccer, Basketball, Tennis already have dedicated page-level components;
 * suppress their BetsAPI sections to avoid redundancy.
 * All other BetsAPI sports get a `betsapi_*` sportKey so AllSportsHighlights
 * renders them — Odds API uses different prefixes (golf_, handball_ etc.) so
 * there is no risk of visual duplication.
 */
const BETSAPI_SECTION_SUPPRESSED = new Set([
  'sp_soccer', 'sp_basketball', 'sp_tennis',
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

      // Count-only sports (Horse Racing, Greyhounds): contribute to sidebar counts
      // via countBySportId but NEVER push fake match rows into leagues[].
      if (meta.countOnly) continue;

      // All BetsAPI sports get a betsapi_* sportKey so AllSportsHighlights can
      // render them — except soccer/basketball/tennis which have dedicated components.
      const sportKey = BETSAPI_SECTION_SUPPRESSED.has(meta.sportId)
        ? undefined
        : `betsapi_${meta.sportId.replace('sp_', '')}`;

      const matches: Match[] = evs
        .filter(ev => {
          const ts = parseInt(ev.time, 10);
          return !isNaN(ts) && ts * 1000 > now;
        })
        .slice(0, 10)
        .map((ev): Match => {
          const ts       = parseInt(ev.time, 10);
          const real     = ev.prematchOdds;
          const fallback = meta.fallbackOdds;
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
              home: real?.home  ?? fallback.home,
              ...(meta.hasDraw && (real?.draw ?? fallback.draw) != null
                ? { draw: real?.draw ?? fallback.draw }
                : {}),
              away: real?.away  ?? fallback.away,
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

// ─── De-duplicate helper ──────────────────────────────────────────────────────

/**
 * De-duplicate leagues by normalised (sportId + leagueName) key.
 * Odds API leagues take precedence; BetsAPI leagues that share a name
 * with an existing Odds API league are silently dropped.
 */
function deduplicateLeagues(leagues: League[]): League[] {
  const seen = new Set<string>();
  const out:  League[] = [];
  for (const league of leagues) {
    const key = `${league.sportId ?? ''}::${(league.name ?? '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(league);
  }
  return out;
}

// ─── Shared fetch logic ───────────────────────────────────────────────────────

async function fetchAllLeagues(): Promise<{
  leagues:        League[];
  error:          string | null;
  /** Raw event count per BetsAPI sport_id (includes countOnly sports) */
  countBySportId: Record<string, number>;
}> {
  const [oddsResult, betsResult] = await Promise.allSettled([
    fetchAllOdds(),
    fetchBetsApiUpcoming().catch(() => null),
  ]);

  const leagues: League[] = [];
  let oddsQuotaExhausted = false;
  let countBySportId: Record<string, number> = {};

  // 1. The Odds API — supplemental source (optional; never blocks BetsAPI)
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
    if (msg === 'QUOTA_EXHAUSTED') oddsQuotaExhausted = true;
    // Odds API failure is non-fatal — BetsAPI continues below
  }

  // 2. BetsAPI — primary source for volume; always processed regardless of Odds API state
  if (betsResult.status === 'fulfilled' && betsResult.value) {
    const { sports, sportMeta, countBySportId: betsCount } = betsResult.value;
    countBySportId = betsCount ?? {};
    const betsLeagues = normaliseBetsApiLeagues(sports, sportMeta);
    leagues.push(...betsLeagues);
  }

  // Only report quota exhausted if BetsAPI also has no data
  if (oddsQuotaExhausted && leagues.length === 0) {
    return { leagues: [], error: 'QUOTA_EXHAUSTED', countBySportId };
  }

  if (leagues.length === 0) {
    return { leagues: [], error: 'No cached data yet — server is warming up', countBySportId };
  }

  // De-duplicate by (sportId, leagueName) — Odds API entries win (they're first)
  return { leagues: deduplicateLeagues(leagues), error: null, countBySportId };
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
  /**
   * Raw BetsAPI event count per internal BetsAPI sport_id string.
   * Includes countOnly sports (Horse Racing id="2", Greyhounds id="4").
   * Used by useOddsData to merge into sidebar matchCountBySportId.
   */
  betsApiCountById:  Record<string, number>;
}

export function useOddsApi(): UseOddsApiResult {
  const stored = _sessionCache ?? loadFromStorage();

  const [realLeagues,     setRealLeagues]     = useState<League[]>(
    stored ? filterCurrentLeagues(stored.leagues) : [],
  );
  const [loading,         setLoading]         = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [fetchedAt,       setFetchedAt]       = useState<Date | null>(
    stored ? new Date(stored.fetchedAt) : null,
  );
  const [betsApiCountById, setBetsApiCountById] = useState<Record<string, number>>(
    stored?.countBySportId ?? {},
  );

  const isMounted = useRef(true);

  const doFetch = useCallback(async (background: boolean) => {
    background ? setRefreshing(true) : setLoading(true);
    setError(null);

    const { leagues, error: fetchError, countBySportId } = await fetchAllLeagues();

    if (!isMounted.current) return;

    setBetsApiCountById(countBySportId);

    if (leagues.length > 0) {
      clearQuotaExhausted();
      const now: StoredEntry = { leagues, fetchedAt: Date.now(), countBySportId };
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

    // Quota exhausted only blocks if BetsAPI also fails — always attempt fetch
    if (isQuotaExhausted()) setError('QUOTA_EXHAUSTED');

    const cached = _sessionCache ?? loadFromStorage();

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      _sessionCache = cached;
      setRealLeagues(filterCurrentLeagues(cached.leagues));
      setFetchedAt(new Date(cached.fetchedAt));
      if (cached.countBySportId) setBetsApiCountById(cached.countBySportId);
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
    betsApiCountById,
    refresh: () => {
      clearQuotaExhausted();
      _sessionCache = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setError(null);
      void doFetch(realLeagues.length > 0);
    },
  };
}
