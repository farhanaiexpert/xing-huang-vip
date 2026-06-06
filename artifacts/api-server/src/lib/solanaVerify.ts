import { logger } from "./logger.js";

/**
 * Verifies a Solana USDT (SPL) deposit.
 *
 * Uses `getTransaction` with `jsonParsed` encoding on the public Solana RPC.
 * The `postTokenBalances` / `preTokenBalances` delta tells us exactly how many
 * USDT tokens the platform address received, without needing to parse instruction data.
 *
 * Reliability: falls back through a list of public RPC endpoints, with one
 * retry per endpoint on HTTP 429 (rate-limit) after a brief pause.
 */

const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const TIMEOUT_MS = 15_000;

// RPC endpoints tried in order. The first available response wins.
// Alchemy (when ALCHEMY_API_KEY is set) is preferred for reliability, then
// falls back through public endpoints.
const SOLANA_RPCS = [
  ...(process.env.ALCHEMY_API_KEY
    ? [`https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`]
    : []),
  "https://api.mainnet-beta.solana.com",
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
];

// Log only the RPC host, never the full URL — Alchemy URLs embed the API key.
function redactRpc(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown-rpc";
  }
}

export interface SolanaVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  note: string;
}

async function rpcPost(
  endpoint: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    clearTimeout(timer);
    if (resp.status === 429) {
      // signal rate-limit to the caller so it can retry or fall back
      throw Object.assign(new Error("rate-limited"), { status: 429 });
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json() as { result?: unknown; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result;
  } finally {
    clearTimeout(timer);
  }
}

/** Try every RPC in sequence; on 429 wait 600 ms and retry once before moving on. */
async function getTransactionWithFallback(signature: string): Promise<unknown> {
  const params = [
    signature,
    { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
  ];

  for (const endpoint of SOLANA_RPCS) {
    try {
      return await rpcPost(endpoint, "getTransaction", params);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        // one retry after short pause
        await new Promise(r => setTimeout(r, 600));
        try {
          return await rpcPost(endpoint, "getTransaction", params);
        } catch { /* fall through to next endpoint */ }
      }
      // network / timeout / non-429 — fall through to next endpoint
      logger.debug({ rpc: redactRpc(endpoint), err }, "Solana RPC endpoint failed, trying next");
    }
  }

  throw new Error("All Solana RPC endpoints failed");
}

/**
 * Verifies a Solana USDT (SPL) deposit via the public Solana RPC.
 * Checks that the transaction is finalised and that USDT was transferred
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

  // Solana signatures: 64 bytes base58 → 87–88 base58 chars
  if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature)) {
    return { verified: false, note: "Invalid Solana signature format — Solana signatures are 87–88 base58 characters" };
  }

  let txResult: unknown;
  try {
    txResult = await getTransactionWithFallback(signature);
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
    return { verified: false, note: "Solana transaction not found or not yet finalised — please wait a minute and resubmit" };
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
  const preBalances  = tx.meta?.preTokenBalances  ?? [];

  // Find the platform's USDT token account entry in the balance snapshots.
  // `owner` = the wallet that owns the token account (i.e. the platform pubkey).
  const platformPost = postBalances.find(b => b.mint === USDT_MINT && b.owner === platformAddress);
  const platformPre  = preBalances.find(b  => b.mint === USDT_MINT && b.owner === platformAddress);

  if (!platformPost) {
    return { verified: false, note: "No USDT (SPL) received by platform address in this Solana transaction" };
  }

  const postAmount = platformPost.uiTokenAmount.uiAmount ?? 0;
  const preAmount  = platformPre?.uiTokenAmount.uiAmount ?? 0;
  const onChainAmountUsdt = postAmount - preAmount;

  if (onChainAmountUsdt <= 0) {
    return { verified: false, note: "Platform address USDT balance did not increase in this transaction" };
  }

  const tolerance = 0.01;
  if (onChainAmountUsdt < claimedAmountUsdt - tolerance) {
    return {
      verified: false,
      onChainAmountUsdt,
      note: `On-chain amount (${onChainAmountUsdt.toFixed(6)} USDT) is less than claimed (${claimedAmountUsdt} USDT)`,
    };
  }

  return {
    verified: true,
    onChainAmountUsdt,
    toAddress: platformAddress,
    note: `Auto-verified on Solana: ${onChainAmountUsdt.toFixed(2)} USDT received`,
  };
}
