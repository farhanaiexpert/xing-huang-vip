import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/wallet/balance", authenticate, async (req, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  res.json({ balance: wallet.balanceUsdt, currency: "USDT" });
});

router.get("/wallet/transactions", authenticate, async (req, res): Promise<void> => {
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, req.user!.userId))
    .orderBy(transactionsTable.createdAt);
  res.json(txns);
});

const DepositBody = z.object({
  amount: z.number().positive(),
  reference: z.string().optional(),
});

router.post("/wallet/deposit", authenticate, async (req, res): Promise<void> => {
  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { amount, reference } = parsed.data;

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.user!.userId,
    type: "deposit",
    amount: amount.toString(),
    status: "pending",
    reference,
  }).returning();

  res.status(201).json(txn);
});

const WithdrawBody = z.object({
  amount: z.number().positive(),
  walletAddress: z.string().min(10),
});

router.post("/wallet/withdraw", authenticate, async (req, res): Promise<void> => {
  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { amount, walletAddress } = parsed.data;

  const [wallet] = await db.select().from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (!wallet || parseFloat(wallet.balanceUsdt) < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const [txn] = await db.insert(transactionsTable).values({
    userId: req.user!.userId,
    type: "withdrawal",
    amount: amount.toString(),
    status: "pending",
    reference: walletAddress,
  }).returning();

  res.status(201).json(txn);
});

export default router;
