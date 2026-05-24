import { Router } from "express";
import { eq, desc, sql, count, sum, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
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
  sessionsTable,
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

  // Gross gaming revenue = total stakes from settled bets − total winnings paid out
  const revenueRows = await db.execute(sql`
    SELECT
      COALESCE(SUM(stake), 0)::text AS total_stakes,
      COALESCE(SUM(CASE WHEN status = 'won' THEN potential_return ELSE 0 END), 0)::text AS total_winnings
    FROM bets
    WHERE status IN ('won', 'lost', 'void')
  `);
  const rev = revenueRows.rows[0] as { total_stakes: string; total_winnings: string };
  const grossRevenue = (Number(rev.total_stakes) - Number(rev.total_winnings)).toFixed(2);

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
      grossRevenue,
    },
  });
});

// ─── Bets chart (last 30 days) ────────────────────────────────────────────────
router.get("/admin/stats/bets-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      count(*)::int AS count,
      coalesce(sum(stake), 0)::text AS volume
    FROM bets
    WHERE created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/users-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      count(*)::int AS count
    FROM users
    WHERE created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/revenue-chart", async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'MM-DD') AS day,
      coalesce(sum(stake), 0)::text AS stakes,
      coalesce(sum(CASE WHEN status = 'won' THEN potential_return ELSE 0 END), 0)::text AS payouts
    FROM bets
    WHERE created_at >= now() - interval '30 days'
    GROUP BY date_trunc('day', created_at AT TIME ZONE 'UTC')
    ORDER BY date_trunc('day', created_at AT TIME ZONE 'UTC')
  `);
  res.json(rows.rows);
});

router.get("/admin/stats/recent-activity", async (req, res): Promise<void> => {
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
    .limit(10);
  res.json(logs);
});

// ─── Users ───────────────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res): Promise<void> => {
  const { search, page = "1", limit = "20", suspended, role } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(usersTable.email, `%${search}%`), ilike(usersTable.username, `%${search}%`)));
  }
  if (suspended === "true") conditions.push(eq(usersTable.isSuspended, true));
  if (suspended === "false") conditions.push(eq(usersTable.isSuspended, false));
  if (role === "admins") {
    conditions.push(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")));
  } else if (role && role !== "all") {
    conditions.push(eq(usersTable.role, role as "user" | "admin" | "super_admin"));
  }

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

const CreateUserBody = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
});

router.post("/admin/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  const { email, username, password, role } = parsed.data;

  if ((role === "admin" || role === "super_admin") && req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: only super admins can create admin accounts" });
    return;
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.email, email.toLowerCase()), eq(usersTable.username, username)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email or username already in use" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);
  const [newUser] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    username,
    passwordHash,
    role,
  }).returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email });

  await db.insert(walletsTable).values({ userId: newUser.id });
  await logAdminAction(req.user!.userId, "create_user", "user", newUser.id, { username, role });
  res.status(201).json(newUser);
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

  if (role !== undefined && (role === "admin" || role === "super_admin") && req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden: only super admins can assign admin roles" });
    return;
  }

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

const ResetPasswordBody = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/admin/users/:id/reset-password", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }

  const [user] = await db.select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, id));

  await logAdminAction(req.user!.userId, "reset_password", "user", id, { username: user.username });
  res.json({ success: true });
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
  const { status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (status) conditions.push(eq(betsTable.status, status));
  if (search) conditions.push(ilike(usersTable.username, `%${search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
      eventName: sql<string | null>`(SELECT event_name FROM bet_selections WHERE bet_id = ${betsTable.id} LIMIT 1)`,
      sport: sql<string | null>`(SELECT sport FROM bet_selections WHERE bet_id = ${betsTable.id} LIMIT 1)`,
    })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where)
    .orderBy(desc(betsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db
    .select({ count: count() })
    .from(betsTable)
    .leftJoin(usersTable, eq(usersTable.id, betsTable.userId))
    .where(where);

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

// ─── Transactions pending totals (aggregate — no page cap) ───────────────────
router.get("/admin/transactions/pending-totals", async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'deposit' AND status = 'pending'), 0)::text AS deposit_total,
      COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'pending') AS deposit_count,
      COALESCE(SUM(amount::numeric) FILTER (WHERE type = 'withdrawal' AND status = 'pending'), 0)::text AS withdrawal_total,
      COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'pending') AS withdrawal_count
    FROM transactions
  `);
  const row = result.rows[0] as {
    deposit_total: string; deposit_count: string;
    withdrawal_total: string; withdrawal_count: string;
  };
  res.json({
    pendingDepositTotal: row.deposit_total,
    pendingDepositCount: Number(row.deposit_count),
    pendingWithdrawalTotal: row.withdrawal_total,
    pendingWithdrawalCount: Number(row.withdrawal_count),
  });
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

  // Deposit approved → credit wallet
  if (status === "completed" && txn.type === "deposit") {
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));
  }
  // Withdrawal approved → debit wallet (funds are held in "pending" state, not deducted at request time)
  if (status === "completed" && txn.type === "withdrawal") {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, txn.userId)).limit(1);
    if (!wallet || parseFloat(wallet.balanceUsdt) < parseFloat(txn.amount)) {
      res.status(400).json({ error: "Insufficient wallet balance to complete withdrawal" });
      return;
    }
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`GREATEST(0, balance_usdt - ${txn.amount})` })
      .where(eq(walletsTable.userId, txn.userId));
  }

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
    .limit(500);

  const [commTotal] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable);
  const [commPaid] = await db.select({ total: sum(commissionsTable.amount) }).from(commissionsTable).where(eq(commissionsTable.status, "paid"));

  const commByReferrerRows = await db.execute(sql`
    SELECT r.referrer_id AS "referrerId", COALESCE(SUM(c.amount), 0)::text AS total
    FROM commissions c
    JOIN referrals r ON r.id = c.referral_id
    GROUP BY r.referrer_id
  `);
  const commMap = new Map<number, string>(
    (commByReferrerRows.rows as { referrerId: number; total: string }[])
      .map(r => [Number(r.referrerId), r.total])
  );

  // Count referrals per referrer and compute top 10 by commission
  const referrerMap = new Map<number, { referrerId: number; referrerUsername: string | null; count: number }>();
  for (const r of referrals as Array<{ referrerId: number; referrerUsername: string | null }>) {
    const existing = referrerMap.get(r.referrerId);
    if (existing) {
      existing.count++;
    } else {
      referrerMap.set(r.referrerId, { referrerId: r.referrerId, referrerUsername: r.referrerUsername, count: 1 });
    }
  }
  const topReferrersByCommission = Array.from(referrerMap.values())
    .map(r => ({
      referrerId: r.referrerId,
      name: r.referrerUsername ?? `uid:${r.referrerId}`,
      commission: parseFloat(commMap.get(r.referrerId) ?? "0"),
      count: r.count,
    }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 10);

  res.json({
    referrals,
    stats: {
      totalReferrals: referrals.length,
      totalCommissions: commTotal.total ?? "0",
      totalPaid: commPaid.total ?? "0",
    },
    topReferrersByCommission,
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

const PatchPoolBody = PoolBody.partial().extend({ outcome: z.string().optional() });

router.patch("/admin/pools/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const parsed = PatchPoolBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { outcome, ...poolFields } = parsed.data;

  // Idempotency: reject if pool is already settled
  const [current] = await db
    .select({ status: predictionPoolsTable.status })
    .from(predictionPoolsTable)
    .where(eq(predictionPoolsTable.id, id))
    .limit(1);
  if (!current) { res.status(404).json({ error: "Pool not found" }); return; }
  if (poolFields.status === "settled" && current.status === "settled") {
    res.status(400).json({ error: "Pool is already settled — cannot redistribute prizes" });
    return;
  }

  // Build update — persist correctOutcome in its dedicated column
  const setFields: Record<string, unknown> = { ...poolFields };
  if (poolFields.deadline) setFields.deadline = new Date(poolFields.deadline);
  if (poolFields.status === "settled") {
    setFields.settledAt = new Date();
    if (outcome !== undefined) setFields.correctOutcome = outcome;
  }

  const [updated] = await db
    .update(predictionPoolsTable)
    .set(setFields as Parameters<ReturnType<typeof db.update>["set"]>[0])
    .where(eq(predictionPoolsTable.id, id))
    .returning();

  let settledRecipientCount = 0;
  let totalDistributed = "0";

  if (poolFields.status === "settled" && updated && outcome !== undefined) {
    // Load all entries with their picks
    const entries = await db
      .select({ userId: poolEntriesTable.userId, picks: poolEntriesTable.picks })
      .from(poolEntriesTable)
      .where(eq(poolEntriesTable.poolId, id));

    if (entries.length > 0 && Number(updated.prizePool) > 0) {
      // Evaluate picks against the correct outcome.
      // Picks format: { outcome: string } — winners are entries where picks.outcome matches.
      // Fall back to all entrants when no entries have a matching pick (e.g. empty picks {}).
      const winners = entries.filter((e: { userId: number; picks: unknown }) => {
        const p = e.picks as { outcome?: string } | null;
        return p && typeof p.outcome === "string" && p.outcome === outcome;
      });
      const recipients = winners.length > 0 ? winners : entries;

      const prizePerEntry = Number(updated.prizePool) / recipients.length;
      const prizeStr = prizePerEntry.toFixed(8);
      for (const entry of recipients) {
        await db
          .update(walletsTable)
          .set({ balanceUsdt: sql`balance_usdt + ${prizeStr}` })
          .where(eq(walletsTable.userId, entry.userId));
        await db.insert(transactionsTable).values({
          userId: entry.userId,
          type: "credit",
          amount: prizeStr,
          status: "completed",
          notes: `Pool #${id} settlement — outcome: ${outcome}`,
        });
      }
      settledRecipientCount = recipients.length;
      totalDistributed = Number(updated.prizePool).toFixed(2);
    }
  }

  await logAdminAction(req.user!.userId, "update_pool", "pool", id, {
    status: poolFields.status,
    correctOutcome: outcome ?? null,
    settledRecipientCount,
    totalDistributedUsdt: totalDistributed,
  });
  res.json(updated);
});

router.delete("/admin/pools/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  await db.delete(predictionPoolsTable).where(eq(predictionPoolsTable.id, id));
  await logAdminAction(req.user!.userId, "delete_pool", "pool", id, {});
  res.sendStatus(204);
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  const { page = "1", limit = "50", action, adminId } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (action) conditions.push(eq(adminLogsTable.action, action));
  if (adminId) conditions.push(eq(adminLogsTable.adminId, parseInt(adminId)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

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
    .where(where)
    .orderBy(desc(adminLogsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [total] = await db.select({ count: count() }).from(adminLogsTable).where(where);
  res.json({ logs, total: Number(total.count), page: pageNum, limit: limitNum });
});

export default router;
