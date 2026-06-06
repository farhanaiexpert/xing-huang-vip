import { useState, useEffect } from 'react';
import { useChainId, useWalletClient, usePublicClient } from 'wagmi';
import { useWallet } from './useWallet';
import { useToast } from './use-toast';
import { api } from '../lib/apiClient';

/** Env-var fallbacks — only used when callers don't pass platformAddresses */
const ERC20_ADDRESS_ENV = (import.meta.env.VITE_PLATFORM_ERC20_ADDRESS as string) || '';
const TRC20_ADDRESS_ENV = (import.meta.env.VITE_PLATFORM_TRC20_ADDRESS as string) || '';
export const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export const USDT_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const;

export const EVM_CHAINS: Record<number, {
  address: `0x${string}`;
  decimals: number;
  network: string;
  label: string;
  color: string;
  /** Must match backend MIN_CONFIRMATIONS in evmVerify.ts */
  minConfirmations: number;
  /** Native gas token symbol (ETH / BNB / MATIC) */
  nativeToken: string;
  /** Block explorer tx base URL (append txHash) */
  explorerTx: string;
}> = {
  1:     { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  network: 'ETH',      label: 'Ethereum (ERC-20)',  color: '#627EEA', minConfirmations: 3, nativeToken: 'ETH',   explorerTx: 'https://etherscan.io/tx/' },
  56:    { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, network: 'BSC',      label: 'BSC (BEP-20)',       color: '#F0B90B', minConfirmations: 2, nativeToken: 'BNB',   explorerTx: 'https://bscscan.com/tx/' },
  137:   { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  network: 'POLYGON',  label: 'Polygon (MATIC)',    color: '#8247E5', minConfirmations: 2, nativeToken: 'MATIC', explorerTx: 'https://polygonscan.com/tx/' },
  42161: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  network: 'ARBITRUM', label: 'Arbitrum One',       color: '#28A0F0', minConfirmations: 1, nativeToken: 'ETH',   explorerTx: 'https://arbiscan.io/tx/' },
  10:    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6,  network: 'OPTIMISM', label: 'Optimism',           color: '#FF0420', minConfirmations: 1, nativeToken: 'ETH',   explorerTx: 'https://optimistic.etherscan.io/tx/' },
  8453:  { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6,  network: 'BASE',     label: 'Base',               color: '#0052FF', minConfirmations: 1, nativeToken: 'ETH',   explorerTx: 'https://basescan.org/tx/' },
};

/** Convert human USDT amount to BigInt base units, avoiding float precision loss */
export function toBaseUnits(amount: number, decimals: number): bigint {
  const fixed = amount.toFixed(decimals);
  const [whole, frac = ''] = fixed.split('.');
  return BigInt(whole + frac.padEnd(decimals, '0').slice(0, decimals));
}

export type DepositPhase = 'idle' | 'sending' | 'confirming' | 'submitting' | 'success' | 'error';
export interface DepositResult {
  autoVerified: boolean;
  txHash: string;
  /** Full block-explorer URL for the transaction (undefined for unsupported chains) */
  explorerUrl?: string;
}

/** Platform deposit addresses sourced from GET /wallet/deposit-info */
export interface PlatformAddresses {
  /** ERC-20 / non-BSC EVM destination (Ethereum, Polygon, Arbitrum, Optimism, Base) */
  addressErc20?: string;
  /** BEP-20 destination (BSC chain). Falls back to addressErc20 if absent. */
  addressBsc?: string;
  /** TRC-20 destination (TronLink) */
  addressTrc20?: string;
}

interface UseAutoDepositOptions {
  onSuccess?: (result: DepositResult) => void;
  /** API-sourced platform addresses. Falls back to VITE_PLATFORM_* env vars if omitted. */
  platformAddresses?: PlatformAddresses;
}

function encodeTransfer(to: string, amount: bigint): string {
  const toHex = to.toLowerCase().replace('0x', '').padStart(64, '0');
  const amtHex = amount.toString(16).padStart(64, '0');
  return '0xa9059cbb' + toHex + amtHex;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function waitForConfirmationsPublic(client: any, txHash: `0x${string}`, minConfirmations: number): Promise<void> {
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      if (!receipt?.blockNumber) continue;
      const currentBlock = await client.getBlockNumber();
      const confirmations = Number(currentBlock) - Number(receipt.blockNumber) + 1;
      if (confirmations >= minConfirmations) return;
    } catch { /* keep polling */ }
  }
  // Timed out — caller will submit to backend anyway; backend verifies independently
  throw new Error('timeout');
}

