import { Router } from "express";
import { eq, desc, and, gt, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, walletsTable, transactionsTable, userLimitsTable, selfExclusionsTable } from "@workspace/db";
import { checkDepositLimits, recordDepositUsage, isSelfExcludedFromDeposits } from "../lib/depositGuard.js";
import { authenticate } from "../middleware/authenticate.js";
import { verifyTronDeposit } from "../lib/tronVerify.js";
import { verifyEvmDeposit } from "../lib/evmVerify.js";
import { verifySolanaDeposit } from "../lib/solanaVerify.js";
import { verifyTonDeposit } from "../lib/tonVerify.js";
import { verifyBtcDeposit } from "../lib/btcVerify.js";
import { verifyXrpDeposit } from "../lib/xrpVerify.js";
import { createPayment, getPaymentStatus, getMinimumPaymentAmount, FINISHED_STATUSES, FAILED_STATUSES } from "../lib/nowpayments.js";
import { createPayment as cryptomusCreatePayment, getPaymentStatus as cryptomusGetStatus, cryptomusConfigured, FINISHED_STATUSES as CRYPTOMUS_FINISHED, FAILED_STATUSES as CRYPTOMUS_FAILED } from "../lib/cryptomus.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Platform deposit config ───────────────────────────────────────────────────
export const PLATFORM_DEPOSIT = {
  address:       process.env.DEPOSIT_WALLET_ADDRESS        ?? "",
  addressErc20:  process.env.DEPOSIT_WALLET_ADDRESS_ERC20  ?? "",
  addressBtc:    process.env.DEPOSIT_WALLET_ADDRESS_BTC    ?? "",
  addressSol:    process.env.DEPOSIT_WALLET_ADDRESS_SOL    ?? "",
  addressTon:    process.env.DEPOSIT_WALLET_ADDRESS_TON    ?? "",
  addressXrp:    process.env.DEPOSIT_WALLET_ADDRESS_XRP    ?? "",
  network: "TRC-20",
  qrImageUrl: "https://media.ourwebprojects.pro/wp-content/uploads/2026/05/Farhan-QR.png",
  minDeposit: 10,
  processingTime: "instant (auto-verified) or up to 30 minutes (manual review)",
};

