/**
 * BetsAPI — fetch helpers for Bet365 live and pre-match data.
 * Key is read from BETSAPI_KEY env var (server-side only).
 */

import { recordApiCall } from './apiUsage.js';
import { reserveBetsApiCredit } from './betsApiRateLimiter.js';

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
  8:  { name: 'Rugby Union',       sportId: 'sp_rugby_union',       hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  9:  { name: 'Boxing',            sportId: 'sp_boxing',            hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  12: { name: 'American Football', sportId: 'sp_american_football', hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  13: { name: 'Baseball',          sportId: 'sp_baseball',          hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  14: { name: 'Ice Hockey',        sportId: 'sp_ice_hockey',        hasDraw: false, countOnly: false, fallbackOdds: { home: 1.90, away: 1.85 } },
  16: { name: 'Basketball',        sportId: 'sp_basketball',        hasDraw: false, countOnly: false, fallbackOdds: { home: 1.85, away: 1.90 } },
  17: { name: 'Tennis',            sportId: 'sp_tennis',            hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  18: { name: 'Golf',              sportId: 'sp_golf',              hasDraw: false, countOnly: false, fallbackOdds: { home: 3.50, away: 4.00 } },
  19: { name: 'Handball',          sportId: 'sp_handball',          hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  36: { name: 'Australian Rules',  sportId: 'sp_aussie_rules',      hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  78: { name: 'Rugby League',      sportId: 'sp_rugby_league',      hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  91: { name: 'Volleyball',        sportId: 'sp_volleyball',        hasDraw: false, countOnly: false, fallbackOdds: { home: 1.80, away: 1.95 } },
  92: { name: 'Table Tennis',      sportId: 'sp_table_tennis',      hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  161:{ name: 'MMA',               sportId: 'sp_mma',               hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  94: { name: 'Snooker',           sportId: 'sp_snooker',           hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
  95: { name: 'Darts',             sportId: 'sp_darts',             hasDraw: false, countOnly: false, fallbackOdds: { home: 1.75, away: 2.00 } },
};

export const BETSAPI_SPORT_IDS = Object.keys(BETSAPI_SPORT_MAP).map(Number);

// Filter pattern for virtual / eSports leagues
const VIRTUAL_RE = /esoccer|esport|virtual|ebasketball|efootball|cyber|simul/i;

// ─── Raw API shapes ───────────────────────────────────────────────────────────

// ─── Rich market availability flags ──────────────────────────────────────────

/**
 * Flags indicating which BetsAPI market categories are available for an event.
 * Populated for free from the same prematch API call used for 1X2 odds — no extra credits.
 */
export interface BetsApiRichMarkets {
  hasHcp:      boolean;  // Asian Handicap
  hasOU:       boolean;  // Over/Under Goals
  hasHT:       boolean;  // Half-Time Result
  hasBTTS:     boolean;  // Both Teams To Score
  hasCS:       boolean;  // Correct Score
  hasCorners:  boolean;  // Corners
  hasCards:    boolean;  // Cards / Bookings
  hasNextGoal: boolean;  // Next Goal / First Goalscorer
  /** Total count of market categories available — used to determine "Featured" status (≥4) */
  marketScore: number;
  // Key odds for quick display in market tabs
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
  // Detailed markets (returned by /betsapi/markets/:id, NOT stored on the homepage Match to keep localStorage lean)
  /** Top correct-score lines, e.g. [{ label: "2-1", odds: 8.5 }] (cap 16) */
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
  /** Rich market availability flags (from same prematch call — no extra credits) */
  richMarkets?: BetsApiRichMarkets | null;
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
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1 && o.header && o.header.trim() !== '' && !o.name);
    if (real.length < 2) continue;
    const home = parseFloat(real[0].odds);
    const away = parseFloat(real[1].odds);
    if (isNaN(home) || isNaN(away)) continue;
    return { home, away };
  }

  return null;
}

/**
 * Parse ALL market types from the same prematch API response.
 * Returns both 1X2 odds AND rich market flags with key odds — no extra API credit needed.
 */
function parsePrematchData(
  data: PrematchResponse,
  hasDraw: boolean,
): { odds: { home: number; draw?: number; away: number } | null; richMarkets: BetsApiRichMarkets } {
  const odds = parsePrematchOdds(data, hasDraw);

  const item = data.results?.[0];
  const sp: Record<string, PrematchOutcome[] | undefined> = item?.main?.sp ?? {};

  /** Returns true if an sp key exists and has ≥2 real outcome entries */
  const hasKey = (keys: string[]) =>
    keys.some(k => Array.isArray(sp[k]) && (sp[k] as PrematchOutcome[]).filter(o => o.odds && parseFloat(o.odds) > 1).length >= 2);

  const hasHcp      = hasKey(['asian_handicap', 'asian_handicap_including_overtime', 'handicap_result', 'asian_handicap_half_time', 'asian_handicap_corners']);
  const hasOU       = hasKey(['goals_over_under', 'over_under_25', 'total_goals', 'over_under_15', 'over_under_35', '1st_half_over_under', 'alternative_over_under']);
  const hasHT       = hasKey(['half_time_result', 'half_time_home_away', 'ht_home_away', 'half_time_score', 'half_time']);
  const hasBTTS     = hasKey(['both_teams_to_score', 'btts', 'score_both_teams', 'both_to_score']);
  const hasCS       = hasKey(['correct_score', 'correct_score_v2', 'scores', 'halftime_correct_score']);
  const hasCorners  = hasKey(['corner_count_over_under', 'asian_corners', 'corners_over_under', 'corners_match_line', 'corners_handicap', 'total_corners']);
  const hasCards    = hasKey(['cards_over_under', 'player_to_receive_a_card', 'cards_handicap', 'cards_match_line', 'total_bookings']);
  const hasNextGoal = hasKey(['next_goal', 'first_goalscorer', 'first_goal_scorer', 'next_goal_scorer', 'last_goalscorer']);
  const marketScore = [hasHcp, hasOU, hasHT, hasBTTS, hasCS, hasCorners, hasCards, hasNextGoal].filter(Boolean).length;

  /** Pull first N valid odds from an sp key */
  const pickOdds = (keys: string[], count: number): number[] => {
    for (const key of keys) {
      const outcomes = sp[key];
      if (!Array.isArray(outcomes)) continue;
      const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1);
      if (real.length >= count) return real.slice(0, count).map(o => parseFloat(o.odds));
    }
    return [];
  };

  // HCP
  let hcpHome: number | undefined, hcpAway: number | undefined, hcpLine: string | undefined;
  for (const key of ['asian_handicap', 'handicap_result']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes)) continue;
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1);
    if (real.length >= 2) {
      hcpLine = real[0].handicap ?? real[0].name ?? '';
      hcpHome = parseFloat(real[0].odds);
      hcpAway = parseFloat(real[real.length - 1].odds);
      break;
    }
  }

  // O/U 2.5
  const [ou25Over, ou25Under] = pickOdds(['goals_over_under', 'over_under_25', 'total_goals'], 2);

  // HT
  let htHome: number | undefined, htDraw: number | undefined, htAway: number | undefined;
  for (const key of ['half_time_result', 'half_time_home_away']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes)) continue;
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1);
    if (hasDraw && real.length >= 3) {
      htHome = parseFloat(real[0].odds); htDraw = parseFloat(real[1].odds); htAway = parseFloat(real[2].odds);
      break;
    } else if (real.length >= 2) {
      htHome = parseFloat(real[0].odds); htAway = parseFloat(real[real.length - 1].odds);
      break;
    }
  }

  // BTTS
  const [bttsY, bttsN] = pickOdds(['both_teams_to_score', 'btts'], 2);

  // Correct Score — collect scorelines like "2-1" with their odds (cap 16)
  let correctScore: { label: string; odds: number }[] | undefined;
  for (const key of ['correct_score', 'correct_score_v2', 'halftime_correct_score']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes)) continue;
    const real = outcomes.filter(
      o => o.name && /^\d+\s*-\s*\d+$/.test(o.name.trim()) && o.odds && parseFloat(o.odds) > 1,
    );
    if (real.length >= 3) {
      correctScore = real.slice(0, 16).map(o => ({ label: o.name.trim().replace(/\s+/g, ''), odds: parseFloat(o.odds) }));
      break;
    }
  }

  /** Find a matching Over/Under pair (same handicap line) from any of the given keys */
  const pickOverUnder = (keys: string[]): { line?: string; over?: number; under?: number } => {
    for (const key of keys) {
      const outcomes = sp[key];
      if (!Array.isArray(outcomes)) continue;
      const real = outcomes.filter(o => o.name && o.odds && parseFloat(o.odds) > 1);
      const over  = real.find(o => /over/i.test(o.name));
      const under = real.find(o => /under/i.test(o.name) && (!over || o.handicap === over.handicap || !over.handicap));
      if (over && under) {
        return { line: over.handicap ?? under.handicap ?? '', over: parseFloat(over.odds), under: parseFloat(under.odds) };
      }
    }
    return {};
  };

  // Corners O/U
  const { line: cornersLine, over: cornersOver, under: cornersUnder } =
    pickOverUnder(['corner_count_over_under', 'corners_over_under', 'total_corners', 'asian_corners']);

  // Cards O/U
  const { line: cardsLine, over: cardsOver, under: cardsUnder } =
    pickOverUnder(['cards_over_under', 'total_bookings', 'bookings_over_under']);

  // Next Goal — 2-way (Home/Away) or 3-way (Home/None/Away)
  let nextGoalHome: number | undefined, nextGoalNone: number | undefined, nextGoalAway: number | undefined;
  for (const key of ['next_goal', 'next_goal_scorer']) {
    const outcomes = sp[key];
    if (!Array.isArray(outcomes)) continue;
    const real = outcomes.filter(o => o.odds && parseFloat(o.odds) > 1);
    if (real.length >= 3) {
      nextGoalHome = parseFloat(real[0].odds);
      nextGoalNone = parseFloat(real[1].odds);
      nextGoalAway = parseFloat(real[2].odds);
      break;
    } else if (real.length === 2) {
      nextGoalHome = parseFloat(real[0].odds);
      nextGoalAway = parseFloat(real[1].odds);
      break;
    }
  }

  const richMarkets: BetsApiRichMarkets = {
    hasHcp, hasOU, hasHT, hasBTTS, hasCS, hasCorners, hasCards, hasNextGoal, marketScore,
    hcpHome, hcpAway, hcpLine,
    ou25Over, ou25Under,
    htHome, htDraw, htAway,
    bttsY, bttsN,
    correctScore,
    cornersLine, cornersOver, cornersUnder,
    cardsLine, cardsOver, cardsUnder,
    nextGoalHome, nextGoalNone, nextGoalAway,
  };

  return { odds, richMarkets };
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
 *
 * Returns null when the API responds with a permission/auth error (4xx)
 * so callers can use a shorter retry TTL instead of the 4-hour off-season TTL.
 * Returns [] when the API succeeds but genuinely has no events (off-season).
 */
