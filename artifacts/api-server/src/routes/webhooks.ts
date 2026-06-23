import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, walletsTable, transactionsTable } from "@workspace/db";
import { checkDepositLimits, recordDepositUsage, isSelfExcludedFromDeposits } from "../lib/depositGuard.js";
import { verifyIpnSignature, FINISHED_STATUSES, FAILED_STATUSES } from "../lib/nowpayments.js";
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

    // Atomic claim: only credit if we can transition pending → completed.
    // PostgreSQL UPDATE is atomic — exactly one concurrent request wins (webhook
    // vs polling fallback); the other sees claimed.length === 0 and skips.
    const claimed = await db.update(transactionsTable)
      .set({ status: "completed", verified: true, verificationNote: `Auto-credited via NOWPayments (${paymentStatus})`, nowpaymentsStatus: paymentStatus })
      .where(and(eq(transactionsTable.id, txn.id), eq(transactionsTable.status, "pending")))
      .returning({ id: transactionsTable.id });

    if (claimed.length > 0) {
      await db.update(walletsTable)
        .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
        .where(eq(walletsTable.userId, txn.userId));
      await recordDepositUsage(txn.userId, txn.amount);
      logger.info({ paymentId, userId: txn.userId, amount: txn.amount }, "NOWPayments deposit credited to wallet");
    } else {
      logger.info({ paymentId }, "NOWPayments webhook: deposit already processed, skipping duplicate credit");
    }
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

export default router;
