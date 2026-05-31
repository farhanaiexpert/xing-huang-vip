import { Router } from "express";
import { and, eq, gt, isNull, ne, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyMessage, isAddress, getAddress } from "viem";
import { randomBytes } from "crypto";
import { db, usersTable, walletsTable, sessionsTable, referralsTable, selfExclusionsTable, noncesTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, refreshTokenExpiresAt, verifyToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { isTronAddress, verifyTronSignature } from "../lib/tronUtils.js";

const router = Router();

// ── Wallet authentication helpers ────────────────────────────────────────────

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateNonce(): string {
  return randomBytes(32).toString("hex");
}

function buildSignMessage(address: string, nonce: string): string {
  return `Welcome to CupBett!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${address}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
}

function shortAddress(addr: string): string {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ── GET /auth/wallet/nonce?address=0x... ──────────────────────────────────────
router.get("/auth/wallet/nonce", async (req, res): Promise<void> => {
  const rawAddress = req.query.address as string | undefined;
  if (!rawAddress || !isAddress(rawAddress)) {
    res.status(400).json({ error: "Valid Ethereum wallet address required" });
    return;
  }

  const address = rawAddress.toLowerCase();
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await db.insert(noncesTable)
    .values({ walletAddress: address, nonce, expiresAt })
    .onConflictDoUpdate({
      target: noncesTable.walletAddress,
      set: { nonce, expiresAt },
    });

  const message = buildSignMessage(address, nonce);
  res.json({ nonce, message });
});

// ── POST /auth/wallet/verify ──────────────────────────────────────────────────
const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum", 56: "BSC", 137: "Polygon", 43114: "Avalanche",
  10: "Optimism", 42161: "Arbitrum", 8453: "Base", 250: "Fantom",
};

function chainName(chainId?: number | null): string | null {
  if (!chainId) return null;
  return CHAIN_NAMES[chainId] ?? `chainId:${chainId}`;
}

const WalletVerifyBody = z.object({
  address: z.string(),
  signature: z.string(),
  nonce: z.string(),
  chainId: z.number().optional(),
});

router.post("/auth/wallet/verify", async (req, res): Promise<void> => {
  const parsed = WalletVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "address, signature, and nonce are required" });
    return;
  }
  const { address: rawAddress, signature, nonce, chainId } = parsed.data;

  if (!isAddress(rawAddress)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  const address = rawAddress.toLowerCase();

  // Verify nonce exists and hasn't expired
  const [storedNonce] = await db.select()
    .from(noncesTable)
    .where(and(
      eq(noncesTable.walletAddress, address),
      eq(noncesTable.nonce, nonce),
      gt(noncesTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (!storedNonce) {
    res.status(401).json({ error: "Invalid or expired nonce. Please request a new one." });
    return;
  }

  // Verify the signature using viem
  const message = buildSignMessage(address, nonce);
  let valid = false;
  try {
    valid = await verifyMessage({
      address: getAddress(rawAddress),
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    valid = false;
  }

  if (!valid) {
    res.status(401).json({ error: "Signature verification failed" });
    return;
  }

  // Consume the nonce (one-time use)
  await db.delete(noncesTable).where(eq(noncesTable.walletAddress, address));

  // Upsert user — create if first login, return existing if not
  const existing = await db.select()
    .from(usersTable)
    .where(eq(usersTable.walletAddress, address))
    .limit(1);

  let user = existing[0];

  const network = chainName(chainId);

  if (!user) {
    const referralCode = randomBytes(4).toString("hex").toUpperCase();
    const [created] = await db.insert(usersTable).values({
      walletAddress: address,
      walletNetwork: network,
      referralCode,
      role: "user",
    }).returning();
    user = created;
    // Initialise wallet balance
    await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });
  } else if (network && user.walletNetwork !== network) {
    // Update network if it changed or was never set
    await db.update(usersTable).set({ walletNetwork: network }).where(eq(usersTable.id, user.id));
    user = { ...user, walletNetwork: network };
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  // Check for active self-exclusion (non-take-a-break)
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

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: shortAddress(user.walletAddress!),
      // email and username are null for wallet-only accounts; kept for
      // contract compatibility with consumers that destructure these fields
      email: user.email ?? null,
      username: user.username ?? null,
      role: user.role,
      referralCode: user.referralCode,
    },
  });
});

// ── GET /auth/wallet/nonce/tron?address=T... ──────────────────────────────────
router.get("/auth/wallet/nonce/tron", async (req, res): Promise<void> => {
  const address = req.query.address as string | undefined;
  if (!address || !isTronAddress(address)) {
    res.status(400).json({ error: "Valid TRON wallet address required (starts with T, 34 characters)" });
    return;
  }

  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  await db.insert(noncesTable)
    .values({ walletAddress: address, nonce, expiresAt })
    .onConflictDoUpdate({
      target: noncesTable.walletAddress,
      set: { nonce, expiresAt },
    });

  const message = buildSignMessage(address, nonce);
  res.json({ nonce, message });
});

// ── POST /auth/wallet/verify/tron ─────────────────────────────────────────────
const TronVerifyBody = z.object({
  address: z.string(),
  signature: z.string(),
  nonce: z.string(),
});

router.post("/auth/wallet/verify/tron", async (req, res): Promise<void> => {
  const parsed = TronVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "address, signature, and nonce are required" });
    return;
  }
  const { address, signature, nonce } = parsed.data;

  if (!isTronAddress(address)) {
    res.status(400).json({ error: "Invalid TRON wallet address" });
    return;
  }

  // Verify nonce exists and hasn't expired
  const [storedNonce] = await db.select()
    .from(noncesTable)
    .where(and(
      eq(noncesTable.walletAddress, address),
      eq(noncesTable.nonce, nonce),
      gt(noncesTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (!storedNonce) {
    res.status(401).json({ error: "Invalid or expired nonce. Please request a new one." });
    return;
  }

  // Verify the TronLink signMessageV2 signature
  const message = buildSignMessage(address, nonce);
  const recovered = await verifyTronSignature(message, signature);

  if (!recovered || recovered !== address) {
    res.status(401).json({ error: "Signature verification failed" });
    return;
  }

  // Consume the nonce (one-time use)
  await db.delete(noncesTable).where(eq(noncesTable.walletAddress, address));

  // Upsert user
  const existing = await db.select()
    .from(usersTable)
    .where(eq(usersTable.walletAddress, address))
    .limit(1);

  let user = existing[0];

  if (!user) {
    const referralCode = randomBytes(4).toString("hex").toUpperCase();
    const [created] = await db.insert(usersTable).values({
      walletAddress: address,
      walletNetwork: "TRON",
      referralCode,
      role: "user",
    }).returning();
    user = created;
    await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });
  } else if (user.walletNetwork !== "TRON") {
    await db.update(usersTable).set({ walletNetwork: "TRON" }).where(eq(usersTable.id, user.id));
    user = { ...user, walletNetwork: "TRON" };
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  // Check for active self-exclusion
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

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      displayName: shortAddress(user.walletAddress!),
      email: user.email ?? null,
      username: user.username ?? null,
      role: user.role,
      referralCode: user.referralCode,
    },
  });
});

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
  // Additive: include walletAddress and displayName alongside existing fields
  res.json({
    ...user,
    displayName: user.walletAddress
      ? shortAddress(user.walletAddress)
      : (user.username ?? user.email ?? "User"),
  });
});

// ── PATCH /auth/update-profile ────────────────────────────────────────────────
// Kept for backward compatibility; wallet users may still set a display username
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
// Kept for backward compatibility; only applies to admin accounts with a passwordHash
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