export function useAutoDeposit(options?: UseAutoDepositOptions) {
  const { refreshBalance } = useWallet();
  const { toast } = useToast();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [depositAmount, setDepositAmount] = useState('50');
  const [depositPhase, setDepositPhase] = useState<DepositPhase>('idle');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null);
  const [hasTronLink, setHasTronLink] = useState(false);
  const [hasPhantom,  setHasPhantom]  = useState(false);
  const [hasTon,      setHasTon]      = useState(false);

  useEffect(() => {
    function detectExtensions() {
      // TronLink: check for presence of window.tronWeb (not connected state).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHasTronLink(!!(window as any).tronWeb);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHasPhantom(!!(( window as any).solana?.isPhantom));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHasTon(!!(( window as any).ton?.send));
    }
    detectExtensions();
    // Re-check after 300 ms — some extensions inject asynchronously after page load.
    const timer = setTimeout(detectExtensions, 300);
    return () => clearTimeout(timer);
  }, []);

  const chainCfg = EVM_CHAINS[chainId] ?? null;
  const isProcessing = depositPhase === 'sending' || depositPhase === 'confirming' || depositPhase === 'submitting';

  async function submitToBackend(txHash: string, amount: number, network: string) {
    setDepositPhase('submitting');
    try {
      const result = await api.post<{ autoVerified: boolean }>('/wallet/deposit', { txHash, amount, network });
      const dr: DepositResult = { autoVerified: result.autoVerified, txHash };
      setDepositResult(dr);
      setDepositPhase('success');
      await refreshBalance();
      toast({
        title: result.autoVerified ? '✅ Deposit verified!' : '⏳ Deposit submitted',
        description: result.autoVerified
          ? `$${amount} USDT has been credited to your account.`
          : `$${amount} USDT is under review and will be credited shortly.`,
      });
      options?.onSuccess?.(dr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deposit submission failed. Please contact support.';
      setDepositError(msg);
      setDepositPhase('error');
    }
  }

  async function handleEvmDeposit() {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) { setDepositError('Minimum deposit is 10 USDT'); return; }
    if (!chainCfg) {
      setDepositError('Your wallet is on an unsupported network. Switch to Ethereum, BSC, Polygon, Arbitrum, Optimism, or Base to deposit USDT.');
      return;
    }

    // Resolve platform destination address: BSC uses its own receiving address; all
    // other EVM chains use the ERC-20 address. API-sourced addresses take precedence
    // over VITE_PLATFORM_* env-var fallbacks.
    const addrErc20 = options?.platformAddresses?.addressErc20 || ERC20_ADDRESS_ENV;
    const addrBsc   = options?.platformAddresses?.addressBsc   || addrErc20; // fallback to ERC-20 addr
    const platformAddr = chainCfg.network === 'BSC' ? addrBsc : addrErc20;

    if (!platformAddr || !/^0x[0-9a-fA-F]{40}$/.test(platformAddr)) {
      setDepositError('Web3 wallet deposit is temporarily unavailable. Please use NOWPayments or Manual Deposit instead.');
      setDepositPhase('error');
      return;
    }
    if (!walletClient) {
      setDepositError('No EVM wallet connected. Please connect your wallet first.');
      return;
    }

    setDepositPhase('sending');
    setDepositError(null);
    let txHash: `0x${string}` | null = null;
    try {
      const rawAmount = toBaseUnits(amount, chainCfg.decimals);
      const data = encodeTransfer(platformAddr, rawAmount) as `0x${string}`;
      txHash = await walletClient.sendTransaction({
        to: chainCfg.address,
        data,
      });

      // Persist immediately — survives page refresh so the hash is never lost
      localStorage.setItem('cb_pending_evm_tx', JSON.stringify({
        txHash, amount, network: chainCfg.network, ts: Date.now(),
      }));

      setDepositPhase('confirming');

      // Wait for confirmations; if this times out we still submit to backend
      // (backend re-verifies on-chain independently — hash is never lost).
      if (publicClient) {
        try {
          await waitForConfirmationsPublic(publicClient, txHash, chainCfg.minConfirmations);
        } catch { /* timeout — fall through and submit anyway */ }
      }

      const result = await (async () => {
        setDepositPhase('submitting');
        const r = await api.post<{ autoVerified: boolean }>('/wallet/deposit', { txHash, amount, network: chainCfg.network });
        return r;
      })();

      const dr: DepositResult = {
        autoVerified: result.autoVerified,
        txHash,
        explorerUrl: `${chainCfg.explorerTx}${txHash}`,
      };
      setDepositResult(dr);
      setDepositPhase('success');
      localStorage.removeItem('cb_pending_evm_tx');
      await refreshBalance();
      toast({
        title: result.autoVerified ? '✅ Deposit verified!' : '⏳ Deposit submitted',
        description: result.autoVerified
          ? `$${amount} USDT has been credited to your account.`
          : `$${amount} USDT is under review and will be credited shortly.`,
      });
      options?.onSuccess?.(dr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected')) {
        localStorage.removeItem('cb_pending_evm_tx');
        setDepositError('Transaction was rejected in your wallet.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        localStorage.removeItem('cb_pending_evm_tx');
        setDepositError('Insufficient USDT balance in your wallet for this amount.');
      } else if (txHash) {
        setDepositError(`Deposit submission failed — your funds are safe. Use Manual Deposit and paste this hash:\n${txHash}`);
      } else {
        setDepositError(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
      setDepositPhase('error');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function waitForTronConfirmation(tronWeb: any, txHash: string): Promise<void> {
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const info = await tronWeb.trx.getTransactionInfo(txHash);
        if (info?.blockNumber) return;
      } catch { /* keep polling */ }
    }
    throw new Error('timeout');
  }

  async function handleTronDeposit() {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) { setDepositError('Minimum deposit is 10 USDT'); return; }

    const trc20Addr = options?.platformAddresses?.addressTrc20 || TRC20_ADDRESS_ENV;
    if (!trc20Addr) {
      setDepositError('Web3 wallet deposit is temporarily unavailable. Please use NOWPayments or Manual Deposit instead.');
      setDepositPhase('error');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronWeb = (window as any).tronWeb;
    if (!tronWeb?.defaultAddress?.base58) {
      setDepositError('TronLink is not connected. Please unlock TronLink and try again.');
      return;
    }
    setDepositPhase('sending');
    setDepositError(null);
    let txHash: string | null = null;
    try {
      const contract = await tronWeb.contract().at(TRON_USDT_CONTRACT);
      const rawAmount = Number(toBaseUnits(amount, 6));
      txHash = (await contract.transfer(trc20Addr, rawAmount).send({ feeLimit: 10_000_000, callValue: 0 })) as string;

      // Persist immediately — survives page refresh
      localStorage.setItem('cb_pending_tron_tx', JSON.stringify({
        txHash, amount, ts: Date.now(),
      }));

      setDepositPhase('confirming');

      // Wait for confirmation; submit to backend regardless of timeout
      try {
        await waitForTronConfirmation(tronWeb, txHash);
      } catch { /* timeout — fall through and submit anyway */ }

      setDepositPhase('submitting');
      const result = await api.post<{ autoVerified: boolean }>('/wallet/deposit', { txHash, amount, network: 'TRC-20' });
      const dr: DepositResult = {
        autoVerified: result.autoVerified,
        txHash,
        explorerUrl: `https://tronscan.org/#/transaction/${txHash}`,
      };
      setDepositResult(dr);
      setDepositPhase('success');
      localStorage.removeItem('cb_pending_tron_tx');
      await refreshBalance();
      toast({
        title: result.autoVerified ? '✅ Deposit verified!' : '⏳ Deposit submitted',
        description: result.autoVerified
          ? `$${amount} USDT has been credited to your account.`
          : `$${amount} USDT is under review and will be credited shortly.`,
      });
      options?.onSuccess?.(dr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('reject')) {
        localStorage.removeItem('cb_pending_tron_tx');
        setDepositError('Transaction was cancelled in TronLink.');
      } else if (txHash) {
        setDepositError(`Deposit submission failed — your funds are safe. Use Manual Deposit and paste this hash:\n${txHash}`);
      } else {
        setDepositError(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
      setDepositPhase('error');
    }
  }

  function resetDeposit() {
    setDepositPhase('idle');
    setDepositError(null);
    setDepositResult(null);
  }

  function clearError() {
    setDepositError(null);
    if (depositPhase === 'error') setDepositPhase('idle');
  }

  return {
    depositAmount, setDepositAmount,
    depositPhase, depositError, depositResult,
    isProcessing, hasTronLink, hasPhantom, hasTon, chainCfg,
    handleEvmDeposit, handleTronDeposit,
    resetDeposit, clearError,
  };
}
