/**
 * Auto-Settlement Worker
 *
 * Polls The Odds API /v4/sports/{sport}/scores every 5 minutes, detects
 * completed matches that still have open bets, and settles them automatically.
 *
 * Idempotent: only processes bet_selections with status = 'open', so re-running
 * on an already-settled event is a no-op.
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

const ODDS_API_KEY = process.env.ODDS_API_KEY;
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";

/** Mutex — skip tick if previous run is still in progress */
let isRunning = false;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreEntry {
  name: string;
  score: string;
}

interface CompletedEvent {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores: ScoreEntry[] | null;
}

type MatchOutcome = "home" | "away" | "draw" | "void";

interface EventOutcome {
  marketType: string;
  selection: string;
  result: "won" | "lost" | "void";
}

// ─── Score fetching ───────────────────────────────────────────────────────────

async function fetchCompletedScores(sportKey: string): Promise<CompletedEvent[]> {
  try {
    const url = `${ODDS_API_BASE}/sports/${sportKey}/scores?apiKey=${ODDS_API_KEY}&daysFrom=3&dateFormat=iso`;
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn({ sport: sportKey, status: res.status }, "Settlement: scores fetch failed");
      return [];
    }
    const data = (await res.json()) as CompletedEvent[];
    return Array.isArray(data)
      ? data.filter((e) => e.completed && Array.isArray(e.scores) && e.scores.length > 0)
      : [];
  } catch (err) {
    logger.warn({ err, sport: sportKey }, "Settlement: error fetching scores");
    return [];
  }
}

// ─── Result determination ─────────────────────────────────────────────────────

function determineMatchOutcome(event: CompletedEvent): MatchOutcome {
  if (!event.scores || event.scores.length < 2) return "void";
  const homeEntry = event.scores.find((s) => s.name === event.home_team);
  const awayEntry = event.scores.find((s) => s.name === event.away_team);
  if (!homeEntry || !awayEntry) return "void";
  const home = parseFloat(homeEntry.score);
  const away = parseFloat(awayEntry.score);
  if (isNaN(home) || isNaN(away)) return "void";
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

/** Extract numeric home/away scores from a completed event. Returns null if scores are missing/invalid. */
function getNumericScores(event: CompletedEvent): { home: number; away: number } | null {
  if (!event.scores || event.scores.length < 2) return null;
  const homeEntry = event.scores.find((s) => s.name === event.home_team);
  const awayEntry = event.scores.find((s) => s.name === event.away_team);
  if (!homeEntry || !awayEntry) return null;
  const home = parseFloat(homeEntry.score);
  const away = parseFloat(awayEntry.score);
  if (isNaN(home) || isNaN(away)) return null;
  return { home, away };
}

/**
 * Maps a single h2h selection to won/lost/void based on the match result.
 * Handles team-name, numeric (1/2/X), and keyword (home/away/draw) formats.
 */
function mapSelectionOutcome(
  selection: string,
  outcome: MatchOutcome,
  homeTeam: string,
  awayTeam: string,
): "won" | "lost" | "void" {
  if (outcome === "void") return "void";

  const sel = selection.toLowerCase().trim();
  const home = homeTeam.toLowerCase().trim();
  const away = awayTeam.toLowerCase().trim();

  if (outcome === "home") {
    if (sel === home || sel === "1" || sel === "home") return "won";
    if (sel === "draw" || sel === "x") return "lost";
    if (sel === away || sel === "2" || sel === "away") return "lost";
  }
  if (outcome === "away") {
    if (sel === away || sel === "2" || sel === "away") return "won";
    if (sel === "draw" || sel === "x") return "lost";
    if (sel === home || sel === "1" || sel === "home") return "lost";
  }
  if (outcome === "draw") {
    if (sel === "draw" || sel === "x") return "won";
    return "lost";
  }

  // Fuzzy fallback — partial team name match
  if (outcome === "home" && home.split(" ").some((w) => sel.includes(w) && w.length > 2)) return "won";
  if (outcome === "away" && away.split(" ").some((w) => sel.includes(w) && w.length > 2)) return "won";

  return "void";
}

/**
 * Settles a totals (over/under) selection.
 * Expected selection format: "Over 2.5" | "Under 2.5"
 * Returns void on push (exact line) or unrecognised format.
 */
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
  return "void"; // unrecognised format
}

/**
 * Settles a spreads (point-spread / handicap) selection.
 * Expected selection format: "Team Name +1.5" | "Team Name -1.5"
 * Returns void on push (margin exactly zero) or unrecognised format.
 */
