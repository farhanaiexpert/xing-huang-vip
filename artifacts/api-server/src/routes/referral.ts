import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, referralsTable, commissionsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/referral/code", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.json({ referralCode: user?.referralCode ?? null });
});

router.get("/referral/commissions", authenticate, async (req, res): Promise<void> => {
  const commissions = await db.select().from(commissionsTable)
    .where(eq(commissionsTable.userId, req.user!.userId))
    .orderBy(commissionsTable.createdAt);

  const total = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const pending = commissions.filter(c => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const paid = commissions.filter(c => c.status === "paid")
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  res.json({ commissions, summary: { total, pending, paid } });
});

router.get("/referral/network", authenticate, async (req, res): Promise<void> => {
  const tier1 = await db.select({
    referralId: referralsTable.id,
    userId: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    createdAt: referralsTable.createdAt,
  }).from(referralsTable)
    .innerJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
    .where(eq(referralsTable.referrerId, req.user!.userId));

  res.json({ tier1, totalReferrals: tier1.length });
});

export default router;
