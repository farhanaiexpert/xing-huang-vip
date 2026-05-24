import { Router } from "express";
import { eq, desc, sql, count, sum, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  walletsTable,
  transactionsTable,
  betsTable,
  betSelectionsTable,
  referralsTable,
  commissionsTable,
  promotionsTable,
  promotionClaimsTable,
  predictionPoolsTable,
  poolEntriesTable,
  adminLogsTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// All admin routes require auth + super_admin role
router.use(authenticate, requireAdmin);

// ─── Audit log helper ────────────────────────────────────────────────────────
async function logAdminAction(
  adminId: number,
  action: string,
  entityType?: string,
  entityId?: number,
  details?: Record<string, unknown>,
) {
  await db.insert(adminLogsTable).values({ adminId, action, entityType, entityId, details: details ?? null });
}

// ─── Stats ───────────────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [betStats] = await db
    .select({ count: count(), volume: sum(betsTable.stake) })
    .from(betsTable);
  const [pendingDeposits] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));
  const [pendingWithdrawals] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(eq(transactionsTable.type, "withdrawal"), eq(transactionsTable.status, "pending")));
  const [openBets] = await db
    .select({ count: count() })
    .from(betsTable)
    .where(eq(betsTable.status, "open"));
  const [walletStats] = await db
    .select({ totalBalance: sum(walletsTable.balanceUsdt) })
    .from(walletsTable);
  const [commissionStats] = await db
    .select({ total: sum(commissionsTable.amount) })
    .from(commissionsTable)
    .where(eq(commissionsTable.status, "paid"));

  res.json({
    users: { total: Number(userCount.count) },
    bets: { total: Number(betStats.count), volume: betStats.volume ?? "0", open: Number(openBets.count) },
    transactions: {
      pendingDeposits: Number(pendingDeposits.count),
      pendingWithdrawals: Number(pendingWithdrawals.count),
    },
    platform: {
      totalWalletBalance: walletStats.totalBalance ?? "0",
      totalCommissionsPaid: commissionStats.total ?? "0",
    },
  });
});

// ─── Users ───────────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const { search, page = "1", limit = "20", suspended } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.username, `%${search}%`)));
  }
  if (suspended === "true") conditions.push(eq(usersTable.isSuspended, true));
  if (suspended === "false") conditions.push(eq(usersTable.isSuspended, false));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      role: usersTable.role,
      kycStatus: usersTable.kycStatus,
      country: usersTable.country,
      isSuspended: usersTable.isSuspended,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
      balance: walletsTable.balanceUsdt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(usersTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(usersTable).where(where);

  res.json({ users, total: Number(total.count), page: pageNum, limit: limitNum });
});

router.get("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      role: usersTable.role,
      kycStatus: usersTable.kycStatus,
      country: usersTable.country,
      isSuspended: usersTable.isSuspended,
      referralCode: usersTable.referralCode,
      createdAt: usersTable.createdAt,
      balance: walletsTable.balanceUsdt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

const PatchUserBody = z.object({
  isSuspended: z.boolean().optional(),
  role: z.string().optional(),
  kycStatus: z.string().optional(),
  balanceAdjustment: z.number().optional(),
  balanceNote: z.string().optional(),
});

router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { isSuspended, role, kycStatus, balanceAdjustment, balanceNote } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (isSuspended !== undefined) updates.isSuspended = isSuspended;
  if (role !== undefined) updates.role = role;
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;

  if (Object.keys(updates).length > 0) {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
  }

  if (balanceAdjustment !== undefined && balanceAdjustment !== 0) {
    const absAmount = Math.abs(balanceAdjustment);
    const type = balanceAdjustment > 0 ? "credit" : "debit";
    await db.insert(transactionsTable).values({
      userId: id,
      type,
      amount: String(absAmount),
      status: "completed",
      notes: balanceNote ?? `Admin ${type}`,
    });
    if (balanceAdjustment > 0) {
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`balance_usdt + ${String(absAmount)}` })
        .where(eq(walletsTable.userId, id));
    } else {
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`GREATEST(0, balance_usdt - ${String(absAmount)})` })
        .where(eq(walletsTable.userId, id));
    }
  }

  await logAdminAction(req.user!.userId, "patch_user", "user", id, parsed.data as Record<string, unknown>);

  const [updated] = await db
    .select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, isSuspended: usersTable.isSuspended, role: usersTable.role, kycStatus: usersTable.kycStatus, balance: walletsTable.balanceUsdt })
    .from(usersTable)
    .leftJoin(walletsTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(usersTable.id, id))
    .limit(1);

  res.json(updated);
});

