import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable, betsTable, betSelectionsTable, transactionsTable,
  commissionSettingsTable, userBalancesTable, platformSettingsTable,
  withdrawalRequestsTable,
  SETTING_DEFAULTS,
} from "@workspace/db";
import { eq, desc, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middleware/auth";
import { settleBet, runAutoSettlement } from "../services/settlement";

const router = Router();
router.use(requireAdmin);

/* ── Users — list ───────────────────────────────────────────── */
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

/* ── Users — edit full profile ──────────────────────────────── */
router.patch("/users/:id", async (req, res) => {
  const schema = z.object({
    username:      z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    email:         z.string().email().optional().nullable(),
    walletAddress: z.string().min(10).max(100).optional().nullable(),
    role:          z.enum(["user", "admin"]).optional(),
    status:        z.enum(["active", "suspended", "banned"]).optional(),
    newPassword:   z.string().min(8).max(128).optional(),
  }).refine(d => Object.keys(d).length > 0, { message: "At least one field required" });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { id } = req.params;
  const { username, email, walletAddress, role, status, newPassword } = parsed.data;

  try {
    // Uniqueness checks
    if (username) {
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username));
      if (existing && existing.id !== id) {
        res.status(409).json({ error: "conflict", message: "Username already taken" });
        return;
      }
    }
    if (email) {
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
      if (existing && existing.id !== id) {
        res.status(409).json({ error: "conflict", message: "Email already in use" });
        return;
      }
    }
    if (walletAddress) {
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.walletAddress, walletAddress));
      if (existing && existing.id !== id) {
        res.status(409).json({ error: "conflict", message: "Wallet already linked to another account" });
        return;
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (username      !== undefined) updates.username      = username;
    if (email         !== undefined) updates.email         = email;
    if (walletAddress !== undefined) updates.walletAddress = walletAddress;
    if (role          !== undefined) updates.role          = role;
    if (status        !== undefined) updates.status        = status;
    if (newPassword)                 updates.passwordHash  = await bcrypt.hash(newPassword, 12);

    await db.update(usersTable).set(updates).where(eq(usersTable.id, id));

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
    req.log.error({ err }, "admin edit user error");
    res.status(500).json({ error: "internal", message: "Failed to update user" });
  }
});

/* ── Users — status-only shortcut (kept for backwards compat) ── */
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

    if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "admin update status error");
    res.status(500).json({ error: "internal", message: "Failed to update status" });
  }
});

/* ── Users — detail (profile + balance + bets + txns) ──────── */
router.get("/users/:id/detail", async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }

    const [balanceRow] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, id));
    const balance = balanceRow
      ? { available: balanceRow.available, locked: balanceRow.locked, currency: balanceRow.currency }
      : { available: "0", locked: "0", currency: "USDT" };

    const recentBets = await db
      .select()
      .from(betsTable)
      .where(eq(betsTable.userId, id))
      .orderBy(desc(betsTable.createdAt))
      .limit(10);

    const betsWithSels = await Promise.all(
      recentBets.map(async bet => {
        const sels = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
        return { ...bet, selections: sels };
      })
    );

    const recentTxns = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    res.json({ user, balance, recentBets: betsWithSels, recentTransactions: recentTxns });
  } catch (err) {
    req.log.error({ err }, "admin user detail error");
    res.status(500).json({ error: "internal", message: "Failed to fetch user detail" });
  }
});

