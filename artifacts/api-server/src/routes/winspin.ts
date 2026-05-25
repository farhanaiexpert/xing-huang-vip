import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, winspinSpinsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/winspin/history", authenticate, async (req, res): Promise<void> => {
  const spins = await db.select()
    .from(winspinSpinsTable)
    .where(eq(winspinSpinsTable.userId, req.user!.userId))
    .orderBy(desc(winspinSpinsTable.createdAt))
    .limit(50);
  res.json(spins);
});

export default router;
