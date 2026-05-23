import { db } from "@workspace/db";
import {
  betsTable, betSelectionsTable,
  userBalancesTable, transactionsTable,
} from "@workspace/db";
import { eq, and, isNull, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

export type SettleOutcome = "won" | "lost" | "void";

/* ─────────────────────────────────────────────────────────────
   Core settlement function — called by both manual admin settle
   and the auto-scheduler. Idempotent: skips already-settled bets.
───────────────────────────────────────────────────────────────*/
export async function settleBet(betId: string, outcome: SettleOutcome): Promise<{
  settled: boolean;
  payout: number;
  reason?: string;
}> {
  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId));

  if (!bet) return { settled: false, payout: 0, reason: "Bet not found" };
  if (bet.status !== "pending") return { settled: false, payout: 0, reason: `Already settled as ${bet.status}` };

  const stake = parseFloat(bet.stake);
  const potentialReturn = parseFloat(bet.potentialReturn);

  if (outcome === "won") {
    const payout = potentialReturn;

    await db.update(betsTable)
      .set({ status: "won", settledAt: new Date() })
      .where(eq(betsTable.id, betId));

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: bet.userId,
      type: "bet_win",
      amount: payout.toFixed(8),
      currency: "USDT",
      status: "completed",
      reference: betId,
      description: `Bet won: payout $${payout.toFixed(2)} USDT`,
    });

    const [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, bet.userId));
    const current = parseFloat(balance?.available ?? "0");
    await db.insert(userBalancesTable)
      .values({ userId: bet.userId, available: (current + payout).toFixed(8), currency: "USDT" })
      .onConflictDoUpdate({
        target: userBalancesTable.userId,
        set: { available: (current + payout).toFixed(8), updatedAt: new Date() },
      });

    logger.info({ betId, userId: bet.userId, payout }, "Bet settled: won");
    return { settled: true, payout };

  } else if (outcome === "void") {
    const refund = stake;

    await db.update(betsTable)
      .set({ status: "void", settledAt: new Date() })
      .where(eq(betsTable.id, betId));

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId: bet.userId,
      type: "bet_refund",
      amount: refund.toFixed(8),
      currency: "USDT",
      status: "completed",
      reference: betId,
      description: `Bet voided: stake refunded $${refund.toFixed(2)} USDT`,
    });

    const [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, bet.userId));
    const current = parseFloat(balance?.available ?? "0");
    await db.insert(userBalancesTable)
      .values({ userId: bet.userId, available: (current + refund).toFixed(8), currency: "USDT" })
      .onConflictDoUpdate({
        target: userBalancesTable.userId,
        set: { available: (current + refund).toFixed(8), updatedAt: new Date() },
      });

    logger.info({ betId, userId: bet.userId, refund }, "Bet settled: void");
    return { settled: true, payout: refund };

  } else {
    // lost — no money movement
    await db.update(betsTable)
      .set({ status: "lost", settledAt: new Date() })
      .where(eq(betsTable.id, betId));

    logger.info({ betId, userId: bet.userId }, "Bet settled: lost");
    return { settled: true, payout: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────
   Odds API score fetcher
   Returns null when no API key is configured (graceful fallback)
───────────────────────────────────────────────────────────────*/
export interface OddsApiScore {
  id: string;          // match ID (same as bet matchId)
  sport_key: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
}

async function fetchScores(sport: string): Promise<OddsApiScore[]> {
  const apiKey = process.env["ODDS_API_KEY"];
  if (!apiKey) return [];

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${apiKey}&daysFrom=3`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      logger.warn({ status: res.status, sport }, "Odds API scores request failed");
      return [];
    }
    return (await res.json()) as OddsApiScore[];
  } catch (err) {
    logger.warn({ err, sport }, "Odds API fetch error");
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   Determine outcome for a single selection based on scores
───────────────────────────────────────────────────────────────*/
function determineSelectionOutcome(
  score: OddsApiScore,
  market: string,
  selection: string,
): SettleOutcome | null {
  if (!score.completed || !score.scores) return null;

  const homeScore = parseInt(score.scores.find(s => s.name === score.home_team)?.score ?? "0");
  const awayScore = parseInt(score.scores.find(s => s.name === score.away_team)?.score ?? "0");

  const lowerMarket = market.toLowerCase();
  const lowerSel   = selection.toLowerCase();

  if (lowerMarket.includes("h2h") || lowerMarket.includes("moneyline") || lowerMarket.includes("winner")) {
    if (homeScore > awayScore) {
      return lowerSel === score.home_team.toLowerCase() ? "won" : "lost";
    } else if (awayScore > homeScore) {
      return lowerSel === score.away_team.toLowerCase() ? "won" : "lost";
    } else {
      // Draw — check if selection is draw
      return lowerSel.includes("draw") || lowerSel === "x" ? "won" : "lost";
    }
  }

  if (lowerMarket.includes("totals") || lowerMarket.includes("over_under")) {
    // selection looks like "Over 2.5" or "Under 48.5"
    const parts = selection.split(" ");
    const direction = parts[0]?.toLowerCase();
    const line = parseFloat(parts[1] ?? "0");
    const total = homeScore + awayScore;
    if (direction === "over")  return total > line  ? "won" : "lost";
    if (direction === "under") return total < line  ? "won" : "lost";
  }

  return null; // unknown market — leave pending
}

/* ─────────────────────────────────────────────────────────────
   Auto-settlement runner — called by scheduler every 5 minutes.
   Returns a stats summary for the admin trigger endpoint.
───────────────────────────────────────────────────────────────*/
export interface SettlementRunResult {
  checked: number;
  settled: number;
  won: number;
  lost: number;
  void: number;
  skipped: number;
  totalPaidOut: number;
}

export async function runAutoSettlement(): Promise<SettlementRunResult> {
  const stats: SettlementRunResult = { checked: 0, settled: 0, won: 0, lost: 0, void: 0, skipped: 0, totalPaidOut: 0 };

  const pendingBets = await db
    .select()
    .from(betsTable)
    .where(and(
      eq(betsTable.status, "pending"),
      lte(betsTable.createdAt, new Date(Date.now() - 60 * 60 * 1000)), // at least 1hr old
    ))
    .limit(200);

  if (pendingBets.length === 0) return stats;

  // Gather all unique sports from selections
  const betIds = pendingBets.map(b => b.id);
  const allSelections = await Promise.all(
    betIds.map(id => db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id)))
  );

  const sports = [...new Set(allSelections.flat().map(s => s.sport))];

  // Fetch scores for each sport
  const scoreMap = new Map<string, OddsApiScore>();
  for (const sport of sports) {
    const scores = await fetchScores(sport);
    for (const s of scores) scoreMap.set(s.id, s);
  }

  // Settle each bet
  for (let i = 0; i < pendingBets.length; i++) {
    const bet = pendingBets[i];
    const selections = allSelections[i] ?? [];
    stats.checked++;

    const outcomes: (SettleOutcome | null)[] = selections.map(sel => {
      const score = scoreMap.get(sel.matchId);
      if (!score) return null;
      return determineSelectionOutcome(score, sel.market, sel.selection);
    });

    // Only settle if all selections have a result
    if (outcomes.some(o => o === null)) {
      stats.skipped++;
      continue;
    }

    // Accumulator logic: all must win for the bet to win; any void makes it void; any lost = lost
    let betOutcome: SettleOutcome = "won";
    if (outcomes.some(o => o === "lost")) betOutcome = "lost";
    else if (outcomes.some(o => o === "void")) betOutcome = "void";

    const result = await settleBet(bet.id, betOutcome);
    if (result.settled) {
      stats.settled++;
      stats[betOutcome]++;
      stats.totalPaidOut += result.payout;
    }
  }

  logger.info(stats, "Auto-settlement run complete");
  return stats;
}
