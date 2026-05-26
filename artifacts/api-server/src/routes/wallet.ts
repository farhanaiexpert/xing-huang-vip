import { Router } from "express";
import { eq, desc, and, gt, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, walletsTable, transactionsTable, userLimitsTable, selfExclusionsTable } from "@workspace/db";
import { checkDepositLimits, recordDepositUsage, isSelfExcludedFromDeposits } from "../lib/depositGuard.js";
import { authenticate } from "../middleware/authenticate.js";
import { verifyTronDeposit } from "../lib/tronVerify.js";
import { createPayment, getPaymentStatus, getMinimumPaymentAmount, FINISHED_STATUSES, FAILED_STATUSES } from "../lib/nowpayments.js";
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
  const userId = req.user!.userId;

  // ── Self-exclusion blocks deposits (withdrawals still allowed) ───────────────
  const exclusionMsg = await isSelfExcludedFromDeposits(userId);
  if (exclusionMsg) {
    res.status(403).json({ error: exclusionMsg, code: "SELF_EXCLUDED" });
    return;
  }

  // ── Deposit limit enforcement (all active periods: daily/weekly/monthly) ─────
  const limitCheck = await checkDepositLimits(userId, amount);
  if (limitCheck.blocked) {
    res.status(403).json({ error: limitCheck.reason, code: limitCheck.code, remaining: limitCheck.remaining });
    return;
  }

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
      userId,
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
      .where(eq(walletsTable.userId, userId));

    // Record deposit usage across all active limit windows
    await recordDepositUsage(userId, amount.toString());

    logger.info({ txHash, amount, userId }, "Deposit auto-approved and balance credited");

    res.status(201).json({ ...txn, autoVerified: true });
  } else {
    // ── MANUAL REVIEW: could not verify → pending for admin ──────────────────
    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: amount.toString(),
      status: "pending",
      txHash,
      network,
      verified: false,
      verificationNote: verification.note,
    }).returning();

    logger.info({ txHash, amount, userId, reason: verification.note }, "Deposit pending manual review");

    res.status(201).json({ ...txn, autoVerified: false, reviewReason: verification.note });
  }
});

// ── POST /wallet/deposit/nowpayments/create ───────────────────────────────────
const NppCreateBody = z.object({
  amount:   z.number().positive().min(10, "Minimum deposit is 10 USDT"),
  currency: z.string().default("usdttrc20"),
});

