/**
 * End-to-end unit test for TRON signature verification.
 *
 * Simulates exactly what TronLink's signMessageV2 does internally:
 *   1. Build TRON-prefixed message hash
 *   2. Sign the raw hash with secp256k1 (no extra prefixing)
 *   3. Verify using our verifyTronSignature implementation
 *
 * Run: pnpm --filter @workspace/scripts run test:tron
 */

import { privateKeyToAccount }      from "viem/accounts";
import { keccak256 }                from "viem";

// ── Import utils under test (resolved via relative path) ────────────────────
// We import directly to avoid circular workspace references.
import { createHash }               from "node:crypto";
import { recoverAddress }           from "viem";
import { createHash as _sha256Mod } from "node:crypto";

// ── Inline copies of the tronUtils functions (so the test is self-contained) ─
// This lets us run the same crypto logic used by the server without depending
// on the TypeScript build output.

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(data).digest());
}

function base58Encode(data: Uint8Array): string {
  let leadingZeros = 0;
  for (const b of data) {
    if (b !== 0) break;
    leadingZeros++;
  }
  let num = BigInt("0x" + Buffer.from(data).toString("hex") || "0");
  let encoded = "";
  while (num > 0n) {
    const rem = num % 58n;
    encoded = BASE58_ALPHABET[Number(rem)] + encoded;
    num /= 58n;
  }
  return "1".repeat(leadingZeros) + encoded;
}

function base58CheckEncode(payload: Uint8Array): string {
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return base58Encode(new Uint8Array([...payload, ...checksum]));
}

function evmToTronAddress(evmAddr: string): string {
  const hex = evmAddr.replace(/^0x/i, "").toLowerCase().padStart(40, "0");
  const raw = new Uint8Array([0x41, ...Buffer.from(hex, "hex")]);
  return base58CheckEncode(raw);
}

function tronMessageHash(message: string): `0x${string}` {
  const prefix = `\x19TRON Signed Message:\n${message.length}`;
  const combined = new TextEncoder().encode(prefix + message);
  return keccak256(combined);
}

async function verifyTronSignature(message: string, signature: string): Promise<string | null> {
  try {
    const hash = tronMessageHash(message);
    const hexSig = signature.startsWith("0x") ? signature : `0x${signature}`;
    const evmAddr = await recoverAddress({ hash, signature: hexSig as `0x${string}` });
    return evmToTronAddress(evmAddr);
  } catch {
    return null;
  }
}

function isTronAddress(addr: string): boolean {
  if (!addr || addr[0] !== "T" || addr.length !== 34) return false;
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
}

// ── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}${detail ? `  →  ${detail}` : ""}`);
    failed++;
  }
}

// ── isTronAddress ─────────────────────────────────────────────────────────────
console.log("\n── isTronAddress ──────────────────────────────────────────────");
assert("valid mainnet address accepted",           isTronAddress("TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"));
assert("address too short rejected",               !isTronAddress("TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeB"));
assert("address too long rejected",                !isTronAddress("TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBfx"));
assert("wrong prefix (0x) rejected",               !isTronAddress("0x1234567890abcdef1234567890abcdef12345678"));
assert("wrong prefix (E) rejected",                !isTronAddress("EXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"));
assert("invalid base58 char (0) rejected",         !isTronAddress("T0YZopYRdj2D9XRtbG411XZZ3kM5VkAeBf"));
assert("empty string rejected",                    !isTronAddress(""));

// ── evmToTronAddress ──────────────────────────────────────────────────────────
// Known test vector: TRON foundation publishes that EVM address
// 0x0000000000000000000000000000000000000001 → T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb
console.log("\n── evmToTronAddress ───────────────────────────────────────────");
const knownEvm  = "0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C";  // TRON official USDT contract
const knownTron = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";          // Official TRON USDT address
const computed  = evmToTronAddress(knownEvm);
assert(
  `known TRON USDT contract address matches  (got ${computed})`,
  computed === knownTron,
  `expected ${knownTron}`
);

const zeroEvm   = "0x0000000000000000000000000000000000000001";
const zeroTron  = evmToTronAddress(zeroEvm);
assert("T… prefix on zero+1 address",  zeroTron.startsWith("T"));
assert("34-char length on zero+1 addr", zeroTron.length === 34);
console.log(`  ℹ️  EVM 0x…0001 → TRON ${zeroTron}`);

// ── verifyTronSignature round-trip ────────────────────────────────────────────
// This is the critical test: generate a key, sign with the TRON prefix,
// then verify our recovery reproduces the correct TRON address.
console.log("\n── verifyTronSignature round-trip ─────────────────────────────");

// Deterministic test private key (DO NOT use in production)
const TEST_PRIVATE_KEY = "0x4c0883a69102937d6231471b5dbb6e538eba2ef2d12bf300a02bebe56f1e1f52";
const testAccount      = privateKeyToAccount(TEST_PRIVATE_KEY);
const expectedTronAddr = evmToTronAddress(testAccount.address);

console.log(`  ℹ️  Test EVM  address : ${testAccount.address}`);
console.log(`  ℹ️  Expected TRON addr: ${expectedTronAddr}`);

