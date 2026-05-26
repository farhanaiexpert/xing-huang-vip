import { Router } from "express";
import { eq, and, gt, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, userLimitsTable, selfExclusionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

function nextResetAt(period: string): Date {
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

// ── GET /rg/status ─── Returns all active limits + exclusion for current user ─
router.get("/rg/status", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const now = new Date();

  const limits = await db.select().from(userLimitsTable)
    .where(eq(userLimitsTable.userId, userId));

  // Reset expired periods inline
  const updatedLimits = await Promise.all(limits.map(async (lim) => {
    if (new Date(lim.resetAt) < now) {
      const [updated] = await db.update(userLimitsTable)
        .set({ currentUsage: "0", resetAt: nextResetAt(lim.period) })
        .where(eq(userLimitsTable.id, lim.id))
        .returning();
      return updated ?? lim;
    }
    return lim;
  }));

  const exclusion = await db.select().from(selfExclusionsTable)
    .where(and(
      eq(selfExclusionsTable.userId, userId),
      isNull(selfExclusionsTable.liftedAt),
      or(
        eq(selfExclusionsTable.isPermanent, true),
        gt(selfExclusionsTable.endsAt, now),
      ),
    ))
    .limit(1)
    .then(rows => rows[0] ?? null);

  res.json({ limits: updatedLimits, exclusion });
});

// ── POST /rg/limits ─── Set or update a deposit/loss limit ──────────────────
const SetLimitBody = z.object({
  limitType: z.enum(["deposit", "loss"]),
  period: z.enum(["daily", "weekly", "monthly"]),
  amountUsdt: z.number().positive(),
});

router.post("/rg/limits", authenticate, async (req, res): Promise<void> => {
  const parsed = SetLimitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }
  const { limitType, period, amountUsdt } = parsed.data;
  const userId = req.user!.userId;

  // Check if tightening or loosening
  const [existing] = await db.select().from(userLimitsTable)
    .where(and(
      eq(userLimitsTable.userId, userId),
      eq(userLimitsTable.limitType, limitType),
      eq(userLimitsTable.period, period),
    ))
    .limit(1);

  const resetAt = nextResetAt(period);

  if (!existing) {
    const [lim] = await db.insert(userLimitsTable).values({
      userId,
      limitType,
      period,
      amountUsdt: amountUsdt.toString(),
      currentUsage: "0",
      resetAt,
    }).returning();
    res.status(201).json(lim);
    return;
  }

  // Tightening (lower limit) is instant; loosening (higher limit) is deferred 24 h.
  const isTightening = amountUsdt <= parseFloat(existing.amountUsdt);

  if (isTightening) {
    // Tightening: apply immediately, clear any pending loosening
    const [updated] = await db.update(userLimitsTable)
      .set({ amountUsdt: amountUsdt.toString(), resetAt, updatedAt: new Date(), pendingAmountUsdt: null, pendingEffectiveAt: null })
      .where(eq(userLimitsTable.id, existing.id))
      .returning();
    res.json({ ...updated, effectiveAt: null });
    return;
  }

  // Loosening: store as pending — amountUsdt (the lower active limit) stays UNCHANGED until 24 h have passed.
  // The server enforces the original lower limit until pendingEffectiveAt.
  const effectiveAt = new Date(Date.now() + 24 * 3600 * 1000);
  const [updated] = await db.update(userLimitsTable)
    .set({ pendingAmountUsdt: amountUsdt.toString(), pendingEffectiveAt: effectiveAt, updatedAt: new Date() })
    .where(eq(userLimitsTable.id, existing.id))
    .returning();
  res.json({ ...updated, effectiveAt, notice: "Limit increase takes effect in 24 hours" });
});

// ── DELETE /rg/limits/:id ─── Remove a limit ─────────────────────────────────
router.delete("/rg/limits/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid limit ID" }); return; }

  const [lim] = await db.select().from(userLimitsTable)
    .where(and(eq(userLimitsTable.id, id), eq(userLimitsTable.userId, req.user!.userId)))
    .limit(1);
  if (!lim) { res.status(404).json({ error: "Limit not found" }); return; }

  await db.delete(userLimitsTable).where(eq(userLimitsTable.id, id));
  res.status(204).end();
});

// ── POST /rg/exclusion ─── Self-exclude or take a break ─────────────────────
const ExclusionBody = z.object({
  durationHours: z.number().int().positive().optional(),
  isPermanent: z.boolean().default(false),
  isTakeABreak: z.boolean().default(false),
  reason: z.string().optional(),
});

router.post("/rg/exclusion", authenticate, async (req, res): Promise<void> => {
  const parsed = ExclusionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }
  const { durationHours, isPermanent, isTakeABreak, reason } = parsed.data;
  const userId = req.user!.userId;

  if (!isPermanent && !durationHours) {
    res.status(400).json({ error: "Provide durationHours or set isPermanent=true" });
    return;
  }

  const startsAt = new Date();
  const endsAt = isPermanent ? null : new Date(Date.now() + (durationHours ?? 24) * 3600 * 1000);

  const [excl] = await db.insert(selfExclusionsTable).values({
    userId,
    durationHours: durationHours ?? null,
    startsAt,
    endsAt,
    isPermanent,
    isTakeABreak: isTakeABreak ?? false,
    reason: reason ?? null,
  }).returning();

  res.status(201).json(excl);
});

export default router;
