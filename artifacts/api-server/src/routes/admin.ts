import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable, betsTable, betSelectionsTable, transactionsTable,
         commissionSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { settleBet, runAutoSettlement } from "../services/settlement";

const router = Router();
router.use(requireAdmin);

/* ── Users ──────────────────────────────────────────────────── */
router.get("/users", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id, username: usersTable.username, email: usersTable.email,
        walletAddress: usersTable.walletAddress, role: usersTable.role,
        status: usersTable.status, createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));

    res.json({ users, total: users.length });
  } catch (err) {
    req.log.error({ err }, "admin get users error");
    res.status(500).json({ error: "internal", message: "Failed to fetch users" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const schema = z.object({ status: z.enum(["active", "suspended", "banned"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Valid status required" });
    return;
  }

  const { id } = req.params;
  try {
    await db.update(usersTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(usersTable.id, id));

    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email,
                walletAddress: usersTable.walletAddress, role: usersTable.role,
                status: usersTable.status, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "admin update status error");
    res.status(500).json({ error: "internal", message: "Failed to update status" });
  }
});

/* ── Bets ───────────────────────────────────────────────────── */
router.get("/bets", async (req, res) => {
  try {
    const bets = await db.select().from(betsTable).orderBy(desc(betsTable.createdAt)).limit(500);

    const betsWithSelections = await Promise.all(
      bets.map(async bet => {
        const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, bet.id));
        return { ...bet, selections };
      })
    );

    res.json({ bets: betsWithSelections, total: bets.length });
  } catch (err) {
    req.log.error({ err }, "admin get bets error");
    res.status(500).json({ error: "internal", message: "Failed to fetch bets" });
  }
});

/* ── Settle a bet (manual) — NOW credits/refunds the balance ── */
router.patch("/bets/:id/settle", async (req, res) => {
  const schema = z.object({ status: z.enum(["won", "lost", "void"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Status must be won, lost, or void" });
    return;
  }

  const { id } = req.params;
  try {
    const result = await settleBet(id, parsed.data.status);

    if (!result.settled && result.reason === "Bet not found") {
      res.status(404).json({ error: "not_found", message: "Bet not found" });
      return;
    }

    if (!result.settled) {
      res.status(409).json({ error: "conflict", message: result.reason ?? "Cannot settle bet" });
      return;
    }

    const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, id));
    const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));

    res.json({ ...updated, selections, payout: result.payout });
  } catch (err) {
    req.log.error({ err }, "admin settle bet error");
    res.status(500).json({ error: "internal", message: "Failed to settle bet" });
  }
});

/* ── Trigger auto-settlement run manually ───────────────────── */
router.post("/settlement/run", async (req, res) => {
  try {
    const result = await runAutoSettlement();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "admin settlement run error");
    res.status(500).json({ error: "internal", message: "Settlement run failed" });
  }
});

/* ── Settlement stats ───────────────────────────────────────── */
router.get("/settlement/stats", async (req, res) => {
  try {
    const allBets = await db.select({
      status: betsTable.status,
      stake: betsTable.stake,
      potentialReturn: betsTable.potentialReturn,
    }).from(betsTable);

    const pending = allBets.filter(b => b.status === "pending");
    const won     = allBets.filter(b => b.status === "won");
    const lost    = allBets.filter(b => b.status === "lost");
    const voidB   = allBets.filter(b => b.status === "void");

    const totalWagered  = allBets.reduce((s, b) => s + parseFloat(b.stake), 0);
    const totalPaidOut  = won.reduce((s, b) => s + parseFloat(b.potentialReturn), 0);
    const houseEdge     = totalWagered - totalPaidOut;

    res.json({
      total:        allBets.length,
      pending:      pending.length,
      won:          won.length,
      lost:         lost.length,
      void:         voidB.length,
      totalWagered: totalWagered.toFixed(2),
      totalPaidOut: totalPaidOut.toFixed(2),
      houseEdge:    houseEdge.toFixed(2),
    });
  } catch (err) {
    req.log.error({ err }, "admin settlement stats error");
    res.status(500).json({ error: "internal", message: "Failed to fetch stats" });
  }
});

/* ── Transactions ───────────────────────────────────────────── */
router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(500);
    res.json({ transactions: txns, total: txns.length });
  } catch (err) {
    req.log.error({ err }, "admin get transactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch transactions" });
  }
});

/* ── Commission settings ────────────────────────────────────── */
router.get("/commission-settings", async (req, res) => {
  try {
    const settings = await db.select().from(commissionSettingsTable);

    if (settings.length === 0) {
      res.json({ settings: [
        { level: 1, rate: "0.05" },
        { level: 2, rate: "0.03" },
        { level: 3, rate: "0.01" },
      ]});
      return;
    }

    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "admin get commission settings error");
    res.status(500).json({ error: "internal", message: "Failed to fetch commission settings" });
  }
});

router.put("/commission-settings", async (req, res) => {
  const schema = z.object({
    settings: z.array(z.object({ level: z.number().int().min(1).max(3), rate: z.string() })).min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Invalid settings format" });
    return;
  }

  const adminId = (req as any).user.userId;

  try {
    for (const s of parsed.data.settings) {
      await db.insert(commissionSettingsTable)
        .values({ level: s.level, rate: s.rate, updatedBy: adminId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: commissionSettingsTable.level,
          set: { rate: s.rate, updatedAt: new Date(), updatedBy: adminId },
        });
    }

    const settings = await db.select().from(commissionSettingsTable);
    res.json({ settings });
  } catch (err) {
    req.log.error({ err }, "admin update commission settings error");
    res.status(500).json({ error: "internal", message: "Failed to update commission settings" });
  }
});

export default router;
