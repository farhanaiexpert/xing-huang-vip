import { logger } from "./logger.js";

const BLOCKSTREAM_API = "https://blockstream.info/api/tx";
const TIMEOUT_MS = 12_000;

export interface BtcVerifyResult {
  verified: boolean;
  onChainAmountBtc?: number;
  toAddress?: string;
  note: string;
}

interface BlockstreamVout {
  scriptpubkey_address?: string;
  value: number; // satoshis
}

interface BlockstreamTx {
  txid: string;
  status: { confirmed: boolean; block_height?: number };
  vout: BlockstreamVout[];
}

/**
 * Verifies a Bitcoin deposit via Blockstream public API.
 * Checks that the tx is confirmed and that the claimed amount was sent
 * to the platform BTC address.
 */
export async function verifyBtcDeposit(
  txHash: string,
  platformAddress: string,
  claimedAmountBtc: number,
): Promise<BtcVerifyResult> {
  if (!platformAddress) {
    return { verified: false, note: "BTC deposit address not configured — deposit moved to manual review" };
  }

  if (!/^[0-9a-fA-F]{64}$/.test(txHash)) {
    return { verified: false, note: "Invalid TxHash format — Bitcoin transaction IDs are 64 hex characters" };
  }

  let tx: BlockstreamTx;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const resp = await fetch(`${BLOCKSTREAM_API}/${txHash}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);
    if (!resp.ok) {
      if (resp.status === 404) {
        return { verified: false, note: "Bitcoin transaction not found — please wait for broadcast and try again" };
      }
      return { verified: false, note: `Blockstream API error (HTTP ${resp.status}) — deposit moved to manual review` };
    }
    tx = await resp.json() as BlockstreamTx;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    logger.warn({ err, txHash }, "Blockstream API call failed");
    return {
      verified: false,
      note: isTimeout
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach Bitcoin API — deposit moved to manual review",
    };
  }

  if (!tx.status.confirmed) {
    return { verified: false, note: "Bitcoin transaction is not yet confirmed — please wait for 1+ confirmations and resubmit" };
  }

  const platformVout = tx.vout.find(v =>
    v.scriptpubkey_address?.toLowerCase() === platformAddress.toLowerCase()
  );

  if (!platformVout) {
    return { verified: false, note: `No output to platform BTC address found in this transaction` };
  }

  const onChainAmountBtc = platformVout.value / 1e8;

  // Verify the on-chain amount covers what the user claimed (1% tolerance for dust/rounding).
  // BTC has no stable USDT peg, so the deposit remains in manual review for admin to credit
  // the USDT equivalent — but the claimed BTC amount must still match on-chain.
  const tolerance = claimedAmountBtc * 0.01;
  if (onChainAmountBtc < claimedAmountBtc - tolerance) {
    return {
      verified: false,
      onChainAmountBtc,
      toAddress: platformAddress,
      note: `On-chain amount (${onChainAmountBtc.toFixed(8)} BTC) is less than claimed (${claimedAmountBtc} BTC) — moved to manual review`,
    };
  }

  return {
    verified: true,
    onChainAmountBtc,
    toAddress: platformAddress,
    note: `On-chain verified: ${onChainAmountBtc.toFixed(8)} BTC received at platform address — pending admin USDT credit conversion`,
  };
}
