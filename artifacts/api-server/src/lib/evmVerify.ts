import { logger } from "./logger.js";

// ERC-20 Transfer(address,address,uint256) event signature
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TIMEOUT_MS = 12_000;

interface EvmNetworkConfig {
  contract: string;
  decimals: number;
  rpcUrls: string[];
  label: string;
}

function alchemyOrFallback(alchemySlug: string, fallback: string): string[] {
  const key = process.env.ALCHEMY_API_KEY;
  const urls = key ? [`https://${alchemySlug}.g.alchemy.com/v2/${key}`, fallback] : [fallback];
  return urls;
}

const NETWORK_CONFIG: Record<string, EvmNetworkConfig> = {
  ETH: {
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    rpcUrls: alchemyOrFallback("eth-mainnet", "https://eth.drpc.org"),
    label: "Ethereum",
  },
  BSC: {
    contract: "0x55d398326f99059fF775485246999027B3197955",
    decimals: 18,
    rpcUrls: ["https://bsc-dataseed.binance.org/", "https://bsc.drpc.org"],
    label: "BNB Smart Chain",
  },
  POLYGON: {
    contract: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    decimals: 6,
    rpcUrls: alchemyOrFallback("polygon-mainnet", "https://polygon.drpc.org"),
    label: "Polygon",
  },
  ARBITRUM: {
    contract: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    decimals: 6,
    rpcUrls: alchemyOrFallback("arb-mainnet", "https://arb1.arbitrum.io/rpc"),
    label: "Arbitrum One",
  },
  OPTIMISM: {
    contract: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    decimals: 6,
    rpcUrls: alchemyOrFallback("opt-mainnet", "https://mainnet.optimism.io"),
    label: "Optimism",
  },
  BASE: {
    contract: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    decimals: 6,
    rpcUrls: alchemyOrFallback("base-mainnet", "https://mainnet.base.org"),
    label: "Base",
  },
  LINEA: {
    contract: "0xA219439258ca9da29E9Cc4cE5596924745e12B93",
    decimals: 6,
    rpcUrls: alchemyOrFallback("linea-mainnet", "https://rpc.linea.build"),
    label: "Linea",
  },
};

export interface EvmVerifyResult {
  verified: boolean;
  onChainAmountUsdt?: number;
  toAddress?: string;
  fromAddress?: string;
  note: string;
}

interface EthLog {
  address: string;
  topics: string[];
  data: string;
}

interface EthReceipt {
  status: string;
  blockNumber: string; // hex
  from: string;
  logs: EthLog[];
}

const MIN_CONFIRMATIONS: Record<string, number> = {
  ETH:      3,
  BSC:      2,
  POLYGON:  2,
  ARBITRUM: 1,
  OPTIMISM: 1,
  BASE:     1,
  LINEA:    1,
};

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
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

function addressToTopic(addr: string): string {
  return "0x000000000000000000000000" + addr.replace(/^0x/, "").toLowerCase();
}

/**
 * Verifies an ERC-20 USDT deposit on ETH, BNB Smart Chain, or Polygon.
 * Uses JSON-RPC eth_getTransactionReceipt and inspects Transfer event logs.
 */
export async function verifyEvmDeposit(
  txHash: string,
  network: string,
  platformAddress: string,
  claimedAmountUsdt: number,
): Promise<EvmVerifyResult> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { verified: false, note: "Invalid TxHash format — EVM hashes are 0x + 64 hex characters" };
  }

  const cfg = NETWORK_CONFIG[network.toUpperCase()];
  if (!cfg) {
    return { verified: false, note: `Unsupported EVM network: ${network} — deposit moved to manual review` };
  }

  let receipt: EthReceipt | null = null;
  let lastErr = "";

  for (const rpcUrl of cfg.rpcUrls) {
    try {
      receipt = await rpcCall(rpcUrl, "eth_getTransactionReceipt", [txHash]) as EthReceipt | null;
      if (receipt !== null) break;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      logger.warn({ err, txHash, network, rpcUrl }, "EVM RPC call failed, trying next");
    }
  }

  if (receipt === null && lastErr) {
    const isTimeout = lastErr.includes("abort") || lastErr.includes("timeout");
    return {
      verified: false,
      note: isTimeout
        ? "Blockchain lookup timed out — deposit moved to manual review"
        : "Could not reach blockchain API — deposit moved to manual review",
    };
  }

  if (!receipt) {
    return { verified: false, note: "Transaction not found or not yet confirmed — please wait a moment and resubmit" };
  }

  if (receipt.status !== "0x1") {
    return { verified: false, note: "Transaction failed on-chain (reverted) — no funds were transferred" };
  }

  // ── Confirmation depth check ──────────────────────────────────────────────
  const minConfs = MIN_CONFIRMATIONS[network.toUpperCase()] ?? 6;
  let latestBlock = 0n;
  for (const rpcUrl of cfg.rpcUrls) {
    try {
      const raw = await rpcCall(rpcUrl, "eth_blockNumber", []) as string;
      latestBlock = BigInt(raw);
      break;
    } catch {
      // try next RPC
    }
  }
  const txBlock = BigInt(receipt.blockNumber);
  const confirmations = latestBlock > txBlock ? Number(latestBlock - txBlock) : 0;
  if (confirmations < minConfs) {
    return {
      verified: false,
      note: `Transaction has ${confirmations}/${minConfs} confirmations — deposit moved to manual review. It will be credited shortly.`,
    };
  }

  const paddedPlatform = addressToTopic(platformAddress);
  const transferLog = receipt.logs.find(log =>
    log.address?.toLowerCase() === cfg.contract.toLowerCase() &&
    log.topics[0]?.toLowerCase() === TRANSFER_TOPIC &&
    log.topics[2]?.toLowerCase() === paddedPlatform,
  );

  if (!transferLog) {
    return {
      verified: false,
      note: `No USDT transfer to platform address found in this transaction on ${cfg.label}`,
    };
  }

  // Amount: convert from base units (BigInt) to USDT float
  const rawAmount = BigInt(transferLog.data);
  const scale = BigInt(10 ** cfg.decimals);
  // multiply by 1e6 then divide by scale to preserve 6 decimal places in the result
  const onChainAmountUsdt = Number(rawAmount * 1_000_000n / scale) / 1_000_000;

  const fromAddress = "0x" + (transferLog.topics[1] ?? "").slice(-40);
  const toAddress = platformAddress;

  const tolerance = 0.01;
  if (onChainAmountUsdt < claimedAmountUsdt - tolerance) {
    return {
      verified: false,
      onChainAmountUsdt,
      toAddress,
      fromAddress,
      note: `On-chain amount ($${onChainAmountUsdt.toFixed(6)} USDT) is less than claimed ($${claimedAmountUsdt} USDT)`,
    };
  }

  return {
    verified: true,
    onChainAmountUsdt,
    toAddress,
    fromAddress,
    note: `Auto-verified on ${cfg.label}: $${onChainAmountUsdt.toFixed(2)} USDT received`,
  };
}
