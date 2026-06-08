import { Router } from "express";
import { eq, desc, inArray, and, gt, or, sql, isNull, gte, count } from "drizzle-orm";
import { z } from "zod";
import {
  db, betsTable, betSelectionsTable, walletsTable, transactionsTable,
  sportControlsTable, marketLiabilityTable, userLimitsTable, selfExclusionsTable,
  platformSettingsTable, riskFlagsTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { nextResetAt } from "../lib/depositGuard.js";

const router = Router();

const SelectionSchema = z.object({
  eventId:          z.string().min(1),
  eventName:        z.string(),
  sport:            z.string().default(""),            // legacy field, kept for compat
  sportKey:         z.string().min(1, "sportKey is required for settlement"),
  homeTeam:         z.string().min(1, "homeTeam is required for settlement"),
  awayTeam:         z.string().min(1, "awayTeam is required for settlement"),
  commenceTime:     z.string()
                      .min(1, "commenceTime is required for settlement")
                      .refine(s => !isNaN(Date.parse(s)), { message: "commenceTime must be a valid ISO 8601 date" }),
  marketType:       z.string().min(1),
  selection:        z.string().min(1),
  odds:             z.number().positive(),
  point:            z.number().optional(),             // handicap/totals line
  isLive:           z.boolean().default(false),
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
    if (new Date(lim.resetAt) < now) {
      // Lazily reset the expired window so limits stay continuously enforceable
      await db.update(userLimitsTable)
        .set({ currentUsage: "0", resetAt: nextResetAt(lim.period), pendingAmountUsdt: "0", pendingEffectiveAt: null })
        .where(eq(userLimitsTable.id, lim.id));
      continue;
    }

    // Lazily promote a matured pending increase
    let effectiveLimit = parseFloat(lim.amountUsdt);
    if (parseFloat(lim.pendingAmountUsdt) > 0 && lim.pendingEffectiveAt && new Date(lim.pendingEffectiveAt) <= now) {
      effectiveLimit = parseFloat(lim.pendingAmountUsdt);
      await db.update(userLimitsTable)
        .set({ amountUsdt: lim.pendingAmountUsdt, pendingAmountUsdt: "0", pendingEffectiveAt: null })
        .where(eq(userLimitsTable.id, lim.id));
    }

    const remaining = effectiveLimit - parseFloat(lim.currentUsage);
    if (remaining < stake) {
      res.status(403).json({
        error: `This bet would exceed your ${lim.period} loss limit. You have ${remaining.toFixed(2)} USDT remaining before your limit resets.`,
        code: "LOSS_LIMIT_EXCEEDED",
      });
      return;
    }
  }

  // ── Suspension check for live bets ─────────────────────────────────────────
  const liveSports = [...new Set(selections.filter(s => s.isLive).map(s => s.sportKey ?? s.sport).filter(Boolean))];
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

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = stake * totalOdds;

  // ── Max-win-per-day cap ────────────────────────────────────────────────────
  const capRow = await db.select().from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "max_win_per_day")).limit(1).then(r => r[0]);
  const maxWinPerDay = capRow ? parseFloat(capRow.value) : 10000;

  if (maxWinPerDay > 0) {
    const midnightUtc = new Date();
    midnightUtc.setUTCHours(0, 0, 0, 0);
    const todayWon = await db.execute(sql`
      SELECT COALESCE(SUM(settled_payout), 0)::float AS total
      FROM bets
      WHERE user_id = ${userId}
        AND status = 'won'
        AND settled_at >= ${midnightUtc}
    `);
    const todayTotal = (todayWon.rows[0] as { total: number }).total ?? 0;
    if (todayTotal + potentialReturn > maxWinPerDay) {
      res.status(403).json({
        error: `This bet would exceed your daily win limit of ${maxWinPerDay.toLocaleString()} USDT. You have ${Math.max(0, maxWinPerDay - todayTotal).toFixed(2)} USDT remaining today.`,
        code: "MAX_WIN_PER_DAY",
      });
      return;
    }
  }

  // ── Atomic bet placement: lock wallet → check balance → insert bet + selections
  // → deduct via subtractive SQL → ledger entry. All in one DB transaction so
  // concurrent bets from the same session cannot race past the balance check.
  let bet: typeof betsTable.$inferSelect;
  try {
    bet = await db.transaction(async (tx) => {
      // Lock the wallet row so concurrent requests queue up behind this transaction
      const walletRows = await tx.execute(sql`
        SELECT balance_usdt::numeric       AS balance,
               bonus_balance_usdt::numeric AS bonus
        FROM wallets
        WHERE user_id = ${userId}
        FOR UPDATE
      `);
      const walletRow = walletRows.rows[0] as { balance: string; bonus: string } | undefined;
      const realBalance  = walletRow ? Number(walletRow.balance) : 0;
      const bonusBalance = walletRow ? Number(walletRow.bonus)   : 0;

      if (!walletRow || (realBalance + bonusBalance) < stake) {
        throw Object.assign(new Error("Insufficient balance"), { code: "INSUFFICIENT_BALANCE" });
      }

      const [newBet] = await tx.insert(betsTable).values({
        userId,
        type,
        stake: stake.toString(),
        totalOdds: totalOdds.toFixed(4),
        potentialReturn: potentialReturn.toFixed(8),
        status: "open",
      }).returning();

      await tx.insert(betSelectionsTable).values(
        selections.map(s => ({
          betId:            newBet.id,
          eventId:          s.eventId,
          eventName:        s.eventName,
          sport:            s.sportKey ?? s.sport ?? "",
          sportKey:         s.sportKey ?? s.sport ?? "",
          homeTeam:         s.homeTeam ?? "",
          awayTeam:         s.awayTeam ?? "",
          commenceTime:     new Date(s.commenceTime),
          marketType:       s.marketType,
          selection:        s.selection,
          odds:             s.odds.toFixed(4),
          point:            s.point != null ? s.point.toFixed(4) : null,
          status:           "open",
          isLive:           s.isLive ?? false,
          scoreAtPlacement: s.scoreAtPlacement ?? null,
        }))
      );

      // ── Deduct: bonus first, then real balance — subtractive SQL (race-safe) ─
      const fromBonus = Math.min(bonusBalance, stake);
      const fromReal  = stake - fromBonus;
      await tx.execute(sql`
        UPDATE wallets
        SET
          balance_usdt       = balance_usdt       - ${fromReal.toFixed(8)}::numeric,
          bonus_balance_usdt = bonus_balance_usdt - ${fromBonus.toFixed(8)}::numeric
        WHERE user_id = ${userId}
      `);

      // Ledger entry — every balance deduction must have a matching record
      await tx.insert(transactionsTable).values({
        userId,
        type: "bet_stake",
        amount: stake.toString(),
        status: "completed",
        reference: `bet_${newBet.id}`,
        notes: `Bet #${newBet.id} stake`,
      });

      return newBet;
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err as { code?: string }).code === "INSUFFICIENT_BALANCE") {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }
    throw err;
  }

  // ── Bet velocity flag (fire-and-forget, non-blocking) ─────────────────────
  void (async () => {
    try {
      const [wRow, lRow] = await Promise.all([
        db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "bet_velocity_window_minutes")).limit(1).then(r => r[0]),
        db.select().from(platformSettingsTable).where(eq(platformSettingsTable.key, "bet_velocity_limit")).limit(1).then(r => r[0]),
      ]);
      const windowMinutes = wRow ? parseInt(wRow.value, 10) : 5;
      const velocityLimit = lRow ? parseInt(lRow.value, 10) : 20;
      const since = new Date(Date.now() - windowMinutes * 60_000);
      const [row] = await db.select({ total: count() }).from(betsTable)
        .where(and(eq(betsTable.userId, userId), gte(betsTable.createdAt, since)));
      const recentBets = Number(row?.total ?? 0);
      if (recentBets > velocityLimit) {
        await db.insert(riskFlagsTable).values({
          userId,
          type: "BET_VELOCITY",
          detail: `${recentBets} bets placed in the last ${windowMinutes} minutes (limit: ${velocityLimit}).`,
        });
      }
    } catch {
      // Non-blocking — ignore errors
    }
  })();

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
      VALUES (${s.eventId}, ${s.eventName}, ${s.sportKey ?? s.sport ?? ""}, ${s.marketType}, ${s.selection}, ${stake.toString()}, ${selectionPayout.toString()}, 1)
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

  const betIds = bets.map(b => b.id);
  const allSelections = betIds.length > 0
    ? await db.select().from(betSelectionsTable).where(inArray(betSelectionsTable.betId, betIds))
    : [];

  const selByBetId = new Map<number, typeof allSelections>();
  for (const sel of allSelections) {
    if (!selByBetId.has(sel.betId)) selByBetId.set(sel.betId, []);
    selByBetId.get(sel.betId)!.push(sel);
  }

  const betsWithSelections = bets.map(bet => ({
    ...bet,
    selections: selByBetId.get(bet.id) ?? [],
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