export async function fetchBetsApiUpcoming(sportId: number): Promise<BetsApiEventRaw[] | null> {
  if (!BETSAPI_KEY) return [];

  const PER_PAGE  = 50;
  const MAX_PAGES = 10; // ceiling: 500 events per sport

  let permissionError = false;

  const fetchPage = async (page: number): Promise<{ events: BetsApiEventRaw[]; total: number }> => {
    try {
      if (!(await reserveBetsApiCredit())) {
        // Hourly credit cap reached — treat as recoverable so a short retry TTL is used.
        permissionError = true;
        recordApiCall("betsapi", false, "rate_limited", `upcoming sport ${sportId} → hourly credit cap reached`);
        return { events: [], total: 0 };
      }
      const url = `${BETSAPI_BASE}/v1/bet365/upcoming?sport_id=${sportId}&token=${BETSAPI_KEY}&per_page=${PER_PAGE}&page=${page}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) {
        // 401/403 = bad token; 429 = rate limit / out of request volume.
        // All are recoverable conditions — flag so the caller uses a short
        // retry TTL instead of caching empty for 4 hours.
        if (res.status === 401 || res.status === 403 || res.status === 429) permissionError = true;
        recordApiCall("betsapi", false, `HTTP ${res.status}`, `upcoming sport ${sportId} → HTTP ${res.status}`);
        return { events: [], total: 0 };
      }
      const json = await res.json() as BetsApiListResponse & { error?: string };
      if (json.success !== 1 || !Array.isArray(json.results)) {
        // BetsAPI sometimes returns HTTP 200 with {success:0, error:"TOO_MANY_REQUESTS"}
        // when the account is out of request volume — treat as recoverable too.
        if (json.success !== 1 && typeof json.error === 'string') permissionError = true;
        recordApiCall("betsapi", false, json.error ?? "success=0", `upcoming sport ${sportId} → ${json.error ?? "success=0"}`);
        return { events: [], total: 0 };
      }
      const total = json.pager?.total ?? json.results.length;
      recordApiCall("betsapi", true, "ok");
      return { events: json.results.filter(filterEvent), total };
    } catch {
      recordApiCall("betsapi", false, "network", `upcoming sport ${sportId} → network/timeout`);
      return { events: [], total: 0 };
    }
  };

  // Page 1 always fetched — use pager.total to know full count
  const { events: page1, total } = await fetchPage(1);
  if (permissionError) return null;
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

  // A 401/403/429 on any page (not just page 1) means the data is unreliable —
  // discard the partial result so the caller uses the short retry TTL.
  if (permissionError) return null;

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
    if (!(await reserveBetsApiCredit())) { recordApiCall("betsapi", false, "rate_limited", "prematch → hourly credit cap reached"); return null; }
    const url = `${BETSAPI_BASE}/v1/bet365/prematch?FI=${fixtureId}&token=${BETSAPI_KEY}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) { recordApiCall("betsapi", false, `HTTP ${res.status}`, `prematch → HTTP ${res.status}`); return null; }
    const json = await res.json() as PrematchResponse;
    if (json.success !== 1) { recordApiCall("betsapi", false, "success=0", "prematch → success=0"); return null; }
    recordApiCall("betsapi", true, "ok");
    return parsePrematchOdds(json, hasDraw);
  } catch {
    recordApiCall("betsapi", false, "network", "prematch → network/timeout");
    return null;
  }
}

