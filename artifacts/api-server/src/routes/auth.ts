import { Router } from "express";
import { and, eq, ne, or, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable, walletsTable, sessionsTable, referralsTable, selfExclusionsTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, refreshTokenExpiresAt, verifyToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const RegisterBody = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  referralCode: z.string().optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, username, password, referralCode } = parsed.data;

  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userReferralCode = Math.random().toString(36).slice(2, 10).toUpperCase();

  const [user] = await db.insert(usersTable).values({
    email,
    username,
    passwordHash,
    referralCode: userReferralCode,
    role: "user",
  }).returning();

  await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });

  if (referralCode) {
    const referrer = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode))
      .limit(1);
    if (referrer.length > 0) {
      await db.insert(referralsTable).values({
        referrerId: referrer[0].id,
        referredId: user.id,
        tier: 1,
      });
    }
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt: refreshTokenExpiresAt(),
  });

  res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email: user.email, username: user.username, role: user.role, referralCode: user.referralCode } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  // Block login for permanent or long-term self-exclusions (take-a-break only blocks betting)
  const now = new Date();
  const [excl] = await db.select().from(selfExclusionsTable)
    .where(and(
      eq(selfExclusionsTable.userId, user.id),
      isNull(selfExclusionsTable.liftedAt),
      eq(selfExclusionsTable.isTakeABreak, false),
      or(
        eq(selfExclusionsTable.isPermanent, true),
        gt(selfExclusionsTable.endsAt, now),
      ),
    ))
    .limit(1);
  if (excl) {
    const endsMsg = excl.isPermanent
      ? "Your account is permanently self-excluded. Please contact support for assistance."
      : `You have self-excluded until ${new Date(excl.endsAt!).toLocaleDateString()}. Please contact support if you need help.`;
    res.status(403).json({ error: endsMsg, code: "SELF_EXCLUDED" });
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

  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, username: user.username, role: user.role, referralCode: user.referralCode } });
});

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

router.post("/auth/logout", authenticate, async (req, res): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    await db.delete(sessionsTable).where(eq(sessionsTable.refreshToken, refreshToken));
  }
  res.sendStatus(204);
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
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

const UpdateProfileBody = z.object({
  username: z.string().min(3).max(30),
});

router.patch("/auth/update-profile", authenticate, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username } = parsed.data;

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

  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, req.user!.userId));

  res.json({ success: true });
});

export default router;
