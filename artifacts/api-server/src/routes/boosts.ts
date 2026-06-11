import { Router } from "express";
import { eq, and, gt, or, isNull } from "drizzle-orm";
import { z } from "zod/v4";
import { db, priceBoostsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// ── GET /boosts/active — public, returns all live boosts ─────────────────────
router.get("/boosts/active", async (_req, res): Promise<void> => {
  const now = new Date();
  const boosts = await db
    .select()
    .from(priceBoostsTable)
    .where(
      and(
        eq(priceBoostsTable.isActive, true),
        or(isNull(priceBoostsTable.expiresAt), gt(priceBoostsTable.expiresAt, now)),
      ),
    )
    .orderBy(priceBoostsTable.createdAt);
  res.json(boosts);
});

// ── Admin: GET /admin/boosts — all boosts ─────────────────────────────────────
router.get("/admin/boosts", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const boosts = await db.select().from(priceBoostsTable).orderBy(priceBoostsTable.createdAt);
  res.json(boosts);
});

const createBoostSchema = z.object({
  title:         z.string().min(1),
  matchId:       z.string().min(1),
  matchName:     z.string().min(1),
  leagueName:    z.string().default(""),
  marketName:    z.string().min(1),
  selectionName: z.string().min(1),
  originalOdds:  z.number().positive(),
  boostedOdds:   z.number().positive(),
  maxStake:      z.number().positive().optional(),
  expiresAt:     z.string().optional(),
  homeTeam:      z.string().default(""),
  awayTeam:      z.string().default(""),
  commenceTime:  z.string().optional(),
  sportKey:      z.string().default(""),
});

// ── Admin: POST /admin/boosts — create boost ──────────────────────────────────
router.post("/admin/boosts", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const parsed = createBoostSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;

  if (d.boostedOdds <= d.originalOdds) {
    res.status(400).json({ error: "Boosted odds must be higher than the original odds" });
    return;
  }

  const [boost] = await db.insert(priceBoostsTable).values({
    title:         d.title,
    matchId:       d.matchId,
    matchName:     d.matchName,
    leagueName:    d.leagueName,
    marketName:    d.marketName,
    selectionName: d.selectionName,
    originalOdds:  String(d.originalOdds),
    boostedOdds:   String(d.boostedOdds),
    maxStake:      d.maxStake ? String(d.maxStake) : "0",
    expiresAt:     d.expiresAt ? new Date(d.expiresAt) : null,
    createdBy:     req.user?.userId ?? null,
    isActive:      true,
    homeTeam:      d.homeTeam,
    awayTeam:      d.awayTeam,
    commenceTime:  d.commenceTime ? new Date(d.commenceTime) : null,
    sportKey:      d.sportKey,
  }).returning();
  res.status(201).json(boost);
});

const patchBoostSchema = z.object({
  isActive:      z.boolean().optional(),
  title:         z.string().min(1).optional(),
  matchId:       z.string().min(1).optional(),
  matchName:     z.string().min(1).optional(),
  leagueName:    z.string().optional(),
  marketName:    z.string().min(1).optional(),
  selectionName: z.string().min(1).optional(),
  originalOdds:  z.number().positive().optional(),
  boostedOdds:   z.number().positive().optional(),
  maxStake:      z.number().nonnegative().optional(),
  expiresAt:     z.string().nullable().optional(),
  homeTeam:      z.string().optional(),
  awayTeam:      z.string().optional(),
  commenceTime:  z.string().nullable().optional(),
  sportKey:      z.string().optional(),
});

// ── Admin: PATCH /admin/boosts/:id — update any boost fields ─────────────────
router.patch("/admin/boosts/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const parsed = patchBoostSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.isActive      !== undefined) updates.isActive      = d.isActive;
  if (d.title         !== undefined) updates.title         = d.title;
  if (d.matchId       !== undefined) updates.matchId       = d.matchId;
  if (d.matchName     !== undefined) updates.matchName     = d.matchName;
  if (d.leagueName    !== undefined) updates.leagueName    = d.leagueName;
  if (d.marketName    !== undefined) updates.marketName    = d.marketName;
  if (d.selectionName !== undefined) updates.selectionName = d.selectionName;
  if (d.originalOdds  !== undefined) updates.originalOdds  = String(d.originalOdds);
  if (d.boostedOdds   !== undefined) updates.boostedOdds   = String(d.boostedOdds);
  if (d.maxStake      !== undefined) updates.maxStake      = String(d.maxStake);
  if (d.expiresAt     !== undefined) updates.expiresAt     = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.homeTeam      !== undefined) updates.homeTeam      = d.homeTeam;
  if (d.awayTeam      !== undefined) updates.awayTeam      = d.awayTeam;
  if (d.commenceTime  !== undefined) updates.commenceTime  = d.commenceTime ? new Date(d.commenceTime) : null;
  if (d.sportKey      !== undefined) updates.sportKey      = d.sportKey;

  if (Object.keys(updates).length === 0) { res.json({ message: "Nothing to update" }); return; }

  const [updated] = await db
    .update(priceBoostsTable)
    .set(updates as Partial<typeof priceBoostsTable.$inferInsert>)
    .where(eq(priceBoostsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Boost not found" }); return; }
  res.json(updated);
});

// ── Admin: DELETE /admin/boosts/:id ──────────────────────────────────────────
router.delete("/admin/boosts/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  await db.delete(priceBoostsTable).where(eq(priceBoostsTable.id, id));
  res.status(204).end();
});

export default router;
