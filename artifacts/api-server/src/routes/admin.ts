import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable, betsTable, betSelectionsTable, transactionsTable,
         commissionSettingsTable, userBalancesTable } from "@workspace/db";
import { eq, desc, count, sum, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = Router();
router.use(requireAdmin);

router.get("/stats", async (req, res) => {
  try {
    const [userStats] = await db
      .select({
        total:     count(),
        active:    sql<number>`sum(case when ${usersTable.status} = 'active' then 1 else 0 end)`,
        suspended: sql<number>`sum(case when ${usersTable.status} = 'suspended' then 1 else 0 end)`,
      })
      .from(usersTable);

    const [betStats] = await db
      .select({
        total:   count(),
        pending: sql<number>`sum(case when ${betsTable.status} = 'pending' then 1 else 0 end)`,
        settled: sql<number>`sum(case when ${betsTable.status} in ('won','lost','void') then 1 else 0 end)`,
        volume:  sum(betsTable.stake),
      })
      .from(betsTable);

    const [txStats] = await db.select({ total: count() }).from(transactionsTable);

    res.json({
      totalUsers:        userStats?.total ?? 0,
      activeUsers:       Number(userStats?.active ?? 0),
      suspendedUsers:    Number(userStats?.suspended ?? 0),
      totalBets:         betStats?.total ?? 0,
      pendingBets:       Number(betStats?.pending ?? 0),
      settledBets:       Number(betStats?.settled ?? 0),
      totalVolume:       betStats?.volume ?? "0",
      totalTransactions: txStats?.total ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "admin get stats error");
    res.status(500).json({ error: "internal", message: "Failed to fetch stats" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id, username: usersTable.username, email: usersTable.email,
        walletAddress: usersTable.walletAddress, role: usersTable.role,
        status: usersTable.status, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json({ users, total: users.length });
  } catch (err) {
    req.log.error({ err }, "admin get users error");
    res.status(500).json({ error: "internal", message: "Failed to fetch users" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const schema = z.object({ status: z.enum(["active", "suspended", "banned"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Valid status required" });
    return;
  }

  const { id } = req.params;
  try {
    await db.update(usersTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(usersTable.id, id));

    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "admin update status error");
    res.status(500).json({ error: "internal", message: "Failed to update status" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  const schema = z.object({ role: z.enum(["user", "admin"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Valid role required" });
    return;
  }

  const { id } = req.params;
  try {
    await db.update(usersTable).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(usersTable.id, id));

    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "admin update role error");
    res.status(500).json({ error: "internal", message: "Failed to update role" });
  }
});

router.patch("/users/:id/balance", async (req, res) => {
  const schema = z.object({
    amount: z.string().regex(/^-?\d+(\.\d+)?$/, "Must be a numeric string"),
    note:   z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid amount" });
    return;
  }

  const { id } = req.params;
  const { amount, note } = parsed.data;
  const adminId = (req as any).user.userId;

  try {
    let [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, id));

    if (!balance) {
      await db.insert(userBalancesTable).values({ userId: id, available: "0", locked: "0", currency: "USDT" });
      balance = { userId: id, available: "0", locked: "0", currency: "USDT", updatedAt: new Date() };
    }

    const newAvailable = (parseFloat(balance.available) + parseFloat(amount)).toFixed(8);
    if (parseFloat(newAvailable) < 0) {
      res.status(400).json({ error: "validation", message: "Balance cannot go below 0" });
      return;
    }

    await db.update(userBalancesTable)
      .set({ available: newAvailable, updatedAt: new Date() })
      .where(eq(userBalancesTable.userId, id));

    await db.insert(transactionsTable).values({
      id:          randomUUID(),
      userId:      id,
      type:        "adjustment",
      amount:      amount,
      currency:    "USDT",
      status:      "completed",
      reference:   `admin:${adminId}`,
      description: note ?? "Admin balance adjustment",
    });

    res.json({ available: newAvailable, locked: balance.locked, currency: "USDT" });
  } catch (err) {
    req.log.error({ err }, "admin adjust balance error");
    res.status(500).json({ error: "internal", message: "Failed to adjust balance" });
  }
});

router.get("/bets", async (req, res) => {
  try {
    const bets = await db.select().from(betsTable).orderBy(desc(betsTable.createdAt)).limit(500);

    const betsWithSelections = await Promise.all(
      bets.map(async bet => {
        const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
        return { ...bet, selections };
      })
    );

    res.json({ bets: betsWithSelections, total: bets.length });
  } catch (err) {
    req.log.error({ err }, "admin get bets error");
    res.status(500).json({ error: "internal", message: "Failed to fetch bets" });
  }
});

router.patch("/bets/:id/settle", async (req, res) => {
  const schema = z.object({ status: z.enum(["won", "lost", "void"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Valid status required (won, lost, void)" });
    return;
  }

  const { id } = req.params;
  const { status } = parsed.data;

  try {
    const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, id));
    if (!bet) {
      res.status(404).json({ error: "not_found", message: "Bet not found" });
      return;
    }

    if (bet.status !== "pending") {
      res.status(400).json({ error: "conflict", message: "Bet is already settled" });
      return;
    }

    await db.update(betsTable)
      .set({ status, settledAt: new Date() })
      .where(eq(betsTable.id, id));

    if (status === "won") {
      const payout = bet.potentialReturn;
      let [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, bet.userId));

      if (!balance) {
        await db.insert(userBalancesTable).values({ userId: bet.userId, available: "0", locked: "0", currency: "USDT" });
        balance = { userId: bet.userId, available: "0", locked: "0", currency: "USDT", updatedAt: new Date() };
      }

      const newAvailable = (parseFloat(balance.available) + parseFloat(payout)).toFixed(8);
      await db.update(userBalancesTable)
        .set({ available: newAvailable, updatedAt: new Date() })
        .where(eq(userBalancesTable.userId, bet.userId));

      await db.insert(transactionsTable).values({
        id:          randomUUID(),
        userId:      bet.userId,
        type:        "bet_win",
        amount:      payout,
        currency:    "USDT",
        status:      "completed",
        reference:   `bet:${id}`,
        description: `Bet won — payout ${payout} USDT`,
      });
    } else if (status === "void") {
      let [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, bet.userId));

      if (!balance) {
        await db.insert(userBalancesTable).values({ userId: bet.userId, available: "0", locked: "0", currency: "USDT" });
        balance = { userId: bet.userId, available: "0", locked: "0", currency: "USDT", updatedAt: new Date() };
      }

      const refund = bet.stake;
      const newAvailable = (parseFloat(balance.available) + parseFloat(refund)).toFixed(8);
      await db.update(userBalancesTable)
        .set({ available: newAvailable, updatedAt: new Date() })
        .where(eq(userBalancesTable.userId, bet.userId));

      await db.insert(transactionsTable).values({
        id:          randomUUID(),
        userId:      bet.userId,
        type:        "bet_refund",
        amount:      refund,
        currency:    "USDT",
        status:      "completed",
        reference:   `bet:${id}`,
        description: `Bet voided — stake refunded ${refund} USDT`,
      });
    }

    const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id));
    const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));

    res.json({ ...updated, selections });
  } catch (err) {
    req.log.error({ err }, "admin settle bet error");
    res.status(500).json({ error: "internal", message: "Failed to settle bet" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(500);
    res.json({ transactions: txns, total: txns.length });
  } catch (err) {
    req.log.error({ err }, "admin get transactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch transactions" });
  }
});

router.get("/commission-settings", async (req, res) => {
  try {
    const settings = await db.select().from(commissionSettingsTable);

    if (settings.length === 0) {
      res.json({ settings: [
        { level: 1, rate: "0.05" },
        { level: 2, rate: "0.03" },
        { level: 3, rate: "0.01" },
      ]});
      return;
    }

    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "admin get commission settings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch commission settings" });
  }
});

router.put("/commission-settings", async (req, res) => {
  const schema = z.object({
    settings: z.array(z.object({ level: z.number().int().min(1).max(3), rate: z.string() })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Invalid settings format" });
    return;
  }

  const adminId = (req as any).user.userId;

  try {
    for (const s of parsed.data.settings) {
      await db.insert(commissionSettingsTable)
        .values({ level: s.level, rate: s.rate, updatedBy: adminId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: commissionSettingsTable.level,
          set: { rate: s.rate, updatedAt: new Date(), updatedBy: adminId },
        });
    }

    const settings = await db.select().from(commissionSettingsTable);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "admin update commission settings error");
    res.status(500).json({ error: "internal", message: "Failed to update commission settings" });
  }
});

export default router;
