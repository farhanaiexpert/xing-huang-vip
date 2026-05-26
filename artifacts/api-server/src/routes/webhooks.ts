import { Router } from "express";
import { eq, sql, and, gt } from "drizzle-orm";
import { db, walletsTable, transactionsTable, userLimitsTable } from "@workspace/db";
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
    const now = new Date();

    // Check deposit limit before crediting
    const [depositLimit] = await db.select().from(userLimitsTable)
      .where(and(
        eq(userLimitsTable.userId, txn.userId),
        eq(userLimitsTable.limitType, "deposit"),
        gt(userLimitsTable.resetAt, now),
      ))
      .limit(1);

    if (depositLimit) {
      const effectiveLimit = depositLimit.pendingAmountUsdt && depositLimit.pendingEffectiveAt && new Date(depositLimit.pendingEffectiveAt) <= now
        ? parseFloat(depositLimit.pendingAmountUsdt)
        : parseFloat(depositLimit.amountUsdt);
      const used = parseFloat(depositLimit.currentUsage ?? "0");
      if (used + depositAmount > effectiveLimit) {
        // Over limit — reject the credit and mark as rejected
        await db.update(transactionsTable)
          .set({ status: "rejected", verificationNote: "Deposit rejected: would exceed your deposit limit" })
          .where(eq(transactionsTable.id, txn.id));
        logger.warn({ paymentId, userId: txn.userId, depositAmount, used, effectiveLimit }, "NOWPayments deposit rejected: deposit limit exceeded");
        res.status(200).json({ received: true });
        return;
      }
    }

    await db.update(transactionsTable)
      .set({ status: "completed", verified: true, verificationNote: `Auto-credited via NOWPayments (${paymentStatus})` })
      .where(eq(transactionsTable.id, txn.id));

    await db.update(walletsTable)
      .set({ balanceUsdt: sql`balance_usdt + ${txn.amount}` })
      .where(eq(walletsTable.userId, txn.userId));

    // Update deposit limit usage
    if (depositLimit) {
      await db.update(userLimitsTable)
        .set({ currentUsage: sql`current_usage + ${txn.amount}` })
        .where(eq(userLimitsTable.id, depositLimit.id));
    }

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

export default router;
