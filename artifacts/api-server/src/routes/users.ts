import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const UpdateProfileBody = z.object({
  username: z.string().min(3).max(30).optional(),
  country: z.string().optional(),
});

router.get("/users/profile", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    username: usersTable.username,
    role: usersTable.role,
    kycStatus: usersTable.kycStatus,
    country: usersTable.country,
    referralCode: usersTable.referralCode,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/users/profile", authenticate, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.username) updates.username = parsed.data.username;
  if (parsed.data.country != null) updates.country = parsed.data.country;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.userId))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      country: usersTable.country,
      role: usersTable.role,
    });
  res.json(user);
});

export default router;