router.post("/wallet/deposit/nowpayments/create", authenticate, async (req, res): Promise<void> => {
  const parsed = NppCreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, currency } = parsed.data;

  const domain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim();
  const ipnCallbackUrl = domain ? `https://${domain}/api/webhooks/nowpayments` : undefined;

  // Pre-flight: check minimum amount for the chosen currency
  try {
    const minUsd = await getMinimumPaymentAmount(currency);
    if (minUsd > 0 && amount < minUsd) {
      const minRounded = Math.ceil(minUsd * 100) / 100;
      res.status(400).json({
        error: `Minimum deposit for this currency is $${minRounded} USDT. Please enter a higher amount.`,
      });
      return;
    }
  } catch {
    // Non-fatal — continue and let the payment attempt surface any error
  }

  try {
    const payment = await createPayment({
      priceAmount: amount,
      priceCurrency: "usd",
      payCurrency: currency,
      orderId: `cupbett-${req.user!.userId}-${Date.now()}`,
      orderDescription: `CupBett deposit $${amount} USDT for user ${req.user!.userId}`,
      ipnCallbackUrl,
    });

    const [txn] = await db.insert(transactionsTable).values({
      userId: req.user!.userId,
      type: "deposit",
      amount: amount.toString(),
      status: "pending",
      network: currency === "usdttrc20" ? "TRC-20" : currency.toUpperCase(),
      nowpaymentsPaymentId: payment.paymentId,
      nowpaymentsStatus: payment.paymentStatus,
      verificationNote: `NOWPayments payment ${payment.paymentId}`,
    }).returning();

    logger.info({ paymentId: payment.paymentId, userId: req.user!.userId, amount, currency }, "NOWPayments payment created");

    res.status(201).json({
      transactionId: txn.id,
      paymentId:    payment.paymentId,
      payAddress:   payment.payAddress,
      payAmount:    payment.payAmount,
      payCurrency:  payment.payCurrency,
      priceAmount:  payment.priceAmount,
      priceCurrency: payment.priceCurrency,
      status:       payment.paymentStatus,
      expiresAt:    payment.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Parse AMOUNT_MINIMAL_ERROR from NOWPayments response body
    const minMatch = msg.match(/"message"\s*:\s*"Crypto amount ([\d.]+) is less than minimal/);
    if (msg.includes("AMOUNT_MINIMAL_ERROR") || minMatch) {
      res.status(400).json({
        error: "Amount is below the minimum for this cryptocurrency. Please increase your deposit amount or choose a different currency (e.g. USDT TRC-20).",
      });
      return;
    }
    logger.error({ err }, "Failed to create NOWPayments payment");
    res.status(502).json({ error: "Payment gateway unavailable — please try again or use manual deposit" });
  }
});

// ── GET /wallet/deposit/nowpayments/:paymentId/status ─────────────────────────
router.get("/wallet/deposit/nowpayments/:paymentId/status", authenticate, async (req, res): Promise<void> => {
  const paymentId = req.params.paymentId as string;

  const [txn] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.nowpaymentsPaymentId, paymentId))
    .limit(1);

  if (!txn) { res.status(404).json({ error: "Payment not found" }); return; }
  if (txn.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // Already settled by webhook
  if (txn.status === "completed") {
    res.json({ status: "finished", nowpaymentsStatus: txn.nowpaymentsStatus, credited: true });
    return;
  }
  if (txn.status === "rejected") {
    res.json({ status: txn.nowpaymentsStatus ?? "failed", nowpaymentsStatus: txn.nowpaymentsStatus, credited: false });
    return;
  }

  // Poll NOWPayments for live status
  try {
    const payment = await getPaymentStatus(paymentId);

    await db.update(transactionsTable)
      .set({ nowpaymentsStatus: payment.paymentStatus })
      .where(eq(transactionsTable.id, txn.id));

    // Webhook fallback: if finished but not yet credited
    if (FINISHED_STATUSES.has(payment.paymentStatus)) {
      const depositAmt = parseFloat(txn.amount);
      const pollNow = new Date();

        // Self-exclusion and deposit limit checks before crediting
      const pollExclMsg = await isSelfExcludedFromDeposits(txn.userId);
      if (pollExclMsg) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
          .where(eq(transactionsTable.id, txn.id));
        res.json({ status: "rejected", nowpaymentsStatus: payment.paymentStatus, credited: false, error: "Self-excluded" });
        return;
      }
      const pollLimitCheck = await checkDepositLimits(txn.userId, depositAmt);
      if (pollLimitCheck.blocked) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
          .where(eq(transactionsTable.id, txn.id));
        res.json({ status: "rejected", nowpaymentsStatus: payment.paymentStatus, credited: false, error: "Deposit limit exceeded" });
        return;
      }

      await db.update(transactionsTable)
        .set({ status: "completed", verified: true, verificationNote: `Auto-credited via NOWPayments (${payment.paymentStatus})` })
        .where(eq(transactionsTable.id, txn.id));
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
        .where(eq(walletsTable.userId, txn.userId));
      await recordDepositUsage(txn.userId, txn.amount);
      logger.info({ paymentId, userId: txn.userId }, "NOWPayments deposit credited via polling fallback");
      res.json({ status: payment.paymentStatus, nowpaymentsStatus: payment.paymentStatus, credited: true });
      return;
    }

    if (FAILED_STATUSES.has(payment.paymentStatus)) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: `NOWPayments payment ${payment.paymentStatus}` })
        .where(eq(transactionsTable.id, txn.id));
    }

    res.json({ status: payment.paymentStatus, nowpaymentsStatus: payment.paymentStatus, credited: false });
  } catch (err) {
    logger.warn({ err, paymentId }, "Failed to poll NOWPayments status");
    res.json({ status: txn.nowpaymentsStatus ?? "waiting", nowpaymentsStatus: txn.nowpaymentsStatus, credited: false });
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
