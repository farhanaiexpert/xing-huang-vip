/**
 * Auto-Settlement Worker  (v2)
 *
 * Dual-source settlement:
 *  1. The Odds API  /v4/sports/{sport}/scores  — primary, all sports
 *  2. API-Football  /fixtures?date=…&status=FT — fallback, soccer only
 *
 * Auto-void: open selections on events whose earliest bet is > AUTO_VOID_HOURS
 * old and neither source returned a result → stake is refunded in full.
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
} from "@workspace/db";
import { logger } from "./logger.js";
import { nextResetAt } from "./depositGuard.js";
import {
  fetchCompletedScoresApiFootball,
  isApiFootballSport,
  type CompletedEvent,
} from "./apiFootball.js";

const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

/** Bets older than this with no API result are voided and stake refunded */
const AUTO_VOID_HOURS = 12;

/**
 * Maps generic / internal sport identifiers to the specific Odds API sport keys
 * needed for the /scores endpoint.  Covers three formats:
 *   1. Generic prefix from sport_key.split('_')[0]  — e.g. "basketball"
 *   2. Internal sp_ IDs                            — e.g. "sp_basketball"
 *   3. Exact Odds API keys (pass-through if already correct)
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
                     'soccer_uefa_nations_league', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league'],
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
  boxing:           ['boxing_boxing'],
  aussierules:      ['aussierules_afl'],

  // ── Internal sp_ IDs ──────────────────────────────────────────────────────
  sp_basketball:        ['basketball_nba', 'basketball_ncaab', 'basketball_euroleague', 'basketball_nbl'],
  sp_soccer:            ['soccer_epl', 'soccer_spain_la_liga', 'soccer_italy_serie_a', 'soccer_france_ligue_one',
                         'soccer_germany_bundesliga', 'soccer_usa_mls', 'soccer_turkey_super_league',
                         'soccer_netherlands_eredivisie', 'soccer_brazil_campeonato', 'soccer_mexico_ligamx',
                         'soccer_efl_champ', 'soccer_scotland_premiership', 'soccer_portugal_primeira_liga',
                         'soccer_belgium_first_div', 'soccer_argentina_primera_division',
                         'soccer_conmebol_copa_libertadores', 'soccer_korea_kleague1', 'soccer_japan_j_league',
                         'soccer_australia_aleague', 'soccer_india_superleague', 'soccer_conmebol_copa_america',
                         'soccer_uefa_nations_league', 'soccer_uefa_champs_league', 'soccer_uefa_europa_league'],
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
  sp_boxing:            ['boxing_boxing'],
  sp_aussie_rules:      ['aussierules_afl'],
  sp_horse_racing:      [], // Not available in Odds API scores endpoint
};

/**
 * Common sport keys to try when the stored sport is empty or unknown.
 * Ordered by global betting volume so the most-likely matches are checked first.
 */
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
  'mma_mixed_martial_arts', 'boxing_boxing',
  'cricket_ipl', 'cricket_international_t20',
];

/** Returns the Odds API sport keys to query for a stored sport identifier */
function expandSportKey(sport: string): string[] {
  const expansion = SPORT_KEY_EXPANSION[sport];
  if (expansion) return expansion;
  // Already a valid Odds API key (contains _ and not an sp_ internal ID)
  if (sport && sport.includes('_') && !sport.startsWith('sp_')) return [sport];
  // Empty or completely unknown sport — try all common keys for fuzzy matching
  return UNKNOWN_SPORT_FALLBACK;
}

/** Normalize a team name for fuzzy comparison */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns true if two team names refer to the same team */
function teamsMatch(betTeam: string, apiTeam: string): boolean {
  const a = normalizeTeam(betTeam);
  const b = normalizeTeam(apiTeam);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = a.split(' ').filter(w => w.length > 2);
  const bWords = b.split(' ').filter(w => w.length > 2);
  if (aWords.length === 0 || bWords.length === 0) return false;
  const shared = aWords.filter(w => bWords.includes(w));
  return shared.length > 0 && shared.length >= Math.ceil(Math.min(aWords.length, bWords.length) * 0.6);
}

/** Mutex — skip tick if previous run is still in progress */
let isRunning = false;

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchOutcome = "home" | "away" | "draw" | "void";

