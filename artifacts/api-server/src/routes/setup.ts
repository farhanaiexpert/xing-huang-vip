/**
 * One-time bootstrap endpoint.
 * Creates the first super_admin user if none exists.
 * Once any admin/super_admin user exists, this endpoint returns 409 and does nothing.
 */
import { Router } from "express";
import { or, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import { db, usersTable, walletsTable, sessionsTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, refreshTokenExpiresAt } from "../lib/auth.js";

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

// ── Dev-only: instant login as a persistent test account ──────────────────────
// Lets you enter the app (e.g. Bet History) without a real wallet signature.
// Mounted only outside production (see routes/index.ts), so it cannot be reached live.
const TEST_WALLET = "0x00000000000000000000000000000000deadbeef";

router.post("/setup/test-login", async (_req, res): Promise<void> => {
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.walletAddress, TEST_WALLET))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(usersTable)
      .values({
        walletAddress: TEST_WALLET,
        walletNetwork: "Ethereum",
        username: "Test Player",
        role: "user",
        isTestAccount: true,
        referralCode: randomBytes(4).toString("hex").toUpperCase(),
      })
      .returning();
  }

  // Ensure a wallet row exists (e.g. if the user was created but the wallet row
  // was removed); insert with a starting balance only when missing.
  await db
    .insert(walletsTable)
    .values({ userId: user.id, balanceUsdt: "5000" })
    .onConflictDoNothing({ target: walletsTable.userId });

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt: refreshTokenExpiresAt(),
  });

  res.json({ accessToken, refreshToken });
});

export default router;
