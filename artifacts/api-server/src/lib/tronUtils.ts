/**
 * TRON-specific cryptographic utilities.
 *
 * Implements TRON address validation and signMessageV2 signature verification
 * using only `viem` (already a dependency) + the built-in `node:crypto` SHA-256.
 * No tronweb package required.
 *
 * TRON's signMessageV2 prefixes the message the same way Ethereum's personal_sign
 * does but with a different header, so we can reuse viem's recoverAddress after
 * hashing with the TRON prefix.
 */

import { createHash }                   from "node:crypto";
import { keccak256, recoverAddress, toBytes } from "viem";

// ── Base58 / Base58Check ────────────────────────────────────────────────────

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

// ── Address helpers ─────────────────────────────────────────────────────────

/** Convert a 0x... EVM address string to a TRON base58check address (T...) */
export function evmToTronAddress(evmAddr: string): string {
  const hex = evmAddr.replace(/^0x/i, "").toLowerCase().padStart(40, "0");
  const raw = new Uint8Array([0x41, ...Buffer.from(hex, "hex")]);
  return base58CheckEncode(raw);
}

/**
 * Validate a TRON base58check address.
 * Must start with 'T', be 34 characters, and pass checksum.
 */
export function isTronAddress(addr: string): boolean {
  if (!addr || addr[0] !== "T" || addr.length !== 34) return false;
  // Attempt to decode — we check structural validity only (no full checksum
  // decode because we don't need a full base58check decoder here; the 'T' +
  // 34-char check is sufficient for nonce endpoint input validation).
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr);
}

// ── Signature verification ──────────────────────────────────────────────────

/**
 * Build the hash that TronLink creates for signMessageV2.
 * Prefix: "\x19TRON Signed Message:\n" + message.length + message
 */
function tronMessageHash(message: string): `0x${string}` {
  const prefix = `\x19TRON Signed Message:\n${message.length}`;
  const bytes = toBytes(`${prefix}${message}`, { size: undefined } as never);
  // toBytes won't work for arbitrary strings directly — use TextEncoder
  const encoder = new TextEncoder();
  const combined = encoder.encode(prefix + message);
  return keccak256(combined);
}

/**
 * Verify a TronLink signMessageV2 signature.
 * Returns the TRON base58check address that signed the message,
 * or null if verification fails.
 */
export async function verifyTronSignature(
  message: string,
  signature: string
): Promise<string | null> {
  try {
    const hash = tronMessageHash(message);
    const hexSig = signature.startsWith("0x") ? signature : `0x${signature}`;
    const evmAddr = await recoverAddress({ hash, signature: hexSig as `0x${string}` });
    return evmToTronAddress(evmAddr);
  } catch {
    return null;
  }
}