/* ── Users — balance adjustment ─────────────────────────────── */
router.post("/users/:id/balance/adjust", async (req, res) => {
  const schema = z.object({
    amount: z.number().refine(n => n !== 0, "Amount cannot be zero"),
    reason: z.string().min(1).max(255),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { id } = req.params;
  const { amount, reason } = parsed.data;

  try {
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, id));
    if (!user) { res.status(404).json({ error: "not_found", message: "User not found" }); return; }

    // Atomic read-modify-write inside a serializable transaction
    let previous = "0";
    let newAvailable = "0";

    await db.transaction(async tx => {
      // FOR UPDATE locks the row so concurrent adjustments queue instead of racing
      const rows = await tx.execute(
        sql`SELECT available FROM user_balances WHERE user_id = ${id} FOR UPDATE`
      ) as { rows: { available: string }[] };

      const current = parseFloat(rows.rows[0]?.available ?? "0");
      const next = current + amount;

      if (next < 0) {
        throw Object.assign(new Error("Adjustment would result in negative balance"), { code: "NEG_BALANCE" });
      }

      previous     = current.toFixed(8);
      newAvailable = next.toFixed(8);

      if (rows.rows.length === 0) {
        await tx.insert(userBalancesTable).values({ userId: id, available: newAvailable, currency: "USDT" });
      } else {
        await tx.update(userBalancesTable)
          .set({ available: newAvailable, updatedAt: new Date() })
          .where(eq(userBalancesTable.userId, id));
      }

      // Direction recorded in description; amount is always the absolute value per schema
      await tx.insert(transactionsTable).values({
        id:          randomUUID(),
        userId:      id,
        type:        "adjustment",
        amount:      Math.abs(amount).toFixed(8),
        currency:    "USDT",
        status:      "completed",
        description: `Admin ${amount > 0 ? "credit" : "debit"}: ${reason}`,
      });
    });

    res.json({
      userId:    id,
      previous,
      adjusted:  amount.toFixed(8),
      available: newAvailable,
      currency:  "USDT",
    });
  } catch (err: any) {
    if (err?.code === "NEG_BALANCE") {
      res.status(400).json({ error: "validation", message: "Adjustment would result in negative balance" });
      return;
    }
    req.log.error({ err }, "admin balance adjust error");
    res.status(500).json({ error: "internal", message: "Failed to adjust balance" });
  }
});

/* ── Bets — list ────────────────────────────────────────────── */
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

/* ── Bets — settle ──────────────────────────────────────────── */
router.patch("/bets/:id/settle", async (req, res) => {
  const schema = z.object({ status: z.enum(["won", "lost", "void"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Status must be won, lost, or void" });
    return;
  }

  const { id } = req.params;
  try {
    const result = await settleBet(id, parsed.data.status);
    if (!result.settled && result.reason === "Bet not found") {
      res.status(404).json({ error: "not_found", message: "Bet not found" }); return;
    }
    if (!result.settled) {
      res.status(409).json({ error: "conflict", message: result.reason ?? "Cannot settle bet" }); return;
    }
    const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id));
    const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));
    res.json({ ...updated, selections, payout: result.payout });
  } catch (err) {
    req.log.error({ err }, "admin settle bet error");
    res.status(500).json({ error: "internal", message: "Failed to settle bet" });
  }
});

/* ── Settlement — manual run ────────────────────────────────── */
router.post("/settlement/run", async (req, res) => {
  try {
    const result = await runAutoSettlement();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "admin settlement run error");
    res.status(500).json({ error: "internal", message: "Settlement run failed" });
  }
});

/* ── Settlement — stats ─────────────────────────────────────── */
router.get("/settlement/stats", async (req, res) => {
  try {
    const allBets = await db.select({ status: betsTable.status, stake: betsTable.stake, potentialReturn: betsTable.potentialReturn }).from(betsTable);
    const pending = allBets.filter(b => b.status === "pending");
    const won     = allBets.filter(b => b.status === "won");
    const lost    = allBets.filter(b => b.status === "lost");
    const voidB   = allBets.filter(b => b.status === "void");
    const totalWagered = allBets.reduce((s, b) => s + parseFloat(b.stake), 0);
    const totalPaidOut = won.reduce((s, b) => s + parseFloat(b.potentialReturn), 0);
    res.json({
      total: allBets.length, pending: pending.length, won: won.length, lost: lost.length, void: voidB.length,
      totalWagered: totalWagered.toFixed(2), totalPaidOut: totalPaidOut.toFixed(2),
      houseEdge: (totalWagered - totalPaidOut).toFixed(2),
    });
  } catch (err) {
    req.log.error({ err }, "admin settlement stats error");
    res.status(500).json({ error: "internal", message: "Failed to fetch stats" });
  }
});

