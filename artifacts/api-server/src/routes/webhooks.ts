import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { checkDepositLimits, recordDepositUsage, isSelfExcludedFromDeposits } from "../lib/depositGuard.js";
import { verifyIpnSignature, FINISHED_STATUSES, FAILED_STATUSES } from "../lib/nowpayments.js";
import { verifyPlisioWebhook, PLISIO_FINISHED_STATUSES, PLISIO_FAILED_STATUSES } from "../lib/plisio.js";
import { verifyWebhookSignature as verifyCryptomusWebhook, FINISHED_STATUSES as CRYPTOMUS_FINISHED, FAILED_STATUSES as CRYPTOMUS_FAILED } from "../lib/cryptomus.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── POST /webhooks/nowpayments ─────────────────────────────────────────────────
// Called by NOWPayments when a payment status changes.
// NOWPayments sends: payment_id, payment_status, order_id, price_amount, pay_amount, etc.
// Signature is in the `x-nowpayments-sig` header.

router.post("/webhooks/nowpayments", async (req, res): Promise<void> => {
  const sig = req.headers["x-nowpayments-sig"];
  const body = req.body as Record<string, unknown>;

  // ── 1. Verify signature ───────────────────────────────────────────────────
  if (!sig || typeof sig !== "string") {
    logger.warn("NOWPayments IPN received with no signature");
    res.status(400).json({ error: "Missing signature" });
    return;
  }

  if (!verifyIpnSignature(body, sig)) {
    logger.warn({ sig }, "NOWPayments IPN signature verification FAILED");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const paymentId     = String(body.payment_id ?? "");
  const paymentStatus = String(body.payment_status ?? "");
  const orderId       = body.order_id ? String(body.order_id) : null;

  logger.info({ paymentId, paymentStatus, orderId }, "NOWPayments IPN received");

  // ── 2. Find our transaction ────────────────────────────────────────────────
  const [txn] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.nowpaymentsPaymentId, paymentId))
    .limit(1);

  if (!txn) {
    logger.warn({ paymentId }, "NOWPayments IPN — transaction not found");
    // Return 200 so NOWPayments doesn't keep retrying for unknown payments
    res.status(200).json({ received: true });
    return;
  }

  // ── 3. Update status in DB ─────────────────────────────────────────────────
  await db
    .update(transactionsTable)
    .set({ nowpaymentsStatus: paymentStatus })
    .where(eq(transactionsTable.id, txn.id));

  // ── 4. Credit wallet when payment finishes ─────────────────────────────────
  if (FINISHED_STATUSES.has(paymentStatus) && txn.status !== "completed") {
    const depositAmount = parseFloat(txn.amount);

    // Self-exclusion check — excluded users are blocked from depositing
    const exclMsg = await isSelfExcludedFromDeposits(txn.userId);
    if (exclMsg) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ paymentId, userId: txn.userId }, "NOWPayments deposit rejected: self-excluded");
      res.status(200).json({ received: true });
      return;
    }

    // Deposit limit check across ALL active periods (daily/weekly/monthly)
    const limitCheck = await checkDepositLimits(txn.userId, depositAmount);
    if (limitCheck.blocked) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ paymentId, userId: txn.userId, depositAmount }, "NOWPayments deposit rejected: deposit limit exceeded");
      res.status(200).json({ received: true });
      return;
    }

    await db.update(transactionsTable)
      .set({ status: "completed", verified: true, verificationNote: `Auto-credited via NOWPayments (${paymentStatus})` })
      .where(eq(transactionsTable.id, txn.id));

    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));

    // Record usage across all matching deposit limit windows
    await recordDepositUsage(txn.userId, txn.amount);

    logger.info({ paymentId, userId: txn.userId, amount: txn.amount }, "NOWPayments deposit credited to wallet");
  }

  // ── 5. Mark failed/expired ─────────────────────────────────────────────────
  if (FAILED_STATUSES.has(paymentStatus) && txn.status === "pending") {
    await db.update(transactionsTable)
      .set({ status: "rejected", verificationNote: `NOWPayments payment ${paymentStatus}` })
      .where(eq(transactionsTable.id, txn.id));

    logger.info({ paymentId, paymentStatus }, "NOWPayments payment marked rejected");
  }

  // Always acknowledge with 200 so NOWPayments stops retrying
  res.status(200).json({ received: true });
});

// ── POST /webhooks/plisio ──────────────────────────────────────────────────────
// Called by Plisio when payment status changes.
// Body is JSON; verified with HMAC-SHA1 of sorted keys using PLISIO_IPN_SECRET.

