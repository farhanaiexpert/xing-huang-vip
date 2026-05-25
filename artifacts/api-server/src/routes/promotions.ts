import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, promotionsTable, promotionClaimsTable } from "@workspace/db";
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

router.get("/promotions", async (req, res): Promise<void> => {
  const userId = tryAuth(req);

  const promos = await db
    .select({
      id:          promotionsTable.id,
      title:       promotionsTable.title,
      description: promotionsTable.description,
      type:        promotionsTable.type,
      bonusAmount: promotionsTable.bonusAmount,
      minDeposit:  promotionsTable.minDeposit,
      eligibility: promotionsTable.eligibility,
      maxClaims:   promotionsTable.maxClaims,
      isActive:    promotionsTable.isActive,
      expiresAt:   promotionsTable.expiresAt,
      createdAt:   promotionsTable.createdAt,
    })
    .from(promotionsTable)
    .where(eq(promotionsTable.isActive, true))
    .orderBy(promotionsTable.createdAt);

  if (userId) {
    const claims = await db
      .select({ promotionId: promotionClaimsTable.promotionId })
      .from(promotionClaimsTable)
      .where(eq(promotionClaimsTable.userId, userId));
    const claimed = new Set(claims.map((c) => c.promotionId));
    res.json(promos.map((p) => ({ ...p, claimed: claimed.has(p.id) })));
    return;
  }

  res.json(promos.map((p) => ({ ...p, claimed: false })));
});

router.post("/promotions/:id/claim", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid promotion ID" }); return; }

  const [promo] = await db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, id));
  if (!promo || !promo.isActive) { res.status(404).json({ error: "Promotion not found" }); return; }

  const userId = req.user!.userId;
  const [existing] = await db
    .select()
    .from(promotionClaimsTable)
    .where(and(eq(promotionClaimsTable.promotionId, id), eq(promotionClaimsTable.userId, userId)));
  if (existing) { res.status(409).json({ error: "Already claimed" }); return; }

  const [claim] = await db
    .insert(promotionClaimsTable)
    .values({ promotionId: id, userId })
    .returning();

  res.status(201).json({ success: true, claimId: claim.id });
});

export default router;