/* ── Transactions ───────────────────────────────────────────── */
router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(500);
    res.json({ transactions: txns, total: txns.length });
  } catch (err) {
    req.log.error({ err }, "admin get transactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch transactions" });
  }
});

/* ── Commission settings ────────────────────────────────────── */
router.get("/commission-settings", async (req, res) => {
  try {
    const settings = await db.select().from(commissionSettingsTable);
    if (settings.length === 0) {
      res.json({ settings: [{ level: 1, rate: "0.05" }, { level: 2, rate: "0.03" }, { level: 3, rate: "0.01" }] });
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
    res.status(400).json({ error: "validation", message: "Invalid settings format" }); return;
  }
  const adminId = (req as any).user.userId;
  try {
    for (const s of parsed.data.settings) {
      await db.insert(commissionSettingsTable)
        .values({ level: s.level, rate: s.rate, updatedBy: adminId, updatedAt: new Date() })
        .onConflictDoUpdate({ target: commissionSettingsTable.level, set: { rate: s.rate, updatedAt: new Date(), updatedBy: adminId } });
    }
    const settings = await db.select().from(commissionSettingsTable);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "admin update commission settings error");
    res.status(500).json({ error: "internal", message: "Failed to update commission settings" });
  }
});

/* ── Platform settings ──────────────────────────────────────── */
function buildSettingsObject(rows: { key: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(platformSettingsTable);
    res.json({ settings: buildSettingsObject(rows) });
  } catch (err) {
    req.log.error({ err }, "admin get settings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req, res) => {
  const schema = z.object({
    settings: z.record(z.string(), z.string()),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "settings must be a key-value object" }); return;
  }
  try {
    for (const [key, value] of Object.entries(parsed.data.settings)) {
      if (!(key in SETTING_DEFAULTS)) continue; // ignore unknown keys
      await db.insert(platformSettingsTable)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
    }
    const rows = await db.select().from(platformSettingsTable);
    res.json({ settings: buildSettingsObject(rows) });
  } catch (err) {
    req.log.error({ err }, "admin update settings error");
    res.status(500).json({ error: "internal", message: "Failed to update settings" });
  }
});

/* ── Withdrawals — list all ──────────────────────────────────── */
router.get("/withdrawals", async (req, res) => {
  try {
    const withdrawals = await db
      .select()
      .from(withdrawalRequestsTable)
      .orderBy(desc(withdrawalRequestsTable.createdAt))
      .limit(500);

    res.json({ withdrawals, total: withdrawals.length });
  } catch (err) {
    req.log.error({ err }, "admin get withdrawals error");
    res.status(500).json({ error: "internal", message: "Failed to fetch withdrawals" });
  }
});

