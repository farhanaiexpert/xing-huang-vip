/**
 * Shared deposit-guard utilities used by all deposit-credit paths:
 *   - POST /wallet/deposit (manual txHash)
 *   - POST /webhooks/nowpayments (IPN)
 *   - GET  /wallet/deposit/nowpayments/:id/status (polling fallback)
 *
 * Responsibilities:
 *  1. Block deposits for self-excluded users (non-take-a-break)
 *  2. Enforce ALL active deposit limits (daily + weekly + monthly)
 *     – lazily reset expired limits inline
 *     – lazily promote matured pending increases
 *  3. Record usage across all matching limits after a credit succeeds
 */

import { eq, and, or, gt, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, userLimitsTable, selfExclusionsTable } from "@workspace/db";
import { logger } from "./logger.js";

// ── Period reset helper ───────────────────────────────────────────────────────

export function nextResetAt(period: string): Date {
  const now = new Date();
  if (period === "daily") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === "weekly") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + (7 - d.getUTCDay()));
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── Self-exclusion check ──────────────────────────────────────────────────────

export async function isSelfExcludedFromDeposits(userId: number): Promise<string | null> {
  const now = new Date();
  const [excl] = await db.select().from(selfExclusionsTable)
    .where(and(
      eq(selfExclusionsTable.userId, userId),
      isNull(selfExclusionsTable.liftedAt),
      eq(selfExclusionsTable.isTakeABreak, false),
      or(
        eq(selfExclusionsTable.isPermanent, true),
        gt(selfExclusionsTable.endsAt, now),
      ),
    ))
    .limit(1);
  if (!excl) return null;
  return excl.isPermanent
    ? "Deposits are blocked: your account is permanently self-excluded. Contact support to withdraw funds."
    : `Deposits are blocked: you are self-excluded until ${new Date(excl.endsAt!).toLocaleDateString()}. Contact support to withdraw funds.`;
}

// ── Deposit limit check ───────────────────────────────────────────────────────

interface LimitCheckResult {
  blocked: boolean;
  reason?: string;
  code?: string;
  remaining?: number;
  periodBlocked?: string;
}

/**
 * Check whether adding `amount` USDT would exceed any active deposit limit for the user.
 * Also lazily resets expired limit windows and promotes matured pending increases.
 * Returns { blocked: false } if safe, or { blocked: true, reason, ... } if not.
 */
export async function checkDepositLimits(userId: number, amount: number): Promise<LimitCheckResult> {
  const now = new Date();

  // Fetch all deposit limits (daily + weekly + monthly)
  const limits = await db.select().from(userLimitsTable)
    .where(and(
      eq(userLimitsTable.userId, userId),
      eq(userLimitsTable.limitType, "deposit"),
    ));

  for (const lim of limits) {
    const limNow = new Date();

    // ── Lazily reset an expired window ──────────────────────────────────────
    if (new Date(lim.resetAt) < limNow) {
      const newResetAt = nextResetAt(lim.period);
      await db.update(userLimitsTable)
        .set({
          currentUsage: "0",
          resetAt: newResetAt,
          pendingAmountUsdt: "0",
          pendingEffectiveAt: null,
        })
        .where(eq(userLimitsTable.id, lim.id));
      // After reset, usage is 0 — the amount is fine for this period
      continue;
    }

    // ── Lazily promote a matured pending increase ───────────────────────────
    let effectiveLimit = parseFloat(lim.amountUsdt);
    if (parseFloat(lim.pendingAmountUsdt) > 0 && lim.pendingEffectiveAt && new Date(lim.pendingEffectiveAt) <= limNow) {
      effectiveLimit = parseFloat(lim.pendingAmountUsdt);
      await db.update(userLimitsTable)
        .set({ amountUsdt: lim.pendingAmountUsdt, pendingAmountUsdt: "0", pendingEffectiveAt: null })
        .where(eq(userLimitsTable.id, lim.id));
    }

    const used = parseFloat(lim.currentUsage ?? "0");
    if (used + amount > effectiveLimit) {
      const remaining = Math.max(0, effectiveLimit - used);
      logger.warn({ userId, period: lim.period, used, effectiveLimit, amount }, "Deposit limit would be exceeded");
      return {
        blocked: true,
        reason: `Your ${lim.period} deposit limit of ${effectiveLimit.toFixed(2)} USDT has been reached. You can deposit up to ${remaining.toFixed(2)} USDT more this ${lim.period}.`,
        code: "DEPOSIT_LIMIT_EXCEEDED",
        remaining,
        periodBlocked: lim.period,
      };
    }
  }

  return { blocked: false };
}

/**
 * Record a successful deposit against all active deposit limit windows.
 * Call this after crediting the wallet.
 */
export async function recordDepositUsage(userId: number, amount: string): Promise<void> {
  const now = new Date();

  const limits = await db.select().from(userLimitsTable)
    .where(and(
      eq(userLimitsTable.userId, userId),
      eq(userLimitsTable.limitType, "deposit"),
      gt(userLimitsTable.resetAt, now),
    ));

  for (const lim of limits) {
    await db.update(userLimitsTable)
      .set({ currentUsage: sql`current_usage + ${amount}::numeric` })
      .where(eq(userLimitsTable.id, lim.id));
  }
}