// ── GET /wallet/deposit-info ─── public, no auth needed ──────────────────────
router.get("/wallet/deposit-info", (_req, res): void => {
  // Only expose addresses that have been configured; return undefined (omitted)
  // for empty addresses so the frontend can show "Unavailable" instead of an
  // empty or placeholder string — prevents users from sending funds to nowhere.
  res.json({
    address:      PLATFORM_DEPOSIT.address      || undefined,
    addressErc20: PLATFORM_DEPOSIT.addressErc20 || undefined,
    addressBtc:   PLATFORM_DEPOSIT.addressBtc   || undefined,
    addressSol:   PLATFORM_DEPOSIT.addressSol   || undefined,
    addressTon:   PLATFORM_DEPOSIT.addressTon   || undefined,
    addressXrp:   PLATFORM_DEPOSIT.addressXrp   || undefined,
    network:      PLATFORM_DEPOSIT.network,
    qrImageUrl:   PLATFORM_DEPOSIT.qrImageUrl,
    minDeposit:   PLATFORM_DEPOSIT.minDeposit,
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
  res.json({ balance: wallet.balanceUsdt, bonusBalance: wallet.bonusBalanceUsdt, currency: "USDT" });
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
// Minimum amount per network (non-USDT networks use coin units)
const NETWORK_MINIMUMS: Record<string, { min: number; unit: string }> = {
  BTC:  { min: 0.00001, unit: "BTC"  },
  XRP:  { min: 1,       unit: "XRP"  },
  SOLANA: { min: 1,     unit: "USDT" },
  TON:    { min: 1,     unit: "USDT" },
};

// These networks use native coin amounts — never auto-credit; always require
// admin to convert coin amount → USDT equivalent before crediting
const FORCE_MANUAL_NETWORKS = new Set(["BTC", "XRP"]);

const DepositBody = z.object({
  amount:  z.number().positive(),
  txHash:  z.string().min(10, "Please enter a valid transaction hash"),
  // ETH | BSC | POLYGON | ARBITRUM | OPTIMISM | BASE = EVM auto-deposit (verified via evmVerify)
  // TRC-20 = TRON auto or manual deposit (verified via tronVerify)
  // ERC-20 = legacy manual form (falls through to EVM/ETH verifier)
  // SOLANA | TON | BTC | XRP = non-EVM chains (verified via dedicated libs)
  network: z.enum(["TRC-20", "ERC-20", "ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM", "BASE", "SOLANA", "TON", "BTC", "XRP"]).default("TRC-20"),
});

router.post("/wallet/deposit", authenticate, async (req, res): Promise<void> => {
  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, txHash, network } = parsed.data;
  const userId = req.user!.userId;

  // ── Network-specific minimum amount check ─────────────────────────────────────
  const netMin = NETWORK_MINIMUMS[network];
  const minValue = netMin ? netMin.min : PLATFORM_DEPOSIT.minDeposit;
  const minUnit  = netMin ? netMin.unit : "USDT";
  if (amount < minValue) {
    res.status(400).json({ error: `Minimum deposit is ${minValue} ${minUnit}` });
    return;
  }

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

  // ── On-chain verification — route to correct verifier by network ──────────────
  logger.info({ txHash, amount, network, userId: req.user!.userId }, "Starting on-chain deposit verification");

  const verification = (network === "TRC-20")
    ? await verifyTronDeposit(txHash, PLATFORM_DEPOSIT.address, amount)
    : (network === "SOLANA")
      ? await verifySolanaDeposit(txHash, PLATFORM_DEPOSIT.addressSol, amount)
      : (network === "TON")
        ? await verifyTonDeposit(txHash, PLATFORM_DEPOSIT.addressTon, amount)
        : (network === "BTC")
          ? await verifyBtcDeposit(txHash, PLATFORM_DEPOSIT.addressBtc, amount)
          : (network === "XRP")
            ? await verifyXrpDeposit(txHash, PLATFORM_DEPOSIT.addressXrp, amount)
            : await verifyEvmDeposit(txHash, network === "ERC-20" ? "ETH" : network, PLATFORM_DEPOSIT.addressErc20, amount);

  logger.info({ txHash, verified: verification.verified, note: verification.note, network }, "Verification result");

  // BTC/XRP amounts are in coin units — auto-credit not safe without price conversion
  const autoVerified = verification.verified && !FORCE_MANUAL_NETWORKS.has(network);

  if (autoVerified) {
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
  } else if (FORCE_MANUAL_NETWORKS.has(network) && verification.verified) {
    // BTC/XRP verified on-chain but needs admin to convert & credit USDT equiv.
    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: amount.toString(),
      status: "pending",
      txHash,
      network,
      verified: true,
      verificationNote: `${verification.note} — Awaiting admin USDT credit conversion.`,
    }).returning();
    logger.info({ txHash, amount, network, userId }, "Native-coin deposit verified; pending admin credit conversion");
    res.status(201).json({ ...txn, autoVerified: false, reviewReason: "Admin will convert to USDT and credit within 30 min" });
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

// Maps each NOWPayments pay_currency to a human-readable network label stored
// in the transaction record. Without this, every non-TRC-20 currency would be
// recorded as "ERC-20" regardless of the actual network.
const NPP_CURRENCY_TO_NETWORK: Record<string, string> = {
  usdttrc20:   "TRC-20",
  usdterc20:   "ERC-20",
  usdtbsc:     "BEP-20",
  usdtpolygon: "Polygon",
  usdtsol:     "Solana",
  usdtarbi:    "Arbitrum",
  usdtton:     "TON",
  btc:         "BTC",
  eth:         "ETH",
  bnbbsc:      "BEP-20",
  ltc:         "LTC",
  xrp:         "XRP",
};

const ALLOWED_NPP_CURRENCIES = [
  "usdttrc20", "usdterc20", "usdtbsc", "usdtpolygon", "usdtsol", "usdtarbi",
  "btc", "eth", "bnbbsc", "ltc", "usdtton", "xrp",
] as const;

const NppCreateBody = z.object({
  amount:   z.number().positive().min(10, "Minimum deposit is 10 USDT"),
  currency: z.enum(ALLOWED_NPP_CURRENCIES).default("usdttrc20"),
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
      network: NPP_CURRENCY_TO_NETWORK[currency] ?? "ERC-20",
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

      // Self-exclusion and deposit limit checks before crediting
      const pollExclMsg = await isSelfExcludedFromDeposits(txn.userId);
      if (pollExclMsg) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
          .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")));
        res.json({ status: "rejected", nowpaymentsStatus: payment.paymentStatus, credited: false, error: "Self-excluded" });
        return;
      }
      const pollLimitCheck = await checkDepositLimits(txn.userId, depositAmt);
      if (pollLimitCheck.blocked) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
          .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")));
        res.json({ status: "rejected", nowpaymentsStatus: payment.paymentStatus, credited: false, error: "Deposit limit exceeded" });
        return;
      }

      // Atomic claim: only credit if we can transition pending → completed.
      // This prevents double-credit when both the webhook and polling path
      // see a finished status concurrently. Mirrors the Cryptomus pattern.
      const pollClaimed = await db.update(transactionsTable)
        .set({ status: "completed", verified: true, verificationNote: `Auto-credited via NOWPayments (${payment.paymentStatus})`, nowpaymentsStatus: payment.paymentStatus })
        .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")))
        .returning({ id: transactionsTable.id });

      if (pollClaimed.length > 0) {
        await db.update(walletsTable)
          .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
          .where(eq(walletsTable.userId, txn.userId));
        await recordDepositUsage(txn.userId, txn.amount);
        logger.info({ paymentId, userId: txn.userId }, "NOWPayments deposit credited via polling fallback");
      } else {
        logger.info({ paymentId }, "NOWPayments polling: deposit already processed, skipping duplicate credit");
      }
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

// ── GET /wallet/deposit/cryptomus/available ───────────────────────────────────
router.get("/wallet/deposit/cryptomus/available", (_req, res): void => {
  res.json({ available: cryptomusConfigured() });
});

// ── POST /wallet/deposit/cryptomus/create ─────────────────────────────────────
const CRYPTOMUS_NETWORKS = ["trc20", "erc20"] as const;

const CryptomusCreateBody = z.object({
  amount:  z.number().positive().min(10, "Minimum deposit is 10 USDT"),
  network: z.enum(CRYPTOMUS_NETWORKS).default("trc20"),
});

router.post("/wallet/deposit/cryptomus/create", authenticate, async (req, res): Promise<void> => {
  if (!cryptomusConfigured()) {
    res.status(503).json({ error: "Cryptomus gateway is not configured" });
    return;
  }

  const parsed = CryptomusCreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, network } = parsed.data;
  const userId = req.user!.userId;

  // Self-exclusion and deposit-limit preflight
  const exclMsg = await isSelfExcludedFromDeposits(userId);
  if (exclMsg) {
    res.status(403).json({ error: exclMsg, code: "SELF_EXCLUDED" });
    return;
  }
  const limitCheck = await checkDepositLimits(userId, amount);
  if (limitCheck.blocked) {
    res.status(403).json({ error: limitCheck.reason ?? "Deposit limit exceeded", code: limitCheck.code, remaining: limitCheck.remaining });
    return;
  }

  const domain = (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim();
  const callbackUrl = domain ? `https://${domain}/api/webhooks/cryptomus` : undefined;
  const orderId = `cupbett-${userId}-${Date.now()}`;

  try {
    const payment = await cryptomusCreatePayment({
      amount,
      network: network === "trc20" ? "TRON" : "ETH",
      orderId,
      callbackUrl,
    });

    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type:             "deposit",
      amount:           amount.toString(),
      status:           "pending",
      network:          network === "trc20" ? "TRC-20" : "ERC-20",
      cryptomusUuid:    payment.uuid,
      cryptomusStatus:  payment.status,
      verificationNote: `Cryptomus payment ${payment.uuid}`,
    }).returning();

    logger.info({ uuid: payment.uuid, userId, amount, network }, "Cryptomus payment created");

    const expiresAt = payment.expiredAt
      ? new Date(payment.expiredAt * 1000).toISOString()
      : null;

    res.status(201).json({
      transactionId:  txn.id,
      uuid:           payment.uuid,
      address:        payment.address,
      amount,
      network:        payment.network,
      paymentStatus:  payment.status,
      paymentUrl:     payment.url,
      expiresAt,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create Cryptomus payment");
    res.status(502).json({ error: "Cryptomus payment gateway unavailable — please try again or use another deposit method" });
  }
});

// ── GET /wallet/deposit/cryptomus/:uuid/status ────────────────────────────────
router.get("/wallet/deposit/cryptomus/:uuid/status", authenticate, async (req, res): Promise<void> => {
  const uuid = req.params.uuid as string;

  const [txn] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.cryptomusUuid, uuid))
    .limit(1);

  if (!txn) { res.status(404).json({ error: "Payment not found" }); return; }
  if (txn.userId !== req.user!.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // Already settled by webhook
  if (txn.status === "completed") {
    res.json({ status: "paid", cryptomusStatus: txn.cryptomusStatus, credited: true });
    return;
  }
  if (txn.status === "rejected") {
    res.json({ status: txn.cryptomusStatus ?? "fail", cryptomusStatus: txn.cryptomusStatus, credited: false });
    return;
  }

  // Poll Cryptomus for live status
  try {
    const payment = await cryptomusGetStatus(uuid);

    await db.update(transactionsTable)
      .set({ cryptomusStatus: payment.status })
      .where(eq(transactionsTable.id, txn.id));

    if (CRYPTOMUS_FINISHED.has(payment.status)) {
      const depositAmt = parseFloat(txn.amount);

      const pollExclMsg = await isSelfExcludedFromDeposits(txn.userId);
      if (pollExclMsg) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
          .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")));
        res.json({ status: "rejected", cryptomusStatus: payment.status, credited: false, error: "Self-excluded" });
        return;
      }
      const pollLimitCheck = await checkDepositLimits(txn.userId, depositAmt);
      if (pollLimitCheck.blocked) {
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
          .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")));
        res.json({ status: "rejected", cryptomusStatus: payment.status, credited: false, error: "Deposit limit exceeded" });
        return;
      }

      // Atomic claim: only credit if we transition pending → completed
      const claimed = await db.update(transactionsTable)
        .set({ status: "completed", verified: true, verificationNote: `Auto-credited via Cryptomus (${payment.status})`, cryptomusStatus: payment.status })
        .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")))
        .returning({ id: transactionsTable.id });

      if (claimed.length > 0) {
        await db.update(walletsTable)
          .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
          .where(eq(walletsTable.userId, txn.userId));
        await recordDepositUsage(txn.userId, txn.amount);
        logger.info({ uuid, userId: txn.userId }, "Cryptomus deposit credited via polling fallback");
        res.json({ status: payment.status, cryptomusStatus: payment.status, credited: true });
      } else {
        // Already credited by a concurrent webhook or poll — return success
        res.json({ status: "paid", cryptomusStatus: payment.status, credited: true });
      }
      return;
    }

    if (CRYPTOMUS_FAILED.has(payment.status)) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: `Cryptomus payment ${payment.status}` })
        .where(eq(transactionsTable.id, txn.id));
    }

    res.json({ status: payment.status, cryptomusStatus: payment.status, credited: false });
  } catch (err) {
    logger.warn({ err, uuid }, "Failed to poll Cryptomus status");
    res.json({ status: txn.cryptomusStatus ?? "check", cryptomusStatus: txn.cryptomusStatus, credited: false });
  }
});

