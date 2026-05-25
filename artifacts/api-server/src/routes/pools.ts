import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, poolEntriesTable, predictionPoolsTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.get("/pools/my-entries", authenticate, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const entries = await db
    .select({
      entryId:        poolEntriesTable.id,
      poolId:         poolEntriesTable.poolId,
      picks:          poolEntriesTable.picks,
      entryCreatedAt: poolEntriesTable.createdAt,
      poolTitle:      predictionPoolsTable.title,
      sport:          predictionPoolsTable.sport,
      status:         predictionPoolsTable.status,
      prizePool:      predictionPoolsTable.prizePool,
      entryFee:       predictionPoolsTable.entryFee,
      deadline:       predictionPoolsTable.deadline,
      settledAt:      predictionPoolsTable.settledAt,
      correctOutcome: predictionPoolsTable.correctOutcome,
    })
    .from(poolEntriesTable)
    .innerJoin(predictionPoolsTable, eq(predictionPoolsTable.id, poolEntriesTable.poolId))
    .where(eq(poolEntriesTable.userId, userId))
    .orderBy(poolEntriesTable.createdAt);

  res.json(entries);
});

export default router;
