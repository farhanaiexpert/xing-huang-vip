/**
 * Auto-Settlement Worker  (v4)
 *
 * Three-source settlement:
 *  1. The Odds API  /v4/sports/{sport}/scores      — primary, Odds-API events
 *  2. BetsAPI       /v1/bet365/result?FI={id}      — BetsAPI (betsapi_*) events
 *  3. Manual review — fallback after 48 h with no result from either source
 *
 * Settlement timing: driven by match commence_time stored at bet placement,
 * NOT by the bet's created_at timestamp.
 *
 * Decision tree per event (evaluated each cron tick):
 *  1. commence_time in future (or null for legacy rows) → skip, keep open
 *  2. commence_time in past → attempt settlement from source 1 then 2
 *  3. Result found (Odds API exact ID or api_live_ prefix) → settle via source 1
 *  4. Event ID starts with "betsapi_" → query BetsAPI result endpoint (source 2)
 *  5. No result found AND < 48h after commence_time → keep open, retry next tick
 *  6. No result found AND ≥ 48h after commence_time → mark bet as manual_review
 *
 * Event identity: always matched by eventId (exact).
 *  - Odds API events:    UUID string, e.g. "a3f9c21b-88d4-4e12-…"
 *  - api_live_XXXX:      strip prefix → look up real Odds API UUID
 *  - betsapi_XXXXXXXX:   strip prefix → fixture ID for /v1/bet365/result call
 *
 * Idempotent: only processes bet_selections with status = 'open'.
 */