interface EventOutcome {
  marketType: string;
  selection:  string;
  result:     "won" | "lost" | "void";
}

interface OpenEventMeta {
  eventId:     string;
  eventName:   string;
  sport:       string;
  homeTeam:    string;
  awayTeam:    string;
  earliestBet: Date;
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

function determineMatchOutcome(event: CompletedEvent): MatchOutcome {
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

function mapSelectionOutcome(
  selection: string,
  outcome:   MatchOutcome,
  homeTeam:  string,
  awayTeam:  string,
): "won" | "lost" | "void" {
  if (outcome === "void") return "void";
  const sel  = selection.toLowerCase().trim();
  const home = homeTeam.toLowerCase().trim();
  const away = awayTeam.toLowerCase().trim();

  if (outcome === "home") {
    if (sel === home || sel === "1" || sel === "home") return "won";
    if (sel === away || sel === "2" || sel === "away") return "lost";
    if (sel === "draw" || sel === "x") return "lost";
  }
  if (outcome === "away") {
    if (sel === away || sel === "2" || sel === "away") return "won";
    if (sel === home || sel === "1" || sel === "home") return "lost";
    if (sel === "draw" || sel === "x") return "lost";
  }
  if (outcome === "draw") {
    if (sel === "draw" || sel === "x") return "won";
    return "lost";
  }

  // Fuzzy fallback — partial team name match
  if (outcome === "home" && home.split(" ").some(w => sel.includes(w) && w.length > 2)) return "won";
  if (outcome === "away" && away.split(" ").some(w => sel.includes(w) && w.length > 2)) return "lost";

  return "void";
}

function mapTotalsOutcome(
  selection: string,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "void" {
  const lower = selection.toLowerCase().trim();
  const total = homeScore + awayScore;
  const overMatch  = lower.match(/^over\s+(\d+(?:\.\d+)?)$/);
  const underMatch = lower.match(/^under\s+(\d+(?:\.\d+)?)$/);
  if (overMatch) {
    const line = parseFloat(overMatch[1]);
    if (isNaN(line)) return "void";
    if (total > line) return "won";
    if (total < line) return "lost";
    return "void"; // push
  }
  if (underMatch) {
    const line = parseFloat(underMatch[1]);
    if (isNaN(line)) return "void";
    if (total < line) return "won";
    if (total > line) return "lost";
    return "void"; // push
  }
  return "void";
}

function mapSpreadsOutcome(
  selection: string,
  homeTeam:  string,
  awayTeam:  string,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "void" {
  const lower = selection.toLowerCase().trim();
  const home  = homeTeam.toLowerCase().trim();
  const away  = awayTeam.toLowerCase().trim();
  const spreadMatch = lower.match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)$/);
  if (!spreadMatch) return "void";
  const teamPart = spreadMatch[1].trim();
  const spread   = parseFloat(spreadMatch[2]);
  if (isNaN(spread)) return "void";
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
): Promise<{ settled: number; won: number; lost: number; voided: number; payout: number }> {
  let totalSettled = 0, totalWon = 0, totalLost = 0, totalVoided = 0, totalPayout = 0;

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

      if (allSelections.some(s => s.status === "open")) continue;

      const hasLost  = allSelections.some(s => s.status === "lost");
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
        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type:   txType,
          amount: payout.toFixed(8),
          status: "completed",
          notes:  newStatus === "void"
            ? `Bet #${betId} auto-voided — stake refunded`
            : `Bet #${betId} won — payout ${payout.toFixed(2)} USDT`,
        });
        await tx.execute(sql`
          UPDATE wallets
          SET balance_usdt = balance_usdt + ${payout.toFixed(8)}
          WHERE user_id = ${bet.userId}
        `);
      }

      // Award loyalty points (1 pt/USDT for singles; 2× for accas)
      const stakeAmt  = parseFloat(String(bet.stake));
      const loyaltyPts = stakeAmt * (bet.type === "acca" ? 2 : 1);
      await tx.insert(loyaltyPointsTable).values({
        userId: bet.userId,
        betId,
        points: loyaltyPts.toFixed(2),
        reason: "bet_settled",
      });
    }
  });

  return { settled: totalSettled, won: totalWon, lost: totalLost, voided: totalVoided, payout: totalPayout };
}