/**
 * Fetch BOTH 1X2 odds AND rich market flags from a single prematch API call.
 * Use this in the cron to populate richMarkets at no extra credit cost.
 */
export async function fetchPrematchData(
  fixtureId: string,
  hasDraw:   boolean,
): Promise<{ odds: { home: number; draw?: number; away: number } | null; richMarkets: BetsApiRichMarkets }> {
  const emptyRich: BetsApiRichMarkets = {
    hasHcp: false, hasOU: false, hasHT: false, hasBTTS: false,
    hasCS: false, hasCorners: false, hasCards: false, hasNextGoal: false,
    marketScore: 0,
  };
  if (!BETSAPI_KEY) return { odds: null, richMarkets: emptyRich };
  try {
    if (!(await reserveBetsApiCredit())) {
      recordApiCall("betsapi", false, "rate_limited", "prematch → hourly credit cap reached");
      return { odds: null, richMarkets: emptyRich };
    }
    const url = `${BETSAPI_BASE}/v1/bet365/prematch?FI=${fixtureId}&token=${BETSAPI_KEY}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) { recordApiCall("betsapi", false, `HTTP ${res.status}`, `prematch ${fixtureId} → HTTP ${res.status}`); return { odds: null, richMarkets: emptyRich }; }
    const json = await res.json() as PrematchResponse;
    if (json.success !== 1) { recordApiCall("betsapi", false, "success=0", `prematch ${fixtureId} → success=0`); return { odds: null, richMarkets: emptyRich }; }
    recordApiCall("betsapi", true, "ok");
    return parsePrematchData(json, hasDraw);
  } catch {
    recordApiCall("betsapi", false, "network", `prematch ${fixtureId} → network/timeout`);
    return { odds: null, richMarkets: emptyRich };
  }
}

// ─── In-memory odds caches ────────────────────────────────────────────────────
// inplayOddsCache  : 2-min TTL  — live odds that shift as the match progresses
// prematchOddsCache: 30-min TTL — opening odds, used as fallback

interface PrematchCacheEntry {
  odds:      { home: number; draw?: number; away: number } | null;
  expiresAt: number;
}

const inplayOddsCache   = new Map<string, PrematchCacheEntry>();
const prematchOddsCache = new Map<string, PrematchCacheEntry>();

/**
 * Enrich a batch of live events with the best available real 1X2 odds.
 *
 * Strategy (per event):
 *   1. Check inplay cache (2-min TTL) — use if fresh.
 *   2. Fetch /v1/bet365/inplay?FI=<id> for live match odds.
 *   3. If inplay returns no parseable 1X2 market → fall back to prematch.
 *   4. Events with no odds from either source are excluded entirely.
 *
 * Cache policies:
 *   Inplay  : success=1 + odds found → cache 2 min.
 *             success=1 + no 1X2     → cache null 2 min (definitive).
 *             Non-2xx / timeout / success≠1 → do NOT cache (transient).
 *   Prematch: success=1 (any outcome) → cache 30 min.
 *             Non-2xx / timeout / success≠1 → do NOT cache (transient).
 */
async function enrichWithLiveOdds(
  events: BetsApiEventRaw[],
  allowedIds?: Set<string>,
): Promise<BetsApiEventRaw[]> {
  // Bet-scoped enrichment (Task #243): when a caller passes an allow-list, only
  // fixtures with an active user bet are enriched with live/prematch odds. This
  // is where the per-fixture upstream calls happen, so filtering here is what
  // actually saves credits when most live matches have no bets on them.
  if (allowedIds) {
    events = events.filter(ev => allowedIds.has(String(ev.id)));
  }
  const now             = Date.now();
  const INPLAY_TTL_MS   = 5 * 60 * 1000;    // 5 min — cuts per-fixture inplay calls by ~60% vs 2 min
  const PREMATCH_TTL_MS = 30 * 60 * 1000;   // 30 min — stable opening lines
  const CONCUR          = 5;
  const PER_FETCH       = 4_000;

  const results:   BetsApiEventRaw[] = [];
  const needFetch: BetsApiEventRaw[] = [];

  for (const ev of events) {
    const inplayHit = inplayOddsCache.get(ev.id);
    if (inplayHit && inplayHit.expiresAt > now) {
      if (inplayHit.odds !== null) {
        // Fresh live odds — use directly
        results.push({ ...ev, prematchOdds: inplayHit.odds });
        continue;
      }
      // Inplay definitively had no 1X2 → try prematch fallback from cache
      const prematchHit = prematchOddsCache.get(ev.id);
      if (prematchHit && prematchHit.expiresAt > now) {
        if (prematchHit.odds !== null) results.push({ ...ev, prematchOdds: prematchHit.odds });
        // null → no odds from either source → exclude
        continue;
      }
      // Prematch cache stale → need fresh prematch fetch
      needFetch.push(ev);
      continue;
    }
    needFetch.push(ev);
  }

  for (let i = 0; i < needFetch.length; i += CONCUR) {
    const batch = needFetch.slice(i, i + CONCUR);
    const batchResult = await Promise.all(batch.map(async (ev) => {
      const sportMeta = BETSAPI_SPORT_MAP[Number(ev.sport_id)];
      const hasDraw   = sportMeta?.hasDraw ?? false;

      // ── Step 1: try live inplay odds ──────────────────────────────────
      try {
        if (!(await reserveBetsApiCredit())) {
          recordApiCall("betsapi", false, "rate_limited", "inplay → hourly credit cap reached");
        } else {
        const url = `${BETSAPI_BASE}/v1/bet365/inplay?FI=${ev.id}&token=${BETSAPI_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(PER_FETCH) });
        if (res.ok) {
          const json = await res.json() as PrematchResponse;
          if (json.success === 1) {
            // Definitive API answer — cache regardless of whether 1X2 was found
            recordApiCall("betsapi", true, "ok");
            const odds = parsePrematchOdds(json, hasDraw);
            inplayOddsCache.set(ev.id, { odds, expiresAt: now + INPLAY_TTL_MS });
            if (odds !== null) return { ...ev, prematchOdds: odds };
            // success=1 but no 1X2 market → fall through to prematch
          } else {
            // success≠1 → transient; don't cache; fall through
            recordApiCall("betsapi", false, "success=0", "inplay → success=0");
          }
        } else {
          // non-2xx → transient; fall through
          recordApiCall("betsapi", false, `HTTP ${res.status}`, `inplay → HTTP ${res.status}`);
        }
        }
      } catch {
        // timeout / network error → transient; fall through
        recordApiCall("betsapi", false, "network", "inplay → network/timeout");
      }

      // ── Step 2: fall back to prematch opening odds ─────────────────────
      const prematchHit = prematchOddsCache.get(ev.id);
      if (prematchHit && prematchHit.expiresAt > now) {
        return prematchHit.odds !== null ? { ...ev, prematchOdds: prematchHit.odds } : null;
      }
      try {
        if (!(await reserveBetsApiCredit())) { recordApiCall("betsapi", false, "rate_limited", "prematch → hourly credit cap reached"); return null; }
        const url = `${BETSAPI_BASE}/v1/bet365/prematch?FI=${ev.id}&token=${BETSAPI_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(PER_FETCH) });
        if (!res.ok) { recordApiCall("betsapi", false, `HTTP ${res.status}`, `prematch → HTTP ${res.status}`); return null; }
        const json = await res.json() as PrematchResponse;
        if (json.success !== 1) { recordApiCall("betsapi", false, "success=0", "prematch → success=0"); return null; }
        recordApiCall("betsapi", true, "ok");
        const odds = parsePrematchOdds(json, hasDraw);
        prematchOddsCache.set(ev.id, { odds, expiresAt: now + PREMATCH_TTL_MS });
        return odds !== null ? { ...ev, prematchOdds: odds } : null;
      } catch {
        recordApiCall("betsapi", false, "network", "prematch → network/timeout");
        return null;
      }
    }));
    results.push(...(batchResult.filter(Boolean) as BetsApiEventRaw[]));
  }

  return results;
}

/**
 * Fetch all inplay events using /v1/bet365/inplay_filter per sport,
 * then enrich each event with real Bet365 prematch 1X2 odds.
 * Events for which no real odds are available are excluded from the result.
 */
export async function fetchBetsApiInplay(
  allowedIds?: Set<string>,
  allowedSportIds?: Set<number>,
): Promise<BetsApiEventRaw[]> {
  if (!BETSAPI_KEY) return [];

  // Bet-scoped (Task #243): when an allow-list is supplied and it is empty, there
  // are no live matches with active user bets — skip ALL upstream calls entirely.
  if (allowedIds && allowedIds.size === 0) return [];

  const ALL_LIVE_SPORT_IDS = [1, 3, 8, 12, 13, 14, 16, 17, 19, 92, 94, 95];
  // Bet-scoped fan-out: when we know the sports the active-bet fixtures belong to,
  // only poll those sports' inplay lists (e.g. 1 call instead of 12 for a single
  // soccer bet). Fall back to all live sports when the sport set can't be resolved
  // so we never miss live data for a genuinely active bet.
  const liveSportIds =
    allowedSportIds && allowedSportIds.size > 0
      ? ALL_LIVE_SPORT_IDS.filter(id => allowedSportIds.has(id))
      : ALL_LIVE_SPORT_IDS;

  const fetchSport = async (sportId: number): Promise<BetsApiEventRaw[]> => {
    try {
      if (!(await reserveBetsApiCredit())) { recordApiCall("betsapi", false, "rate_limited", `inplay_filter sport ${sportId} → hourly credit cap reached`); return []; }
      const url = `${BETSAPI_BASE}/v1/bet365/inplay_filter?sport_id=${sportId}&token=${BETSAPI_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) { recordApiCall("betsapi", false, `HTTP ${res.status}`, `inplay_filter sport ${sportId} → HTTP ${res.status}`); return []; }
      const json = await res.json() as BetsApiListResponse;
      if (json.success !== 1 || !Array.isArray(json.results)) { recordApiCall("betsapi", false, "success=0", `inplay_filter sport ${sportId} → success=0`); return []; }
      recordApiCall("betsapi", true, "ok");
      return json.results.filter(filterEvent);
    } catch {
      recordApiCall("betsapi", false, "network", `inplay_filter sport ${sportId} → network/timeout`);
      return [];
    }
  };

  const results = await Promise.all(liveSportIds.map(fetchSport));
  const allEvents = results.flat();

  // Enrich with live inplay odds (prematch fallback); events without real odds are dropped.
  // When bet-scoped, only fixtures in the allow-list incur per-fixture enrichment calls.
  return enrichWithLiveOdds(allEvents, allowedIds);
}
