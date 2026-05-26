import { Router } from "express";
import { eq, desc, inArray, and, gt, or, sql, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  db, betsTable, betSelectionsTable, walletsTable, transactionsTable,
  sportControlsTable, marketLiabilityTable, userLimitsTable, selfExclusionsTable,
  platformSettingsTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const SelectionSchema = z.object({
  eventId: z.string(),
  eventName: z.string(),
  sport: z.string().default(""),
  marketType: z.string(),
  selection: z.string(),
  odds: z.number().positive(),
  isLive: z.boolean().default(false),
  scoreAtPlacement: z.string().optional(),
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
  const userId = req.user!.userId;

  // ── Self-exclusion check ────────────────────────────────────────────────────
  const now = new Date();
  const [excl] = await db.select().from(selfExclusionsTable)
    .where(and(
      eq(selfExclusionsTable.userId, userId),
      isNull(selfExclusionsTable.liftedAt),
      or(
        eq(selfExclusionsTable.isPermanent, true),
        gt(selfExclusionsTable.endsAt, now),
      ),
    ))
    .limit(1);

  if (excl) {
    const msg = excl.isTakeABreak
      ? "You are on a cooling-off break. Betting is temporarily unavailable."
      : excl.isPermanent
        ? "Your account is permanently self-excluded. Please contact support."
        : `You are self-excluded until ${new Date(excl.endsAt!).toLocaleDateString()}.`;
    res.status(403).json({ error: msg, code: "SELF_EXCLUDED" });
    return;
  }

  // ── Loss limit check (limit = max cumulative losses allowed per period) ─────
  // Usage is incremented only when a bet is actually LOST (in settlementWorker),
  // so here we check if the current usage already exceeds the limit.
  const lossLimits = await db.select().from(userLimitsTable)
    .where(and(eq(userLimitsTable.userId, userId), eq(userLimitsTable.limitType, "loss")));

  for (const lim of lossLimits) {
    if (new Date(lim.resetAt) < now) continue; // expired, skip

    // Lazily promote a matured pending increase
    let effectiveLimit = parseFloat(lim.amountUsdt);
    if (lim.pendingAmountUsdt && lim.pendingEffectiveAt && new Date(lim.pendingEffectiveAt) <= now) {
      effectiveLimit = parseFloat(lim.pendingAmountUsdt);
      await db.update(userLimitsTable)
        .set({ amountUsdt: lim.pendingAmountUsdt, pendingAmountUsdt: null, pendingEffectiveAt: null })
        .where(eq(userLimitsTable.id, lim.id));
    }

    const remaining = effectiveLimit - parseFloat(lim.currentUsage);
    if (remaining <= 0) {
      res.status(403).json({
        error: `Your ${lim.period} loss limit of ${effectiveLimit.toFixed(2)} USDT has been reached. Betting is blocked until your limit resets.`,
        code: "LOSS_LIMIT_EXCEEDED",
      });
      return;
    }
  }

  // ── Suspension check for live bets ─────────────────────────────────────────
  const liveSports = [...new Set(selections.filter(s => s.isLive).map(s => s.sport).filter(Boolean))];
  if (liveSports.length > 0) {
    const controls = await db
      .select()
      .from(sportControlsTable)
      .where(inArray(sportControlsTable.sportKey, liveSports));
    const suspended = controls.find(c => c.isSuspended);
    if (suspended) {
      res.status(403).json({ error: `Live betting is suspended for ${suspended.leagueName}` });
      return;
    }
  }

  // ── Market liability suspension check ─────────────────────────────────────
  for (const s of selections) {
    const [suspendedMarket] = await db.select().from(marketLiabilityTable)
      .where(and(
        eq(marketLiabilityTable.eventId, s.eventId),
        eq(marketLiabilityTable.marketType, s.marketType),
        eq(marketLiabilityTable.selection, s.selection),
        eq(marketLiabilityTable.isSuspended, true),
      ))
      .limit(1);
    if (suspendedMarket) {
      res.status(403).json({
        error: `This market is temporarily suspended — ${s.selection} (${s.eventName}). Try another selection.`,
        code: "MARKET_SUSPENDED",
      });
      return;
    }
  }

  // ── Balance check ──────────────────────────────────────────────────────────
  const [wallet] = await db.select().from(walletsTable)
    .where(eq(walletsTable.userId, userId)).limit(1);
  if (!wallet || parseFloat(wallet.balanceUsdt) < stake) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = stake * totalOdds;

  const [bet] = await db.insert(betsTable).values({
    userId,
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
      sport: s.sport ?? "",
      marketType: s.marketType,
      selection: s.selection,
      odds: s.odds.toFixed(4),
      status: "open",
      isLive: s.isLive ?? false,
      scoreAtPlacement: s.scoreAtPlacement ?? null,
    }))
  );

  const newBalance = (parseFloat(wallet.balanceUsdt) - stake).toFixed(8);
  await db.update(walletsTable)
    .set({ balanceUsdt: newBalance })
    .where(eq(walletsTable.userId, userId));

  await db.insert(transactionsTable).values({
    userId,
    type: "debit",
    amount: stake.toString(),
    status: "completed",
    reference: `bet_${bet.id}`,
  });

  // ── Upsert market liability ────────────────────────────────────────────────
  const liabilityThresholdRow = await db.select().from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "liability_threshold_usdt"))
    .limit(1).then(r => r[0]);
  const threshold = liabilityThresholdRow ? parseFloat(liabilityThresholdRow.value) : 5000;

  for (const s of selections) {
    const selectionOdds = parseFloat(s.odds.toFixed(4));
    const selectionPayout = stake * selectionOdds;

    await db.execute(sql`
      INSERT INTO market_liability (event_id, event_name, sport, market_type, selection, total_stake, potential_payout, bet_count)
      VALUES (${s.eventId}, ${s.eventName}, ${s.sport ?? ""}, ${s.marketType}, ${s.selection}, ${stake.toString()}, ${selectionPayout.toString()}, 1)
      ON CONFLICT (event_id, market_type, selection)
      DO UPDATE SET
        total_stake      = market_liability.total_stake + EXCLUDED.total_stake,
        potential_payout = market_liability.potential_payout + EXCLUDED.potential_payout,
        bet_count        = market_liability.bet_count + 1,
        updated_at       = NOW()
    `);

    // Auto-suspend if liability exceeds threshold
    if (threshold > 0) {
      const [liability] = await db.select().from(marketLiabilityTable)
        .where(and(
          eq(marketLiabilityTable.eventId, s.eventId),
          eq(marketLiabilityTable.marketType, s.marketType),
          eq(marketLiabilityTable.selection, s.selection),
        ))
        .limit(1);

      if (liability && parseFloat(liability.potentialPayout) > threshold && !liability.isSuspended) {
        await db.update(marketLiabilityTable)
          .set({ isSuspended: true })
          .where(eq(marketLiabilityTable.id, liability.id));
      }
    }
  }

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