router.post("/webhooks/plisio", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  // ── 1. Verify signature ───────────────────────────────────────────────────
  if (!verifyPlisioWebhook(body)) {
    logger.warn("Plisio IPN signature verification FAILED");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const txnId  = body.txn_id  ? String(body.txn_id)  : null;
  const status = body.status  ? String(body.status)  : null;
  const orderId = body.order_number ? String(body.order_number) : null;

  logger.info({ txnId, status, orderId }, "Plisio IPN received");

  if (!txnId) {
    res.status(400).json({ error: "Missing txn_id" });
    return;
  }

  // ── 2. Find our transaction ────────────────────────────────────────────────
  const [txn] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.plisioPaymentId, txnId))
    .limit(1);

  if (!txn) {
    logger.warn({ txnId }, "Plisio IPN — transaction not found");
    res.status(200).json({ received: true });
    return;
  }

  // ── 3. Update status in DB ─────────────────────────────────────────────────
  if (status) {
    await db
      .update(transactionsTable)
      .set({ plisioStatus: status })
      .where(eq(transactionsTable.id, txn.id));
  }

  // ── 4. Credit wallet when payment completes ────────────────────────────────
  if (status && PLISIO_FINISHED_STATUSES.has(status) && txn.status !== "completed") {
    const depositAmount = parseFloat(txn.amount);

    const exclMsg = await isSelfExcludedFromDeposits(txn.userId);
    if (exclMsg) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ txnId, userId: txn.userId }, "Plisio deposit rejected: self-excluded");
      res.status(200).json({ received: true });
      return;
    }

    const limitCheck = await checkDepositLimits(txn.userId, depositAmount);
    if (limitCheck.blocked) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ txnId, userId: txn.userId, depositAmount }, "Plisio deposit rejected: deposit limit exceeded");
      res.status(200).json({ received: true });
      return;
    }

    await db.update(transactionsTable)
      .set({ status: "completed", verified: true, verificationNote: `Auto-credited via Plisio (${status})` })
      .where(eq(transactionsTable.id, txn.id));

    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));

    await recordDepositUsage(txn.userId, txn.amount);

    logger.info({ txnId, userId: txn.userId, amount: txn.amount }, "Plisio deposit credited to wallet");
  }

  // ── 5. Mark failed/cancelled ───────────────────────────────────────────────
  if (status && PLISIO_FAILED_STATUSES.has(status) && txn.status === "pending") {
    await db.update(transactionsTable)
      .set({ status: "rejected", verificationNote: `Plisio payment ${status}` })
      .where(eq(transactionsTable.id, txn.id));

    logger.info({ txnId, status }, "Plisio payment marked rejected");
  }

  res.status(200).json({ received: true });
});

// ── POST /webhooks/cryptomus ───────────────────────────────────────────────────
// Cryptomus sends JSON; sign = md5(base64(body without sign field) + api_key)

router.post("/webhooks/cryptomus", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const receivedSign = body.sign ? String(body.sign) : null;

  // ── 1. Verify signature ───────────────────────────────────────────────────
  if (!receivedSign) {
    logger.warn("Cryptomus webhook received with no sign field");
    res.status(400).json({ error: "Missing sign" });
    return;
  }

  if (!verifyCryptomusWebhook(body, receivedSign)) {
    logger.warn("Cryptomus webhook signature verification FAILED");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const uuid   = body.uuid   ? String(body.uuid)   : null;
  const status = body.status ? String(body.status) : null;
  const orderId = body.order_id ? String(body.order_id) : null;

  logger.info({ uuid, status, orderId }, "Cryptomus webhook received");

  if (!uuid) {
    res.status(400).json({ error: "Missing uuid" });
    return;
  }

  // ── 2. Find our transaction ────────────────────────────────────────────────
  const [txn] = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.cryptomusUuid, uuid))
    .limit(1);

  if (!txn) {
    logger.warn({ uuid }, "Cryptomus webhook — transaction not found");
    res.status(200).json({ received: true });
    return;
  }

  // ── 3. Update status in DB ─────────────────────────────────────────────────
  if (status) {
    await db
      .update(transactionsTable)
      .set({ cryptomusStatus: status })
      .where(eq(transactionsTable.id, txn.id));
  }

  // ── 4. Credit wallet when payment completes ────────────────────────────────
  if (status && CRYPTOMUS_FINISHED.has(status) && txn.status !== "completed") {
    const depositAmount = parseFloat(txn.amount);

    const exclMsg = await isSelfExcludedFromDeposits(txn.userId);
    if (exclMsg) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: account is self-excluded" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ uuid, userId: txn.userId }, "Cryptomus deposit rejected: self-excluded");
      res.status(200).json({ received: true });
      return;
    }

    const limitCheck = await checkDepositLimits(txn.userId, depositAmount);
    if (limitCheck.blocked) {
      await db.update(transactionsTable)
        .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
        .where(eq(transactionsTable.id, txn.id));
      logger.warn({ uuid, userId: txn.userId, depositAmount }, "Cryptomus deposit rejected: deposit limit exceeded");
      res.status(200).json({ received: true });
      return;
    }

    await db.update(transactionsTable)
      .set({ status: "completed", verified: true, verificationNote: `Auto-credited via Cryptomus (${status})` })
      .where(eq(transactionsTable.id, txn.id));

    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));

    await recordDepositUsage(txn.userId, txn.amount);

    logger.info({ uuid, userId: txn.userId, amount: txn.amount }, "Cryptomus deposit credited to wallet");
  }

  // ── 5. Mark failed/cancelled ───────────────────────────────────────────────
  if (status && CRYPTOMUS_FAILED.has(status) && txn.status === "pending") {
    await db.update(transactionsTable)
      .set({ status: "rejected", verificationNote: `Cryptomus payment ${status}` })
      .where(eq(transactionsTable.id, txn.id));

    logger.info({ uuid, status }, "Cryptomus payment marked rejected");
  }

  res.status(200).json({ received: true });
});

export default router;
