import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, betsTable, betSelectionsTable, walletsTable, transactionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const SelectionSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  marketType: z.string(),
  selection: z.string(),
  odds: z.number().positive(),
});

const PlaceBetBody = z.object({
  type: z.enum(["single", "accumulator"]),
  stake: z.number().positive(),
  selections: z.array(SelectionSchema).min(1),
});

router.post("/bets", authenticate, async (req, res): Promise<void> => {
  const parsed = PlaceBetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, stake, selections } = parsed.data;

  const [wallet] = await db.select().from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (!wallet || parseFloat(wallet.balanceUsdt) < stake) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = stake * totalOdds;

  const [bet] = await db.insert(betsTable).values({
    userId: req.user!.userId,
    type,
    stake: stake.toString(),
    totalOdds: totalOdds.toFixed(4),
    potentialReturn: potentialReturn.toFixed(8),
    status: "open",
  }).returning();

  await db.insert(betSelectionsTable).values(
    selections.map(s => ({
      betId: bet.id,
      eventId: s.eventId,
      eventName: s.eventName,
      marketType: s.marketType,
      selection: s.selection,
      odds: s.odds.toFixed(4),
      status: "open",
    }))
  );

  const newBalance = (parseFloat(wallet.balanceUsdt) - stake).toFixed(8);
  await db.update(walletsTable)
    .set({ balanceUsdt: newBalance })
    .where(eq(walletsTable.userId, req.user!.userId));

  await db.insert(transactionsTable).values({
    userId: req.user!.userId,
    type: "debit",
    amount: stake.toString(),
    status: "completed",
    reference: `bet_${bet.id}`,
  });

  res.status(201).json(bet);
});

router.get("/bets", authenticate, async (req, res): Promise<void> => {
  const bets = await db.select().from(betsTable)
    .where(eq(betsTable.userId, req.user!.userId))
    .orderBy(desc(betsTable.createdAt));

  const betsWithSelections = await Promise.all(bets.map(async (bet) => {
    const selections = await db.select().from(betSelectionsTable)
      .where(eq(betSelectionsTable.betId, bet.id));
    return { ...bet, selections };
  }));

  res.json(betsWithSelections);
});

router.get("/bets/:id", authenticate, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid bet ID" });
    return;
  }

  const [bet] = await db.select().from(betsTable)
    .where(eq(betsTable.id, id)).limit(1);
  if (!bet || bet.userId !== req.user!.userId) {
    res.status(404).json({ error: "Bet not found" });
    return;
  }

  const selections = await db.select().from(betSelectionsTable)
    .where(eq(betSelectionsTable.betId, id));
  res.json({ ...bet, selections });
});

export default router;
