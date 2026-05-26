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
});

// ── Admin: POST /admin/boosts — create boost ──────────────────────────────────
router.post("/admin/boosts", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const parsed = createBoostSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const d = parsed.data;
  const [boost] = await db.insert(priceBoostsTable).values({
    title:         d.title,
    matchId:       d.matchId,
    matchName:     d.matchName,
    leagueName:    d.leagueName,
    marketName:    d.marketName,
    selectionName: d.selectionName,
    originalOdds:  String(d.originalOdds),
    boostedOdds:   String(d.boostedOdds),
    maxStake:      d.maxStake ? String(d.maxStake) : null,
    expiresAt:     d.expiresAt ? new Date(d.expiresAt) : null,
    createdBy:     req.user?.userId ?? null,
    isActive:      true,
  }).returning();
  res.status(201).json(boost);
});

// ── Admin: PATCH /admin/boosts/:id — toggle active / update ──────────────────
router.patch("/admin/boosts/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const schema = z.object({ isActive: z.boolean().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [updated] = await db
    .update(priceBoostsTable)
    .set({ isActive: parsed.data.isActive })
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
