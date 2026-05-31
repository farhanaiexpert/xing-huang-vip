/**
 * BetsAPI — fetch helpers for Bet365 live and pre-match data.
 * Key is read from BETSAPI_KEY env var (server-side only).
 */

const BETSAPI_BASE = 'https://api.betsapi.com';
export const BETSAPI_KEY = process.env.BETSAPI_KEY;

// ─── Sport ID mapping ─────────────────────────────────────────────────────────

export interface BetsApiSportMeta {
  name:        string;
  sportId:     string;   // internal sp_ id used by sidebar
  hasDraw:     boolean;
  countOnly:   boolean;  // true = sidebar count only, no match cards (Horse Racing, Greyhounds)
  /** fallback home/draw/away odds when no prematch odds available */
  fallbackOdds: { home: number; draw?: number; away: number };
}

export const BETSAPI_SPORT_MAP: Record<number, BetsApiSportMeta> = {
  1:  { name: 'Soccer',            sportId: 'sp_soccer',            hasDraw: true,  countOnly: false, fallbackOdds: { home: 1.90, draw: 3.40, away: 2.10 } },
  2:  { name: 'Horse Racing',      sportId: 'sp_horse_racing',      hasDraw: false, countOnly: true,  fallbackOdds: { home: 3.50, away: 4.00 } },
  3:  { name: 'Cricket',           sportId: 'sp_cricket',           hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  4:  { name: 'Greyhounds',        sportId: 'sp_greyhounds',        hasDraw: false, countOnly: true,  fallbackOdds: { home: 3.50, away: 4.00 } },
  8:  { name: 'Rugby',             sportId: 'sp_rugby_union',       hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  12: { name: 'American Football', sportId: 'sp_american_football', hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  13: { name: 'Baseball',         sportId: 'sp_baseball',          hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  14: { name: 'Ice Hockey',        sportId: 'sp_ice_hockey',        hasDraw: false, countOnly: false, fallbackOdds: { home: 1.90, away: 1.85 } },
  16: { name: 'Basketball',        sportId: 'sp_basketball',        hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  17: { name: 'Tennis',            sportId: 'sp_tennis',            hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  18: { name: 'Golf',              sportId: 'sp_golf',              hasDraw: false, countOnly: false, fallbackOdds: { home: 3.50, away: 4.00 } },
  19: { name: 'Handball',          sportId: 'sp_handball',          hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  92: { name: 'Table Tennis',      sportId: 'sp_table_tennis',      hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  94: { name: 'Snooker',           sportId: 'sp_snooker',           hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  95: { name: 'Darts',             sportId: 'sp_darts',             hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
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
  /** Real odds extracted from prematch endpoint (attached by fetch layer) */
  prematchOdds?: { home: number; draw?: number; away: number } | null;
}

interface BetsApiListResponse {
  success: number;
  results: BetsApiEventRaw[];
  pager?:  { page: number; per_page: number; total: number };
}

// ─── Prematch odds shapes ─────────────────────────────────────────────────────

interface PrematchOutcome {
  id:       string;
  name:     string;
  odds:     string;
  header?:  string;
  handicap?: string;
}

interface PrematchResponse {
  success: number;
  results: {
    FI:        string;
    event_id?: string;
    sport_id?: string;
    main?: {
      sp?: {
        full_time_result?: PrematchOutcome[];   // Soccer, Rugby (3-way)
        home_away_draw?:   PrematchOutcome[];   // alternative 3-way key
        match_lines?:      PrematchOutcome[];   // Tennis, TT, most 2-way
        match_result?:     PrematchOutcome[];   // some sports
        [key: string]:     PrematchOutcome[] | undefined;
      };
    };
  }[];
}

/** Parse prematch API response → {home, draw?, away} odds or null */
function parsePrematchOdds(
  data: PrematchResponse,
  hasDraw: boolean,
): { home: number; draw?: number; away: number } | null {
  const item = data.results?.[0];
  if (!item) return null;
  const sp = item.main?.sp ?? {};

  // Try known 3-way market keys
  for (const key of ['full_time_result', 'home_away_draw']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes) || outcomes.length === 0) continue;
    // Filter out header rows (odds === '' or name in header set)
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1);
    if (real.length < 2) continue;

    if (hasDraw && real.length >= 3) {
      const home = parseFloat(real[0].odds);
      const draw = parseFloat(real[1].odds);
      const away = parseFloat(real[2].odds);
      if (isNaN(home) || isNaN(draw) || isNaN(away)) continue;
      return { home, draw, away };
    } else if (real.length >= 2) {
      const home = parseFloat(real[0].odds);
      const away = parseFloat(real[real.length - 1].odds);
      if (isNaN(home) || isNaN(away)) continue;
      return { home, away };
    }
  }

  // Try 2-way market keys (Tennis, TT, etc.)
  for (const key of ['match_lines', 'match_result']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes) || outcomes.length === 0) continue;
    // Real outcomes have numeric odds and a header (team name)
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1 && o.header && o.header.trim() !== '' && !o.name);
    if (real.length < 2) continue;
    const home = parseFloat(real[0].odds);
    const away = parseFloat(real[1].odds);
    if (isNaN(home) || isNaN(away)) continue;
    return { home, away };
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterEvent(ev: BetsApiEventRaw): boolean {
  return !VIRTUAL_RE.test(ev.league?.name ?? '');
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

/**
 * Fetch all pages for one sport until the pager total is reached.
 * Per-page size is 50; hard ceiling is 500 events (10 pages) to avoid
 * runaway fetches on sports with thousands of events.
 */
export async function fetchBetsApiUpcoming(sportId: number): Promise<BetsApiEventRaw[]> {
  if (!BETSAPI_KEY) return [];

  const PER_PAGE  = 50;
  const MAX_PAGES = 10; // ceiling: 500 events per sport

  const fetchPage = async (page: number): Promise<{ events: BetsApiEventRaw[]; total: number }> => {
    try {
      const url = `${BETSAPI_BASE}/v1/bet365/upcoming?sport_id=${sportId}&token=${BETSAPI_KEY}&per_page=${PER_PAGE}&page=${page}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) return { events: [], total: 0 };
      const json = await res.json() as BetsApiListResponse;
      if (json.success !== 1 || !Array.isArray(json.results)) return { events: [], total: 0 };
      const total = json.pager?.total ?? json.results.length;
      return { events: json.results.filter(filterEvent), total };
    } catch {
      return { events: [], total: 0 };
    }
  };

  // Page 1 always fetched — use pager.total to know full count
  const { events: page1, total } = await fetchPage(1);
  const allEvents = [...page1];

  // Compute how many pages are needed, capped at MAX_PAGES
  const totalPages = Math.min(MAX_PAGES, Math.ceil(total / PER_PAGE));

  if (totalPages > 1) {
    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    // Fetch remaining pages in parallel (max 5 concurrent)
    const batches: number[][] = [];
    for (let i = 0; i < pageNums.length; i += 5) batches.push(pageNums.slice(i, i + 5));
    for (const batch of batches) {
      const results = await Promise.all(batch.map(p => fetchPage(p)));
      allEvents.push(...results.flatMap(r => r.events));
    }
  }

  return allEvents;
}

/** Fetch real 1X2/Match Winner odds for a single event via prematch endpoint.
 *  Returns null if fetch fails or odds cannot be parsed. */
export async function fetchPrematchOdds(
  fixtureId: string,
  hasDraw:   boolean,
): Promise<{ home: number; draw?: number; away: number } | null> {
  if (!BETSAPI_KEY) return null;
  try {
    const url = `${BETSAPI_BASE}/v1/bet365/prematch?FI=${fixtureId}&token=${BETSAPI_KEY}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = await res.json() as PrematchResponse;
    if (json.success !== 1) return null;
    return parsePrematchOdds(json, hasDraw);
  } catch {
    return null;
  }
}

/**
 * Fetch all inplay events using /v1/bet365/inplay_filter per sport.
 * This endpoint returns clean {id, sport_id, home, away, ss, league, timer} objects.
 */
export async function fetchBetsApiInplay(): Promise<BetsApiEventRaw[]> {
  if (!BETSAPI_KEY) return [];

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
