import { useState, useEffect } from 'react';
import { useWallet } from './useWallet';
import { useToast } from './use-toast';
import { api } from '../lib/apiClient';

const ERC20_ADDRESS = (import.meta.env.VITE_PLATFORM_ERC20_ADDRESS as string) || '';
const TRC20_ADDRESS = (import.meta.env.VITE_PLATFORM_TRC20_ADDRESS as string) || '';
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
}> = {
  1:     { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  network: 'ETH',      label: 'Ethereum (ERC-20)',  color: '#627EEA', minConfirmations: 6 },
  56:    { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, network: 'BSC',      label: 'BSC (BEP-20)',       color: '#F0B90B', minConfirmations: 3 },
  137:   { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  network: 'POLYGON',  label: 'Polygon (MATIC)',    color: '#8247E5', minConfirmations: 3 },
  42161: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6,  network: 'ARBITRUM', label: 'Arbitrum One',       color: '#28A0F0', minConfirmations: 1 },
  10:    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6,  network: 'OPTIMISM', label: 'Optimism',           color: '#FF0420', minConfirmations: 1 },
  8453:  { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6,  network: 'BASE',     label: 'Base',               color: '#0052FF', minConfirmations: 1 },
};

/** Convert human USDT amount to BigInt base units, avoiding float precision loss */
export function toBaseUnits(amount: number, decimals: number): bigint {
  const fixed = amount.toFixed(decimals);
  const [whole, frac = ''] = fixed.split('.');
  return BigInt(whole + frac.padEnd(decimals, '0').slice(0, decimals));
}

export type DepositPhase = 'idle' | 'sending' | 'confirming' | 'submitting' | 'success' | 'error';
export interface DepositResult { autoVerified: boolean; txHash: string }

interface UseAutoDepositOptions {
  onSuccess?: (result: DepositResult) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEth(): any { return typeof window !== 'undefined' ? (window as any).ethereum ?? null : null; }

function encodeTransfer(to: string, amount: bigint): string {
  const toHex = to.toLowerCase().replace('0x', '').padStart(64, '0');
  const amtHex = amount.toString(16).padStart(64, '0');
  return '0xa9059cbb' + toHex + amtHex;
}

async function waitForConfirmations(txHash: string, minConfirmations: number): Promise<void> {
  const e = getEth();
  if (!e) throw new Error('No EVM wallet');
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const receipt = await e.request({ method: 'eth_getTransactionReceipt', params: [txHash] }) as { blockNumber?: string } | null;
      if (!receipt?.blockNumber) continue;
      const receiptBlock = parseInt(receipt.blockNumber, 16);
      const currentBlockHex: string = await e.request({ method: 'eth_blockNumber' });
      const confirmations = parseInt(currentBlockHex, 16) - receiptBlock + 1;
      if (confirmations >= minConfirmations) return;
    } catch { /* keep polling */ }
  }
  throw new Error('Transaction confirmation timed out. Your funds are safe — please use Manual Deposit and paste the TxHash.');
}

export function useAutoDeposit(options?: UseAutoDepositOptions) {
  const { refreshBalance } = useWallet();
  const { toast } = useToast();
  const [chainId, setChainId] = useState<number>(1);

  const [depositAmount, setDepositAmount] = useState('50');
  const [depositPhase, setDepositPhase] = useState<DepositPhase>('idle');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null);
  const [hasTronLink, setHasTronLink] = useState(false);
  const [hasPhantom,  setHasPhantom]  = useState(false);
  const [hasTon,      setHasTon]      = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronWeb = (window as any).tronWeb;
    setHasTronLink(!!tronWeb?.defaultAddress?.base58);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ph = (window as any).solana;
    setHasPhantom(!!(ph?.isPhantom));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ton = (window as any).ton;
    setHasTon(!!(ton?.send));

    const e = getEth();
    if (!e) return;
    e.request({ method: 'eth_chainId' })
      .then((hex: string) => setChainId(parseInt(hex, 16)))
      .catch(() => {});
    const onChain = (hex: string) => setChainId(parseInt(hex, 16));
    e.on?.('chainChanged', onChain);
    return () => e.removeListener?.('chainChanged', onChain);
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
      setDepositError('Your wallet is on an unsupported network. Switch to Ethereum mainnet to deposit ERC-20 USDT.');
      return;
    }
    const e = getEth();
    if (!e) { setDepositError('No EVM wallet detected. Please install MetaMask.'); return; }

    setDepositPhase('sending');
    setDepositError(null);
    try {
      const accounts: string[] = await e.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) throw new Error('No accounts found');
      const rawAmount = toBaseUnits(amount, chainCfg.decimals);
      const data = encodeTransfer(ERC20_ADDRESS, rawAmount);
      const txHash: string = await e.request({
        method: 'eth_sendTransaction',
        params: [{ from: accounts[0], to: chainCfg.address, data }],
      });
      setDepositPhase('confirming');
      await waitForConfirmations(txHash, chainCfg.minConfirmations);
      await submitToBackend(txHash, amount, chainCfg.network);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied') || msg.toLowerCase().includes('rejected')) {
        setDepositError('Transaction was rejected in your wallet.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setDepositError('Insufficient USDT balance in your wallet for this amount.');
      } else {
        setDepositError(msg.length > 120 ? msg.slice(0, 120) + '…' : msg);
      }
      setDepositPhase('error');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function waitForTronConfirmation(tronWeb: any, txHash: string): Promise<void> {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const info = await tronWeb.trx.getTransactionInfo(txHash);
        if (info?.blockNumber) return;
      } catch { /* keep polling */ }
    }
    throw new Error('Transaction confirmation timed out. Your funds are safe — please use Manual Deposit and paste the TxHash.');
  }

  async function handleTronDeposit() {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) { setDepositError('Minimum deposit is 10 USDT'); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tronWeb = (window as any).tronWeb;
    if (!tronWeb?.defaultAddress?.base58) {
      setDepositError('TronLink is not connected. Please unlock TronLink and try again.');
      return;
    }
    setDepositPhase('sending');
    setDepositError(null);
    try {
      const contract = await tronWeb.contract().at(TRON_USDT_CONTRACT);
      const rawAmount = Math.round(amount * 1_000_000);
      const txHash = await contract.transfer(TRC20_ADDRESS, rawAmount).send({ feeLimit: 10_000_000, callValue: 0 });
      setDepositPhase('confirming');
      await waitForTronConfirmation(tronWeb, txHash as string);
      await submitToBackend(txHash as string, amount, 'TRC-20');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('reject')) {
        setDepositError('Transaction was cancelled in TronLink.');
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