import { eq, sql, and } from "drizzle-orm";
import {
  db,
  betsTable,
  betSelectionsTable,
  walletsTable,
  transactionsTable,
  settlementLogTable,
  marketLiabilityTable,
  userLimitsTable,
  loyaltyPointsTable,
  referralsTable,
  commissionsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { nextResetAt } from "./depositGuard.js";
import {
  fetchCompletedScoresApiFootball,
  isApiFootballSport,
  type CompletedEvent,
} from "./apiFootball.js";
import { fetchBetsApiResult } from "./betsApiResult.js";

const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

/**
 * Bets with no result from any source this many hours after commence_time
 * are escalated to manual_review (instead of auto-voided).
 */
const AUTO_SETTLEMENT_REVIEW_HOURS = 48;

/**
 * Maps generic / internal sport identifiers to the specific Odds API sport keys
 * needed for the /scores endpoint.
 */
const SPORT_KEY_EXPANSION: Record<string, string[]> = {
  // ── Generic names (sport_key prefix) ──────────────────────────────────────
  basketball:       ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl'],
  soccer:           ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
                     'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_turkey_super_league',
                     'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato', 'soccer_mexico_ligamx',
                     'soccer_efl_champ', 'soccer_scotland_premiership', 'soccer_portugal_primeira_liga',
                     'soccer_belgium_first_div', 'soccer_argentina_primera_division',
                     'soccer_conmebol_copa_libertadores', 'soccer_korea_kleague1', 'soccer_japan_j_league',
                     'soccer_australia_aleague', 'soccer_india_superleague', 'soccer_conmebol_copa_america',
                     'soccer_uefa_nations_league', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
                     'soccer_fifa_world_cup', 'soccer_brazil_serie_b', 'soccer_chile_campeonato',
                     'soccer_conmebol_copa_sudamericana', 'soccer_sweden_allsvenskan',
                     'soccer_norway_eliteserien', 'soccer_denmark_superliga', 'soccer_china_superleague'],
  football:         ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
                     'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league'],
  tennis:           ['tennis_atp_french_open', 'tennis_wta_french_open', 'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
                     'tennis_atp_us_open', 'tennis_wta_us_open', 'tennis_atp_australian_open', 'tennis_wta_australian_open'],
  americanfootball: ['americanfootball_nfl', 'americanfootball_ncaaf', 'americanfootball_ufl'],
  cricket:          ['cricket_ipl', 'cricket_international_t20', 'cricket_big_bash', 'cricket_psl', 'cricket_test_match'],
  baseball:         ['baseball_mlb', 'baseball_npb', 'baseball_kbo'],
  icehockey:        ['icehockey_nhl', 'icehockey_sweden_hockey_league'],
  rugbyleague:      ['rugbyleague_nrl', 'rugbyleague_super_league'],
  rugbyunion:       ['rugbyunion_premiership', 'rugbyunion_super_rugby', 'rugbyunion_six_nations',
                     'rugbyunion_world_cup', 'rugbyunion_champions_cup'],
  mma:              ['mma_mixed_martial_arts'],
  boxing:           ['boxing_event'],
  aussierules:      ['aussierules_afl'],

  // ── Internal sp_ IDs ──────────────────────────────────────────────────────
  sp_nba:               ['basketball_nba'],
  sp_basketball:        ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl'],
  sp_soccer:            ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
                         'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_turkey_super_league',
                         'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato', 'soccer_mexico_ligamx',
                         'soccer_efl_champ', 'soccer_scotland_premiership', 'soccer_portugal_primeira_liga',
                         'soccer_belgium_first_div', 'soccer_argentina_primera_division',
                         'soccer_conmebol_copa_libertadores', 'soccer_korea_kleague1', 'soccer_japan_j_league',
                         'soccer_australia_aleague', 'soccer_india_superleague', 'soccer_conmebol_copa_america',
                         'soccer_uefa_nations_league', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
                         'soccer_fifa_world_cup', 'soccer_brazil_serie_b', 'soccer_chile_campeonato',
                         'soccer_conmebol_copa_sudamericana', 'soccer_sweden_allsvenskan',
                         'soccer_norway_eliteserien', 'soccer_denmark_superliga', 'soccer_china_superleague'],
  sp_ucl:               ['soccer_uefa_champs_league'],
  sp_tennis:            ['tennis_atp_french_open', 'tennis_wta_french_open', 'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
                         'tennis_atp_us_open', 'tennis_wta_us_open', 'tennis_atp_australian_open', 'tennis_wta_australian_open'],
  sp_american_football: ['americanfootball_nfl', 'americanfootball_ncaaf', 'americanfootball_ufl'],
  sp_cricket:           ['cricket_ipl', 'cricket_international_t20', 'cricket_big_bash', 'cricket_psl', 'cricket_test_match'],
  sp_baseball:          ['baseball_mlb', 'baseball_npb', 'baseball_kbo'],
  sp_ice_hockey:        ['icehockey_nhl', 'icehockey_sweden_hockey_league'],
  sp_rugby_league:      ['rugbyleague_nrl', 'rugbyleague_super_league'],
  sp_rugby_union:       ['rugbyunion_premiership', 'rugbyunion_super_rugby', 'rugbyunion_six_nations',
                         'rugbyunion_world_cup', 'rugbyunion_champions_cup'],
  sp_mma:               ['mma_mixed_martial_arts'],
  sp_boxing:            ['boxing_event'],
  sp_aussie_rules:      ['aussierules_afl'],
  sp_horse_racing:      [],

  // ── BetsAPI sport_id prefixed keys ────────────────────────────────────────
  betsapi_1:   ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
                'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_turkey_super_league',
                'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato', 'soccer_mexico_ligamx',
                'soccer_efl_champ', 'soccer_scotland_premiership', 'soccer_portugal_primeira_liga',
                'soccer_belgium_first_div', 'soccer_argentina_primera_division',
                'soccer_conmebol_copa_libertadores', 'soccer_korea_kleague1', 'soccer_japan_j_league',
                'soccer_australia_aleague', 'soccer_india_superleague', 'soccer_conmebol_copa_america',
                'soccer_uefa_nations_league', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league'],
  betsapi_3:   ['cricket_ipl', 'cricket_international_t20', 'cricket_big_bash', 'cricket_psl', 'cricket_test_match'],
  betsapi_8:   ['rugbyunion_premiership', 'rugbyunion_super_rugby', 'rugbyunion_six_nations',
                'rugbyunion_world_cup', 'rugbyunion_champions_cup'],
  betsapi_9:   ['boxing_event'],
  betsapi_12:  ['americanfootball_nfl', 'americanfootball_ncaaf', 'americanfootball_ufl'],
  betsapi_13:  ['baseball_mlb', 'baseball_npb', 'baseball_kbo'],
  betsapi_14:  ['icehockey_nhl', 'icehockey_sweden_hockey_league'],
  betsapi_16:  ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl'],
  betsapi_17:  ['tennis_atp_french_open', 'tennis_wta_french_open', 'tennis_atp_wimbledon', 'tennis_wta_wimbledon',
                'tennis_atp_us_open', 'tennis_wta_us_open', 'tennis_atp_australian_open', 'tennis_wta_australian_open'],
  betsapi_18:  [],
  betsapi_19:  [],
  betsapi_36:  ['aussierules_afl'],
  betsapi_78:  ['rugbyleague_nrl', 'rugbyleague_super_league'],
  betsapi_91:  [],
  betsapi_92:  [],
  betsapi_94:  [],
  betsapi_95:  [],
  betsapi_161: ['mma_mixed_martial_arts'],
};

const UNKNOWN_SPORT_FALLBACK: string[] = [
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
  'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_ukraine_premier_league',
  'soccer_turkey_super_league', 'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato',
  'soccer_mexico_ligamx', 'soccer_efl_champ', 'soccer_scotland_premiership',
  'soccer_portugal_primeira_liga', 'soccer_belgium_first_div',
  'soccer_argentina_primera_division', 'soccer_conmebol_copa_libertadores',
  'soccer_korea_kleague1', 'soccer_japan_j_league', 'soccer_australia_aleague',
  'soccer_conmebol_copa_america', 'soccer_uefa_nations_league',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'basketball_nba', 'basketball_ncaab', 'basketball_euroleague',
  'tennis_atp_french_open', 'tennis_wta_french_open', 'tennis_atp_wimbledon',
  'tennis_wta_wimbledon', 'tennis_atp_us_open',
  'americanfootball_nfl', 'americanfootball_ncaaf',
  'mma_mixed_martial_arts', 'boxing_event',
  'cricket_ipl', 'cricket_international_t20',
];

export function expandSportKey(sport: string): string[] {
  const expansion = SPORT_KEY_EXPANSION[sport];
  if (expansion) return expansion;
  if (sport && sport.includes('_') && !sport.startsWith('sp_')) return [sport];
  return UNKNOWN_SPORT_FALLBACK;
}

