import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  usersTable, userBalancesTable, betsTable, betSelectionsTable,
  withdrawalRequestsTable, transactionsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";

const router = Router();

const updateWalletSchema = z.object({
  walletAddress: z.string().min(10).max(100),
});

router.patch("/me/wallet", requireAuth, async (req, res) => {
  const parsed = updateWalletSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Valid wallet address required" });
    return;
  }

  const { userId } = (req as any).user;
  const { walletAddress } = parsed.data;

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.walletAddress, walletAddress))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== userId) {
      res.status(409).json({ error: "conflict", message: "Wallet address already linked to another account" });
      return;
    }

    await db
      .update(usersTable)
      .set({ walletAddress, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "update wallet error");
    res.status(500).json({ error: "internal", message: "Failed to update wallet" });
  }
});

router.get("/me/bets", requireAuth, async (req, res) => {
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
    req.log.error({ err }, "get user bets error");
    res.status(500).json({ error: "internal", message: "Failed to fetch bets" });
  }
});

router.get("/me/balance", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  try {
    let [balance] = await db
      .select()
      .from(userBalancesTable)
      .where(eq(userBalancesTable.userId, userId));

    if (!balance) {
      await db.insert(userBalancesTable).values({
        userId,
        available: "0",
        locked: "0",
        currency: "USDT",
      });
      balance = { userId, available: "0", locked: "0", currency: "USDT", updatedAt: new Date() };
    }

    res.json({ available: balance.available, locked: balance.locked, currency: balance.currency });
  } catch (err) {
    req.log.error({ err }, "get balance error");
    res.status(500).json({ error: "internal", message: "Failed to fetch balance" });
  }
});

/* ── Withdrawals — submit ────────────────────────────────────── */
const createWithdrawalSchema = z.object({
  amount:        z.number().positive().max(1_000_000),
  walletAddress: z.string().min(10).max(200),
});

router.post("/me/withdrawals", requireAuth, async (req, res) => {
  const parsed = createWithdrawalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { userId } = (req as any).user;
  const { amount, walletAddress } = parsed.data;

  try {
    // Check balance
    const [balance] = await db.select().from(userBalancesTable).where(eq(userBalancesTable.userId, userId));
    const available = parseFloat(balance?.available ?? "0");

    if (available < amount) {
      res.status(400).json({ error: "insufficient_balance", message: "Insufficient balance for this withdrawal" });
      return;
    }

    const id = randomUUID();
    const [created] = await db
      .insert(withdrawalRequestsTable)
      .values({
        id,
        userId,
        amount:        amount.toFixed(8),
        walletAddress,
        currency:      "USDT",
        status:        "pending",
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    req.log.error({ err }, "create withdrawal error");
    res.status(500).json({ error: "internal", message: "Failed to submit withdrawal request" });
  }
});

/* ── Withdrawals — list own ──────────────────────────────────── */
router.get("/me/withdrawals", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  try {
    const withdrawals = await db
      .select()
      .from(withdrawalRequestsTable)
      .where(eq(withdrawalRequestsTable.userId, userId))
      .orderBy(desc(withdrawalRequestsTable.createdAt));

    res.json({ withdrawals });
  } catch (err) {
    req.log.error({ err }, "get withdrawals error");
    res.status(500).json({ error: "internal", message: "Failed to fetch withdrawals" });
  }
});

export default router;
