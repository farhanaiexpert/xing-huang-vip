import { Router } from "express";
import { and, eq, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, refreshTokenExpiresAt, verifyToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

function shortAddress(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ── POST /auth/refresh ────────────────────────────────────────────────────────
router.post("/auth/refresh", async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token required" });
    return;
  }
  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const [session] = await db.select().from(sessionsTable)
    .where(eq(sessionsTable.refreshToken, refreshToken)).limit(1);
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
  res.json({ accessToken });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post("/auth/logout", authenticate, async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await db.delete(sessionsTable).where(eq(sessionsTable.refreshToken, refreshToken));
  }
  res.sendStatus(204);
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const [user] = await db.select({
    id: usersTable.id,
    walletAddress: usersTable.walletAddress,
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
  res.json({
    ...user,
    displayName: user.walletAddress
      ? shortAddress(user.walletAddress)
      : (user.username ?? user.email ?? "User"),
  });
});

// ── PATCH /auth/update-profile ────────────────────────────────────────────────
const UpdateProfileBody = z.object({
  username: z.string().min(3).max(30).optional(),
});

router.patch("/auth/update-profile", authenticate, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username } = parsed.data;
  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.username, username), ne(usersTable.id, req.user!.userId)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ username })
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json({ id: user.id, email: user.email, username: user.username, role: user.role, referralCode: user.referralCode });
});

// ── POST /auth/change-password ────────────────────────────────────────────────
const ChangePasswordBody = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.post("/auth/change-password", authenticate, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { currentPassword, newPassword } = parsed.data;

  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user || !user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, req.user!.userId));

  res.json({ success: true });
});

// ── Admin-only: email/password login (kept for admin portal) ──────────────────
const AdminLoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);

  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!["admin", "super_admin"].includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt: refreshTokenExpiresAt(),
  });

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, username: user.username, role: user.role, referralCode: user.referralCode },
  });
});

export default router;