/**
 * Returns true when the event hasn't kicked off yet and should be skipped
 * by the settlement cron (no result can exist before the match starts).
 * Null commenceTime = legacy row without stored match time → never skip.
 */
export function shouldSkipFutureEvent(commenceTime: Date | null, now: Date): boolean {
  if (!commenceTime) return false;
  return commenceTime > now;
}

/**
 * Returns true when enough time has passed since kick-off that we consider
 * a "no result found" state to be stuck and escalate to manual_review.
 * Null commenceTime = legacy row → never escalate automatically.
 */
export function shouldEscalateToManualReview(
  commenceTime: Date | null,
  now: Date,
  reviewHours: number = AUTO_SETTLEMENT_REVIEW_HOURS,
): boolean {
  if (!commenceTime) return false;
  return (now.getTime() - commenceTime.getTime()) >= reviewHours * 60 * 60 * 1000;
}

/**
 * Pure function mirroring the accumulator outcome logic in settleBetsForEvent.
 * Given an array of settled selection statuses for one bet, returns the final
 * bet outcome.  "open" status means at least one leg is still running.
 *
 * Rules (in priority order):
 *   1. Any "open"  → bet still running ("open")
 *   2. Any "lost"  → entire accumulator lost ("lost")
 *   3. All "void"  → stake refunded ("void")
 *   4. Otherwise   → all remaining legs won, possibly with some voids ("won")
 */
export function combineAccumulatorOutcome(
  statuses: ("won" | "lost" | "void" | "open")[],
): "won" | "lost" | "void" | "open" {
  if (statuses.length === 0)             return "void";
  if (statuses.some(s => s === "open"))  return "open";
  if (statuses.some(s => s === "lost"))  return "lost";
  if (statuses.every(s => s === "void")) return "void";
  return "won";
}

// ─── Team name fuzzy matching (used within mapSelectionOutcome score mapping) ──

function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Mutex ────────────────────────────────────────────────────────────────────

let isRunning = false;

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchOutcome = "home" | "away" | "draw" | "void";

interface EventOutcome {
  marketType: string;
  selection:  string;
  result:     "won" | "lost" | "void";
}

interface OpenEventMeta {
  eventId:      string;
  eventName:    string;
  sport:        string;
  homeTeam:     string;   // from bet_selections.home_team (stored at placement)
  awayTeam:     string;   // from bet_selections.away_team (stored at placement)
  commenceTime: Date | null; // from bet_selections.commence_time (stored at placement)
}

// ─── Odds API score fetching ──────────────────────────────────────────────────

