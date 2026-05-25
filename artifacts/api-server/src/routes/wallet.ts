import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { verifyTronDeposit } from "../lib/tronVerify.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Platform deposit config ───────────────────────────────────────────────────
export const PLATFORM_DEPOSIT = {
  address: process.env.DEPOSIT_WALLET_ADDRESS ?? "PASTE_YOUR_TRC20_WALLET_ADDRESS_HERE",
  network: "TRC-20",
  qrImageUrl: "https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Farhan-QR.png",
  minDeposit: 10,
  processingTime: "instant (auto-verified) or up to 30 minutes (manual review)",
};

// ── GET /wallet/deposit-info ─── public, no auth needed ──────────────────────
router.get("/wallet/deposit-info", (_req, res): void => {
  res.json({
    address: PLATFORM_DEPOSIT.address,
    network: PLATFORM_DEPOSIT.network,
    qrImageUrl: PLATFORM_DEPOSIT.qrImageUrl,
    minDeposit: PLATFORM_DEPOSIT.minDeposit,
    processingTime: PLATFORM_DEPOSIT.processingTime,
    currency: "USDT",
  });
});

// ── GET /wallet/balance ───────────────────────────────────────────────────────
router.get("/wallet/balance", authenticate, async (req, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (!wallet) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }
  res.json({ balance: wallet.balanceUsdt, currency: "USDT" });
});

// ── GET /wallet/transactions ──────────────────────────────────────────────────
router.get("/wallet/transactions", authenticate, async (req, res): Promise<void> => {
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, req.user!.userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(50);
  res.json(txns);
});

// ── POST /wallet/deposit ──────────────────────────────────────────────────────
const DepositBody = z.object({
  amount:  z.number().positive().min(PLATFORM_DEPOSIT.minDeposit, `Minimum deposit is ${PLATFORM_DEPOSIT.minDeposit} USDT`),
  txHash:  z.string().min(10, "Please enter a valid transaction hash"),
  network: z.string().default("TRC-20"),
});

router.post("/wallet/deposit", authenticate, async (req, res): Promise<void> => {
  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, txHash, network } = parsed.data;

  // ── Prevent duplicate TxHash submissions ─────────────────────────────────────
  const [existing] = await db.select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(eq(transactionsTable.txHash, txHash))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "This transaction hash has already been submitted." });
    return;
  }

  // ── On-chain verification via Tronscan ────────────────────────────────────────
  logger.info({ txHash, amount, userId: req.user!.userId }, "Starting on-chain deposit verification");

  const verification = await verifyTronDeposit(txHash, PLATFORM_DEPOSIT.address, amount);

  logger.info({ txHash, verified: verification.verified, note: verification.note }, "Verification result");

  if (verification.verified) {
    // ── AUTO-APPROVE: verified on-chain → credit balance immediately ─────────
    const [txn] = await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amount.toString(),
      status: "completed",
      txHash,
      network,
      verified: true,
      verificationNote: verification.note,
    }).returning();

    // Credit wallet balance
    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${amount.toString()}` })
      .where(eq(walletsTable.userId, req.user!.userId));

    logger.info({ txHash, amount, userId: req.user!.userId }, "Deposit auto-approved and balance credited");

    res.status(201).json({ ...txn, autoVerified: true });
  } else {
    // ── MANUAL REVIEW: could not verify → pending for admin ──────────────────
    const [txn] = await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amount.toString(),
      status: "pending",
      txHash,
      network,
      verified: false,
      verificationNote: verification.note,
    }).returning();

    logger.info({ txHash, amount, userId: req.user!.userId, reason: verification.note }, "Deposit pending manual review");

    res.status(201).json({ ...txn, autoVerified: false, reviewReason: verification.note });
  }
});

// ── POST /wallet/withdraw ─────────────────────────────────────────────────────
const WithdrawBody = z.object({
  amount:        z.number().positive().min(10, "Minimum withdrawal is 10 USDT"),
  walletAddress: z.string().min(10, "Please enter a valid USDT wallet address"),
  network:       z.string().default("TRC-20"),
});

router.post("/wallet/withdraw", authenticate, async (req, res): Promise<void> => {
  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, walletAddress, network } = parsed.data;

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
    walletAddress,
    network,
    reference: walletAddress,
  }).returning();

  res.status(201).json(txn);
});

export default router;
