/**
 * BetsAPI — fetch helpers for Bet365 live and pre-match data.
 * Key is read from BETSAPI_KEY env var (server-side only).
 */

const BETSAPI_BASE = 'https://api.betsapi.com';
export const BETSAPI_KEY = process.env.BETSAPI_KEY;

// ─── Sport ID mapping ─────────────────────────────────────────────────────────

export interface BetsApiSportMeta {
  name:    string;
  sportId: string;   // internal sp_ id used by sidebar
  hasDraw: boolean;
  /** fallback home/draw/away odds when no prematch odds available */
  fallbackOdds: { home: number; draw?: number; away: number };
}

export const BETSAPI_SPORT_MAP: Record<number, BetsApiSportMeta> = {
  1:  { name: 'Soccer',            sportId: 'sp_soccer',            hasDraw: true,  fallbackOdds: { home: 1.90, draw: 3.40, away: 2.10 } },
  3:  { name: 'Cricket',           sportId: 'sp_cricket',           hasDraw: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  8:  { name: 'Rugby',             sportId: 'sp_rugby_union',       hasDraw: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  12: { name: 'American Football', sportId: 'sp_american_football', hasDraw: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  13: { name: 'Baseball',          sportId: 'sp_baseball',          hasDraw: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  14: { name: 'Ice Hockey',        sportId: 'sp_ice_hockey',        hasDraw: false, fallbackOdds: { home: 1.90, away: 1.85 } },
  16: { name: 'Basketball',        sportId: 'sp_basketball',        hasDraw: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  17: { name: 'Tennis',            sportId: 'sp_tennis',            hasDraw: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  18: { name: 'Golf',              sportId: 'sp_golf',              hasDraw: false, fallbackOdds: { home: 3.50, away: 4.00 } },
  19: { name: 'Handball',          sportId: 'sp_handball',          hasDraw: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  92: { name: 'Table Tennis',      sportId: 'sp_table_tennis',      hasDraw: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  94: { name: 'Snooker',           sportId: 'sp_snooker',           hasDraw: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  95: { name: 'Darts',             sportId: 'sp_darts',             hasDraw: false, fallbackOdds: { home: 1.75, away: 2.00 } },
};

export const BETSAPI_SPORT_IDS = Object.keys(BETSAPI_SPORT_MAP).map(Number);

// Filter pattern for virtual / eSports leagues
const VIRTUAL_RE = /esoccer|esport|virtual|ebasketball|efootball|cyber|simul/i;

// ─── Raw API shapes ───────────────────────────────────────────────────────────

export interface BetsApiEventRaw {
  id:          string;
  sport_id:    string;
  time:        string;          // unix timestamp (pre-match)
  time_status: string;          // '0'=pre-match '1'=in-play '2'=ended
  league:      { id: string; name: string };
  home:        { name: string };
  away:        { name: string };
  ss?:         string | null;   // score "H-A"
  scores?:     Record<string, { home: string; away: string }>;
  timer?:      { tm?: string; ts?: string; tt?: string; ta?: string };
}

interface BetsApiListResponse {
  success: number;
  results: BetsApiEventRaw[];
  pager?:  { page: number; per_page: number; total: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterEvent(ev: BetsApiEventRaw): boolean {
  return !VIRTUAL_RE.test(ev.league?.name ?? '');
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchBetsApiUpcoming(sportId: number): Promise<BetsApiEventRaw[]> {
  if (!BETSAPI_KEY) return [];
  try {
    const url = `${BETSAPI_BASE}/v1/bet365/upcoming?sport_id=${sportId}&token=${BETSAPI_KEY}&per_page=50`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const json = await res.json() as BetsApiListResponse;
    if (json.success !== 1 || !Array.isArray(json.results)) return [];
    return json.results.filter(filterEvent);
  } catch {
    return [];
  }
}

/**
 * Fetch all inplay events using /v1/bet365/inplay_filter per sport.
 * This endpoint returns clean {id, sport_id, home, away, ss, league, timer} objects.
 * We query the top sports in parallel (capped to avoid rate limits).
 */
export async function fetchBetsApiInplay(): Promise<BetsApiEventRaw[]> {
  if (!BETSAPI_KEY) return [];

  // Sports to query for live: soccer, cricket, rugby, am.football, baseball,
  // ice hockey, basketball, tennis, handball, table tennis, snooker, darts
  const liveSportIds = [1, 3, 8, 12, 13, 14, 16, 17, 19, 92, 94, 95];

  const fetchSport = async (sportId: number): Promise<BetsApiEventRaw[]> => {
    try {
      const url = `${BETSAPI_BASE}/v1/bet365/inplay_filter?sport_id=${sportId}&token=${BETSAPI_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return [];
      const json = await res.json() as BetsApiListResponse;
      if (json.success !== 1 || !Array.isArray(json.results)) return [];
      return json.results.filter(filterEvent);
    } catch {
      return [];
    }
  };

  const results = await Promise.all(liveSportIds.map(fetchSport));
  return results.flat();
}