async function fetchCompletedScoresOddsApi(sportKey: string): Promise<CompletedEvent[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=3&dateFormat=iso`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      logger.warn({ sport: sportKey, status: res.status }, "Odds API scores: fetch failed");
      return [];
    }
    const data = (await res.json()) as CompletedEvent[];
    return Array.isArray(data)
      ? data.filter(e => e.completed && Array.isArray(e.scores) && e.scores.length > 0)
      : [];
  } catch (err) {
    logger.warn({ err, sport: sportKey }, "Odds API scores: request error");
    return [];
  }
}

// ─── Result determination ─────────────────────────────────────────────────────

export function determineMatchOutcome(event: CompletedEvent): MatchOutcome {
  if (!event.scores || event.scores.length < 2) return "void";
  const homeEntry = event.scores.find(s => s.name === event.home_team);
  const awayEntry = event.scores.find(s => s.name === event.away_team);
  if (!homeEntry || !awayEntry) return "void";
  const home = parseFloat(homeEntry.score);
  const away = parseFloat(awayEntry.score);
  if (isNaN(home) || isNaN(away)) return "void";
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function getNumericScores(event: CompletedEvent): { home: number; away: number } | null {
  if (!event.scores || event.scores.length < 2) return null;
  const homeEntry = event.scores.find(s => s.name === event.home_team);
  const awayEntry = event.scores.find(s => s.name === event.away_team);
  if (!homeEntry || !awayEntry) return null;
  const home = parseFloat(homeEntry.score);
  const away = parseFloat(awayEntry.score);
  if (isNaN(home) || isNaN(away)) return null;
  return { home, away };
}

/**
 * Normalize the raw market_type string stored in bet_selections
 * (display name from the frontend) to a canonical settlement key.
 */
export function normalizeMarketType(mt: string): string {
  const lower = mt.toLowerCase().trim();
  if (["h2h", "match result", "1x2", "match winner", "moneyline", "winner"].includes(lower))
    return "h2h";
  if (lower === "totals" || lower.startsWith("over/under") || lower === "over_under" || lower === "total goals")
    return "totals";
  if (["spreads", "point_spread", "handicap", "asian handicap"].includes(lower))
    return "spreads";
  if (["btts", "both teams to score", "both teams score", "gg/ng", "gg"].includes(lower))
    return "btts";
  return lower;
}

/**
 * Determine whether a bet selection won, lost, or should be voided.
 *
 * @param storedHome - team name as stored at bet placement (optional, improves matching)
 * @param storedAway - team name as stored at bet placement (optional, improves matching)
 */
export function mapSelectionOutcome(
  selection:  string,
  outcome:    MatchOutcome,
  homeTeam:   string,
  awayTeam:   string,
  storedHome?: string,
  storedAway?: string,
): "won" | "lost" | "void" {
  if (outcome === "void") return "void";
  const sel  = normalizeTeam(selection);
  const home = normalizeTeam(homeTeam);
  const away = normalizeTeam(awayTeam);
  const sh   = storedHome ? normalizeTeam(storedHome) : "";
  const sa   = storedAway ? normalizeTeam(storedAway) : "";

  // Build deduplicated word lists (length > 2) from API name + stored name
  const homeWords = [...new Set([...home.split(" "), ...sh.split(" ")].filter(w => w.length > 2))];
  const awayWords = [...new Set([...away.split(" "), ...sa.split(" ")].filter(w => w.length > 2))];

  /**
   * Returns true if `s` refers to the home team.
   * Checks exact match, substring containment, and significant word overlap.
   */
  const isHomeAlias = (s: string): boolean => {
    if (s === home || (sh && s === sh)) return true;
    if (s === "1" || s === "home") return true;
    // Substring: selection contains the full team name or vice-versa
    if (home && (s.includes(home) || home.includes(s))) return true;
    if (sh   && (s.includes(sh)   || sh.includes(s)))   return true;
    // Word overlap: majority of significant words match
    const matchCount = homeWords.filter(w => s.includes(w)).length;
    if (homeWords.length > 0 && matchCount >= Math.max(1, Math.ceil(homeWords.length * 0.5))) return true;
    return false;
  };

  const isAwayAlias = (s: string): boolean => {
    if (s === away || (sa && s === sa)) return true;
    if (s === "2" || s === "away") return true;
    if (away && (s.includes(away) || away.includes(s))) return true;
    if (sa   && (s.includes(sa)   || sa.includes(s)))   return true;
    const matchCount = awayWords.filter(w => s.includes(w)).length;
    if (awayWords.length > 0 && matchCount >= Math.max(1, Math.ceil(awayWords.length * 0.5))) return true;
    return false;
  };

  // Detect ambiguity: if sel matches BOTH home and away (e.g. shared word like "city")
  // prefer the more specific match (more words matched) before falling through
  const homeMatchCount = homeWords.filter(w => sel.includes(w)).length;
  const awayMatchCount = awayWords.filter(w => sel.includes(w)).length;

  const selIsHome = isHomeAlias(sel);
  const selIsAway = isAwayAlias(sel);

  // Resolve ambiguity by word-overlap count
  const resolvedHome = selIsHome && (!selIsAway || homeMatchCount >= awayMatchCount);
  const resolvedAway = selIsAway && (!selIsHome || awayMatchCount >  homeMatchCount);

  if (outcome === "home") {
    if (resolvedHome) return "won";
    if (resolvedAway) return "lost";
    if (sel === "draw" || sel === "x") return "lost";
  }
  if (outcome === "away") {
    if (resolvedAway) return "won";
    if (resolvedHome) return "lost";
    if (sel === "draw" || sel === "x") return "lost";
  }
  if (outcome === "draw") {
    if (sel === "draw" || sel === "x") return "won";
    // Any team selection loses on a draw
    if (resolvedHome || resolvedAway) return "lost";
    return "lost";
  }

  return "void";
}

export function mapBttsOutcome(
  selection: string,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "void" {
  const sel = selection.toLowerCase().trim();
  const bothScored = homeScore > 0 && awayScore > 0;
  if (sel === "yes") return bothScored ? "won" : "lost";
  if (sel === "no")  return bothScored ? "lost" : "won";
  return "void";
}

/**
 * Settle a totals (over/under) market.
 * Uses `storedPoint` when available (from bet_selections.point),
 * otherwise parses the line from the selection label string.
 */
export function mapTotalsOutcome(
  selection:   string,
  homeScore:   number,
  awayScore:   number,
  storedPoint?: number | null,
): "won" | "lost" | "void" {
  const total = homeScore + awayScore;
  const lower = selection.toLowerCase().trim();

  const line = (() => {
    if (storedPoint != null && !isNaN(storedPoint)) return storedPoint;
    const m = lower.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  })();

  if (line == null || isNaN(line)) return "void";

  const isOver  = lower.includes("over");
  const isUnder = lower.includes("under");

  if (!isOver && !isUnder) return "void";

  if (isOver) {
    if (total > line) return "won";
    if (total < line) return "lost";
    return "void"; // push
  }
  // isUnder
  if (total < line) return "won";
  if (total > line) return "lost";
  return "void"; // push
}

/**
 * Settle a spreads / handicap market.
 * Uses `storedPoint` when available, otherwise parses spread from selection label.
 */
export function mapSpreadsOutcome(
  selection:   string,
  homeTeam:    string,
  awayTeam:    string,
  homeScore:   number,
  awayScore:   number,
  storedPoint?: number | null,
): "won" | "lost" | "void" {
  const lower = selection.toLowerCase().trim();
  const home  = homeTeam.toLowerCase().trim();
  const away  = awayTeam.toLowerCase().trim();

  let teamPart: string;
  let spread: number;

  if (storedPoint != null && !isNaN(storedPoint)) {
    // Extract team part only; sign is encoded in storedPoint
    const withSign = lower.match(/^(.+?)\s*[+-]\d+(?:\.\d+)?$/);
    teamPart = withSign ? withSign[1].trim() : lower;
    spread   = storedPoint;
  } else {
    const spreadMatch = lower.match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)$/);
    if (!spreadMatch) return "void";
    teamPart = spreadMatch[1].trim();
    spread   = parseFloat(spreadMatch[2]);
    if (isNaN(spread)) return "void";
  }

  const isHome = teamPart === home || home.split(" ").some(w => teamPart.includes(w) && w.length > 2);
  const isAway = teamPart === away || away.split(" ").some(w => teamPart.includes(w) && w.length > 2);
  if (!isHome && !isAway) return "void";

  const margin = isHome ? homeScore + spread - awayScore : awayScore + spread - homeScore;
  if (margin > 0) return "won";
  if (margin < 0) return "lost";
  return "void"; // push
}

// ─── DB settlement transaction ────────────────────────────────────────────────

async function settleBetsForEvent(
  eventId:  string,
  outcomes: EventOutcome[],
): Promise<{ settled: number; won: number; lost: number; voided: number; payout: number; transactionIds: number[] }> {
  let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoided = 0, totalPayout = 0;
  const transactionIds: number[] = [];

  await db.transaction(async tx => {
    const affectedBetIds = new Set<number>();

    for (const { marketType, selection, result } of outcomes) {
      const updated = await tx.execute(sql`
        UPDATE bet_selections
        SET    status = ${result}
        WHERE  event_id    = ${eventId}
          AND  market_type = ${marketType}
          AND  selection   = ${selection}
          AND  status      = 'open'
        RETURNING bet_id
      `);
      for (const r of updated.rows as { bet_id: number }[]) {
        affectedBetIds.add(r.bet_id);
      }
    }

    if (affectedBetIds.size === 0) return;

    for (const betId of affectedBetIds) {
      const [bet] = await tx.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
      if (!bet || bet.status !== "open") continue;

      const allSelections = await tx.select().from(betSelectionsTable)
        .where(eq(betSelectionsTable.betId, betId));

      const hasLost = allSelections.some(s => s.status === "lost");
      const hasOpen = allSelections.some(s => s.status === "open");

      // BUG-02 fix: if any leg is confirmed lost, bust the accumulator immediately.
      // Void remaining open legs so we can resolve the bet now rather than waiting.
      if (hasLost && hasOpen) {
        await tx.execute(sql`
          UPDATE bet_selections SET status = 'void'
          WHERE bet_id = ${betId} AND status = 'open'
        `);
        const refreshed = await tx.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, betId));
        allSelections.splice(0, allSelections.length, ...refreshed);
      }

      // Still waiting for other legs (no loss confirmed yet)
      if (!hasLost && hasOpen) continue;

      const allVoid  = allSelections.every(s => s.status === "void");
      const wonLegs  = allSelections.filter(s => s.status === "won");

      let newStatus: string;
      let payout = 0;

      if (hasLost) {
        newStatus = "lost";
        totalLost++;
      } else if (allVoid) {
        newStatus = "void";
        payout    = parseFloat(String(bet.stake));
        totalVoided++;
      } else {
        newStatus     = "won";
        const adjOdds = wonLegs.reduce((acc, s) => acc * parseFloat(String(s.odds)), 1);
        payout        = parseFloat(String(bet.stake)) * adjOdds;
        totalWon++;
      }

      await tx.update(betsTable)
        .set({ status: newStatus, settledAt: new Date(), settledPayout: payout.toFixed(8) })
        .where(eq(betsTable.id, betId));
      totalSettled++;

      // Decrement market liability
      for (const sel of allSelections) {
        const selPayout = parseFloat(String(sel.odds)) * parseFloat(String(bet.stake));
        await tx.execute(sql`
          UPDATE market_liability
          SET
            total_stake      = GREATEST(0, total_stake - ${String(bet.stake)}::numeric),
            potential_payout = GREATEST(0, potential_payout - ${selPayout.toFixed(8)}::numeric),
            bet_count        = GREATEST(0, bet_count - 1)
          WHERE event_id    = ${sel.eventId}
            AND market_type = ${sel.marketType}
            AND selection   = ${sel.selection}
        `);
      }

      // Increment loss-limit usage on lost bets
      if (newStatus === "lost") {
        const now = new Date();
        const lossLimits = await tx.select().from(userLimitsTable)
          .where(and(eq(userLimitsTable.userId, bet.userId), eq(userLimitsTable.limitType, "loss")));
        for (const lim of lossLimits) {
          if (new Date(lim.resetAt) < now) {
            await tx.update(userLimitsTable)
              .set({ currentUsage: "0", resetAt: nextResetAt(lim.period), pendingAmountUsdt: "0", pendingEffectiveAt: null })
              .where(eq(userLimitsTable.id, lim.id));
            continue;
          }
          await tx.update(userLimitsTable)
            .set({ currentUsage: sql`current_usage + ${String(bet.stake)}` })
            .where(eq(userLimitsTable.id, lim.id));
        }
      }

      if (payout > 0) {
        totalPayout += payout;
        const txType = newStatus === "void" ? "refund" : "win";
        const [txRow] = await tx.insert(transactionsTable).values({
          userId:    bet.userId,
          type:      txType,
          amount:    payout.toFixed(8),
          status:    "completed",
          reference: `bet_${betId}`,
          notes:     newStatus === "void"
            ? `Bet #${betId} voided — stake refunded`
            : `Bet #${betId} won — payout ${payout.toFixed(2)} USDT`,
        }).returning({ id: transactionsTable.id });
        if (txRow) transactionIds.push(txRow.id);
        await tx.execute(sql`
          UPDATE wallets
          SET balance_usdt = balance_usdt + ${payout.toFixed(8)}
          WHERE user_id = ${bet.userId}
        `);
      }

      // Award loyalty points (1 pt/USDT for singles; 2× for accas)
      const stakeAmt   = parseFloat(String(bet.stake));
      const loyaltyPts = stakeAmt * (bet.type === "accumulator" ? 2 : 1);
      await tx.insert(loyaltyPointsTable).values({
        userId: bet.userId,
        betId,
        points: loyaltyPts.toFixed(2),
        reason: "bet_settled",
      }).onConflictDoNothing();

      // Generate referral commissions for winning bets only.
      // With the multi-tier row model, referralsTable has explicit rows for
      // tier 1/2/3 for every referred user — no chain-walk needed.
      if (newStatus === "won") {
        const commRates: Record<number, number> = { 1: 0.05, 2: 0.03, 3: 0.01 };
        const refs = await tx
          .select({ id: referralsTable.id, referrerId: referralsTable.referrerId, tier: referralsTable.tier })
          .from(referralsTable)
          .where(eq(referralsTable.referredId, bet.userId));
        for (const ref of refs) {
          const rate = commRates[ref.tier];
          if (!rate) continue;
          const commAmount = stakeAmt * rate;
          await tx.insert(commissionsTable).values({
            referralId: ref.id,
            userId: ref.referrerId,
            amount: commAmount.toFixed(8),
            status: "pending",
            tier: ref.tier,
            sourceTransactionId: betId,
          }).onConflictDoNothing();
        }
      }
    }
  });

  return { settled: totalSettled, won: totalWon, lost: totalLost, voided: totalVoided, payout: totalPayout, transactionIds };
}