// ─── Parse home / away from "Home Team vs Away Team" event name ───────────────

function parseTeams(eventName: string): { homeTeam: string; awayTeam: string } {
  const parts = eventName.split(/\s+(?:vs\.?|@|-)\s+/i);
  if (parts.length >= 2) return { homeTeam: parts[0].trim(), awayTeam: parts[1].trim() };
  return { homeTeam: eventName, awayTeam: eventName }; // fallback: won't match in API-Football
}

// ─── Settle a single event from any source ───────────────────────────────────

async function processEvent(
  event:  CompletedEvent,
  sport:  string,
  source: "odds-api" | "api-football" | "auto-void",
): Promise<number> {
  const matchOutcome = source === "auto-void" ? "void" : determineMatchOutcome(event);

  const openSelectionsResult = await db.execute(sql`
    SELECT DISTINCT market_type, selection
    FROM bet_selections
    WHERE event_id = ${event.id} AND status = 'open'
  `);
  if (openSelectionsResult.rows.length === 0) return 0;

  const numericScores = getNumericScores(event);
  const outcomes: EventOutcome[] = [];

  for (const row of openSelectionsResult.rows as { market_type: string; selection: string }[]) {
    let result: "won" | "lost" | "void";
    if (source === "auto-void") {
      result = "void";
    } else if (row.market_type === "h2h") {
      result = mapSelectionOutcome(row.selection, matchOutcome, event.home_team, event.away_team);
    } else if (row.market_type === "totals" && numericScores) {
      result = mapTotalsOutcome(row.selection, numericScores.home, numericScores.away);
    } else if (row.market_type === "spreads" && numericScores) {
      result = mapSpreadsOutcome(row.selection, event.home_team, event.away_team, numericScores.home, numericScores.away);
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
    eventId:    event.id,
    eventName,
    sport,
    result:     matchOutcome,
    homeTeam:   event.home_team,
    awayTeam:   event.away_team,
    homeScore:  homeEntry?.score ?? "",
    awayScore:  awayEntry?.score ?? "",
    betsSettled: stats.settled,
    betsWon:    stats.won,
    betsLost:   stats.lost,
    betsVoided: stats.voided,
    totalPayout: stats.payout.toFixed(8),
    source,
  });

  logger.info(
    { eventId: event.id, eventName, sport, source, matchOutcome, ...stats },
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

  // Load all open events with metadata (team names + age)
  // Note: we include empty-sport events so they can be caught by auto-void
  const openResult = await db.execute(sql`
    SELECT
      event_id,
      event_name,
      sport,
      MIN(created_at) AS earliest_bet
    FROM bet_selections
    WHERE status = 'open' AND event_id != ''
    GROUP BY event_id, event_name, sport
  `);

  if (openResult.rows.length === 0) {
    logger.debug("Settlement worker: no open bets");
    return;
  }

  // Build metadata map
  const allOpenEvents: OpenEventMeta[] = (openResult.rows as {
    event_id: string; event_name: string; sport: string; earliest_bet: string;
  }[]).map(r => {
    const { homeTeam, awayTeam } = parseTeams(r.event_name);
    return {
      eventId:     r.event_id,
      eventName:   r.event_name,
      sport:       r.sport,
      homeTeam,
      awayTeam,
      earliestBet: new Date(r.earliest_bet),
    };
  });

  // Group by sport
  const bySport = new Map<string, OpenEventMeta[]>();
  for (const ev of allOpenEvents) {
    const list = bySport.get(ev.sport) ?? [];
    list.push(ev);
    bySport.set(ev.sport, list);
  }

  logger.info({ sports: [...bySport.keys()], totalEvents: allOpenEvents.length }, "Settlement worker: run started");

  const cutoff = new Date(Date.now() - AUTO_VOID_HOURS * 60 * 60 * 1000);
  let grandTotal = 0;

  for (const [sport, events] of bySport) {
    const unsettledIds = new Set(events.map(e => e.eventId));

    // Build a map: realOddsApiId → syntheticEventId, for events whose IDs
    // were prefixed with "api_live_" at bet-placement time.
    const liveIdMap = new Map<string, string>();
    for (const ev of events) {
      if (ev.eventId.startsWith("api_live_")) {
        liveIdMap.set(ev.eventId.slice("api_live_".length), ev.eventId);
      }
    }

    // ── Step 1: The Odds API (with sport key expansion) ─────────────────────
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
        const n = await processEvent(event, sport, "odds-api");
        grandTotal += n;
        unsettledIds.delete(id);
      } catch (err) {
        logger.error({ err, eventId: id }, "Settlement worker: Odds API event error");
      }
    }

    // Match api_live_XXXX events — strip prefix, look up real Odds API UUID
    for (const [realId, syntheticId] of liveIdMap) {
      if (!unsettledIds.has(syntheticId)) continue;
      const apiEvent = completedMap.get(realId);
      if (!apiEvent) continue;
      const patchedEvent: CompletedEvent = { ...apiEvent, id: syntheticId };
      try {
        const n = await processEvent(patchedEvent, sport, "odds-api");
        grandTotal += n;
        unsettledIds.delete(syntheticId);
        logger.info({ syntheticId, realId }, "Settlement worker: resolved api_live_ event");
      } catch (err) {
        logger.error({ err, eventId: syntheticId }, "Settlement worker: api_live_ event error");
      }
    }

    if (unsettledIds.size === 0) continue;

    // Fuzzy team-name matching for remaining events whose IDs don't match
    const remainingForFuzzy = events.filter(e => unsettledIds.has(e.eventId));
    for (const ev of remainingForFuzzy) {
      if (!completedMap.size) break;
      const match = [...completedMap.values()].find(c =>
        teamsMatch(ev.homeTeam, c.home_team) && teamsMatch(ev.awayTeam, c.away_team)
      );
      if (!match) continue;
      const patchedEvent: CompletedEvent = { ...match, id: ev.eventId };
      try {
        const n = await processEvent(patchedEvent, sport, "odds-api");
        if (n > 0) {
          grandTotal += n;
          unsettledIds.delete(ev.eventId);
          logger.info(
            { eventId: ev.eventId, matchedTeams: `${match.home_team} vs ${match.away_team}` },
            "Settlement worker: fuzzy team-name match",
          );
        }
      } catch (err) {
        logger.error({ err, eventId: ev.eventId }, "Settlement worker: fuzzy match error");
      }
    }

    if (unsettledIds.size === 0) continue;

    // ── Step 2: API-Football fallback (soccer only) ─────────────────────────
    if (isApiFootballSport(sport)) {
      const remaining = events.filter(e => unsettledIds.has(e.eventId));
      try {
        const apfbCompleted = await fetchCompletedScoresApiFootball(
          sport,
          remaining.map(e => ({ id: e.eventId, homeTeam: e.homeTeam, awayTeam: e.awayTeam })),
        );

        for (const event of apfbCompleted) {
          try {
            const n = await processEvent(event, sport, "api-football");
            grandTotal += n;
            unsettledIds.delete(event.id);
          } catch (err) {
            logger.error({ err, eventId: event.id }, "Settlement worker: API-Football event error");
          }
        }
      } catch (err) {
        logger.warn({ err, sport }, "Settlement worker: API-Football fetch error");
      }
    }

    if (unsettledIds.size === 0) continue;

    // ── Step 3: Auto-void — old bets with no result from any source ─────────
    const toVoid = events.filter(e => unsettledIds.has(e.eventId) && e.earliestBet < cutoff);

    for (const ev of toVoid) {
      try {
        const dummyEvent: CompletedEvent = {
          id:        ev.eventId,
          sport_key: sport || "unknown",
          home_team: ev.homeTeam,
          away_team: ev.awayTeam,
          completed: true,
          scores:    null,
        };
        const n = await processEvent(dummyEvent, sport, "auto-void");
        if (n > 0) {
          grandTotal += n;
          logger.warn(
            { eventId: ev.eventId, eventName: ev.eventName, ageHours: AUTO_VOID_HOURS },
            "Settlement worker: auto-voided — no result from any source",
          );
        }
      } catch (err) {
        logger.error({ err, eventId: ev.eventId }, "Settlement worker: auto-void error");
      }
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
  try {
    await processSettlement();
  } catch (err) {
    logger.error({ err }, "Settlement worker: unhandled error");
  } finally {
    isRunning = false;
  }
}
