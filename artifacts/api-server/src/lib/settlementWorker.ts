/**
 * Auto-Settlement Worker
 *
 * Polls The Odds API /v4/sports/{sport}/scores every 5 minutes, detects
 * completed matches that still have open bets, and settles them automatically.
 *
 * Idempotent: only processes bet_selections with status = 'open', so re-running
 * on an already-settled event is a no-op.
 */

import { eq, sql } from "drizzle-orm";
import {
  db,
  betsTable,
  betSelectionsTable,
  walletsTable,
  transactionsTable,
  settlementLogTable,
} from "@workspace/db";
import { logger } from "./logger.js";

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

/**
 * Maps a single selection string to won/lost/void based on the match result.
 * Handles h2h selections (team name or "Draw").
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
        .set({ status: newStatus, settledAt: new Date() })
        .where(eq(betsTable.id, betId));
      totalSettled++;

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

        // Build outcome list — h2h auto-resolved; non-h2h voided for admin review
        const outcomes: EventOutcome[] = [];
        for (const row of openSelectionsResult.rows as { market_type: string; selection: string }[]) {
          if (row.market_type === "h2h") {
            outcomes.push({
              marketType: row.market_type,
              selection: row.selection,
              result: mapSelectionOutcome(row.selection, matchOutcome, event.home_team, event.away_team),
            });
          } else {
            // Non-h2h markets (totals, spreads) — void; admin can override
            outcomes.push({ marketType: row.market_type, selection: row.selection, result: "void" });
          }
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