// ─── Mark bets as manual_review ───────────────────────────────────────────────

/**
 * Escalates all open bets for an event to 'manual_review' status.
 * Used when 48h have elapsed since commence_time and neither Odds API nor
 * API-Football returned a completed result.
 * The bet's selections stay 'open' so an admin can settle them manually.
 */
async function markBetsAsManualReview(
  eventId: string,
  eventName: string,
  commenceTime?: Date | null,
): Promise<number> {
  const affected = await db.execute(sql`
    SELECT DISTINCT bet_id FROM bet_selections
    WHERE event_id = ${eventId} AND status = 'open'
  `);
  let count = 0;
  for (const row of affected.rows as { bet_id: number }[]) {
    const betId = row.bet_id;
    const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
    if (!bet || bet.status !== "open") continue;
    await db.update(betsTable)
      .set({ status: "manual_review" })
      .where(eq(betsTable.id, betId));
    count++;
  }
  if (count > 0) {
    await db.insert(settlementLogTable).values({
      eventId,
      eventName,
      sport:       "",
      result:      "manual_review",
      commenceTime: commenceTime ?? null,
      betsSettled:  count,
      betsWon:      0,
      betsLost:     0,
      betsVoided:   0,
      totalPayout:  "0",
      source:       "manual_review",
    });
    logger.warn(
      { eventId, eventName, betsMarked: count, reviewAfterHours: AUTO_SETTLEMENT_REVIEW_HOURS },
      "Settlement worker: marked manual_review — no result after commence_time cutoff",
    );
  }
  return count;
}

