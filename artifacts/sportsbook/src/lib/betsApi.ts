/**
 * BetsAPI — client types & fetch helpers.
 * All requests go through the CupBett API server (/api/betsapi/*).
 * The BetsAPI key is server-side only and never sent to the browser.
 */

// ─── Raw event shape (mirrored from server) ───────────────────────────────────

export interface BetsApiEvent {
  id:          string;
  sport_id:    string;
  time:        string;          // unix timestamp (pre-match)
  time_status: string;          // '0'=pre-match '1'=in-play
  league:      { id: string; name: string };
  home:        { name: string };
  away:        { name: string };
  ss?:         string | null;   // score "H-A"
  scores?:     Record<string, { home: string; away: string }>;
  timer?:      { tm?: string; ts?: string; tt?: string; ta?: string };
  /** Real prematch odds fetched from /v1/bet365/prematch (server-enriched) */
  prematchOdds?: { home: number; draw?: number; away: number } | null;
  /** Attached by server — sport metadata */
  _meta?: {
    name:    string;
    sportId: string;
    hasDraw: boolean;
    countOnly: boolean;
    fallbackOdds: { home: number; draw?: number; away: number };
  } | null;
}

// ─── Server response shapes ───────────────────────────────────────────────────

export interface BetsApiSportMeta {
  name:      string;
  sportId:   string;
  hasDraw:   boolean;
  countOnly: boolean;
  fallbackOdds: { home: number; draw?: number; away: number };
}

interface AllResponse {
  sports:    Record<string, BetsApiEvent[]>;
  sportMeta: Record<string, BetsApiSportMeta>;
  cached:    boolean;
  sportCount: number;
}

interface LiveResponse {
  events: BetsApiEvent[];
  cached: boolean;
  count:  number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/** Fetch all upcoming/pre-match events from server cache */
export async function fetchBetsApiUpcoming(): Promise<AllResponse> {
  // Use /all as primary; /upcoming is the same but kept for backward compat
  const res = await fetch('/api/betsapi/all');
  if (res.status === 503) throw new Error('BetsAPI not configured');
  if (!res.ok) throw new Error(`BetsAPI HTTP ${res.status}`);
  return await res.json() as AllResponse;
}

/** Fetch live inplay events */
export async function fetchBetsApiLive(): Promise<BetsApiEvent[]> {
  const res = await fetch('/api/betsapi/live');
  if (res.status === 503) return [];
  if (!res.ok) throw new Error(`BetsAPI live HTTP ${res.status}`);
  const json = await res.json() as LiveResponse;
  return Array.isArray(json.events) ? json.events : [];
}

// ─── Sport ID → internal sport key mapping ────────────────────────────────────

/** Maps BetsAPI sport_id → the sport key prefix used in AllSportsHighlights */
export const BETSAPI_SPORT_KEY: Record<string, string> = {
  '1':  'betsapi_soccer',
  '2':  'betsapi_horse_racing',
  '3':  'betsapi_cricket',
  '4':  'betsapi_greyhounds',
  '8':  'betsapi_rugby',
  '12': 'betsapi_americanfootball',
  '13': 'betsapi_baseball',
  '14': 'betsapi_icehockey',
  '16': 'betsapi_basketball',
  '17': 'betsapi_tennis',
  '18': 'betsapi_golf',
  '19': 'betsapi_handball',
  '92': 'betsapi_table_tennis',
  '94': 'betsapi_snooker',
  '95': 'betsapi_darts',
};
