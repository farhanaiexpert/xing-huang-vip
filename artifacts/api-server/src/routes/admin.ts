import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable, betsTable, betSelectionsTable, transactionsTable,
         commissionSettingsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

const router = Router();
router.use(requireAdmin);

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

router.get("/transactions", async (req, res) => {
  try {
    const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(500);
    res.json({ transactions: txns, total: txns.length });
  } catch (err) {
    req.log.error({ err }, "admin get transactions error");
    res.status(500).json({ error: "internal", message: "Failed to fetch transactions" });
  }
});

router.patch("/bets/:id/settle", async (req, res) => {
  const schema = z.object({ status: z.enum(["won", "lost", "void"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", message: "Status must be won, lost, or void" });
    return;
  }
  const { id } = req.params;
  try {
    const [updated] = await db
      .update(betsTable)
      .set({ status: parsed.data.status, settledAt: new Date() })
      .where(eq(betsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Bet not found" });
      return;
    }
    const selections = await db.select().from(betSelectionsTable).where(eq(betSelectionsTable.betId, id));
    res.json({ ...updated, selections });
  } catch (err) {
    req.log.error({ err }, "admin settle bet error");
    res.status(500).json({ error: "internal", message: "Failed to settle bet" });
  }
});

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