// ─── Settle a single event from any source ───────────────────────────────────

async function processEvent(
  event:         CompletedEvent,
  sport:         string,
  source:        "odds_api" | "api_football" | "betsapi",
  commenceTime?: Date | null,
): Promise<number> {
  const matchOutcome = determineMatchOutcome(event);

  const openSelectionsResult = await db.execute(sql`
    SELECT DISTINCT market_type, selection, point, home_team, away_team
    FROM bet_selections
    WHERE event_id = ${event.id} AND status = 'open'
  `);
  if (openSelectionsResult.rows.length === 0) return 0;

  const numericScores = getNumericScores(event);
  const outcomes: EventOutcome[] = [];

  for (const row of openSelectionsResult.rows as {
    market_type: string;
    selection:   string;
    point:       string | null;
    home_team:   string;
    away_team:   string;
  }[]) {
    let result: "won" | "lost" | "void";
    const mt          = normalizeMarketType(row.market_type);
    const storedPoint = row.point != null ? parseFloat(row.point) : null;
    const storedHome  = row.home_team || undefined;
    const storedAway  = row.away_team || undefined;

    if (mt === "h2h") {
      result = mapSelectionOutcome(
        row.selection, matchOutcome,
        event.home_team, event.away_team,
        storedHome, storedAway,
      );
    } else if (mt === "totals") {
      if (!numericScores) continue;
      result = mapTotalsOutcome(row.selection, numericScores.home, numericScores.away, storedPoint);
    } else if (mt === "spreads") {
      if (!numericScores) continue;
      result = mapSpreadsOutcome(
        row.selection, event.home_team, event.away_team,
        numericScores.home, numericScores.away,
        storedPoint,
      );
    } else if (mt === "btts") {
      if (!numericScores) continue;
      result = mapBttsOutcome(row.selection, numericScores.home, numericScores.away);
    } else {
      result = "void";
    }
    outcomes.push({ marketType: row.market_type, selection: row.selection, result });
  }

  if (outcomes.length === 0) return 0;

  const nameLookup = await db.execute(sql`
    SELECT event_name FROM bet_selections WHERE event_id = ${event.id} LIMIT 1
  `);
  const eventName = (nameLookup.rows[0] as { event_name: string } | undefined)?.event_name ?? event.id;

  const stats = await settleBetsForEvent(event.id, outcomes);
  if (stats.settled === 0) return 0;

  const homeEntry = event.scores?.find(s => s.name === event.home_team);
  const awayEntry = event.scores?.find(s => s.name === event.away_team);

  await db.insert(settlementLogTable).values({
    eventId:     event.id,
    eventName,
    sport,
    result:      matchOutcome,
    homeTeam:    event.home_team,
    awayTeam:    event.away_team,
    homeScore:   homeEntry?.score ?? "",
    awayScore:   awayEntry?.score ?? "",
    commenceTime: commenceTime ?? null,
    betsSettled: stats.settled,
    betsWon:     stats.won,
    betsLost:    stats.lost,
    betsVoided:  stats.voided,
    totalPayout: stats.payout.toFixed(8),
    source,
  });

  logger.info(
    {
      eventId:        event.id,
      eventName,
      sport,
      source,
      matchOutcome,
      finalScore:     `${homeEntry?.score ?? "?"}-${awayEntry?.score ?? "?"}`,
      commenceTime:   commenceTime?.toISOString() ?? null,
      transactionIds: stats.transactionIds,
      betsSettled:    stats.settled,
      betsWon:        stats.won,
      betsLost:       stats.lost,
      betsVoided:     stats.voided,
      totalPayout:    stats.payout,
    },
    "Settlement worker: event settled",
  );
  return stats.settled;
}