// ── GET /wallet/bonus/welcome/status ─────────────────────────────────────────
router.get("/wallet/bonus/welcome/status", authenticate, async (req, res): Promise<void> => {
  const [existing] = await db.select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, req.user!.userId),
      eq(transactionsTable.type, "bonus"),
      eq(transactionsTable.reference, "welcome_bonus"),
    ))
    .limit(1);
  res.json({ claimed: !!existing });
});

// ── POST /wallet/bonus/welcome ────────────────────────────────────────────────
router.post("/wallet/bonus/welcome", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const BONUS_AMOUNT = "120.00";

  try {
    // Atomic: insert transaction first — the unique partial index rejects duplicates
    // then credit the wallet. Wrapped in a DB transaction for consistency.
    await db.transaction(async (tx) => {
      await tx.insert(transactionsTable).values({
        userId,
        type: "bonus",
        amount: BONUS_AMOUNT,
        status: "completed",
        reference: "welcome_bonus",
        verified: true,
        notes: "Welcome bonus — non-withdrawable",
      });

      await tx.update(walletsTable)
        .set({ bonusBalanceUsdt: sql`bonus_balance_usdt + ${BONUS_AMOUNT}` })
        .where(eq(walletsTable.userId, userId));
    });

    logger.info({ userId, amount: BONUS_AMOUNT }, "Welcome bonus claimed");
    res.status(201).json({ bonusAmount: BONUS_AMOUNT, currency: "USDT" });
  } catch (err: unknown) {
    // DrizzleQueryError wraps the pg error in .cause, not .message — check both
    const msg = err instanceof Error ? err.message : String(err);
    const causeMsg = (err as { cause?: { message?: string } })?.cause?.message ?? "";
    const full = `${msg} ${causeMsg}`.toLowerCase();
    if (full.includes("idx_transactions_welcome_bonus") || full.includes("duplicate key") || full.includes("already_claimed")) {
      res.status(409).json({ error: "Welcome bonus already claimed.", code: "ALREADY_CLAIMED" });
    } else {
      logger.error({ err, userId }, "Failed to claim welcome bonus");
      res.status(500).json({ error: "Failed to claim bonus. Please try again." });
    }
  }
});

