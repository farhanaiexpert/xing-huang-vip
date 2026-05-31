import { logger } from "./logger.js";

/**
 * Verifies a TON USDT (Jetton) deposit using TONapi v2.
 *
 * TONapi auto-decodes Jetton transfer message bodies, so we can extract the
 * destination address and the transferred amount without a TON SDK.
 *
 * Strategy:
 *   1. Look up the transaction by hash on TONapi v2.
 *   2. Scan in_msg and out_msgs for any JettonTransfer / JettonInternalTransfer op.
 *   3. If found and amount >= claimed, return verified: true.
 *   4. Fall back to manual review on any error or missing data.
 *
 * Address format note: TONapi returns addresses in raw form (0:<hex>).
 * The platform address from env is typically user-friendly (EQ…/UQ…).
 * We extract the 64-char hex segment from both and compare case-insensitively.
 */

const TONAPI_BASE = "https://tonapi.io/v2";
const USDT_DECIMALS = 6; // USDT Jetton has 6 decimal places on TON
const TIMEOUT_MS = 15_000;

// Known USDT Jetton master addresses (mainnet)
const USDT_MASTER_NAMES = ["usdt", "usdtton", "eqcxe6mutqjkfngfarotkot1lzbdii"];

interface TonApiMsg {
  decoded_op_name?: string;
  decoded_body?: {
    amount?: string | number;
    destination?: { address?: string } | string;
    jetton?: { address?: string; name?: string; symbol?: string };
  };
}

interface TonApiTransaction {
  hash?: string;
  in_msg?: TonApiMsg;
  out_msgs?: TonApiMsg[];
}