// ─── Core processing loop ─────────────────────────────────────────────────────

async function processSettlement(): Promise<void> {
  if (!ODDS_API_KEY) {
    logger.warn("Settlement worker: ODDS_API_KEY not configured — skipping");
    return;
  }

  const now = new Date();
  const reviewCutoffMs = AUTO_SETTLEMENT_REVIEW_HOURS * 60 * 60 * 1000;

  // Load all open events with stored team names and commence_time.
  // Legacy rows (no commence_time) are still included — they skip the
  // future-match guard and proceed straight to settlement attempts.
  const openResult = await db.execute(sql`
    SELECT
      event_id,
      event_name,
      sport,
      MAX(home_team)     AS home_team,
      MAX(away_team)     AS away_team,
      MIN(commence_time) AS commence_time
    FROM bet_selections
    WHERE status = 'open' AND event_id != ''
    GROUP BY event_id, event_name, sport
  `);

  const openBetEventCount = openResult.rows.length;
  logger.info(
    { count: openBetEventCount },
    `[settlementWorker] open bets found: ${openBetEventCount}`,
  );
  if (openBetEventCount === 0) return;

  const allOpenEvents: OpenEventMeta[] = (openResult.rows as {
    event_id: string; event_name: string; sport: string;
    home_team: string; away_team: string; commence_time: string | null;
  }[]).map(r => ({
    eventId:      r.event_id,
    eventName:    r.event_name,
    sport:        r.sport,
    homeTeam:     r.home_team ?? "",
    awayTeam:     r.away_team ?? "",
    commenceTime: r.commence_time ? new Date(r.commence_time) : null,
  }));

  // Group by sport key
  const bySport = new Map<string, OpenEventMeta[]>();
  for (const ev of allOpenEvents) {
    const list = bySport.get(ev.sport) ?? [];
    list.push(ev);
    bySport.set(ev.sport, list);
  }

  logger.info(
    { sports: [...bySport.keys()], totalEvents: allOpenEvents.length },
    "Settlement worker: run started",
  );

  let grandTotal = 0;

  for (const [sport, events] of bySport) {
    // ── Step 0: Skip events that haven't started yet ──────────────────────────
    const startedEvents  = events.filter(ev => !ev.commenceTime || ev.commenceTime <= now);
    const futureCount    = events.length - startedEvents.length;
    if (futureCount > 0) {
      logger.debug(
        { count: futureCount, sport },
        "Settlement worker: skipping future events (commence_time in future)",
      );
    }
    if (startedEvents.length === 0) continue;

    const unsettledIds = new Set(startedEvents.map(e => e.eventId));

    // Build api_live_ prefix map: realOddsApiId → syntheticId
    const liveIdMap = new Map<string, string>();
    for (const ev of startedEvents) {
      if (ev.eventId.startsWith("api_live_")) {
        liveIdMap.set(ev.eventId.slice("api_live_".length), ev.eventId);
      }
    }

    // ── Step 1: The Odds API (with sport key expansion) ───────────────────────
    const apiKeys = expandSportKey(sport);
    const allCompleted: CompletedEvent[] = [];

    for (const key of apiKeys) {
      try {
        const completed = await fetchCompletedScoresOddsApi(key);
        allCompleted.push(...completed);
      } catch (err) {
        logger.warn({ err, key }, "Settlement worker: Odds API key fetch error");
      }
    }

    // Deduplicate completed events by id
    const completedMap = new Map<string, CompletedEvent>();
    for (const ev of allCompleted) {
      if (!completedMap.has(ev.id)) completedMap.set(ev.id, ev);
    }

    // Match by exact event ID
    for (const [id, event] of completedMap) {
      if (!unsettledIds.has(id)) continue;
      try {
        const meta = startedEvents.find(e => e.eventId === id);
        const n = await processEvent(event, sport, "odds_api", meta?.commenceTime);
        grandTotal += n;
        unsettledIds.delete(id);
      } catch (err) {
        logger.error({ err, eventId: id }, "Settlement worker: Odds API event error");
      }
    }

    // Resolve api_live_XXXX events — strip prefix, look up real Odds API UUID
    for (const [realId, syntheticId] of liveIdMap) {
      if (!unsettledIds.has(syntheticId)) continue;
      const apiEvent = completedMap.get(realId);
      if (!apiEvent) continue;
      const patchedEvent: CompletedEvent = { ...apiEvent, id: syntheticId };
      try {
        const meta = startedEvents.find(e => e.eventId === syntheticId);
        const n = await processEvent(patchedEvent, sport, "odds_api", meta?.commenceTime);
        grandTotal += n;
        unsettledIds.delete(syntheticId);
        logger.info({ syntheticId, realId }, "Settlement worker: resolved api_live_ event");
      } catch (err) {
        logger.error({ err, eventId: syntheticId }, "Settlement worker: api_live_ event error");
      }
    }

    if (unsettledIds.size === 0) continue;

    // ── Step 2: BetsAPI direct result (for betsapi_* event IDs) ─────────────────
    // For events whose ID starts with "betsapi_", query BetsAPI's own
    // /v1/bet365/result endpoint using the stored Bet365 fixture ID.
    // This covers ALL BetsAPI sports including those not on The Odds API
    // (Table Tennis, Darts, Snooker, Handball, Volleyball, Golf, etc.)
    // as well as major league matches that simply have different IDs on
    // each platform.
    //
    // Results are cached 30 min (completed) / 5 min (pending) to stay
    // within the shared 3-hour credit window.  Calls that cannot reserve
    // a credit slot are silently skipped (the event stays open and will
    // be retried on the next cron tick).

    const betsapiUnsettled = [...unsettledIds].filter(id => id.startsWith('betsapi_'));

    for (const eventId of betsapiUnsettled) {
      if (!unsettledIds.has(eventId)) continue;   // already settled in a prior iteration
      const meta = startedEvents.find(e => e.eventId === eventId);

      try {
        const result = await fetchBetsApiResult(
          eventId,
          meta?.homeTeam ?? '',
          meta?.awayTeam ?? '',
        );

        if (!result) continue;   // not finished yet or API unavailable — retry next tick

        const n = await processEvent(result, sport, 'betsapi', meta?.commenceTime);
        if (n > 0) {
          grandTotal += n;
          unsettledIds.delete(eventId);
          logger.info(
            { eventId, sport, betsSettled: n },
            'Settlement worker: BetsAPI event settled via /v1/bet365/result',
          );
        }
      } catch (err) {
        logger.error({ err, eventId }, 'Settlement worker: BetsAPI result step error');
      }
    }

    // ── Step 3: Manual review — events ≥ 48h past commence_time with no result ─
    const toReview = startedEvents.filter(e => {
      if (!unsettledIds.has(e.eventId)) return false;
      if (!e.commenceTime) return false; // legacy row without commence_time — never auto-escalate
      return (now.getTime() - e.commenceTime.getTime()) >= reviewCutoffMs;
    });

    for (const ev of toReview) {
      try {
        const n = await markBetsAsManualReview(ev.eventId, ev.eventName, ev.commenceTime);
        if (n > 0) grandTotal += n;
      } catch (err) {
        logger.error({ err, eventId: ev.eventId }, "Settlement worker: manual_review escalation error");
      }
    }

    // Log events still unresolved (within 48h window — normal, will retry)
    const stillOpen = [...unsettledIds].filter(id =>
      !toReview.some(e => e.eventId === id),
    );
    if (stillOpen.length > 0) {
      logger.debug(
        { count: stillOpen.length, sport, eventIds: stillOpen.slice(0, 5) },
        "Settlement worker: events awaiting result (within review window)",
      );
    }
  }

  if (grandTotal > 0) {
    logger.info({ totalBetsSettled: grandTotal }, "Settlement worker: run complete");
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function runSettlementWorker(): Promise<void> {
  if (isRunning) {
    logger.debug("Settlement worker already running — skipping tick");
    return;
  }
  isRunning = true;
  logger.info(
    { timestamp: new Date().toISOString() },
    "[settlementWorker] started",
  );
  try {
    await processSettlement();
  } catch (err) {
    logger.error({ err }, "Settlement worker: unhandled error");
  } finally {
    isRunning = false;
  }
}