// ── POST /wallet/withdraw ─────────────────────────────────────────────────────
const WithdrawBody = z.object({
  amount:        z.number().positive().min(100, "Minimum withdrawal is 100 USDT"),
  walletAddress: z.string().min(10, "Please enter a valid USDT wallet address"),
  network:       z.enum(["TRC-20", "ERC-20"]),
});

router.post("/wallet/withdraw", authenticate, async (req, res): Promise<void> => {
  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { amount, walletAddress, network } = parsed.data;
  const userId = req.user!.userId;

  try {
    // Use a DB transaction with SELECT FOR UPDATE to serialize concurrent
    // withdrawal requests and prevent over-spending. We account for all
    // already-pending withdrawals so two simultaneous requests can't both
    // pass the balance check against the same balance.
    const [txn] = await db.transaction(async (tx) => {
      const balRows = await tx.execute(sql`
        SELECT
          w.balance_usdt::numeric AS balance,
          COALESCE((
            SELECT SUM(t.amount::numeric)
            FROM transactions t
            WHERE t.user_id = ${userId}
              AND t.type    = 'withdrawal'
              AND t.status  = 'pending'
          ), 0) AS reserved
        FROM wallets w
        WHERE w.user_id = ${userId}
        FOR UPDATE OF w
      `);

      const row = balRows.rows[0] as { balance: string; reserved: string } | undefined;
      const available = row ? Number(row.balance) - Number(row.reserved) : 0;

      if (!row || available < amount) {
        throw Object.assign(new Error("INSUFFICIENT_BALANCE"), { isInsufficient: true });
      }

      return tx.insert(transactionsTable).values({
        userId,
        type: "withdrawal",
        amount: amount.toString(),
        status: "pending",
        walletAddress,
        network,
        reference: walletAddress,
      }).returning();
    });

    res.status(201).json(txn);
  } catch (err: unknown) {
    if (err instanceof Error && (err as { isInsufficient?: boolean }).isInsufficient) {
      res.status(400).json({ error: "Insufficient withdrawable balance. Bonus funds and pending withdrawals cannot be withdrawn." });
      return;
    }
    throw err;
  }
});

export default router;
