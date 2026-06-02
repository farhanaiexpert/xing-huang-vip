import { Router } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db, usersTable, referralsTable, commissionsTable, walletsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ── GET /referral/code ─────────────────────────────────────────────────────────
router.get("/referral/code", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.json({ referralCode: user?.referralCode ?? null });
});

// ── PATCH /referral/code ──────────────────────────────────────────────────────
router.patch("/referral/code", authenticate, async (req, res): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 4 || clean.length > 16) {
    res.status(400).json({ error: "Code must be 4–16 alphanumeric characters" });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referralCode, clean))
    .limit(1);

  if (existing && existing.id !== req.user!.userId) {
    res.status(409).json({ error: "That code is already taken — try another" });
    return;
  }

  await db.update(usersTable)
    .set({ referralCode: clean })
    .where(eq(usersTable.id, req.user!.userId));

  res.json({ referralCode: clean });
});

// ── GET /referral/commissions ──────────────────────────────────────────────────
router.get("/referral/commissions", authenticate, async (req, res): Promise<void> => {
  const referred = usersTable;
  const rows = await db
    .select({
      id: commissionsTable.id,
      amount: commissionsTable.amount,
      status: commissionsTable.status,
      tier: commissionsTable.tier,
      sourceTransactionId: commissionsTable.sourceTransactionId,
      createdAt: commissionsTable.createdAt,
      referredUsername: referred.username,
      referredEmail: referred.email,
      referredWallet: referred.walletAddress,
    })
    .from(commissionsTable)
    .innerJoin(referralsTable, eq(commissionsTable.referralId, referralsTable.id))
    .leftJoin(referred, eq(referralsTable.referredId, referred.id))
    .where(eq(commissionsTable.userId, req.user!.userId))
    .orderBy(commissionsTable.createdAt);

  const commissions = rows.map(c => ({
    id: c.id,
    amount: c.amount,
    status: c.status,
    tier: c.tier ?? 1,
    createdAt: c.createdAt,
    referredUsername:
      c.referredUsername ??
      c.referredEmail ??
      (c.referredWallet ? c.referredWallet.slice(0, 8) + "…" : null),
    sourceTransactionId: c.sourceTransactionId,
  }));

  const total = commissions.reduce((s, c) => s + parseFloat(c.amount), 0);
  const pending = commissions
    .filter(c => c.status === "pending")
    .reduce((s, c) => s + parseFloat(c.amount), 0);
  const paid = commissions
    .filter(c => c.status === "paid")
    .reduce((s, c) => s + parseFloat(c.amount), 0);

  res.json({ commissions, summary: { total, pending, paid } });
});

// ── POST /referral/commissions/claim ──────────────────────────────────────────
router.post("/referral/commissions/claim", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  let claimed = 0;
  let total = "0";

  await db.transaction(async tx => {
    // Atomic UPDATE…RETURNING: mark as paid and get amounts in one statement,
    // preventing double-credit under concurrent requests.
    const updated = await tx.execute(sql`
      UPDATE commissions
      SET status = 'paid'
      WHERE user_id = ${userId} AND status = 'pending'
      RETURNING id, amount
    `);
    const rows = updated.rows as { id: number; amount: string }[];
    if (rows.length === 0) return;

    const totalAmt = rows.reduce((s, r) => s + parseFloat(r.amount), 0);

    await tx.execute(sql`
      UPDATE wallets
      SET balance_usdt = balance_usdt + ${totalAmt.toFixed(8)}::numeric
      WHERE user_id = ${userId}
    `);

    claimed = rows.length;
    total = totalAmt.toFixed(8);
  });

  res.json({ claimed, total });
});

// ── GET /referral/network ──────────────────────────────────────────────────────
// With the multi-tier row model every referred user has explicit rows in
// referrals for each tier (referrer_id=A, tier=1/2/3).  Query each tier
// directly — no chain-traversal needed, no risk of inflated counts.
router.get("/referral/network", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const cols = {
    referralId: referralsTable.id,
    userId: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    walletAddress: usersTable.walletAddress,
    createdAt: referralsTable.createdAt,
  };

  const [tier1, tier2, tier3] = await Promise.all([
    db.select(cols).from(referralsTable)
      .innerJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.tier, 1))),
    db.select(cols).from(referralsTable)
      .innerJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.tier, 2))),
    db.select(cols).from(referralsTable)
      .innerJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
      .where(and(eq(referralsTable.referrerId, userId), eq(referralsTable.tier, 3))),
  ]);

  const fmt = (r: typeof tier1[0]) => ({
    referralId: r.referralId,
    userId: r.userId,
    username:
      r.username ??
      r.email ??
      (r.walletAddress ? r.walletAddress.slice(0, 8) + "…" : `uid:${r.userId}`),
    createdAt: r.createdAt,
  });

  res.json({
    tier1: tier1.map(fmt),
    tier2: tier2.map(fmt),
    tier3: tier3.map(fmt),
    totalReferrals: tier1.length + tier2.length + tier3.length,
  });
});

export default router;
