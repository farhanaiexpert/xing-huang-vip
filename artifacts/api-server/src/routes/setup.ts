/**
 * One-time bootstrap endpoint.
 * Creates the first super_admin user if none exists.
 * Once any admin/super_admin user exists, this endpoint returns 409 and does nothing.
 */
import { Router } from "express";
import { or, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import { db, usersTable, walletsTable } from "@workspace/db";

const router = Router();

const BootstrapBody = z.object({
  username: z.string().min(3).max(32),
  email:    z.string().email(),
  password: z.string().min(8),
});

router.post("/setup/bootstrap-admin", async (req, res): Promise<void> => {
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "super_admin")))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Already bootstrapped. An admin account already exists." });
    return;
  }

  const parsed = BootstrapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;

  const [emailExists] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));
  if (emailExists) { res.status(409).json({ error: "Email already in use" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await db
    .insert(usersTable)
    .values({ username, email: email.toLowerCase(), passwordHash, role: "super_admin" })
    .returning({ id: usersTable.id, username: usersTable.username, email: usersTable.email, role: usersTable.role });

  await db.insert(walletsTable).values({ userId: newUser.id });

  res.status(201).json({
    message: "Super-admin account created successfully. Please log in via the admin dashboard.",
    user: newUser,
  });
});

export default router;
