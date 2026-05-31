import { logger } from "./logger.js";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TIMEOUT_MS = 15_000;

export interface SolanaVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  note: string;
}

async function rpcPost(method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as { result?: unknown; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies a Solana USDT (SPL) deposit via the public Solana RPC.
 * Checks that the transaction is finalized and that USDT was transferred
 * to the platform Solana address.
 */
export async function verifySolanaDeposit(
  signature: string,
  platformAddress: string,
  claimedAmountUsdt: number,
): Promise<SolanaVerifyResult> {
  if (!platformAddress) {
    return { verified: false, note: "Solana deposit address not configured — deposit moved to manual review" };
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature)) {
    return { verified: false, note: "Invalid Solana signature format — Solana signatures are 87-88 base58 characters" };
  }

  let txResult: unknown;
  try {
    txResult = await rpcPost("getTransaction", [
      signature,
      { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, signature }, "Solana RPC call failed");
    return {
      verified: false,
      note: msg.includes("abort") || msg.includes("timeout")
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach Solana RPC — deposit moved to manual review",
    };
  }

  if (!txResult) {
    return { verified: false, note: "Solana transaction not found or not yet finalized — please wait and resubmit" };
  }

  const tx = txResult as {
    meta?: {
      err?: unknown;
      postTokenBalances?: Array<{ mint: string; owner: string; uiTokenAmount: { uiAmount: number | null } }>;
      preTokenBalances?: Array<{ mint: string; owner: string; uiTokenAmount: { uiAmount: number | null } }>;
    };
  };

  if (tx.meta?.err) {
    return { verified: false, note: "Solana transaction failed on-chain" };
  }

  const postBalances = tx.meta?.postTokenBalances ?? [];
  const preBalances = tx.meta?.preTokenBalances ?? [];

  const platformPost = postBalances.find(b =>
    b.mint === USDT_MINT && b.owner === platformAddress
  );
  const platformPre = preBalances.find(b =>
    b.mint === USDT_MINT && b.owner === platformAddress
  );

  if (!platformPost) {
    return { verified: false, note: `No USDT (SPL) received by platform address in this Solana transaction` };
  }

  const postAmount = platformPost.uiTokenAmount.uiAmount ?? 0;
  const preAmount = platformPre?.uiTokenAmount.uiAmount ?? 0;
  const onChainAmountUsdt = postAmount - preAmount;

  if (onChainAmountUsdt <= 0) {
    return { verified: false, note: "Platform address USDT balance did not increase in this transaction" };
  }

  const tolerance = 0.01;
  if (onChainAmountUsdt < claimedAmountUsdt - tolerance) {
    return {
      verified: false,
      onChainAmountUsdt,
      note: `On-chain amount ($${onChainAmountUsdt.toFixed(6)} USDT) is less than claimed ($${claimedAmountUsdt} USDT)`,
    };
  }

  return {
    verified: true,
    onChainAmountUsdt,
    toAddress: platformAddress,
    note: `Auto-verified on Solana: $${onChainAmountUsdt.toFixed(2)} USDT received`,
  };
}
