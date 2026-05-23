import { Router } from "express";
import { db } from "@workspace/db";
import { betsTable, betSelectionsTable, userBalancesTable, transactionsTable, createBetSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = createBetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid bet data" });
    return;
  }

  const { userId } = (req as any).user;
  const { stake, selections } = parsed.data;

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = stake * totalOdds;

  const betId = randomUUID();

  try {
    await db.insert(betsTable).values({
      id: betId,
      userId,
      stake: stake.toString(),
      totalOdds: totalOdds.toFixed(4),
      potentialReturn: potentialReturn.toFixed(8),
      status: "pending",
      currency: "USDT",
    });

    const selectionRows = selections.map(s => ({
      id: randomUUID(),
      betId,
      matchId: s.matchId,
      sport: s.sport,
      homeTeam: s.homeTeam,
      awayTeam: s.awayTeam,
      market: s.market,
      selection: s.selection,
      odds: s.odds.toString(),
      commenceTime: s.commenceTime ? new Date(s.commenceTime) : null,
    }));

    await db.insert(betSelectionsTable).values(selectionRows);

    await db.insert(transactionsTable).values({
      id: randomUUID(),
      userId,
      type: "bet_stake",
      amount: stake.toString(),
      currency: "USDT",
      status: "completed",
      reference: betId,
      description: `Bet placed: ${selections.length} selection(s)`,
    });

    const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId));
    const sels = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, betId));

    res.status(201).json({ ...bet, selections: sels });
  } catch (err) {
    req.log.error({ err }, "create bet error");
    res.status(500).json({ error: "internal", message: "Failed to place bet" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  try {
    const bets = await db
      .select()
      .from(betsTable)
      .where(eq(betsTable.userId, userId))
      .orderBy(desc(betsTable.createdAt))
      .limit(100);

    const betsWithSelections = await Promise.all(
      bets.map(async bet => {
        const selections = await db
          .select()
          .from(betSelectionsTable)
          .where(eq(betSelectionsTable.betId, bet.id));
        return { ...bet, selections };
      })
    );

    res.json({ bets: betsWithSelections });
  } catch (err) {
    req.log.error({ err }, "get bets error");
    res.status(500).json({ error: "internal", message: "Failed to fetch bets" });
  }
});

export default router;
