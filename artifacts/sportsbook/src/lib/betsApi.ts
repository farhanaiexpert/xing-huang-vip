/**
 * BetsAPI — client types & fetch helpers.
 * All requests go through the Xing Huang API server (/api/betsapi/*).
 * The BetsAPI key is server-side only and never sent to the browser.
 */

import { API_BASE } from './apiBase';

// ─── Raw event shape (mirrored from server) ───────────────────────────────────

/** Rich market availability flags — mirrors server BetsApiRichMarkets */
export interface BetsApiRichMarkets {
  hasHcp:      boolean;
  hasOU:       boolean;
  hasHT:       boolean;
  hasBTTS:     boolean;
  hasCS:       boolean;
  hasCorners:  boolean;
  hasCards:    boolean;
  hasNextGoal: boolean;
  marketScore: number;
  hcpHome?:   number;
  hcpAway?:   number;
  hcpLine?:   string;
  ou25Over?:  number;
  ou25Under?: number;
  htHome?:    number;
  htDraw?:    number;
  htAway?:    number;
  bttsY?:     number;
  bttsN?:     number;
  /** Top correct-score lines, e.g. [{ label: "2-1", odds: 8.5 }] */
  correctScore?: { label: string; odds: number }[];
  cornersLine?:  string;
  cornersOver?:  number;
  cornersUnder?: number;
  cardsLine?:    string;
  cardsOver?:    number;
  cardsUnder?:   number;
  nextGoalHome?: number;
  nextGoalNone?: number;
  nextGoalAway?: number;
}

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
  /** Rich market availability flags (same prematch call — no extra credits) */
  richMarkets?: BetsApiRichMarkets | null;
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
  sports:         Record<string, BetsApiEvent[]>;
  sportMeta:      Record<string, BetsApiSportMeta>;
  /** Raw event count per BetsAPI sport_id string — includes countOnly sports */
  countBySportId: Record<string, number>;
  cached:         boolean;
  /** true when the server is serving expired cache because a fresh fetch failed */
  stale?:         boolean;
  sportCount:     number;
}

interface LiveResponse {
  events: BetsApiEvent[];
  cached: boolean;
  count:  number;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetch homepage matches from the dedicated cache-only endpoint.
 * `/api/homepage/matches` serves ONLY cached prematch data (never an upstream
 * BetsAPI call), with the 30-minute server-side shuffle applied and already-started
 * matches removed. Response shape matches AllResponse (plus an ignored `meta`).
 */
export async function fetchBetsApiUpcoming(): Promise<AllResponse> {
  const res = await fetch(`${API_BASE}/api/homepage/matches`);
  if (res.status === 503) throw new Error('BetsAPI not configured');
  if (!res.ok) throw new Error(`BetsAPI HTTP ${res.status}`);
  const json = await res.json() as AllResponse;
  // Ensure countBySportId always exists (older cache may not have it)
  if (!json.countBySportId) json.countBySportId = {};
  return json;
}

/**
 * On-demand single-match refresh (Task #243). Returns cached fixture data
 * immediately when odds are present; otherwise the server refreshes just this one
 * fixture (credit-limited). Never triggers a global refresh. Returns null on 404.
 */
export async function refreshBetsApiMatch(fixtureId: string): Promise<BetsApiMarketsResponse | null> {
  const id = fixtureId.replace(/^betsapi_/, '');
  const res = await fetch(`${API_BASE}/api/betsapi/refresh/${id}`);
  if (!res.ok) return null;
  return await res.json() as BetsApiMarketsResponse;
}

/** Fetch live inplay events */
export async function fetchBetsApiLive(): Promise<BetsApiEvent[]> {
  const res = await fetch(`${API_BASE}/api/betsapi/live`);
  if (res.status === 503) return [];
  if (!res.ok) throw new Error(`BetsAPI live HTTP ${res.status}`);
  const json = await res.json() as LiveResponse;
  return Array.isArray(json.events) ? json.events : [];
}

// ─── Rich markets for a single fixture (cache-only — 0 extra credits) ──────────

export interface BetsApiMarketsResponse {
  fixtureId:    string;
  richMarkets:  BetsApiRichMarkets | null;
  prematchOdds: { home: number; draw?: number; away: number } | null;
  home:         string;
  away:         string;
  commenceTime: string;
  cached:       boolean;
}

/**
 * Fetch rich markets for one BetsAPI fixture from the server cache.
 * `fixtureId` is the numeric BetsAPI event id (Match.id without the `betsapi_` prefix).
 * Returns null when the fixture is not cached (404) or markets are unavailable.
 */
export async function fetchBetsApiMarkets(fixtureId: string): Promise<BetsApiMarketsResponse | null> {
  const id = fixtureId.replace(/^betsapi_/, '');
  const res = await fetch(`${API_BASE}/api/betsapi/markets/${id}`);
  if (!res.ok) return null;
  return await res.json() as BetsApiMarketsResponse;
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