async function fetchTonApiTx(txHash: string): Promise<TonApiTransaction | null> {
  // Primary: direct transaction hash lookup
  const url = `${TONAPI_BASE}/blockchain/transactions/${encodeURIComponent(txHash)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (resp.ok) return await resp.json() as TonApiTransaction;
    if (resp.status !== 404) throw new Error(`TONapi HTTP ${resp.status}`);
  } finally {
    clearTimeout(timer);
  }

  // Fallback: the client submits an external message BOC hash (not an internal tx hash).
  // TONapi exposes the containing transaction via /blockchain/messages/{msg_id}/transaction.
  const msgUrl = `${TONAPI_BASE}/blockchain/messages/${encodeURIComponent(txHash)}/transaction`;
  const ctrl2 = new AbortController();
  const timer2 = setTimeout(() => ctrl2.abort(), TIMEOUT_MS);
  try {
    const resp2 = await fetch(msgUrl, {
      signal: ctrl2.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer2);
    if (resp2.ok) return await resp2.json() as TonApiTransaction;
    if (resp2.status === 404) return null;
    throw new Error(`TONapi msg-lookup HTTP ${resp2.status}`);
  } finally {
    clearTimeout(timer2);
  }
}

/**
 * Normalise a TON address to its 64-char lowercase hex account-ID.
 *
 * Handles three formats:
 *   1. Raw:            "-1:<64hex>" or "0:<64hex>"  → strip prefix
 *   2. User-friendly:  "EQ…" / "UQ…" (48 base64url chars)
 *                      → base64url-decode → 36 bytes
 *                      → layout: [tag(1)] [workchain(1)] [hash(32)] [crc(2)]
 *                      → return hex(hash)
 *   3. Fallback:       extract first run of 64 hex chars
 */
function normaliseTonAddress(addr: string): string {
  if (!addr) return "";
  const s = addr.trim();

  // Format 1: raw  "-1:<64hex>" or "0:<64hex>"
  const rawMatch = /^-?[0-9]+:([0-9a-fA-F]{64})$/.exec(s);
  if (rawMatch) return rawMatch[1].toLowerCase();

  // Format 2: user-friendly base64url (exactly 48 chars like EQ… / UQ…)
  if (/^[A-Za-z0-9_-]{48}$/.test(s)) {
    try {
      const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
      // pad to multiple of 4
      const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
      const buf = Buffer.from(padded, "base64");
      // 36 bytes: 1 tag + 1 workchain + 32 hash + 2 CRC
      if (buf.length >= 34) return buf.slice(2, 34).toString("hex").toLowerCase();
    } catch { /* fall through */ }
  }

  // Format 3: extract first 64-char hex run (covers partial raw addresses)
  const hexMatch = /[0-9a-fA-F]{64}/.exec(s);
  if (hexMatch) return hexMatch[0].toLowerCase();

  return s.toLowerCase();
}

function isUsdtJetton(msg: TonApiMsg): boolean {
  const jetton = msg.decoded_body?.jetton;
  // Fail-closed: if jetton metadata is absent we cannot confirm this is USDT → manual review
  if (!jetton) return false;
  const addr = (jetton.address ?? "").toLowerCase();
  const sym  = (jetton.symbol ?? "").toLowerCase();
  const name = (jetton.name ?? "").toLowerCase();
  return sym === "usdt" || name.includes("usdt") ||
    USDT_MASTER_NAMES.some(k => addr.includes(k) || name.includes(k));
}

function extractJettonAmount(body: TonApiMsg["decoded_body"]): number {
  if (!body) return 0;
  const raw = body.amount ?? 0;
  const nano = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);
  if (!Number.isFinite(nano) || nano <= 0) return 0;
  return nano / 10 ** USDT_DECIMALS;
}

function destinationMatches(body: TonApiMsg["decoded_body"], platformAddress: string): boolean {
  // Fail-closed: missing body or missing destination → cannot confirm recipient → manual review
  if (!body) return false;
  const dest = body.destination;
  if (!dest) return false;
  const destStr = typeof dest === "string" ? dest : (dest.address ?? "");
  if (!destStr) return false;
  return normaliseTonAddress(destStr) === normaliseTonAddress(platformAddress) ||
    // partial match: last 20 hex chars (handles raw vs user-friendly format differences)
    normaliseTonAddress(destStr).endsWith(normaliseTonAddress(platformAddress).slice(-20));
}

export interface TonVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  note: string;
}

export async function verifyTonDeposit(
  txHash: string,
  platformAddress: string,
  claimedAmountUsdt: number,
): Promise<TonVerifyResult> {
  if (!platformAddress) {
    return { verified: false, note: "TON deposit address not configured — moved to manual review" };
  }

  // Accept both base64url (43-44 chars) and hex (64 chars) tx hashes
  const isBase64 = /^[A-Za-z0-9+/=_-]{43,44}$/.test(txHash);
  const isHex    = /^[0-9a-fA-F]{64}$/.test(txHash);
  if (!isBase64 && !isHex) {
    return { verified: false, note: "Invalid TON transaction hash format" };
  }

  try {
    const tx = await fetchTonApiTx(txHash);

    if (!tx) {
      return {
        verified: false,
        note: "TON transaction not found — moved to manual review. Will be credited within 30 min if valid.",
      };
    }

    // Collect all messages to scan for JettonTransfer ops
    const msgs: TonApiMsg[] = [
      ...(tx.in_msg ? [tx.in_msg] : []),
      ...(tx.out_msgs ?? []),
    ];

    for (const msg of msgs) {
      const op = (msg.decoded_op_name ?? "").toLowerCase();
      if (!op.includes("jetton")) continue;

      const body = msg.decoded_body;
      const amountUsdt = extractJettonAmount(body);

      // Check USDT Jetton (permissive if metadata missing)
      if (!isUsdtJetton(msg)) continue;

      // Check destination (permissive if missing from body)
      if (!destinationMatches(body, platformAddress)) {
        logger.info({ txHash, op, amountUsdt, platformAddress }, "TON Jetton destination mismatch");
        continue;
      }

      if (amountUsdt >= claimedAmountUsdt) {
        logger.info({ txHash, op, amountUsdt, claimed: claimedAmountUsdt }, "TON USDT deposit auto-verified");
        return {
          verified: true,
          onChainAmountUsdt: amountUsdt,
          note: `Auto-verified via TONapi: ${amountUsdt.toFixed(2)} USDT Jetton transfer confirmed on-chain`,
        };
      } else {
        return {
          verified: false,
          onChainAmountUsdt: amountUsdt,
          note: `TON Jetton transfer found (${amountUsdt.toFixed(2)} USDT) but claimed ${claimedAmountUsdt} USDT — moved to manual review`,
        };
      }
    }

    // Found the tx but no matching Jetton op — manual review
    return {
      verified: false,
      note: "TON transaction found but no USDT Jetton transfer detected — moved to manual review",
    };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, txHash }, "TONapi call failed during deposit verification");
    return {
      verified: false,
      note: msg.includes("abort") || msg.includes("timeout")
        ? "TON API timed out — deposit moved to manual review"
        : `TON API error — deposit moved to manual review`,
    };
  }
}
