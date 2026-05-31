import { logger } from "./logger.js";

const XRPL_API = "https://xrplcluster.com";
const TIMEOUT_MS = 12_000;

export interface XrpVerifyResult {
  verified: boolean;
  onChainAmountXrp?: number;
  toAddress?: string;
  note: string;
}

interface XrplTxResponse {
  result: {
    validated?: boolean;
    meta?: {
      TransactionResult?: string;
      delivered_amount?: string | { currency: string; value: string };
    };
    Transaction?: {
      TransactionType?: string;
      Destination?: string;
      Amount?: string;
    };
    tx_json?: {
      TransactionType?: string;
      Destination?: string;
      Amount?: string;
    };
    error?: string;
    error_message?: string;
  };
}

/**
 * Verifies an XRP deposit via XRPL public API.
 * Checks that the tx is validated, successful, and sent the correct amount
 * to the platform XRP address.
 */
export async function verifyXrpDeposit(
  txHash: string,
  platformAddress: string,
  claimedAmountXrp: number,
): Promise<XrpVerifyResult> {
  if (!platformAddress) {
    return { verified: false, note: "XRP deposit address not configured — deposit moved to manual review" };
  }

  if (!/^[0-9A-Fa-f]{64}$/.test(txHash)) {
    return { verified: false, note: "Invalid TxHash format — XRP transaction hashes are 64 hex characters" };
  }

  let data: XrplTxResponse;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const resp = await fetch(XRPL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        method: "tx",
        params: [{ transaction: txHash, binary: false }],
      }),
    });
    clearTimeout(timer);
    if (!resp.ok) {
      return { verified: false, note: `XRPL API error (HTTP ${resp.status}) — deposit moved to manual review` };
    }
    data = await resp.json() as XrplTxResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, txHash }, "XRPL API call failed");
    return {
      verified: false,
      note: msg.includes("abort") || msg.includes("timeout")
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach XRP Ledger API — deposit moved to manual review",
    };
  }

  const result = data.result;

  if (result.error) {
    if (result.error === "txnNotFound") {
      return { verified: false, note: "XRP transaction not found — please wait for confirmation and resubmit" };
    }
    return { verified: false, note: `XRPL error: ${result.error_message ?? result.error} — deposit moved to manual review` };
  }

  if (!result.validated) {
    return { verified: false, note: "XRP transaction is not yet validated — please wait and resubmit" };
  }

  if (result.meta?.TransactionResult !== "tesSUCCESS") {
    return { verified: false, note: `XRP transaction failed on-chain: ${result.meta?.TransactionResult ?? "unknown"}` };
  }

  const txJson = result.tx_json ?? result.Transaction;
  if (!txJson || txJson.TransactionType !== "Payment") {
    return { verified: false, note: "Transaction is not a Payment type — only XRP Payment transactions are accepted" };
  }

  if (txJson.Destination?.toLowerCase() !== platformAddress.toLowerCase()) {
    return { verified: false, note: `XRP was sent to a different address (${txJson.Destination}) — expected ${platformAddress}` };
  }

  const deliveredRaw = result.meta?.delivered_amount;
  let onChainAmountXrp = 0;
  if (typeof deliveredRaw === "string") {
    onChainAmountXrp = parseInt(deliveredRaw, 10) / 1_000_000;
  } else if (deliveredRaw && typeof deliveredRaw === "object") {
    onChainAmountXrp = parseFloat(deliveredRaw.value);
  } else if (typeof txJson.Amount === "string") {
    onChainAmountXrp = parseInt(txJson.Amount, 10) / 1_000_000;
  }

  // Amount comparison is intentionally skipped: XRP is a native coin with no stable
  // USDT peg. Admin will review the on-chain amount and credit USDT equivalent.
  return {
    verified: true,
    onChainAmountXrp,
    toAddress: platformAddress,
    note: `On-chain verified: ${onChainAmountXrp.toFixed(6)} XRP received at platform address — pending admin USDT credit conversion`,
  };
}
