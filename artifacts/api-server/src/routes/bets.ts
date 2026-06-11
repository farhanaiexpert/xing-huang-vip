import { Router } from "express";
import { eq, desc, inArray, and, gt, or, sql, isNull, gte, count } from "drizzle-orm";
import { z } from "zod";
import {
  db, betsTable, betSelectionsTable, walletsTable, transactionsTable,
  sportControlsTable, marketLiabilityTable, userLimitsTable, selfExclusionsTable,
  platformSettingsTable, riskFlagsTable, priceBoostsTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { nextResetAt } from "../lib/depositGuard.js";

const router = Router();

// ── Odds slippage helpers ─────────────────────────────────────────────────

const SLIPPAGE_TOLERANCE_DEFAULT = 0.05; // 5 %

async function getCachedOddsBlob(sportKey: string): Promise<unknown[] | null> {
  const rows = await db.execute(sql`
    SELECT data FROM odds_cache
    WHERE sport_key = ${sportKey} AND expires_at > NOW()
    LIMIT 1
  `);
  const row = rows.rows[0] as { data: unknown } | undefined;
  if (!row) return null;
  const raw = row.data;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(parsed) ? (parsed as unknown[]) : null;
}

interface OddsOutcome   { name: string; price: number }
interface OddsMarket    { key: string; outcomes: OddsOutcome[] }
interface OddsBookmaker { markets: OddsMarket[] }
interface OddsEvent     { id: string; home_team: string; away_team: string; bookmakers: OddsBookmaker[] }

function normalizeSlippageMarket(mt: string): string {
  const lower = mt.toLowerCase();
  if (['h2h', 'match result', '1x2', 'match winner', 'moneyline', 'winner'].includes(lower)) return 'h2h';
  if (lower.includes('over/under') || lower.startsWith('total')) return 'totals';
  if (lower.includes('handicap') || lower.includes('spread'))    return 'spreads';
  if (lower.includes('both teams') || lower.includes('btts'))    return 'btts';
  return lower;
}

function findBestCurrentOdds(
  events: unknown[],
  eventId: string,
  marketType: string,
  selection: string,
  homeTeam: string,
  awayTeam: string,
): number | null {
  const event = (events as OddsEvent[]).find(e => e.id === eventId);
  if (!event) return null;

  const mKey = normalizeSlippageMarket(marketType);
  const selLower = selection.toLowerCase();

  let targetName: string;
  if (mKey === 'h2h' || mKey === 'spreads') {
    if (selLower === 'home')      targetName = event.home_team;
    else if (selLower === 'away') targetName = event.away_team;
    else if (selLower === 'draw') targetName = 'Draw';
    else targetName = selection;
  } else {
    targetName = selection; // "Over", "Under", "Yes", "No"
  }
  const targetLower = targetName.toLowerCase();

  let bestPrice: number | null = null;
  for (const bm of event.bookmakers ?? []) {
    for (const mkt of bm.markets ?? []) {
      if (mkt.key !== mKey) continue;
      for (const outcome of mkt.outcomes ?? []) {
        if (outcome.name.toLowerCase() === targetLower && outcome.price > (bestPrice ?? 0)) {
          bestPrice = outcome.price;
        }
      }
    }
  }
  return bestPrice;
}

const SelectionSchema = z.object({
  eventId:          z.string().min(1),
  eventName:        z.string(),
  sport:            z.string().default(""),            // legacy field, kept for compat
  sportKey:         z.string().min(1, "sportKey is required for settlement"),
  homeTeam:         z.string().default(""),
  awayTeam:         z.string().default(""),
  commenceTime:     z.string()
                      .default(() => new Date().toISOString())
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

  // ── Active boost lookup — apply boosted odds, skip slippage, enforce maxStake
  const boostMap = new Map<string, { boostedOdds: number; boostId: number; maxStake: number | null }>();
  {
    const activeBoosts = await db
      .select()
      .from(priceBoostsTable)
      .where(
        and(
          eq(priceBoostsTable.isActive, true),
          or(isNull(priceBoostsTable.expiresAt), gt(priceBoostsTable.expiresAt, now)),
        ),
      );
    for (const s of selections) {
      const boost = activeBoosts.find(
        b =>
          b.matchId === s.eventId &&
          b.selectionName.toLowerCase().trim() === s.selection.toLowerCase().trim(),
      );
      if (boost) {
        const key = `${s.eventId}||${s.selection.toLowerCase().trim()}`;
        boostMap.set(key, {
          boostedOdds: parseFloat(boost.boostedOdds),
          boostId:     boost.id,
          maxStake:    boost.maxStake && parseFloat(boost.maxStake) > 0 ? parseFloat(boost.maxStake) : null,
        });
      }
    }
  }
  // Enforce per-boost maxStake
  for (const override of boostMap.values()) {
    if (override.maxStake !== null && stake > override.maxStake) {
      res.status(400).json({
        error: `This boosted offer has a maximum stake of ${override.maxStake} USDT.`,
        code: "BOOST_MAX_STAKE_EXCEEDED",
      });
      return;
    }
  }
  // Apply boosted odds to matched selections
  const boostedSelections = selections.map(s => {
    const key = `${s.eventId}||${s.selection.toLowerCase().trim()}`;
    const override = boostMap.get(key);
    return override ? { ...s, odds: override.boostedOdds } : s;
  });

  // ── Odds slippage check (pre-match only — live odds move too fast) ──────────
  // Boost selections are intentionally above market odds — skip them here.
  const prematches = boostedSelections.filter(s => {
    const key = `${s.eventId}||${s.selection.toLowerCase().trim()}`;
    return !s.isLive && !boostMap.has(key);
  });
  if (prematches.length > 0) {
    const tolRow = await db.select().from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, 'odds_slippage_tolerance'))
      .limit(1).then(r => r[0]);
    const tolerance = tolRow ? parseFloat(tolRow.value) : SLIPPAGE_TOLERANCE_DEFAULT;

    const sportKeys = [...new Set(prematches.map(s => s.sportKey))];
    const blobMap = new Map<string, unknown[] | null>(
      await Promise.all(sportKeys.map(async sk => [sk, await getCachedOddsBlob(sk)] as const))
    );

    type StaleSel = { eventId: string; eventName: string; selection: string; submittedOdds: number; currentOdds: number };
    const stale: StaleSel[] = [];

    for (const s of prematches) {
      const blob = blobMap.get(s.sportKey);
      if (!blob) continue; // Sport not cached (off-season) — fail open

      const current = findBestCurrentOdds(blob, s.eventId, s.marketType, s.selection, s.homeTeam, s.awayTeam);
      if (current === null) continue; // Event/market not in cache — fail open

      // Reject only when submitted odds are higher than current best + tolerance
      if (s.odds > current * (1 + tolerance)) {
        stale.push({ eventId: s.eventId, eventName: s.eventName, selection: s.selection, submittedOdds: s.odds, currentOdds: current });
      }
    }

    if (stale.length > 0) {
      req.log.warn({ stale }, 'Bet rejected: odds slippage');
      res.status(409).json({
        error: stale.length === 1
          ? `Odds changed for ${stale[0].eventName} — ${stale[0].selection} is now ${stale[0].currentOdds.toFixed(2)} (you had ${stale[0].submittedOdds.toFixed(2)}). Please review and confirm.`
          : `Odds changed for ${stale.length} selections. Please review the updated odds and confirm.`,
        code: 'ODDS_CHANGED',
        changedSelections: stale,
      });
      return;
    }
  }

  const totalOdds = boostedSelections.reduce((acc, s) => acc * s.odds, 1);
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
        boostedSelections.map(s => ({
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

  // ── Boost usage tracking (fire-and-forget) ────────────────────────────────
  if (boostMap.size > 0) {
    void (async () => {
      const usedIds = [...new Set([...boostMap.values()].map(v => v.boostId))];
      for (const id of usedIds) {
        try {
          await db.execute(sql`UPDATE price_boosts SET usage_count = usage_count + 1 WHERE id = ${id}`);
        } catch { /* non-critical */ }
      }
    })();
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