/* ── Withdrawals — review (approve/reject/process) ───────────── */
router.patch("/withdrawals/:id", async (req, res) => {
  const schema = z.object({
    action: z.enum(["approve", "reject", "process"]),
    note:   z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { id } = req.params;
  const { action, note } = parsed.data;
  const adminId = (req as any).user.userId;

  // All logic runs inside a single serializable transaction.
  // We lock the withdrawal row first (FOR UPDATE) so concurrent requests on the
  // same withdrawal queue behind the lock — eliminating double-approve races.
  let updatedWithdrawal: (typeof withdrawalRequestsTable.$inferSelect) | undefined;

  try {
    await db.transaction(async tx => {
      // 1. Lock the withdrawal row — concurrent requests block here
      const wRows = await tx.execute(
        sql`SELECT * FROM withdrawal_requests WHERE id = ${id} FOR UPDATE`
      ) as { rows: Record<string, unknown>[] };

      if (wRows.rows.length === 0) {
        throw Object.assign(new Error("not_found"), { code: "NOT_FOUND" });
      }

      const w = wRows.rows[0] as {
        id: string; user_id: string; amount: string; wallet_address: string;
        currency: string; status: string; note: string | null;
        transaction_id: string | null; reviewed_by: string | null; reviewed_at: Date | null;
        created_at: Date;
      };

      // 2. Re-validate transition using the locked, current status
      if (action === "approve" && w.status !== "pending") {
        throw Object.assign(new Error(`Cannot approve a ${w.status} request`), { code: "CONFLICT" });
      }
      if (action === "reject" && !["pending", "approved"].includes(w.status)) {
        throw Object.assign(new Error(`Cannot reject a ${w.status} request`), { code: "CONFLICT" });
      }
      if (action === "process" && w.status !== "approved") {
        throw Object.assign(new Error("Only approved withdrawals can be marked as processed"), { code: "CONFLICT" });
      }

      if (action === "approve") {
        // Lock balance row and deduct atomically
        const balRows = await tx.execute(
          sql`SELECT available FROM user_balances WHERE user_id = ${w.user_id} FOR UPDATE`
        ) as { rows: { available: string }[] };

        if (balRows.rows.length === 0) {
          throw Object.assign(new Error("Insufficient balance"), { code: "INSUF" });
        }
        const current = parseFloat(balRows.rows[0].available ?? "0");
        const amount  = parseFloat(w.amount);
        if (current < amount) {
          throw Object.assign(new Error("Insufficient balance"), { code: "INSUF" });
        }

        const newAvailable = (current - amount).toFixed(8);
        await tx.update(userBalancesTable)
          .set({ available: newAvailable, updatedAt: new Date() })
          .where(eq(userBalancesTable.userId, w.user_id));

        const txId = randomUUID();
        await tx.insert(transactionsTable).values({
          id:          txId,
          userId:      w.user_id,
          type:        "withdrawal",
          amount:      amount.toFixed(8),
          currency:    "USDT",
          status:      "pending",
          reference:   w.id,
          description: `Withdrawal to ${w.wallet_address}`,
        });

        await tx.update(withdrawalRequestsTable)
          .set({ status: "approved", note: note ?? null, reviewedBy: adminId, reviewedAt: new Date(), transactionId: txId })
          .where(eq(withdrawalRequestsTable.id, id));

      } else if (action === "reject") {
        // If previously approved, refund the balance and cancel the transaction
        if (w.status === "approved" && w.transaction_id) {
          const amount = parseFloat(w.amount);
          await tx.execute(
            sql`UPDATE user_balances SET available = available + ${amount.toFixed(8)}, updated_at = NOW() WHERE user_id = ${w.user_id}`
          );
          await tx.update(transactionsTable)
            .set({ status: "cancelled" })
            .where(eq(transactionsTable.id, w.transaction_id));
        }
        await tx.update(withdrawalRequestsTable)
          .set({ status: "rejected", note: note ?? null, reviewedBy: adminId, reviewedAt: new Date() })
          .where(eq(withdrawalRequestsTable.id, id));

      } else if (action === "process") {
        await tx.update(withdrawalRequestsTable)
          .set({ status: "processed", note: note ?? w.note, reviewedBy: adminId, reviewedAt: new Date() })
          .where(eq(withdrawalRequestsTable.id, id));

        if (w.transaction_id) {
          await tx.update(transactionsTable)
            .set({ status: "completed" })
            .where(eq(transactionsTable.id, w.transaction_id));
        }
      }

      // 3. Read the final state inside the same transaction
      const [final] = await tx
        .select()
        .from(withdrawalRequestsTable)
        .where(eq(withdrawalRequestsTable.id, id));
      updatedWithdrawal = final;
    });

    res.json(updatedWithdrawal);
  } catch (err: any) {
    if (err?.code === "NOT_FOUND") {
      res.status(404).json({ error: "not_found", message: "Withdrawal request not found" });
      return;
    }
    if (err?.code === "CONFLICT") {
      res.status(409).json({ error: "conflict", message: err.message });
      return;
    }
    if (err?.code === "INSUF") {
      res.status(409).json({ error: "conflict", message: "User has insufficient balance for this withdrawal" });
      return;
    }
    req.log.error({ err }, "admin review withdrawal error");
    res.status(500).json({ error: "internal", message: "Failed to review withdrawal" });
  }
});

export default router;