router.get("/admin/users/:id/bets", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const bets = await db
    .select()
    .from(betsTable)
    .where(eq(betsTable.userId, id))
    .orderBy(desc(betsTable.createdAt))
    .limit(50);
  res.json(bets);
});

router.get("/admin/users/:id/transactions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(50);
  res.json(txns);
});

// ─── Bets ────────────────────────────────────────────────────────────────────
router.get("/admin/bets", async (req, res): Promise<void> => {
  const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const where = status ? eq(betsTable.status, status) : undefined;

  const bets = await db
    .select({
      id: betsTable.id,
      userId: betsTable.userId,
      username: usersTable.username,
      type: betsTable.type,
      stake: betsTable.stake,
      totalOdds: betsTable.totalOdds,
      potentialReturn: betsTable.potentialReturn,
      status: betsTable.status,
      settledAt: betsTable.settledAt,
      createdAt: betsTable.createdAt,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where)
    .orderBy(desc(betsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(betsTable).where(where);

  res.json({ bets, total: Number(total.count), page: pageNum, limit: limitNum });
});

router.get("/admin/bets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));
  res.json({ ...bet, selections });
});

const PatchBetBody = z.object({
  status: z.enum(["won", "lost", "void"]),
});

router.patch("/admin/bets/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchBetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  if (!bet) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.status !== "open") { res.status(400).json({ error: "Bet is already settled" }); return; }

  const { status } = parsed.data;
  await db.update(betsTable).set({ status, settledAt: new Date() }).where(eq(betsTable.id, id));

  // If won, credit the winnings; if void, refund the stake
  if (status === "won") {
    const winnings = parseFloat(bet.potentialReturn);
    await db.insert(transactionsTable).values({
      userId: bet.userId,
      type: "credit",
      amount: String(winnings),
      status: "completed",
      notes: `Bet #${id} settled won`,
    });
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${String(winnings)}` })
      .where(eq(walletsTable.userId, bet.userId));
  } else if (status === "void") {
    const stake = parseFloat(bet.stake);
    await db.insert(transactionsTable).values({
      userId: bet.userId,
      type: "credit",
      amount: String(stake),
      status: "completed",
      notes: `Bet #${id} voided - stake refunded`,
    });
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${String(stake)}` })
      .where(eq(walletsTable.userId, bet.userId));
  }

  await logAdminAction(req.user!.userId, `settle_bet_${status}`, "bet", id, { status });

  const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id)).limit(1);
  res.json(updated);
});

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get("/admin/transactions", async (req, res): Promise<void> => {
  const { type, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (type) conditions.push(eq(transactionsTable.type, type));
  if (status) conditions.push(eq(transactionsTable.status, status));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const txns = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      username: usersTable.username,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      status: transactionsTable.status,
      reference: transactionsTable.reference,
      notes: transactionsTable.notes,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId))
    .where(where)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(transactionsTable).where(where);
  res.json({ transactions: txns, total: Number(total.count), page: pageNum, limit: limitNum });
});

const PatchTransactionBody = z.object({
  status: z.enum(["completed", "rejected"]),
  notes: z.string().optional(),
});

router.patch("/admin/transactions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchTransactionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [txn] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (txn.status !== "pending") { res.status(400).json({ error: "Transaction is not pending" }); return; }

  const { status, notes } = parsed.data;
  await db.update(transactionsTable).set({ status, notes: notes ?? txn.notes }).where(eq(transactionsTable.id, id));

  // If deposit is approved, credit the wallet
  if (status === "completed" && txn.type === "deposit") {
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));
  }
  // If withdrawal is approved, the balance was already deducted at request time

  await logAdminAction(req.user!.userId, `${status}_transaction`, "transaction", id, { type: txn.type, amount: txn.amount });

  const [updated] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
  res.json(updated);
});

// ─── Referrals ───────────────────────────────────────────────────────────────
router.get("/admin/referrals", async (req, res): Promise<void> => {
  const referrals = await db
    .select({
      id: referralsTable.id,
      referrerId: referralsTable.referrerId,
      referrerUsername: usersTable.username,
      referredId: referralsTable.referredId,
      tier: referralsTable.tier,
      createdAt: referralsTable.createdAt,
    })
    .from(referralsTable)
    .leftJoin(usersTable, eq(usersTable.id, referralsTable.referrerId))
    .orderBy(desc(referralsTable.createdAt))
    .limit(100);

  const [commTotal] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable);
  const [commPaid] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable).where(eq(commissionsTable.status, "paid"));

  res.json({
    referrals,
    stats: {
      totalReferrals: referrals.length,
      totalCommissions: commTotal.total ?? "0",
      totalPaid: commPaid.total ?? "0",
    },
  });
});

// ─── Promotions ───────────────────────────────────────────────────────────────
router.get("/admin/promotions", async (req, res): Promise<void> => {
  const promos = await db
    .select({
      id: promotionsTable.id,
      title: promotionsTable.title,
      description: promotionsTable.description,
      type: promotionsTable.type,
      bonusAmount: promotionsTable.bonusAmount,
      minDeposit: promotionsTable.minDeposit,
      eligibility: promotionsTable.eligibility,
      maxClaims: promotionsTable.maxClaims,
      isActive: promotionsTable.isActive,
      expiresAt: promotionsTable.expiresAt,
      createdAt: promotionsTable.createdAt,
      claimCount: sql<number>`(SELECT COUNT(*) FROM promotion_claims WHERE promotion_id = ${promotionsTable.id})`,
    })
    .from(promotionsTable)
    .orderBy(desc(promotionsTable.createdAt));

  res.json(promos);
});

const PromotionBody = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().default("welcome"),
  bonusAmount: z.string().optional(),
  minDeposit: z.string().optional(),
  eligibility: z.string().default("all"),
  maxClaims: z.number().optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
});

router.post("/admin/promotions", async (req, res): Promise<void> => {
  const parsed = PromotionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [promo] = await db.insert(promotionsTable).values({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  }).returning();

  await logAdminAction(req.user!.userId, "create_promotion", "promotion", promo.id, { title: promo.title });
  res.status(201).json(promo);
});

router.patch("/admin/promotions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PromotionBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(promotionsTable)
    .set({ ...parsed.data, expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined })
    .where(eq(promotionsTable.id, id))
    .returning();

  await logAdminAction(req.user!.userId, "update_promotion", "promotion", id, parsed.data as Record<string, unknown>);
  res.json(updated);
});

router.delete("/admin/promotions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(promotionsTable).where(eq(promotionsTable.id, id));
  await logAdminAction(req.user!.userId, "delete_promotion", "promotion", id, {});
  res.sendStatus(204);
});

// ─── Prediction Pools ─────────────────────────────────────────────────────────
router.get("/admin/pools", async (req, res): Promise<void> => {
  const pools = await db
    .select({
      id: predictionPoolsTable.id,
      title: predictionPoolsTable.title,
      sport: predictionPoolsTable.sport,
      prizePool: predictionPoolsTable.prizePool,
      entryFee: predictionPoolsTable.entryFee,
      status: predictionPoolsTable.status,
      deadline: predictionPoolsTable.deadline,
      settledAt: predictionPoolsTable.settledAt,
      createdAt: predictionPoolsTable.createdAt,
      entryCount: sql<number>`(SELECT COUNT(*) FROM pool_entries WHERE pool_id = ${predictionPoolsTable.id})`,
    })
    .from(predictionPoolsTable)
    .orderBy(desc(predictionPoolsTable.createdAt));

  res.json(pools);
});

const PoolBody = z.object({
  title: z.string().min(1),
  sport: z.string().min(1),
  eventId: z.string().optional(),
  prizePool: z.string().default("0"),
  entryFee: z.string().default("0"),
  status: z.string().default("open"),
  deadline: z.string().datetime(),
});

router.post("/admin/pools", async (req, res): Promise<void> => {
  const parsed = PoolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [pool] = await db.insert(predictionPoolsTable).values({
    ...parsed.data,
    deadline: new Date(parsed.data.deadline),
  }).returning();

  await logAdminAction(req.user!.userId, "create_pool", "pool", pool.id, { title: pool.title });
  res.status(201).json(pool);
});

router.patch("/admin/pools/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PoolBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(predictionPoolsTable)
    .set({
      ...parsed.data,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      settledAt: parsed.data.status === "settled" ? new Date() : undefined,
    })
    .where(eq(predictionPoolsTable.id, id))
    .returning();

  await logAdminAction(req.user!.userId, "update_pool", "pool", id, parsed.data as Record<string, unknown>);
  res.json(updated);
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const logs = await db
    .select({
      id: adminLogsTable.id,
      adminId: adminLogsTable.adminId,
      adminUsername: usersTable.username,
      action: adminLogsTable.action,
      entityType: adminLogsTable.entityType,
      entityId: adminLogsTable.entityId,
      details: adminLogsTable.details,
      createdAt: adminLogsTable.createdAt,
    })
    .from(adminLogsTable)
    .leftJoin(usersTable, eq(usersTable.id, adminLogsTable.adminId))
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(adminLogsTable);
  res.json({ logs, total: Number(total.count), page: pageNum, limit: limitNum });
});

export default router;
