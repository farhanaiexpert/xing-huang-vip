import { logger } from "./logger.js";

// TRC-20 USDT contract address on Tron mainnet
const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
// USDT has 6 decimal places on TRC-20
const USDT_DECIMALS = 1_000_000;
// Tronscan public API — no API key required
const TRONSCAN_API = "https://apilist.tronscanapi.com/api/transaction-info";
// Abort after 10 s to avoid hanging the deposit endpoint
const TIMEOUT_MS = 10_000;

export interface TronVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  fromAddress?: string;
  confirmed?: boolean;
  note: string;
}

interface TronTrc20Transfer {
  from_address: string;
  to_address: string;
  amount: string;       // base units (no decimals)
  contract_address: string;
}

interface TronscanTxResponse {
  contractRet?: string;
  confirmed?: boolean;
  trc20TransferInfo?: TronTrc20Transfer[];
}

/**
 * Verifies a TRC-20 USDT deposit on the Tron blockchain via Tronscan API.
 *
 * Checks:
 *  1. Transaction exists and was successful on-chain
 *  2. Transaction is confirmed (at least 1 block confirmation)
 *  3. The USDT was sent to our platform wallet address
 *  4. The on-chain USDT amount >= the claimed deposit amount
 *
 * @param txHash         - The transaction hash submitted by the user
 * @param platformAddress - Our USDT deposit wallet address (TRC-20)
 * @param claimedAmountUsdt - The amount the user claims to have sent (in USDT)
 */
export async function verifyTronDeposit(
  txHash: string,
  platformAddress: string,
  claimedAmountUsdt: number
): Promise<TronVerifyResult> {
  // Basic sanity check on txHash format (Tron hashes are 64 hex chars)
  if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
    return { verified: false, note: "Invalid TxHash format — Tron transaction hashes are 64 hex characters" };
  }

  let raw: TronscanTxResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const resp = await fetch(`${TRONSCAN_API}?hash=${txHash}`, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timer);

    if (!resp.ok) {
      logger.warn({ status: resp.status, txHash }, "Tronscan API returned non-OK status");
      return { verified: false, note: `Tronscan API error (HTTP ${resp.status}) — deposit moved to manual review` };
    }

    raw = await resp.json() as TronscanTxResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    logger.warn({ err, txHash }, "Tronscan API call failed");
    return {
      verified: false,
      note: isTimeout
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach blockchain API — deposit moved to manual review",
    };
  }

  // ── Check 1: transaction successful ─────────────────────────────────────────
  if (!raw.contractRet || raw.contractRet !== "SUCCESS") {
    return {
      verified: false,
      note: `On-chain transaction status is "${raw.contractRet ?? "unknown"}" (not SUCCESS)`,
    };
  }

  // ── Check 2: confirmed on chain ──────────────────────────────────────────────
  if (!raw.confirmed) {
    return {
      verified: false,
      note: "Transaction is not yet confirmed on the Tron network — please wait and re-submit",
    };
  }

  // ── Check 3: find the USDT TRC-20 transfer ────────────────────────────────────
  const transfers = raw.trc20TransferInfo ?? [];
  const usdtTransfer = transfers.find(
    t => t.contract_address?.toLowerCase() === USDT_CONTRACT.toLowerCase()
  );

  if (!usdtTransfer) {
    return {
      verified: false,
      note: "No USDT (TRC-20) transfer found in this transaction — only USDT deposits are accepted",
    };
  }

  const onChainAmountUsdt = parseInt(usdtTransfer.amount, 10) / USDT_DECIMALS;
  const toAddress = usdtTransfer.to_address;
  const fromAddress = usdtTransfer.from_address;

  // ── Check 4: sent to our platform wallet ─────────────────────────────────────
  if (toAddress?.toLowerCase() !== platformAddress.toLowerCase()) {
    return {
      verified: false,
      onChainAmountUsdt,
      toAddress,
      fromAddress,
      note: `USDT was sent to a different address (${toAddress}) — expected ${platformAddress}`,
    };
  }

  // ── Check 5: amount matches (allow up to 0.01 USDT rounding tolerance) ───────
  const tolerance = 0.01;
  if (onChainAmountUsdt < claimedAmountUsdt - tolerance) {
    return {
      verified: false,
      onChainAmountUsdt,
      toAddress,
      fromAddress,
      confirmed: true,
      note: `On-chain amount ($${onChainAmountUsdt.toFixed(6)} USDT) is less than claimed ($${claimedAmountUsdt} USDT)`,
    };
  }

  // ── All checks passed ─────────────────────────────────────────────────────────
  return {
    verified: true,
    onChainAmountUsdt,
    toAddress,
    fromAddress,
    confirmed: true,
    note: `Auto-verified via Tronscan: $${onChainAmountUsdt.toFixed(2)} USDT received`,
  };
}
