import { Router } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db, loyaltyPointsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

export const TIERS = [
  { name: "Bronze",   min: 0,     max: 499,   color: "#CD7F32", emoji: "🥉" },
  { name: "Silver",   min: 500,   max: 1999,  color: "#94A3B8", emoji: "🥈" },
  { name: "Gold",     min: 2000,  max: 4999,  color: "#FACC15", emoji: "🥇" },
  { name: "Platinum", min: 5000,  max: 14999, color: "#38BDF8", emoji: "💎" },
  { name: "Diamond",  min: 15000, max: Infinity, color: "#A78BFA", emoji: "👑" },
] as const;

export function getTier(points: number) {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0];
}

// ── GET /loyalty/summary — authenticated user's loyalty data ─────────────────
router.get("/loyalty/summary", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const result = await db.execute(sql`
    SELECT COALESCE(SUM(points), 0) AS total_points
    FROM loyalty_points
    WHERE user_id = ${userId}
  `);
  const totalPoints = parseFloat((result.rows[0] as { total_points: string }).total_points ?? "0");
  const tier = getTier(totalPoints);
  const nextTierIdx = TIERS.findIndex(t => t.name === tier.name) + 1;
  const nextTier = nextTierIdx < TIERS.length ? TIERS[nextTierIdx] : null;

  const history = await db
    .select()
    .from(loyaltyPointsTable)
    .where(eq(loyaltyPointsTable.userId, userId))
    .orderBy(desc(loyaltyPointsTable.createdAt))
    .limit(20);

  res.json({
    totalPoints,
    tier,
    nextTier: nextTier ?? null,
    progressToNext: nextTier ? ((totalPoints - tier.min) / (nextTier.min - tier.min)) * 100 : 100,
    recentHistory: history,
    tiers: TIERS,
  });
});

// ── GET /loyalty/leaderboard — top 10 this month ─────────────────────────────
router.get("/loyalty/leaderboard", authenticate, async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id            AS user_id,
      u.username,
      COALESCE(SUM(lp.points), 0) AS monthly_points
    FROM users u
    LEFT JOIN loyalty_points lp
      ON lp.user_id = u.id
      AND DATE_TRUNC('month', lp.created_at) = DATE_TRUNC('month', NOW())
    GROUP BY u.id, u.username
    ORDER BY monthly_points DESC
    LIMIT 10
  `);

  const board = (rows.rows as { user_id: number; username: string; monthly_points: string }[])
    .map((r, i) => ({
      rank:          i + 1,
      username:      i < 3 ? r.username : r.username.slice(0, 2) + "***",
      monthlyPoints: parseFloat(r.monthly_points),
      tier:          getTier(parseFloat(r.monthly_points)),
    }));

  res.json(board);
});

// ── Admin: POST /admin/loyalty/award — manually award/deduct points ───────────
router.post("/admin/loyalty/award", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const schema = z.object({
    userId: z.number().int(),
    points: z.number(),
    reason: z.string().default("admin_adjustment"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [row] = await db.insert(loyaltyPointsTable).values({
    userId: parsed.data.userId,
    points: String(parsed.data.points),
    reason: parsed.data.reason,
  }).returning();
  res.status(201).json(row);
});

export default router;
