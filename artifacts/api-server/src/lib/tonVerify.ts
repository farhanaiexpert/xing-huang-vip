import { logger } from "./logger.js";

const TONCENTER_API = "https://toncenter.com/api/v2";
const USDT_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";
const TIMEOUT_MS = 15_000;

export interface TonVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  note: string;
}

async function toncenterGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${TONCENTER_API}${path}${qs ? "?" + qs : ""}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as { ok: boolean; result?: T; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Toncenter error");
    return json.result as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies a TON USDT (Jetton) deposit via Toncenter public API.
 * Falls back to manual review if the API is unavailable or tx not found.
 */
export async function verifyTonDeposit(
  txHash: string,
  platformAddress: string,
  claimedAmountUsdt: number,
): Promise<TonVerifyResult> {
  if (!platformAddress) {
    return { verified: false, note: "TON deposit address not configured — deposit moved to manual review" };
  }

  // TON tx hashes are base64url-encoded 32 bytes (44 chars) or hex 64 chars
  const isBase64 = /^[A-Za-z0-9_-]{43,44}$/.test(txHash);
  const isHex = /^[0-9a-fA-F]{64}$/.test(txHash);
  if (!isBase64 && !isHex) {
    return { verified: false, note: "Invalid TON transaction hash format — deposit moved to manual review" };
  }

  try {
    const txs = await toncenterGet<Array<{
      transaction_id: { hash: string };
      in_msg?: {
        source?: string;
        destination?: string;
        value?: string;
        msg_data?: { body?: string };
      };
      out_msgs?: Array<{
        source?: string;
        destination?: string;
        value?: string;
      }>;
    }>>("/getTransactions", {
      address: platformAddress,
      limit: "20",
      archival: "true",
    });

    // Look for a transaction that matches our hash
    const matchTx = txs.find(t => {
      const hash = t.transaction_id.hash;
      return hash === txHash || hash === txHash.replace(/-/g, "+").replace(/_/g, "/");
    });

    if (!matchTx) {
      // Can't find the specific tx - move to manual review
      return {
        verified: false,
        note: "TON transaction not found in recent platform transactions — deposit moved to manual review. It will be credited within 30 minutes if valid.",
      };
    }

    // For USDT Jetton transfers, value in in_msg won't reflect USDT amount directly
    // This is a best-effort check; Jetton parsing requires additional contract calls
    // We accept the tx for manual review rather than auto-verify to be safe
    return {
      verified: false,
      note: "TON USDT deposit received — pending manual review (USDT Jetton verification requires contract parsing). Will be credited within 30 minutes.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, txHash }, "Toncenter API call failed");
    return {
      verified: false,
      note: msg.includes("abort") || msg.includes("timeout")
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach TON API — deposit moved to manual review",
    };
  }
}
