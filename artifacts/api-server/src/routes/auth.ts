import { Router } from "express";
import { and, eq, gt, isNull, ne, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyMessage, isAddress, getAddress } from "viem";
import { randomBytes, verify as cryptoVerify, createPublicKey, createHash } from "crypto";
import { db, usersTable, walletsTable, sessionsTable, referralsTable, selfExclusionsTable, noncesTable } from "@workspace/db";
import { signAccessToken, signRefreshToken, refreshTokenExpiresAt, verifyToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";
import { isTronAddress, verifyTronSignature } from "../lib/tronUtils.js";

const router = Router();

// ── Referral chain creation helper ───────────────────────────────────────────
// Called at every registration path (email + all wallet types).
// With the multi-tier row model, one referred user can have up to 3 rows in
// referrals: tier-1 (direct referrer), tier-2, tier-3.
async function createReferralChain(newUserId: number, referrerId: number): Promise<void> {
  // Tier 1: direct referrer → new user
  await db.insert(referralsTable)
    .values({ referrerId, referredId: newUserId, tier: 1 })
    .onConflictDoNothing();

  // Tier 2: referrer's direct referrer
  const [ref2] = await db
    .select({ referrerId: referralsTable.referrerId })
    .from(referralsTable)
    .where(and(eq(referralsTable.referredId, referrerId), eq(referralsTable.tier, 1)))
    .limit(1);
  if (!ref2) return;

  await db.insert(referralsTable)
    .values({ referrerId: ref2.referrerId, referredId: newUserId, tier: 2 })
    .onConflictDoNothing();

  // Tier 3: referrer's referrer's direct referrer
  const [ref3] = await db
    .select({ referrerId: referralsTable.referrerId })
    .from(referralsTable)
    .where(and(eq(referralsTable.referredId, ref2.referrerId), eq(referralsTable.tier, 1)))
    .limit(1);
  if (!ref3) return;

  await db.insert(referralsTable)
    .values({ referrerId: ref3.referrerId, referredId: newUserId, tier: 3 })
    .onConflictDoNothing();
}

// ── Wallet authentication helpers ────────────────────────────────────────────

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateNonce(): string {
  return randomBytes(32).toString("hex");
}

function buildSignMessage(address: string, nonce: string): string {
  return `Welcome to Xing Huang!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${address}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
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
  referralCode: z.string().optional(),
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
    // Referral chain
    if (parsed.data.referralCode) {
      const [ref] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, parsed.data.referralCode.toUpperCase()))
        .limit(1);
      if (ref) await createReferralChain(user.id, ref.id);
    }
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
  referralCode: z.string().optional(),
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
    if (parsed.data.referralCode) {
      const [ref] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, parsed.data.referralCode.toUpperCase()))
        .limit(1);
      if (ref) await createReferralChain(user.id, ref.id);
    }
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

// ── Solana Ed25519 helpers ────────────────────────────────────────────────────

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function fromBase58(s: string): Buffer {
  let n = BigInt(0);
  for (const c of s) {
    const d = BASE58_CHARS.indexOf(c);
    if (d < 0) throw new Error("Invalid base58 character: " + c);
    n = n * 58n + BigInt(d);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  let leadZeros = 0;
  for (const c of s) { if (c !== "1") break; leadZeros++; }
  const raw = Buffer.from(hex, "hex");
  return leadZeros > 0 ? Buffer.concat([Buffer.alloc(leadZeros), raw]) : raw;
}

// Ed25519 SubjectPublicKeyInfo DER prefix (RFC 8410)
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function isSolanaAddress(addr: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
}

function verifySolanaSignature(message: string, signatureHex: string, address: string): boolean {
  const pubKeyBytes = fromBase58(address);
  if (pubKeyBytes.length !== 32) return false;
  const derKey = Buffer.concat([ED25519_SPKI_PREFIX, pubKeyBytes]);
  const key = createPublicKey({ key: derKey, format: "der", type: "spki" });
  const sigBytes = Buffer.from(signatureHex, "hex");
  // crypto.verify(null, data, key, sig) — null algorithm uses the key's own algorithm (Ed25519)
  // createVerify("Ed25519") throws "Invalid digest" for Ed25519; this is the correct Node API
  return cryptoVerify(null, Buffer.from(message), key, sigBytes);
}

// ── GET /auth/wallet/nonce/solana?address=... ─────────────────────────────────
router.get("/auth/wallet/nonce/solana", async (req, res): Promise<void> => {
  const address = req.query.address as string | undefined;
  if (!address || !isSolanaAddress(address)) {
    res.status(400).json({ error: "Valid Solana wallet address required (base58, 32-44 chars)" });
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

// ── POST /auth/wallet/verify/solana ───────────────────────────────────────────
const SolanaVerifyBody = z.object({
  address:      z.string(),
  signature:    z.string().regex(/^[0-9a-f]{128}$/i, "signature must be 64-byte hex"),
  nonce:        z.string(),
  referralCode: z.string().optional(),
});

router.post("/auth/wallet/verify/solana", async (req, res): Promise<void> => {
  const parsed = SolanaVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "address, signature (hex), and nonce are required" });
    return;
  }
  const { address, signature, nonce } = parsed.data;

  if (!isSolanaAddress(address)) {
    res.status(400).json({ error: "Invalid Solana wallet address" });
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

  // Verify the ed25519 signature
  const message = buildSignMessage(address, nonce);
  let valid = false;
  try {
    valid = verifySolanaSignature(message, signature, address);
  } catch {
    valid = false;
  }

  if (!valid) {
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
      walletNetwork: "SOLANA",
      referralCode,
      role: "user",
    }).returning();
    user = created;
    await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });
    if (parsed.data.referralCode) {
      const [ref] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, parsed.data.referralCode.toUpperCase()))
        .limit(1);
      if (ref) await createReferralChain(user.id, ref.id);
    }
  } else if (user.walletNetwork !== "SOLANA") {
    await db.update(usersTable).set({ walletNetwork: "SOLANA" }).where(eq(usersTable.id, user.id));
    user = { ...user, walletNetwork: "SOLANA" };
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

// ── TON Ed25519 + ton_proof helpers ──────────────────────────────────────────

const TONAPI_BASE = "https://tonapi.io/v2";

function isTonAddress(addr: string): boolean {
  // User-friendly EQ/UQ/EQ bounceable/non-bounceable (48 base64url chars)
  if (/^[EUu][Qq][A-Za-z0-9_-]{46}$/.test(addr)) return true;
  // Raw workchain:hex format (e.g. 0:<64 hex> or -1:<64 hex>)
  if (/^-?[0-9]+:[0-9a-fA-F]{64}$/.test(addr)) return true;
  return false;
}

/** Fetch the wallet's public key from TON blockchain (tonapi.io).
 *  Returns null for undeployed wallets or on network error. */
async function fetchTonOnchainPublicKey(address: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `${TONAPI_BASE}/accounts/${encodeURIComponent(address)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json() as { public_key?: string };
    const key = (data.public_key ?? "").trim();
    return /^[0-9a-fA-F]{64}$/.test(key) ? key : null;
  } catch {
    return null;
  }
}

/** Parse a TON address to its workchain + 32-byte hash.
 *  Supports EQ/UQ user-friendly (48 base64url chars) and raw "wc:<64hex>". */
function parseTonAddressBytes(addr: string): { workchain: number; hash: Buffer } {
  const rawMatch = /^(-?[0-9]+):([0-9a-fA-F]{64})$/.exec(addr);
  if (rawMatch) {
    return { workchain: parseInt(rawMatch[1], 10), hash: Buffer.from(rawMatch[2], "hex") };
  }
  if (/^[A-Za-z0-9_-]{48}$/.test(addr)) {
    const b64 = addr.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Buffer.from(b64 + "==", "base64");
    // layout: [flags 1B] [workchain 1B signed] [hash 32B] [crc 2B]
    if (bytes.length >= 34) {
      const wc = bytes.readInt8(1);
      return { workchain: wc, hash: Buffer.from(bytes.subarray(2, 34)) };
    }
  }
  throw new Error("Cannot parse TON address");
}

/** Build the TON Connect ton_proof message hash per TonConnect spec:
 *  sha256(0xff 0xff "ton-connect" sha256("ton-proof-item-v2/" wc[4BE] hash[32] domainLen[4LE] domain ts[8LE] payload))
 */
function buildTonProofMessage(
  address: string,
  domain: { value: string; lengthBytes: number },
  timestamp: number,
  payload: string,
): Buffer {
  const { workchain, hash } = parseTonAddressBytes(address);

  const wcBuf = Buffer.allocUnsafe(4);
  wcBuf.writeInt32BE(workchain, 0);

  const domainBuf = Buffer.from(domain.value, "utf-8");
  const domainLenBuf = Buffer.allocUnsafe(4);
  domainLenBuf.writeUInt32LE(domain.lengthBytes, 0);

  const tsBuf = Buffer.allocUnsafe(8);
  tsBuf.writeBigUInt64LE(BigInt(timestamp), 0);

  const inner = Buffer.concat([
    Buffer.from("ton-proof-item-v2/"),
    wcBuf,
    hash,
    domainLenBuf,
    domainBuf,
    tsBuf,
    Buffer.from(payload, "utf-8"),
  ]);

  const innerHash = createHash("sha256").update(inner).digest();
  const outer = Buffer.concat([
    Buffer.from([0xff, 0xff]),
    Buffer.from("ton-connect"),
    innerHash,
  ]);
  return createHash("sha256").update(outer).digest();
}

/** Verify an Ed25519 signature. message can be a plain string or raw bytes. */
function verifyTonSignature(message: Buffer | string, signatureBase64: string, publicKeyHex: string): boolean {
  const pubKeyBytes = Buffer.from(publicKeyHex, "hex");
  if (pubKeyBytes.length !== 32) return false;
  const derKey = Buffer.concat([ED25519_SPKI_PREFIX, pubKeyBytes]);
  const key = createPublicKey({ key: derKey, format: "der", type: "spki" });
  const sigBytes = Buffer.from(signatureBase64, "base64");
  const msgBuf = Buffer.isBuffer(message) ? message : Buffer.from(message, "utf-8");
  return cryptoVerify(null, msgBuf, key, sigBytes);
}

// ── GET /auth/wallet/nonce/ton?address=... ────────────────────────────────────
router.get("/auth/wallet/nonce/ton", async (req, res): Promise<void> => {
  const address = req.query.address as string | undefined;
  if (!address || !isTonAddress(address)) {
    res.status(400).json({ error: "Valid TON wallet address required (EQ/UQ user-friendly or raw workchain:hex format)" });
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

// ── POST /auth/wallet/verify/ton ──────────────────────────────────────────────
// Accepts two proof formats:
//   A) ton_proof  — { address, nonce, proof: { timestamp, domain, signature, payload } }
//   B) signMessage — { address, nonce, signature }  (publicKey ALWAYS fetched on-chain)
const TonVerifyBody = z.object({
  address:      z.string(),
  nonce:        z.string(),
  referralCode: z.string().optional(),
  // ton_proof format (preferred — Tonkeeper ≥3 / TonConnect)
  proof: z.object({
    timestamp: z.number(),
    domain:    z.object({ lengthBytes: z.number(), value: z.string() }),
    signature: z.string(),
    payload:   z.string(),
  }).optional(),
  // Legacy ton_signMessage fallback (publicKey NOT accepted from client — fetched on-chain)
  signature: z.string().optional(),
});

router.post("/auth/wallet/verify/ton", async (req, res): Promise<void> => {
  const parsed = TonVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "address and nonce are required, plus either proof or signature" });
    return;
  }
  const { address, nonce, proof, signature } = parsed.data;

  if (!isTonAddress(address)) {
    res.status(400).json({ error: "Invalid TON wallet address" });
    return;
  }

  if (!proof && !signature) {
    res.status(400).json({ error: "Either ton_proof or signature (ton_signMessage) is required" });
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

  // Always fetch public key from blockchain — never trust client-supplied key
  const onchainKey = await fetchTonOnchainPublicKey(address);
  if (!onchainKey) {
    res.status(401).json({
      error: "Unable to verify wallet ownership: public key not found on TON blockchain. " +
             "Please ensure your wallet is activated (has made at least one transaction) and try again.",
    });
    return;
  }

  let valid = false;
  if (proof) {
    // ton_proof verification: verify payload matches nonce, then verify signature
    if (proof.payload !== nonce) {
      res.status(401).json({ error: "ton_proof payload does not match nonce" });
      return;
    }
    // Reject stale proofs (>5 min clock skew tolerance)
    const ageSec = Math.abs(Date.now() / 1000 - proof.timestamp);
    if (ageSec > 5 * 60) {
      res.status(401).json({ error: "ton_proof timestamp expired" });
      return;
    }

    // ── Domain binding: prevent cross-origin proof replay ──────────────────
    // Build the set of allowed origins from REPLIT_DOMAINS (comma-separated)
    // plus localhost variants for local development.
    const replitDomains = (process.env.REPLIT_DOMAINS ?? "")
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);
    const allowedDomains = new Set<string>([
      ...replitDomains,
      "localhost",
      "127.0.0.1",
      // Strip port from any localhost:PORT variants the wallet might report
      ...replitDomains.map(d => d.split(":")[0]),
    ]);

    // Verify domain value is one of the allowed origins
    const proofDomain = proof.domain.value;
    // Some wallets include the port; strip it for the allowlist check
    const proofHost = proofDomain.split(":")[0];
    if (!allowedDomains.has(proofDomain) && !allowedDomains.has(proofHost)) {
      res.status(401).json({ error: "ton_proof domain is not an authorised origin" });
      return;
    }
    // Verify lengthBytes matches the actual UTF-8 byte length of domain.value
    const domainByteLen = Buffer.byteLength(proofDomain, "utf-8");
    if (proof.domain.lengthBytes !== domainByteLen) {
      res.status(401).json({ error: "ton_proof domain lengthBytes mismatch" });
      return;
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
      const msgHash = buildTonProofMessage(address, proof.domain, proof.timestamp, proof.payload);
      valid = verifyTonSignature(msgHash, proof.signature, onchainKey);
    } catch { valid = false; }
  } else if (signature) {
    // ton_signMessage verification using on-chain key (no client-supplied key trusted)
    try {
      const message = buildSignMessage(address, nonce);
      valid = verifyTonSignature(message, signature, onchainKey);
    } catch { valid = false; }
  }

  if (!valid) {
    res.status(401).json({ error: "TON signature verification failed" });
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
      walletNetwork: "TON",
      referralCode,
      role: "user",
    }).returning();
    user = created;
    await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });
    if (parsed.data.referralCode) {
      const [ref] = await db.select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.referralCode, parsed.data.referralCode.toUpperCase()))
        .limit(1);
      if (ref) await createReferralChain(user.id, ref.id);
    }
  } else if (user.walletNetwork !== "TON") {
    await db.update(usersTable).set({ walletNetwork: "TON" }).where(eq(usersTable.id, user.id));
    user = { ...user, walletNetwork: "TON" };
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

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

  // Rotate refresh token: delete the used session and issue a fresh one.
  // This limits the damage window of a stolen refresh token to a single use.
  const newRefreshToken = signRefreshToken({ userId: payload.userId, role: payload.role });
  await db.transaction(async (tx) => {
    await tx.delete(sessionsTable).where(eq(sessionsTable.refreshToken, refreshToken));
    await tx.insert(sessionsTable).values({
      userId: session.userId,
      refreshToken: newRefreshToken,
      expiresAt: refreshTokenExpiresAt(),
    });
  });

  const accessToken = signAccessToken({ userId: payload.userId, role: payload.role });
  res.json({ accessToken, refreshToken: newRefreshToken });
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

// ── POST /auth/register ───────────────────────────────────────────────────────
const RegisterBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referralCode: z.string().optional(),
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { email, password, referralCode } = parsed.data;

  // Check email not already taken
  const [existing] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = randomBytes(4).toString("hex").toUpperCase();

  // Handle referral (optional)
  let referrerId: number | null = null;
  if (referralCode) {
    const [referrer] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, referralCode.toUpperCase()))
      .limit(1);
    if (referrer) referrerId = referrer.id;
  }

  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    referralCode: newReferralCode,
    role: "user",
  }).returning();

  await db.insert(walletsTable).values({ userId: user.id, balanceUsdt: "0" });

  if (referrerId) {
    await createReferralChain(user.id, referrerId);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await db.insert(sessionsTable).values({
    userId: user.id,
    refreshToken,
    expiresAt: refreshTokenExpiresAt(),
  });

  res.status(201).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      walletAddress: null,
      displayName: user.username ?? user.email ?? "User",
      email: user.email,
      username: user.username ?? null,
      role: user.role,
      referralCode: user.referralCode,
    },
  });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
const LoginBody = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
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
      walletAddress: user.walletAddress ?? null,
      displayName: user.username ?? user.email ?? "User",
      email: user.email,
      username: user.username ?? null,
      role: user.role,
      referralCode: user.referralCode,
    },
  });
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
