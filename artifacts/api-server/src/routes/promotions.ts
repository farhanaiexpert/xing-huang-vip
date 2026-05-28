import { Router } from "express";
import { eq, and, gte, count, sum } from "drizzle-orm";
import {
  db,
  promotionsTable,
  promotionClaimsTable,
  promotionRequirementsTable,
  betsTable,
  transactionsTable,
  referralsTable,
} from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { verifyToken } from "../lib/auth.js";
import type { Request } from "express";

const router = Router();

function tryAuth(req: Request): number | null {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const payload = verifyToken(header.slice(7));
    return payload.userId;
  } catch {
    return null;
  }
}

async function computeProgress(
  userId: number,
  requirements: Array<{ id: number; taskType: string; targetValue: string; description: string; sortOrder: number }>,
  promoCreatedAt: Date,
) {
  const results = [];

  for (const req of requirements) {
    const target = parseFloat(req.targetValue);
    let currentValue = 0;

    if (req.taskType === "place_bets") {
      const [r] = await db
        .select({ c: count() })
        .from(betsTable)
        .where(and(eq(betsTable.userId, userId), gte(betsTable.createdAt, promoCreatedAt)));
      currentValue = r?.c ?? 0;
    } else if (req.taskType === "min_deposit") {
      const [r] = await db
        .select({ s: sum(transactionsTable.amount) })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.userId, userId),
            eq(transactionsTable.type, "deposit"),
            eq(transactionsTable.status, "completed"),
            gte(transactionsTable.createdAt, promoCreatedAt),
          ),
        );
      currentValue = parseFloat(r?.s ?? "0");
    } else if (req.taskType === "refer_friends") {
      const [r] = await db
        .select({ c: count() })
        .from(referralsTable)
        .where(and(eq(referralsTable.referrerId, userId), gte(referralsTable.createdAt, promoCreatedAt)));
      currentValue = r?.c ?? 0;
    } else if (req.taskType === "min_stake_bets") {
      const [r] = await db
        .select({ c: count() })
        .from(betsTable)
        .where(
          and(
            eq(betsTable.userId, userId),
            gte(betsTable.stake, req.targetValue),
            gte(betsTable.createdAt, promoCreatedAt),
          ),
        );
      currentValue = r?.c ?? 0;
    } else if (req.taskType === "min_odds_bets") {
      const [r] = await db
        .select({ c: count() })
        .from(betsTable)
        .where(
          and(
            eq(betsTable.userId, userId),
            gte(betsTable.totalOdds, req.targetValue),
            gte(betsTable.createdAt, promoCreatedAt),
          ),
        );
      currentValue = r?.c ?? 0;
    }

    results.push({
      id: req.id,
      taskType: req.taskType,
      targetValue: req.targetValue,
      description: req.description,
      currentValue: Math.min(currentValue, target),
      completed: currentValue >= target,
    });
  }

  return results;
}

router.get("/promotions", async (req, res): Promise<void> => {
  const userId = tryAuth(req);

  const promos = await db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.isActive, true))
    .orderBy(promotionsTable.createdAt);

  const claims = userId
    ? await db
        .select({ promotionId: promotionClaimsTable.promotionId, claimedAt: promotionClaimsTable.claimedAt })
        .from(promotionClaimsTable)
        .where(eq(promotionClaimsTable.userId, userId))
    : [];

  const claimMap = new Map(claims.map((c) => [c.promotionId, c.claimedAt]));

  const allRequirements = await db
    .select()
    .from(promotionRequirementsTable)
    .orderBy(promotionRequirementsTable.sortOrder);

  const reqsByPromo = new Map<number, typeof allRequirements>();
  for (const req of allRequirements) {
    if (!reqsByPromo.has(req.promotionId)) reqsByPromo.set(req.promotionId, []);
    reqsByPromo.get(req.promotionId)!.push(req);
  }

  const result = [];

  for (const promo of promos) {
    const requirements = reqsByPromo.get(promo.id) ?? [];
    const claimed = claimMap.has(promo.id);

    let progress: Awaited<ReturnType<typeof computeProgress>> = [];
    if (userId && requirements.length > 0 && !claimed) {
      progress = await computeProgress(userId, requirements, new Date(promo.createdAt));
    } else if (requirements.length > 0) {
      progress = requirements.map((r) => ({
        id: r.id,
        taskType: r.taskType,
        targetValue: r.targetValue,
        description: r.description,
        currentValue: 0,
        completed: false,
      }));
    }

    const allRequirementsMet = requirements.length === 0 || progress.every((p) => p.completed);

    result.push({
      id: promo.id,
      title: promo.title,
      description: promo.description,
      type: promo.type,
      rewardType: promo.rewardType,
      bonusAmount: promo.bonusAmount,
      poolAmount: promo.poolAmount,
      minDeposit: promo.minDeposit,
      wageringRequirement: promo.wageringRequirement,
      bannerColor: promo.bannerColor,
      eligibility: promo.eligibility,
      maxClaims: promo.maxClaims,
      isActive: promo.isActive,
      expiresAt: promo.expiresAt,
      createdAt: promo.createdAt,
      claimed,
      claimedAt: claimMap.get(promo.id) ?? null,
      requirements: progress,
      allRequirementsMet,
    });
  }

  res.json(result);
});

router.post("/promotions/:id/claim", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid promotion ID" }); return; }

  const [promo] = await db.select().from(promotionsTable).where(eq(promotionsTable.id, id));
  if (!promo || !promo.isActive) { res.status(404).json({ error: "Promotion not found" }); return; }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    res.status(400).json({ error: "This promotion has expired" }); return;
  }

  const userId = req.user!.userId;

  const [existing] = await db
    .select()
    .from(promotionClaimsTable)
    .where(and(eq(promotionClaimsTable.promotionId, id), eq(promotionClaimsTable.userId, userId)));
  if (existing) { res.status(409).json({ error: "Already claimed" }); return; }

  // Check all requirements are met
  const requirements = await db
    .select()
    .from(promotionRequirementsTable)
    .where(eq(promotionRequirementsTable.promotionId, id));

  if (requirements.length > 0) {
    const progress = await computeProgress(userId, requirements, new Date(promo.createdAt));
    const unmet = progress.find((p) => !p.completed);
    if (unmet) {
      res.status(400).json({ error: `Task not yet complete: ${unmet.description}` }); return;
    }
  }

  const [claim] = await db
    .insert(promotionClaimsTable)
    .values({ promotionId: id, userId })
    .returning();

  res.status(201).json({ success: true, claimId: claim.id });
});

export default router;