// Build a realistic Xing Huang nonce message for this address
const nonce   = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const message = `Welcome to Xing Huang!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${expectedTronAddr}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;

// Sign the raw TRON message hash — this is exactly what TronLink's signMessageV2 does:
//   hash = keccak256("\x19TRON Signed Message:\n" + len + message)
//   sig  = secp256k1_sign(privateKey, hash)   ← no extra prefix
const msgHash   = tronMessageHash(message);
const signature = await testAccount.sign({ hash: msgHash });

const recovered = await verifyTronSignature(message, signature);
assert(
  `round-trip: verifyTronSignature recovers correct TRON address`,
  recovered === expectedTronAddr,
  `expected ${expectedTronAddr}, got ${recovered}`
);

// Second message to confirm it's not a fluke
const message2  = `Welcome to Xing Huang!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${expectedTronAddr}\nNonce: deadbeef00112233deadbeef00112233deadbeef00112233deadbeef00112233\n\nThis request will not trigger a blockchain transaction or cost any gas fees.`;
const sig2      = await testAccount.sign({ hash: tronMessageHash(message2) });
const recovered2 = await verifyTronSignature(message2, sig2);
assert(
  `second message round-trip succeeds`,
  recovered2 === expectedTronAddr,
);

// Tampered message must NOT verify
const recovered3 = await verifyTronSignature(message + " TAMPERED", signature);
assert(
  `tampered message recovers a DIFFERENT address (not the signer)`,
  recovered3 !== expectedTronAddr,
);

// Wrong signature format must return null
const recoveredNull = await verifyTronSignature(message, "0xdeadbeef");
assert(
  `invalid signature returns null`,
  recoveredNull === null,
);

// Signature without 0x prefix also works
const sigNoPrefix = signature.replace(/^0x/, "");
const recovered5  = await verifyTronSignature(message, sigNoPrefix);
assert(
  `signature without 0x prefix accepted`,
  recovered5 === expectedTronAddr,
);

// ── Auth API integration: nonce + verify endpoints ───────────────────────────
console.log("\n── Auth API endpoints (/auth/wallet/nonce/tron + /auth/wallet/verify/tron) ──");

const BASE_URL = "http://localhost:80";

async function httpGet(path: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`);
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

async function httpPost(path: string, payload: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
  const r = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body };
}

// ── nonce endpoint ────────────────────────────────────────────────────────────
const badNonce = await httpGet("/api/auth/wallet/nonce/tron?address=0xinvalid");
assert(
  `nonce endpoint rejects EVM address (status ${badNonce.status})`,
  badNonce.status === 400,
);

const badNonce2 = await httpGet("/api/auth/wallet/nonce/tron");
assert(
  `nonce endpoint rejects missing address (status ${badNonce2.status})`,
  badNonce2.status === 400,
);

const goodNonce = await httpGet(`/api/auth/wallet/nonce/tron?address=${expectedTronAddr}`);
assert(
  `nonce endpoint accepts valid TRON address (status ${goodNonce.status})`,
  goodNonce.ok,
  JSON.stringify(goodNonce.body),
);

const nonceBody = goodNonce.body as { nonce: string; message: string } | null;
assert(
  `nonce response contains nonce + message fields`,
  !!(nonceBody?.nonce && nonceBody?.message),
  JSON.stringify(nonceBody),
);

// ── verify endpoint ───────────────────────────────────────────────────────────
if (nonceBody) {
  // Sign the server-issued message with the TRON prefix
  const serverMsgHash = tronMessageHash(nonceBody.message);
  const serverSig     = await testAccount.sign({ hash: serverMsgHash });

  const verifyRes = await httpPost("/api/auth/wallet/verify/tron", {
    address:   expectedTronAddr,
    signature: serverSig,
    nonce:     nonceBody.nonce,
  });
  assert(
    `verify endpoint accepts correct signature (status ${verifyRes.status})`,
    verifyRes.ok,
    JSON.stringify(verifyRes.body),
  );

  const verifyBody = verifyRes.body as { accessToken?: string; user?: { walletAddress: string } } | null;
  assert(
    `verify response contains accessToken`,
    !!(verifyBody?.accessToken),
  );
  assert(
    `verify response contains user with correct walletAddress`,
    verifyBody?.user?.walletAddress === expectedTronAddr,
    `got ${verifyBody?.user?.walletAddress}`,
  );

  // Replay the same nonce — must be rejected (nonce consumed)
  const replayRes = await httpPost("/api/auth/wallet/verify/tron", {
    address:   expectedTronAddr,
    signature: serverSig,
    nonce:     nonceBody.nonce,
  });
  assert(
    `nonce replay is rejected (status ${replayRes.status})`,
    replayRes.status === 401,
  );
}

// Wrong signature — must be rejected even with valid nonce
const freshNonce = await httpGet(`/api/auth/wallet/nonce/tron?address=${expectedTronAddr}`);
const freshBody  = freshNonce.body as { nonce: string; message: string } | null;
if (freshBody) {
  const wrongSigRes = await httpPost("/api/auth/wallet/verify/tron", {
    address:   expectedTronAddr,
    signature: "0x" + "ab".repeat(65),  // garbage signature
    nonce:     freshBody.nonce,
  });
  assert(
    `wrong signature is rejected (status ${wrongSigRes.status})`,
    wrongSigRes.status === 401,
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SOME TESTS FAILED");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED ✅");
}