function mapSpreadsOutcome(
  selection: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
): "won" | "lost" | "void" {
  const lower = selection.toLowerCase().trim();
  const home  = homeTeam.toLowerCase().trim();
  const away  = awayTeam.toLowerCase().trim();

  // Expect "<team name> [+-]<number>" at end of string
  const spreadMatch = lower.match(/^(.+?)\s*([+-]\d+(?:\.\d+)?)$/);
  if (!spreadMatch) return "void";

  const teamPart = spreadMatch[1].trim();
  const spread   = parseFloat(spreadMatch[2]);
  if (isNaN(spread)) return "void";

  const isHome =
    teamPart === home || home.split(" ").some((w) => teamPart.includes(w) && w.length > 2);
  const isAway =
    teamPart === away || away.split(" ").some((w) => teamPart.includes(w) && w.length > 2);

  if (!isHome && !isAway) return "void";

  // margin > 0 → this team covered; < 0 → didn't cover; = 0 → push
  const margin = isHome
    ? homeScore + spread - awayScore
    : awayScore + spread - homeScore;

  if (margin > 0) return "won";
  if (margin < 0) return "lost";
  return "void"; // push
}

// ─── DB settlement transaction ────────────────────────────────────────────────

async function settleBetsForEvent(
  eventId: string,
  outcomes: EventOutcome[],
): Promise<{ settled: number; won: number; lost: number; voided: number; payout: number }> {
  let totalSettled = 0,
    totalWon = 0,
    totalLost = 0,
    totalVoided = 0,
    totalPayout = 0;

  await db.transaction(async (tx) => {
    const affectedBetIds = new Set<number>();

    // Step 1: update each matching selection
    for (const { marketType, selection, result } of outcomes) {
      const updated = await tx.execute(sql`
        UPDATE bet_selections
        SET status = ${result}
        WHERE event_id    = ${eventId}
          AND market_type = ${marketType}
          AND selection   = ${selection}
          AND status      = 'open'
        RETURNING bet_id
      `);
      for (const r of updated.rows as { bet_id: number }[]) {
        affectedBetIds.add(r.bet_id);
      }
    }

    if (affectedBetIds.size === 0) return;

    // Step 2: evaluate each affected bet — only resolve if ALL legs are settled
    for (const betId of affectedBetIds) {
      const [bet] = await tx.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
      if (!bet || bet.status !== "open") continue;

      const allSelections = await tx
        .select()
        .from(betSelectionsTable)
        .where(eq(betSelectionsTable.betId, betId));

      if (allSelections.some((s) => s.status === "open")) continue;

      const hasLost = allSelections.some((s) => s.status === "lost");
      const allVoid = allSelections.every((s) => s.status === "void");
      const wonLegs = allSelections.filter((s) => s.status === "won");

      let newStatus: string;
      let payout = 0;

      if (hasLost) {
        newStatus = "lost";
        totalLost++;
      } else if (allVoid) {
        newStatus = "void";
        payout = parseFloat(String(bet.stake));
        totalVoided++;
      } else {
        newStatus = "won";
        const adjustedOdds = wonLegs.reduce((acc, s) => acc * parseFloat(String(s.odds)), 1);
        payout = parseFloat(String(bet.stake)) * adjustedOdds;
        totalWon++;
      }

      await tx
        .update(betsTable)
        .set({ status: newStatus, settledAt: new Date(), settledPayout: String(payout.toFixed(8)) })
        .where(eq(betsTable.id, betId));
      totalSettled++;

      // ── Decrement market_liability for each selection now that the bet is settled ─
      for (const sel of allSelections) {
        const selPayout = parseFloat(String(sel.odds)) * parseFloat(String(bet.stake));
        await tx.execute(sql`
          UPDATE market_liability
          SET
            total_stake       = GREATEST(0, total_stake - ${String(bet.stake)}::numeric),
            potential_payout  = GREATEST(0, potential_payout - ${selPayout.toFixed(8)}::numeric),
            bet_count         = GREATEST(0, bet_count - 1)
          WHERE event_id    = ${sel.eventId}
            AND market_type = ${sel.marketType}
            AND selection   = ${sel.selection}
        `);
      }

      // ── Increment loss limit usage if the bet was LOST ───────────────────
      // Loss limits track cumulative losses per period (not stakes at placement).
      if (newStatus === "lost") {
        const now = new Date();
        const lossLimits = await tx
          .select()
          .from(userLimitsTable)
          .where(
            and(
              eq(userLimitsTable.userId, bet.userId),
              eq(userLimitsTable.limitType, "loss"),
            ),
          );
        for (const lim of lossLimits) {
          if (new Date(lim.resetAt) < now) {
            // Lazily reset expired window inline so limits stay continuously enforceable
            await tx.update(userLimitsTable)
              .set({ currentUsage: "0", resetAt: nextResetAt(lim.period), pendingAmountUsdt: null, pendingEffectiveAt: null })
              .where(eq(userLimitsTable.id, lim.id));
            continue;
          }
          await tx
            .update(userLimitsTable)
            .set({ currentUsage: sql`current_usage + ${String(bet.stake)}` })
            .where(eq(userLimitsTable.id, lim.id));
        }
      }

      if (payout > 0) {
        totalPayout += payout;
        const txType = newStatus === "void" ? "refund" : "win";
        await tx.insert(transactionsTable).values({
          userId: bet.userId,
          type: txType,
          amount: payout.toFixed(8),
          status: "completed",
          notes:
            newStatus === "void"
              ? `Bet #${betId} auto-voided — stake refunded`
              : `Bet #${betId} auto-won — payout $${payout.toFixed(2)}`,
        });
        await tx.execute(sql`
          UPDATE wallets
          SET balance_usdt = balance_usdt + ${payout.toFixed(8)}
          WHERE user_id = ${bet.userId}
        `);
      }

      // ── Award loyalty points (1 pt/USDT staked; 2× for accas) ───────────────
      const stakeAmt = parseFloat(String(bet.stake));
      const loyaltyPts = stakeAmt * (bet.type === "acca" ? 2 : 1);
      await tx.insert(loyaltyPointsTable).values({
        userId: bet.userId,
        betId,
        points: loyaltyPts.toFixed(2),
        reason: "bet_settled",
      });
    }
  });

  return {
    settled: totalSettled,
    won: totalWon,
    lost: totalLost,
    voided: totalVoided,
    payout: totalPayout,
  };
}

// ─── Core processing loop ─────────────────────────────────────────────────────

async function processSettlement(): Promise<void> {
  if (!ODDS_API_KEY) {
    logger.warn("Settlement worker: ODDS_API_KEY not configured — skipping");
    return;
  }

  // Find all (sport, event_id) pairs that still have open selections
  const openResult = await db.execute(sql`
    SELECT DISTINCT sport, event_id
    FROM bet_selections
    WHERE status = 'open' AND sport != ''
  `);

  if (openResult.rows.length === 0) {
    logger.debug("Settlement worker: no open bets found");
    return;
  }

  // Group event IDs by sport key
  const sportEventMap = new Map<string, Set<string>>();
  for (const row of openResult.rows as { sport: string; event_id: string }[]) {
    if (!sportEventMap.has(row.sport)) sportEventMap.set(row.sport, new Set());
    sportEventMap.get(row.sport)!.add(row.event_id);
  }

  logger.info({ sports: [...sportEventMap.keys()] }, "Settlement worker: run started");

  let grandTotal = 0;

  for (const [sport, openEventIds] of sportEventMap) {
    const completedEvents = await fetchCompletedScores(sport);
    const toSettle = completedEvents.filter((e) => openEventIds.has(e.id));

    if (toSettle.length === 0) continue;

    logger.info({ sport, count: toSettle.length }, "Settlement worker: completed events found");

    for (const event of toSettle) {
      try {
        const matchOutcome = determineMatchOutcome(event);

        // Fetch all distinct open (marketType, selection) pairs for this event
        const openSelectionsResult = await db.execute(sql`
          SELECT DISTINCT market_type, selection
          FROM bet_selections
          WHERE event_id = ${event.id} AND status = 'open'
        `);

        if (openSelectionsResult.rows.length === 0) continue;

        // Resolve every open selection deterministically.
        // h2h → match-winner logic, totals → over/under, spreads → point-spread.
        // Only truly unrecognised market types fall through to void.
        const numericScores = getNumericScores(event);
        const outcomes: EventOutcome[] = [];
        for (const row of openSelectionsResult.rows as { market_type: string; selection: string }[]) {
          let result: "won" | "lost" | "void";
          if (row.market_type === "h2h") {
            result = mapSelectionOutcome(row.selection, matchOutcome, event.home_team, event.away_team);
          } else if (row.market_type === "totals" && numericScores) {
            result = mapTotalsOutcome(row.selection, numericScores.home, numericScores.away);
          } else if (row.market_type === "spreads" && numericScores) {
            result = mapSpreadsOutcome(row.selection, event.home_team, event.away_team, numericScores.home, numericScores.away);
          } else {
            // Scores unavailable or market type not yet supported — void for admin review
            result = "void";
          }
          outcomes.push({ marketType: row.market_type, selection: row.selection, result });
        }

        if (outcomes.length === 0) continue;

        // Look up event name for logging
        const nameLookup = await db.execute(sql`
          SELECT event_name FROM bet_selections WHERE event_id = ${event.id} LIMIT 1
        `);
        const eventName =
          (nameLookup.rows[0] as { event_name: string } | undefined)?.event_name ?? event.id;

        const stats = await settleBetsForEvent(event.id, outcomes);
        grandTotal += stats.settled;

        const homeEntry = event.scores?.find((s) => s.name === event.home_team);
        const awayEntry = event.scores?.find((s) => s.name === event.away_team);

        // Write to settlement_log (only if at least 1 bet was settled)
        if (stats.settled > 0) {
          await db.insert(settlementLogTable).values({
            eventId: event.id,
            eventName,
            sport,
            result: matchOutcome,
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            homeScore: homeEntry?.score ?? "",
            awayScore: awayEntry?.score ?? "",
            betsSettled: stats.settled,
            betsWon: stats.won,
            betsLost: stats.lost,
            betsVoided: stats.voided,
            totalPayout: stats.payout.toFixed(8),
            source: "auto",
          });
        }

        logger.info(
          { eventId: event.id, eventName, sport, matchOutcome, ...stats },
          "Settlement worker: event settled",
        );
      } catch (err) {
        logger.error({ err, eventId: event.id }, "Settlement worker: error settling event");
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
    logger.info("Settlement worker already running — skipping tick");
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
