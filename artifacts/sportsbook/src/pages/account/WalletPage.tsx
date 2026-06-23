import { useState, useEffect, useCallback, useRef } from 'react';
import { useReferral } from '@/hooks/useReferral';
import { usePublicClient, useBalance } from 'wagmi';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useBetHistory } from '@/hooks/useBetHistory';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useEvmWallet } from '@/hooks/useEvmWallet';
import { useToast } from '@/hooks/use-toast';
import { useAutoDeposit, USDT_ABI, TRON_USDT_CONTRACT, EVM_CHAINS } from '@/hooks/useAutoDeposit';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, CheckCircle2,
  Clock, XCircle, RefreshCw, Loader2, CircleDollarSign, Shield,
  AlertCircle, ExternalLink, Info, QrCode, Zap, Lock,
  ChevronRight, ChevronDown, LogOut, RotateCcw, Users, Gift,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DepositInfo {
  address: string;
  addressErc20?: string;
  addressBtc?: string;
  addressSol?: string;
  addressTon?: string;
  addressXrp?: string;
  addressBsc?: string;
  network: string;
  qrImageUrl: string;
  minDeposit: number;
  processingTime: string;
  currency: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: string;
  status: string;
  reference: string | null;
  txHash: string | null;
  network: string | null;
  walletAddress: string | null;
  notes: string | null;
  verified: boolean | null;
  verificationNote: string | null;
  createdAt: string;
}

interface NppPayment {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  priceAmount: number;
  priceCurrency: string;
  expiresAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: string | number) {
  return parseFloat(v as string).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function isCredit(type: string) { return type === 'deposit' || type === 'win' || type === 'bonus'; }

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#00DFA9]">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </span>
  );
  if (status === 'confirming') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#38BDF8]">
      <RefreshCw className="h-3 w-3" style={{ animation: 'spin 2s linear infinite' }} /> Confirming
    </span>
  );
  if (status === 'pending') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FACC15]">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
  if (status === 'rejected' || status === 'failed') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
      <XCircle className="h-3 w-3" /> {status === 'rejected' ? 'Rejected' : 'Failed'}
    </span>
  );
  if (status === 'expired') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#64748B]">
      <Clock className="h-3 w-3" /> Expired
    </span>
  );
  return <span className="text-[10px] text-[#64748B] capitalize">{status}</span>;
}

// ── Chain tab definitions ──────────────────────────────────────────────────────
const CHAIN_TABS = [
  { key: 'bsc',      name: 'BSC',      chainId: 56 },
  { key: 'trc20',    name: 'TRC-20',   chainId: null, color: '#00DFA9' },
  { key: 'polygon',  name: 'Polygon',  chainId: 137 },
  { key: 'arbitrum', name: 'Arbitrum', chainId: 42161 },
  { key: 'optimism', name: 'Optimism', chainId: 10 },
  { key: 'base',     name: 'Base',     chainId: 8453 },
] as const;

type ChainTabKey = typeof CHAIN_TABS[number]['key'];

const MIN_NATIVE_GAS: Record<number, number> = {
  56: 0.003, 137: 0.5, 42161: 0.0005, 10: 0.0005, 8453: 0.0005, 59144: 0.0005,
};

// EVM networks supported by the Reown wallet deposit flow (ordered for switch buttons)
const SUPPORTED_CHAIN_IDS = [56, 137, 42161, 10, 8453, 59144];

// ── Main component ─────────────────────────────────────────────────────────────
export function WalletPage() {
  const { isAuthenticated, user } = useAuth();
  const { bets } = useBetHistory();
  const referral = useReferral();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>(() => {
    const hint = sessionStorage.getItem('cupbett_wallet_tab');
    if (hint) sessionStorage.removeItem('cupbett_wallet_tab');
    return hint === 'history' ? 'history' : hint === 'withdraw' ? 'withdraw' : 'deposit';
  });
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [txns, setTxns]               = useState<Transaction[]>([]);
  const [balance, setBalance]         = useState<number>(0);
  const [loading, setLoading]         = useState(true);
  const [copied, setCopied]           = useState(false);

  // Deposit form
  const [depAmount, setDepAmount]   = useState('');
  const [depTxHash, setDepTxHash]   = useState('');
  const [depSubmitting, setDepSubmitting] = useState(false);
  const [depError, setDepError]     = useState('');
  const [depSuccess, setDepSuccess] = useState(false);
  const [depAutoVerified, setDepAutoVerified] = useState(false);

  // Capture deep-link intent BEFORE depositMethod initializer consumes the flag
  const scrollHint = useRef(sessionStorage.getItem('cupbett_deposit_method') === 'wallet');
  const depositSectionRef = useRef<HTMLDivElement>(null);

  // NOWPayments
  const [depositMethod, setDepositMethod] = useState<'nowpayments' | 'manual' | 'wallet'>(() => {
    const hint = sessionStorage.getItem('cupbett_deposit_method');
    sessionStorage.removeItem('cupbett_deposit_method');
    if (hint === 'manual') return 'manual';
    if (hint === 'nowpayments') return 'nowpayments';
    return 'wallet';
  });
  const [selectedChain, setSelectedChain] = useState<ChainTabKey>('bsc');
  const [manualNetwork, setManualNetwork] = useState<'TRC-20' | 'ERC-20' | 'BSC' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'BASE' | 'SOLANA' | 'TON' | 'XRP' | 'BTC'>('TRC-20');
  const [nppState, setNppState]       = useState<'idle' | 'creating' | 'paying' | 'success' | 'expired' | 'failed'>(() => {
    try {
      const saved = sessionStorage.getItem('cupbett_npp_payment');
      if (saved) {
        const p = JSON.parse(saved) as NppPayment;
        const secsLeft = p.expiresAt
          ? Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000)
          : 20 * 60;
        if (secsLeft > 0) return 'paying';
      }
    } catch { /* ignore */ }
    return 'idle';
  });
  const [nppAmount, setNppAmount]     = useState('');
  const [nppCurrency, setNppCurrency] = useState('usdttrc20');
  const [nppPayment, setNppPayment]   = useState<NppPayment | null>(() => {
    try {
      const saved = sessionStorage.getItem('cupbett_npp_payment');
      if (saved) {
        const p = JSON.parse(saved) as NppPayment;
        const secsLeft = p.expiresAt
          ? Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000)
          : 20 * 60;
        if (secsLeft > 0) return p;
      }
    } catch { /* ignore */ }
    return null;
  });
  const [nppTimeLeft, setNppTimeLeft] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('cupbett_npp_payment');
      if (saved) {
        const p = JSON.parse(saved) as NppPayment;
        const secsLeft = p.expiresAt
          ? Math.floor((new Date(p.expiresAt).getTime() - Date.now()) / 1000)
          : 20 * 60;
        if (secsLeft > 0) return secsLeft;
      }
    } catch { /* ignore */ }
    return 0;
  });
  const [nppError, setNppError]       = useState('');
  const [nppAddrCopied, setNppAddrCopied] = useState(false);

  // Withdrawal form
  const [wdAmount, setWdAmount]       = useState('');
  const [wdAddress, setWdAddress]     = useState('');
  const [wdNetwork, setWdNetwork]     = useState<'TRC-20' | 'TRX' | 'BSC' | 'BTC'>('TRC-20');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdProcessing, setWdProcessing] = useState(false);
  const [wdError, setWdError]         = useState('');
  const [wdSuccess, setWdSuccess]     = useState(false);

  const [bonusBalance, setBonusBalance] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const [info, bal, history] = await Promise.all([
        api.get<DepositInfo>('/wallet/deposit-info'),
        api.get<{ balance: string; bonusBalance?: string }>('/wallet/balance'),
        api.get<Transaction[]>('/wallet/transactions'),
      ]);
      setDepositInfo(info);
      setBalance(parseFloat(bal.balance));
      setBonusBalance(parseFloat(bal.bonusBalance ?? '0'));
      setTxns(history);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Recover any in-flight deposit that got orphaned by a page refresh ────────
  useEffect(() => {
    if (!isAuthenticated) return;
    const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
    async function recoverPending(key: string, network: string) {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const { txHash, amount, ts } = JSON.parse(raw) as { txHash: string; amount: number; ts: number };
        if (!txHash || !amount || Date.now() - ts > MAX_AGE_MS) {
          localStorage.removeItem(key);
          return;
        }
        // Submit to backend — it will verify on-chain and credit if confirmed
        const result = await api.post<{ autoVerified?: boolean }>('/wallet/deposit', {
          txHash, amount, network,
        });
        localStorage.removeItem(key);
        await loadData();
        if (result?.autoVerified) {
          // Balance credited — refresh header balance too
          window.dispatchEvent(new Event('cb:balance-refresh'));
        }
      } catch {
        // If backend says duplicate (409) or verified already, clear entry
        localStorage.removeItem(key);
      }
    }
    recoverPending('cb_pending_evm_tx', (() => {
      const raw = localStorage.getItem('cb_pending_evm_tx');
      if (!raw) return 'ETH';
      try {
        const VALID_NETWORKS = new Set(['ETH', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BASE', 'LINEA']);
        const parsed = JSON.parse(raw) as { network?: string };
        return (parsed.network && VALID_NETWORKS.has(parsed.network)) ? parsed.network : 'ETH';
      } catch { return 'ETH'; }
    })());
    recoverPending('cb_pending_tron_tx', 'TRC-20');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const evmWallet = useEvmWallet();
  const w3Address   = evmWallet.address;
  const w3Connected = evmWallet.isConnected;
  const [highlightDeposit, setHighlightDeposit] = useState(false);

  // Switch network only on user action; surface rejection as a toast (spec wording)
  const handleNetworkSwitch = useCallback(async (chainId: number) => {
    try {
      await evmWallet.switchChain(chainId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/cancel|reject|denied/i.test(msg)) {
        toast({ title: 'Network switch cancelled.' });
      } else {
        toast({ title: 'Network switch failed', description: msg || 'Please try again.' });
      }
    }
  }, [evmWallet, toast]);

  const [w3DropdownOpen, setW3DropdownOpen] = useState(false);
  const [w3CopiedAddr, setW3CopiedAddr]     = useState(false);
  const [w3DepAddrCopied, setW3DepAddrCopied] = useState(false);
  const [evmBalanceError, setEvmBalanceError]     = useState(false);
  const [tronBalanceError, setTronBalanceError]   = useState(false);
  const [evmBalanceNonce, setEvmBalanceNonce]     = useState(0);
  const [tronBalanceNonce, setTronBalanceNonce]   = useState(0);
  const [tronBandwidth, setTronBandwidth]         = useState<number | null>(null);
  const {
    depositAmount: walletDepAmount, setDepositAmount: setWalletDepAmount,
    depositPhase: walletPhase, depositError: walletError, depositResult: walletResult,
    confirmations: walletConfirmations, pendingTx: walletPendingTx, gasEstimate: walletGasEstimate,
    isProcessing: walletProcessing, hasTronLink, chainCfg,
    handleEvmDeposit, handleTronDeposit, resetDeposit: resetWalletDeposit,
  } = useAutoDeposit({
    onSuccess: loadData,
    platformAddresses: {
      addressErc20: depositInfo?.addressErc20,
      addressBsc:   depositInfo?.addressBsc,
      addressTrc20: depositInfo?.address,
    },
  });

  // ── Native gas balance (BNB / ETH / MATIC) ───────────────────────────────
  const { data: gasData, isError: gasError } = useBalance({
    address: w3Address as `0x${string}` | undefined,
    query: { enabled: !!w3Address && w3Connected },
  });
  const gasBalance = gasData ? Number(gasData.value) / Math.pow(10, gasData.decimals) : null;

  // When the wallet disconnects, return the deposit UI to the Connect Wallet state
  useEffect(() => {
    if (!w3Connected) resetWalletDeposit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w3Connected]);

  // Change Wallet: fully disconnect first, then reopen the picker so the user can
  // choose a different wallet instead of silently reconnecting the previous one.
  const handleChangeWallet = useCallback(async () => {
    resetWalletDeposit();
    evmWallet.disconnect();
    await new Promise(r => setTimeout(r, 200));
    try {
      await evmWallet.openWalletModal();
    } catch {
      /* modal did not open — user can retry */
    }
  }, [evmWallet, resetWalletDeposit]);

  // Disconnect with explicit feedback so an accidental tap is noticeable.
  const handleWalletDisconnect = useCallback(() => {
    evmWallet.disconnect();
    resetWalletDeposit();
    toast({ title: 'Wallet disconnected' });
  }, [evmWallet, resetWalletDeposit, toast]);

  // Mobile heuristic — used to nudge users toward in-wallet dapp browsers where
  // injected providers are unavailable.
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const hasInjectedProvider = typeof window !== 'undefined' && !!(window as { ethereum?: unknown }).ethereum;

  // ── EVM USDT balance (wagmi publicClient — works with MetaMask AND WalletConnect) ──
  const publicClient = usePublicClient();
  const [evmBalanceRaw, setEvmBalanceRaw] = useState<bigint | undefined>(undefined);
  useEffect(() => {
    if (!publicClient || !w3Address || !w3Connected || !chainCfg) {
      setEvmBalanceRaw(undefined); setEvmBalanceError(false); return;
    }
    let cancelled = false;
    setEvmBalanceError(false);
    const timeout = setTimeout(() => {
      if (!cancelled) { setEvmBalanceRaw(undefined); setEvmBalanceError(true); }
    }, 10_000);
    publicClient.readContract({
      address: chainCfg.address,
      abi: USDT_ABI,
      functionName: 'balanceOf',
      args: [w3Address as `0x${string}`],
    }).then((bal) => {
      if (!cancelled) { clearTimeout(timeout); setEvmBalanceRaw(bal as bigint); }
    }).catch(() => {
      if (!cancelled) { clearTimeout(timeout); setEvmBalanceRaw(undefined); setEvmBalanceError(true); }
    });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [publicClient, w3Address, w3Connected, chainCfg, evmBalanceNonce]);
  const evmBalance = (evmBalanceRaw !== undefined && chainCfg)
    ? Number(evmBalanceRaw) / Math.pow(10, chainCfg.decimals)
    : null;

  // ── TronLink USDT balance ─────────────────────────────────────────────────
  const [tronBalance, setTronBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!hasTronLink) { setTronBalance(null); setTronBandwidth(null); setTronBalanceError(false); return; }
    let cancelled = false;
    setTronBalanceError(false);
    const timeout = setTimeout(() => {
      if (!cancelled) { setTronBalance(null); setTronBalanceError(true); }
    }, 10_000);
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tronWeb = (window as any).tronWeb;
        const addr = tronWeb.defaultAddress.base58 as string;
        const contract = await tronWeb.contract().at(TRON_USDT_CONTRACT);
        const [raw, bw] = await Promise.all([
          contract.balanceOf(addr).call(),
          tronWeb.trx.getBandwidth(addr).catch(() => 0),
        ]);
        if (!cancelled) {
          clearTimeout(timeout);
          setTronBalance(Number(raw) / 1_000_000);
          setTronBandwidth(typeof bw === 'number' ? bw : 0);
        }
      } catch { if (!cancelled) { clearTimeout(timeout); setTronBalance(null); setTronBalanceError(true); } }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [hasTronLink, tronBalanceNonce]);

  // Sync selectedChain to the wallet's current connected chain
  useEffect(() => {
    if (w3Connected && chainCfg) {
      const tab = CHAIN_TABS.find(t => t.chainId === evmWallet.chainId);
      if (tab) setSelectedChain(tab.key);
    } else if (!w3Connected && hasTronLink) {
      setSelectedChain('trc20');
    }
  }, [w3Connected, chainCfg, hasTronLink, evmWallet.chainId]);

  const selectedChainData = CHAIN_TABS.find(t => t.key === selectedChain);
  const isOnSelectedChain = selectedChainData?.chainId != null && evmWallet.chainId === selectedChainData.chainId;

  // Scroll deposit section into view + briefly highlight when arriving via header deep-link
  useEffect(() => {
    if (scrollHint.current && depositSectionRef.current) {
      const el = depositSectionRef.current;
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
      setHighlightDeposit(true);
      const t = setTimeout(() => setHighlightDeposit(false), 2200);
      scrollHint.current = false;
      return () => clearTimeout(t);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Balance for the active selected chain
  const walletBalance = selectedChain === 'trc20'
    ? (hasTronLink ? tronBalance : null)
    : (w3Connected && isOnSelectedChain ? evmBalance : null);
  const walletBalanceError = selectedChain === 'trc20' ? tronBalanceError : evmBalanceError;

  // Platform deposit destination address for the active EVM chain
  const platformDepositAddr = (depositInfo && chainCfg)
    ? (chainCfg.network === 'BSC'
        ? cleanAddr(depositInfo.addressBsc ?? '') || cleanAddr(depositInfo.addressErc20 ?? '')
        : cleanAddr(depositInfo.addressErc20 ?? ''))
    : '';

  function cleanAddr(addr: string | undefined): string {
    if (!addr || addr.startsWith('PASTE_YOUR') || addr.startsWith('CONFIGURE_')) return '';
    return addr;
  }

  function getManualAddress(network: typeof manualNetwork, info: DepositInfo): string {
    if (network === 'BTC')    return cleanAddr(info.addressBtc);
    if (network === 'SOLANA') return cleanAddr(info.addressSol);
    if (network === 'TON')    return cleanAddr(info.addressTon);
    if (network === 'XRP')    return cleanAddr(info.addressXrp);
    if (network === 'BSC')    return cleanAddr(info.addressBsc) || cleanAddr(info.addressErc20) || cleanAddr(info.address);
    if (network !== 'TRC-20') return cleanAddr(info.addressErc20) || cleanAddr(info.address);
    return cleanAddr(info.address);
  }

  function copyAddress() {
    if (!depositInfo) return;
    const addr = getManualAddress(manualNetwork, depositInfo);
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    setDepError('');
    const amount = parseFloat(depAmount);
    if (!depAmount || isNaN(amount) || amount <= 0) { setDepError('Enter a valid amount'); return; }
    if (!depTxHash.trim()) { setDepError('Enter your transaction hash / TxID'); return; }
    setDepSubmitting(true);
    try {
      const result = await api.post<{ autoVerified?: boolean }>('/wallet/deposit', { amount, txHash: depTxHash.trim(), network: manualNetwork });
      setDepAutoVerified(result?.autoVerified === true);
      setDepSuccess(true);
      setDepAmount('');
      setDepTxHash('');
      loadData();
    } catch (err: unknown) {
      setDepError(err instanceof Error ? err.message : 'Submission failed');
    } finally { setDepSubmitting(false); }
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setWdError('');
    const amount = parseFloat(wdAmount);
    if (!wdAmount || isNaN(amount) || amount <= 0) { setWdError('Enter a valid amount'); return; }
    if (amount < 100) { setWdError('Minimum withdrawal is 100 USDT'); return; }
    if (amount > balance) { setWdError('Amount exceeds your available balance'); return; }
    if (!wdAddress.trim()) { setWdError(`Enter your ${wdNetwork === 'BTC' ? 'BTC' : `USDT ${wdNetwork}`} wallet address`); return; }
    setWdSubmitting(true);
    try {
      await api.post('/wallet/withdraw', { amount, walletAddress: wdAddress.trim(), network: wdNetwork });
      setWdSubmitting(false);
      setWdProcessing(true);
      setWdAmount('');
      setWdAddress('');
      loadData();
      await new Promise(r => setTimeout(r, 2800));
      setWdProcessing(false);
      setWdSuccess(true);
    } catch (err: unknown) {
      setWdError(err instanceof Error ? err.message : 'Submission failed');
      setWdSubmitting(false);
    }
  }

  // ── NOWPayments handlers ─────────────────────────────────────────────────────
  async function createNppPayment() {
    const amount = parseFloat(nppAmount);
    if (!nppAmount || isNaN(amount) || amount < 10) { setNppError('Minimum deposit is 10 USDT'); return; }
    setNppState('creating'); setNppError('');
    try {
      const result = await api.post<NppPayment & { status: string; expiresAt: string | null }>(
        '/wallet/deposit/nowpayments/create', { amount, currency: nppCurrency }
      );
      const secsLeft = result.expiresAt
        ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
        : 20 * 60;
      try { sessionStorage.setItem('cupbett_npp_payment', JSON.stringify(result)); } catch { /* ignore */ }
      setNppPayment(result);
      setNppTimeLeft(secsLeft);
      setNppState('paying');
      loadData();
    } catch (err: unknown) {
      setNppError(err instanceof Error ? err.message : 'Failed to create payment');
      setNppState('idle');
    }
  }

  function copyNppAddress() {
    if (!nppPayment) return;
    navigator.clipboard.writeText(nppPayment.payAddress);
    setNppAddrCopied(true);
    setTimeout(() => setNppAddrCopied(false), 2000);
  }

  function resetNpp() {
    try { sessionStorage.removeItem('cupbett_npp_payment'); } catch { /* ignore */ }
    setNppState('idle'); setNppPayment(null);
    setNppAmount(''); setNppError(''); setNppTimeLeft(0);
  }

  // Countdown timer
  useEffect(() => {
    if (nppState !== 'paying' || nppTimeLeft <= 0) return;
    const id = setInterval(() => {
      setNppTimeLeft(prev => {
        if (prev <= 1) { setNppState('expired'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [nppState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-poll payment status every 10 s
  useEffect(() => {
    if (nppState !== 'paying' || !nppPayment) return;
    const id = setInterval(async () => {
      try {
        const r = await api.get<{ status: string; credited: boolean }>(
          `/wallet/deposit/nowpayments/${nppPayment.paymentId}/status`
        );
        if (r.credited || r.status === 'finished' || r.status === 'confirmed') {
          try { sessionStorage.removeItem('cupbett_npp_payment'); } catch { /* ignore */ }
          setNppState('success'); loadData();
        } else if (r.status === 'failed' || r.status === 'refunded' || r.status === 'expired') {
          try { sessionStorage.removeItem('cupbett_npp_payment'); } catch { /* ignore */ }
          setNppState(r.status === 'expired' ? 'expired' : 'failed');
        }
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [nppState, nppPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 text-[#00DFA9] animate-spin" />
    </div>
  );

  const lockedInBets       = bets.filter(b => !b.status || b.status === 'open' || b.status === 'pending').reduce((s, b) => s + b.stake, 0);
  const pendingDepositsAmt = txns.filter(t => t.type === 'deposit' && (t.status === 'pending' || t.status === 'confirming')).reduce((s, t) => s + parseFloat(t.amount), 0);
  const pendingDeposits    = txns.filter(t => t.type === 'deposit'    && t.status === 'pending').length;
  const pendingWithdrawals = txns.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;

  return (
    <div className="space-y-5">

      {/* ── Balance Breakdown ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-3.5 sm:p-5"
        style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 50%, #0B0F14 100%)' }}>
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.12) 0%, transparent 70%)' }} />
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Wallet Balance</p>
            </div>
            <div className="text-right">
              <p className="text-[20px] sm:text-[24px] font-black text-[#F8FAFC] leading-none"
                style={{ textShadow: '0 0 32px rgba(0,223,169,0.18)' }}>
                ${fmt(balance + lockedInBets + pendingDepositsAmt)}
              </p>
              <p className="text-[10px] font-semibold text-[#00DFA9]">Withdrawable</p>
            </div>
          </div>

          {/* 2×2 breakdown grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Available */}
            <div className="flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 border"
              style={{ background: 'rgba(0,223,169,0.06)', borderColor: 'rgba(0,223,169,0.14)' }}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.22)' }}>
                <ArrowDownLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#00DFA9]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Available</p>
                <p className="text-[13px] sm:text-[15px] font-black text-[#00DFA9] leading-tight">${fmt(balance)}</p>
              </div>
            </div>

            {/* Locked in active bets */}
            <div className="flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 border"
              style={{ background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.14)' }}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.22)' }}>
                <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#38BDF8]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Active Bets</p>
                <p className="text-[13px] sm:text-[15px] font-black text-[#38BDF8] leading-tight">${fmt(lockedInBets)}</p>
              </div>
            </div>

            {/* Pending deposits */}
            <div className="flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 border"
              style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.14)' }}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.22)' }}>
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Pending</p>
                <p className="text-[13px] sm:text-[15px] font-black text-[#FACC15] leading-tight">${fmt(pendingDepositsAmt)}</p>
              </div>
            </div>

            {/* Bonus */}
            <div className="flex items-center gap-2.5 rounded-xl p-2.5 sm:p-3 border"
              style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.14)' }}
              title="Bonus funds are for betting only — cannot be withdrawn">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.22)' }}>
                <CircleDollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Bonus</p>
                <p className="text-[13px] sm:text-[15px] font-black text-[#FACC15] leading-tight">${fmt(bonusBalance)}</p>
                <p className="text-[8px] text-[#FACC15]/50 leading-none mt-0.5">Bet only</p>
              </div>
            </div>
          </div>

          {/* Pending withdrawal notice */}
          {pendingWithdrawals > 0 && (
            <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[#38BDF8] border border-[#38BDF8]/15 rounded-xl px-3 py-2"
              style={{ background: 'rgba(56,189,248,0.07)' }}>
              <Clock className="h-3 w-3 shrink-0" />
              {pendingWithdrawals} withdrawal{pendingWithdrawals > 1 ? 's' : ''} pending admin review
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex rounded-xl overflow-hidden border border-white/[0.07] bg-[#0E1520] p-1 gap-1">
        {(['deposit', 'withdraw', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 rounded-lg text-[12px] font-bold transition-all capitalize',
              tab === t
                ? 'bg-[#00DFA9] text-[#0B0F14] shadow-[0_0_16px_rgba(0,223,169,0.25)]'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            )}>
            {t === 'deposit' ? '↓ Top Up' : t === 'withdraw' ? '↑ Withdraw' : '📋 History'}
          </button>
        ))}
      </div>

      {/* ── DEPOSIT TAB ───────────────────────────────────────────────────── */}
      {tab === 'deposit' && (
        <div className="space-y-4">

          {/* ── Method selector ─────────────────────────────────────────── */}

          {/* Method picker — always visible: all deposit methods shown upfront */}
          <div className="space-y-2.5">
              <div className="px-0.5">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Choose Top Up Method</p>
              </div>

              {/* Web3 Wallet */}
              {(() => {
                const active = depositMethod === 'wallet';
                return (
                  <button onClick={() => { setDepositMethod('wallet'); }}
                    className="w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-150 text-left group"
                    style={active
                      ? { background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.05) 100%)', border: '2px solid rgba(167,139,250,0.50)', boxShadow: '0 0 20px rgba(167,139,250,0.10)' }
                      : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.30)' }}>
                      <Wallet className="w-4 h-4 text-[#A78BFA]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#F8FAFC]">Web3 Wallet</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.22)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.40)' }}>⚡ Instant</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.20)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.40)' }}>★ Best</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">MetaMask · Trust · ETH · BSC · TRC-20 · <span className="font-semibold text-[#A78BFA]">Min $10</span></p>
                    </div>
                    {active
                      ? <div className="shrink-0 w-5 h-5 rounded-full bg-[#A78BFA] flex items-center justify-center"><Check className="w-3 h-3 text-[#0B0F14]" /></div>
                      : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                  </button>
                );
              })()}

              {/* NOWPayments */}
              {(() => {
                const active = depositMethod === 'nowpayments';
                return (
                  <button onClick={() => { setDepositMethod('nowpayments'); resetNpp(); }}
                    className="w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-150 text-left group"
                    style={active
                      ? { background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.05) 100%)', border: '2px solid rgba(56,189,248,0.50)', boxShadow: '0 0 20px rgba(56,189,248,0.10)' }
                      : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                      <Zap className="w-4 h-4 text-[#38BDF8]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#F8FAFC]">NOWPayments</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.30)' }}>Auto Credit</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">300+ cryptos · TRC-20 · BEP-20 · TON · <span className="font-semibold text-[#38BDF8]">Min $10</span></p>
                    </div>
                    {active
                      ? <div className="shrink-0 w-5 h-5 rounded-full bg-[#38BDF8] flex items-center justify-center"><Check className="w-3 h-3 text-[#0B0F14]" /></div>
                      : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                  </button>
                );
              })()}

              {/* USDT Manual */}
              {(() => {
                const active = depositMethod === 'manual';
                return (
                  <button onClick={() => { setDepositMethod('manual'); }}
                    className="w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-150 text-left group"
                    style={active
                      ? { background: 'linear-gradient(135deg, rgba(0,223,169,0.10) 0%, rgba(0,223,169,0.04) 100%)', border: '2px solid rgba(0,223,169,0.42)', boxShadow: '0 0 20px rgba(0,223,169,0.08)' }
                      : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.30)' }}>
                      <QrCode className="w-4 h-4 text-[#00DFA9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold text-[#F8FAFC]">USDT Manual</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(250,204,21,0.18)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.35)' }}>Most Popular</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">TRC-20 · ERC-20 · BTC · TON · 11 networks · <span className="font-semibold text-[#00DFA9]">Min $10</span></p>
                    </div>
                    {active
                      ? <div className="shrink-0 w-5 h-5 rounded-full bg-[#00DFA9] flex items-center justify-center"><Check className="w-3 h-3 text-[#0B0F14]" /></div>
                      : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                  </button>
                );
              })()}

            </div>

          {/* Trust elements — desktop only to save mobile space */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-2">
            {[
              { emoji: '🔒', label: 'Secure Payments', sub: 'All deposits verified automatically', color: '#38BDF8' },
              { emoji: '⚡', label: 'Fast Processing', sub: 'Most deposits confirmed within minutes', color: '#00DFA9' },
              { emoji: '💰', label: 'Auto Credit', sub: 'Balance updated after blockchain confirmation', color: '#FACC15' },
              { emoji: '🌍', label: 'Multiple Networks', sub: 'TRC20, ERC20, BEP20, Polygon & more', color: '#A78BFA' },
            ].map(({ emoji, label, sub }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0E1520] p-3.5 text-center">
                <span className="text-xl block mb-2">{emoji}</span>
                <p className="text-[11px] font-bold text-[#F8FAFC] leading-tight">{label}</p>
                <p className="text-[10px] text-[#64748B] mt-1 leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>

          {/* ── NOWPayments auto-pay panel ─────────────────────────────── */}
          {depositMethod === 'nowpayments' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 100%)', border: '1px solid rgba(56,189,248,0.20)' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                    <Zap className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#F8FAFC]">Quick Top Up via NOWPayments</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Enter amount → get unique address → pay → auto-credited</p>
                  </div>
                </div>
              </div>
              {/* Network strip */}
              <div className="px-5 py-2 border-b border-white/[0.05] flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[9px] font-bold text-[#475569] uppercase tracking-wider shrink-0">Supports:</span>
                {([
                  { name: 'USDT TRC-20', color: '#00DFA9' },
                  { name: 'USDT ERC-20', color: '#627EEA' },
                  { name: 'USDT BEP-20', color: '#F0B90B' },
                  { name: 'TON', color: '#0098EA' },
                  { name: 'Solana', color: '#9945FF' },
                  { name: 'BTC', color: '#F7931A' },
                  { name: 'LTC', color: '#A5A5A5' },
                  { name: 'ETH', color: '#627EEA' },
                  { name: 'XRP', color: '#00C2FF' },
                  { name: '300+ more', color: '#64748B' },
                ] as { name: string; color: string }[]).map(n => (
                  <span key={n.name} className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: `${n.color}18`, color: n.color, border: `1px solid ${n.color}30` }}>
                    {n.name}
                  </span>
                ))}
              </div>
              <div className="p-5">

                {/* IDLE */}
                {nppState === 'idle' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                          <CircleDollarSign className="h-3 w-3" /> Amount (USDT)
                        </label>
                        <div className="relative">
                          <input type="number" min="10" step="0.01" value={nppAmount}
                            onChange={e => { setNppAmount(e.target.value); setNppError(''); }}
                            placeholder="Min 10 USDT"
                            className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/20 transition-all pr-16" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded-lg">USDT</span>
                        </div>
                        {nppAmount && !isNaN(parseFloat(nppAmount)) && parseFloat(nppAmount) > 0 && (
                          <div className="mt-1.5 px-1">
                            {parseFloat(nppAmount) < 10
                              ? <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> Minimum deposit is 10 USDT</span>
                              : <span className="text-[10px] text-[#00DFA9]">✓ You will receive ≈ {parseFloat(nppAmount).toFixed(2)} USDT</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                          <Zap className="h-3 w-3" /> Pay With
                        </label>
                        <select value={nppCurrency} onChange={e => setNppCurrency(e.target.value)}
                          className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/20 transition-all">
                          <option value="usdttrc20">USDT (TRC-20 / Tron)</option>
                          <option value="usdterc20">USDT (ERC-20 / Ethereum)</option>
                          <option value="usdtbsc">USDT (BEP-20 / BSC)</option>
                          <option value="usdtpolygon">USDT (Polygon)</option>
                          <option value="usdtsol">USDT (Solana / SPL)</option>
                          <option value="usdtarbi">USDT (Arbitrum)</option>
                          <option value="usdtton">USDT (TON)</option>
                          <option value="xrp">XRP (Ripple)</option>
                          <option value="btc">Bitcoin (BTC)</option>
                          <option value="eth">Ethereum (ETH)</option>
                          <option value="bnbbsc">BNB (BSC / BEP-20)</option>
                          <option value="ltc">Litecoin (LTC)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <p className="text-[10px] text-[#64748B] font-semibold mr-0.5">Quick:</p>
                      {[10, 25, 50, 100, 250, 500, 1000].map(amt => (
                        <button key={amt} type="button" onClick={() => { setNppAmount(String(amt)); setNppError(''); }}
                          className={cn('text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all',
                            nppAmount === String(amt)
                              ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                              : 'bg-white/5 text-[#64748B] border border-white/[0.07] hover:bg-white/10 hover:text-white')}>
                          ${amt}
                        </button>
                      ))}
                    </div>
                    {nppError && (
                      <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-[12px] text-red-400">{nppError}</p>
                      </div>
                    )}
                    <button onClick={createNppPayment}
                      className="w-full py-3.5 rounded-xl font-black text-[14px] text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)', boxShadow: '0 0 24px rgba(56,189,248,0.30)' }}>
                      <Zap className="h-4 w-4" /> Generate Payment Address
                    </button>
                    <p className="text-center text-[10px] text-[#64748B]">
                      A unique address is generated for each deposit — your balance is credited automatically when payment is confirmed
                    </p>
                  </div>
                )}

                {/* CREATING */}
                {nppState === 'creating' && (
                  <div className="flex flex-col items-center py-12 gap-5 text-center">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10" style={{ background: 'radial-gradient(circle, #38BDF8, transparent)', animationDuration: '1.4s' }} />
                      <svg className="w-20 h-20 animate-spin" style={{ animationDuration: '1.1s' }} viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#38BDF8" strokeWidth="3" strokeDasharray="160" strokeDashoffset="120" strokeLinecap="round" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#00DFA9" strokeWidth="1" strokeDasharray="213" strokeLinecap="round" style={{ opacity: 0.15 }} />
                      </svg>
                      <div className="absolute w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)' }}>
                        <Zap className="w-6 h-6 text-[#38BDF8]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[16px] font-black text-[#F8FAFC]">Generating address…</p>
                      <p className="text-[11px] text-[#64748B] mt-1">Connecting to NOWPayments gateway</p>
                    </div>
                  </div>
                )}

                {/* PAYING */}
                {nppState === 'paying' && nppPayment && (
                  <div className="space-y-4">
                    {/* Timer */}
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                      style={{ background: nppTimeLeft < 300 ? 'rgba(239,68,68,0.08)' : 'rgba(56,189,248,0.08)', border: `1px solid ${nppTimeLeft < 300 ? 'rgba(239,68,68,0.25)' : 'rgba(56,189,248,0.25)'}` }}>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${nppTimeLeft < 300 ? 'text-red-400' : 'text-[#38BDF8]'}`} />
                        <span className="text-[12px] font-bold text-[#F8FAFC]">Payment expires in</span>
                      </div>
                      <span className={`text-[16px] font-black tabular-nums ${nppTimeLeft < 300 ? 'text-red-400' : 'text-[#38BDF8]'}`}>
                        {Math.floor(nppTimeLeft / 60)}:{String(nppTimeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Payment status tracker */}
                    <div className="flex items-center w-full px-1">
                      {['Waiting','Detected','Confirming','Confirmed','Credited'].map((step, i, arr) => (
                        <div key={step} className="flex items-center flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center',
                              i === 0 ? 'border border-[#38BDF8]/50 bg-[#38BDF8]/10' : 'border border-white/[0.08] bg-white/[0.03]')}>
                              {i === 0
                                ? <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse block" />
                                : <span className="text-[8px] font-bold text-[#475569]">{i+1}</span>}
                            </div>
                            <span className={cn('text-[8px] font-semibold leading-tight text-center whitespace-nowrap',
                              i === 0 ? 'text-[#38BDF8]' : 'text-[#475569]')}>{step}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 h-px mx-1 mb-4" style={{ background: i === 0 ? 'linear-gradient(90deg, rgba(56,189,248,0.4) 0%, rgba(255,255,255,0.06) 100%)' : 'rgba(255,255,255,0.06)' }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* QR + address */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#0B0F14] border border-white/[0.07]">
                      <div className="p-2 rounded-xl bg-white flex-shrink-0" style={{ boxShadow: '0 0 0 1px rgba(56,189,248,0.2)' }}>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(nppPayment.payAddress)}`}
                          alt="Payment address QR" className="w-[140px] h-[140px] object-contain" />
                      </div>
                      <div className="flex-1 w-full space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Send Exactly</p>
                          <div className="flex items-center gap-2 bg-[#38BDF8]/5 border border-[#38BDF8]/20 rounded-xl px-4 py-2.5">
                            <span className="text-[18px] font-black text-[#F8FAFC] tabular-nums">{nppPayment.payAmount}</span>
                            <span className="text-[12px] font-bold text-[#38BDF8] uppercase">{nppPayment.payCurrency}</span>
                          </div>
                          <p className="text-[10px] text-[#64748B] mt-1">≈ ${fmt(nppPayment.priceAmount)} USDT credited to your account</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">To This Address</p>
                          <div className="flex items-center gap-2 bg-[#0E1520] border border-white/[0.08] rounded-xl px-3 py-2">
                            <p className="flex-1 text-[11px] font-mono text-[#94A3B8] break-all leading-relaxed select-all">{nppPayment.payAddress}</p>
                            <button onClick={copyNppAddress}
                              className={cn('shrink-0 p-2 rounded-lg transition-all', nppAddrCopied ? 'bg-[#38BDF8]/20 text-[#38BDF8]' : 'bg-white/5 text-[#64748B] hover:bg-white/10 hover:text-white')}>
                              {nppAddrCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {nppAddrCopied && <p className="text-[10px] text-[#38BDF8] mt-1 flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Address copied</p>}
                        </div>
                      </div>
                    </div>
                    {/* Polling indicator */}
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#00DFA9]/5 border border-[#00DFA9]/15">
                      <div className="relative w-3 h-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-[#00DFA9] animate-ping opacity-60" style={{ animationDuration: '1.5s' }} />
                        <div className="relative w-3 h-3 rounded-full bg-[#00DFA9]" />
                      </div>
                      <p className="text-[11px] text-[#00DFA9]/80">Monitoring your payment — balance updates automatically when confirmed</p>
                    </div>
                    <div className="flex items-start gap-2 bg-[#FACC15]/5 border border-[#FACC15]/15 rounded-xl p-3">
                      <AlertCircle className="h-3.5 w-3.5 text-[#FACC15] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#FACC15]/80 leading-relaxed">
                        Send <strong>exactly</strong> the amount shown above to this unique address. Do not send from an exchange that requires a memo/tag.
                      </p>
                    </div>
                    <button onClick={resetNpp}
                      className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#64748B] border border-white/[0.07] hover:text-white hover:bg-white/5 transition-all">
                      ← Start a new payment
                    </button>
                  </div>
                )}

                {/* SUCCESS */}
                {nppState === 'success' && (
                  <div className="flex flex-col items-center py-8 gap-4 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.2)' }}>
                        <CheckCircle2 className="h-8 w-8 text-[#00DFA9]" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00DFA9] flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#0B0F14]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#F8FAFC]">Top Up Credited! ⚡</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Your payment was confirmed and <span className="text-[#00DFA9] font-semibold">automatically credited</span> to your account.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#00DFA9]/5 border border-[#00DFA9]/15 rounded-xl px-4 py-2.5">
                      <Check className="h-3.5 w-3.5 text-[#00DFA9] shrink-0" />
                      <p className="text-[11px] text-[#00DFA9]/80">Funds are available in your wallet now</p>
                    </div>
                    <button onClick={resetNpp}
                      className="mt-1 px-5 py-2 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/25 hover:bg-[#38BDF8]/10 transition-all">
                      Make another deposit
                    </button>
                  </div>
                )}

                {/* EXPIRED / FAILED */}
                {(nppState === 'expired' || nppState === 'failed') && (
                  <div className="flex flex-col items-center py-8 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.25)' }}>
                      <XCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#F8FAFC]">{nppState === 'expired' ? 'Payment Expired' : 'Payment Failed'}</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        {nppState === 'expired'
                          ? 'This payment session has expired. Please generate a new address to deposit.'
                          : 'The payment was not completed. Please try again or use Manual deposit.'}
                      </p>
                    </div>
                    <button onClick={resetNpp}
                      className="px-5 py-2.5 rounded-xl font-black text-[13px] text-[#0B0F14] transition-all hover:scale-[1.01]"
                      style={{ background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)' }}>
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Web3 Wallet auto-deposit ─────────────────────────────────── */}
          {depositMethod === 'wallet' && (
            <div ref={depositSectionRef} className="rounded-2xl overflow-hidden transition-shadow duration-500" style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0E1228 100%)', border: `1px solid ${highlightDeposit ? 'rgba(167,139,250,0.70)' : 'rgba(167,139,250,0.20)'}`, boxShadow: highlightDeposit ? '0 0 0 2px rgba(167,139,250,0.45), 0 0 28px rgba(167,139,250,0.35)' : 'none' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(90deg, rgba(167,139,250,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.30)' }}>
                    <Wallet className="h-4 w-4 text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#F8FAFC]">Web3 Wallet Top Up</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Send USDT in one click — no TxHash needed</p>
                  </div>
                </div>
              </div>
              <div className="p-5">

                {/* Not connected — single Connect Wallet button (no pre-connect network selection) */}
                {!w3Connected && (
                  <div className="flex flex-col items-center py-6 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)', border: '2px solid rgba(167,139,250,0.25)' }}>
                      <Wallet className="h-8 w-8 text-[#A78BFA]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-[#F8FAFC]">Connect Your Wallet</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Connect MetaMask, Trust Wallet, Coinbase Wallet or any EVM wallet via WalletConnect to deposit USDT.
                      </p>
                    </div>
                    <button
                      onClick={() => void evmWallet.openWalletModal()}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-black text-white transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                    >
                      <Wallet className="w-4 h-4" /> Connect Wallet <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-[#64748B]">Supports 300+ wallets · BSC · Polygon · Arbitrum · Optimism · Base · Linea</p>
                    {isMobileDevice && !hasInjectedProvider && (() => {
                      const fullUrl = typeof window !== 'undefined' ? window.location.href : '';
                      const hostPath = typeof window !== 'undefined' ? `${window.location.host}${window.location.pathname}` : '';
                      const enc = encodeURIComponent(fullUrl);
                      const deepLinks = [
                        { name: 'MetaMask', href: `https://metamask.app.link/dapp/${hostPath}` },
                        { name: 'Trust',    href: `https://link.trustwallet.com/open_url?url=${enc}` },
                        { name: 'Coinbase', href: `https://go.cb-w.com/dapp?cb_url=${enc}` },
                      ];
                      return (
                        <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl text-left max-w-xs" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.20)' }}>
                          <div className="flex items-start gap-2">
                            <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                              On mobile? Open Xing Huang inside your wallet's in-app browser for one-tap deposits — or tap Connect Wallet above to link via WalletConnect.
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {deepLinks.map(({ name, href }) => (
                              <a
                                key={name}
                                href={href}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-[#38BDF8] transition-colors hover:bg-[rgba(56,189,248,0.12)]"
                                style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.24)' }}
                              >
                                {name} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Connected — EVM wallet detected */}
                {w3Connected && walletPhase !== 'success' && (
                  <div className="space-y-3">

                    {/* Wallet address row */}
                    <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl" style={{ background: 'rgba(0,223,169,0.10)', border: '1px solid rgba(0,223,169,0.30)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-[#00DFA9] animate-pulse shrink-0" />
                        <span className="text-[12px] font-mono font-semibold text-[#00DFA9] truncate">
                          {w3Address?.slice(0, 8)}…{w3Address?.slice(-6)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(w3Address ?? '');
                            setW3CopiedAddr(true);
                            setTimeout(() => setW3CopiedAddr(false), 2000);
                          }}
                          className="p-1 rounded-md hover:bg-white/5 transition-colors shrink-0"
                          title="Copy address"
                        >
                          {w3CopiedAddr
                            ? <Check className="w-3.5 h-3.5 text-[#00DFA9]" />
                            : <Copy className="w-3.5 h-3.5 text-[#00DFA9]" />}
                        </button>
                      </div>
                      {chainCfg ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                          style={{ background: `${chainCfg.color}22`, color: chainCfg.color, border: `1px solid ${chainCfg.color}50` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: chainCfg.color }} />
                          {chainCfg.network}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#FACC15] shrink-0"
                          style={{ background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.40)' }}>
                          ⚠ Unsupported
                        </span>
                      )}
                    </div>

                    {/* Change Wallet / Disconnect */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleChangeWallet()}
                        disabled={walletProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-[#A78BFA] transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)' }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Change Wallet
                      </button>
                      <button
                        onClick={handleWalletDisconnect}
                        disabled={walletProcessing}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-red-400 transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <LogOut className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>

                    {/* Network selector — deposit on any supported chain */}
                    <div className="p-3 rounded-xl space-y-2.5" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Top Up Network</p>
                        {chainCfg ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#00DFA9]">
                            <CheckCircle2 className="w-3 h-3" /> {chainCfg.label} Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#FACC15]">
                            <AlertCircle className="w-3 h-3" /> Pick a network
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {SUPPORTED_CHAIN_IDS.map(id => {
                          const c = EVM_CHAINS[id];
                          if (!c) return null;
                          const isActive = evmWallet.chainId === id;
                          return (
                            <button
                              key={id}
                              onClick={() => { if (!isActive) void handleNetworkSwitch(id); }}
                              disabled={walletProcessing}
                              className="flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all hover:brightness-125 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={isActive
                                ? { background: `${c.color}28`, color: c.color, border: `1.5px solid ${c.color}` }
                                : { background: `${c.color}12`, color: c.color, border: `1px solid ${c.color}30` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                              {c.network}
                            </button>
                          );
                        })}
                      </div>
                      {!chainCfg && (
                        <p className="text-[10px] text-[#64748B]">Your wallet is on an unsupported network. Tap a network above to switch and deposit USDT.</p>
                      )}
                    </div>

                    {/* Error banner */}
                    {walletPhase === 'error' && walletError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-400 flex-1 whitespace-pre-wrap break-all">{walletError}</p>
                      </div>
                    )}

                    {/* Deposit UI — only on a supported network */}
                    {chainCfg && (
                      <>
                        {/* USDT + Gas balance row */}
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">USDT Balance</p>
                            {evmBalance !== null ? (
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[14px] font-black text-[#A78BFA] leading-tight">
                                  {evmBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  <span className="text-[10px] font-bold ml-1 text-[#64748B]">USDT</span>
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setWalletDepAmount(evmBalance.toFixed(2))}
                                  disabled={walletProcessing || evmBalance <= 0}
                                  className="px-2 py-0.5 rounded-lg text-[9px] font-black transition-all disabled:opacity-40"
                                  style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.30)' }}
                                >
                                  MAX
                                </button>
                              </div>
                            ) : evmBalanceError ? (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-red-400">Failed to load</span>
                                <button
                                  type="button"
                                  onClick={() => { setEvmBalanceError(false); setEvmBalanceNonce(n => n + 1); }}
                                  className="text-[9px] font-bold text-[#38BDF8] hover:underline"
                                >
                                  Retry ↺
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading…
                              </span>
                            )}
                          </div>
                          {gasBalance !== null ? (() => {
                            const minGas = MIN_NATIVE_GAS[evmWallet.chainId] ?? 0.001;
                            const isLow = gasBalance < minGas;
                            return (
                              <div className="text-right shrink-0 ml-3">
                                <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Gas · {chainCfg.nativeToken}</p>
                                <p className={cn('text-[14px] font-black leading-tight', isLow ? 'text-red-400' : 'text-[#CBD5E1]')}>
                                  {gasBalance.toFixed(4)}
                                  {isLow && <span className="text-[9px] font-bold ml-1 text-red-400">LOW</span>}
                                </p>
                              </div>
                            );
                          })() : gasError ? (
                            <div className="text-right shrink-0 ml-3">
                              <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide">Gas · {chainCfg.nativeToken}</p>
                              <p className="text-[12px] font-bold text-red-400 leading-tight">—</p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#64748B] flex items-center gap-1 shrink-0 ml-3">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            </span>
                          )}
                        </div>

                        {/* Receiving deposit address for the active chain */}
                        {platformDepositAddr && (
                          <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Receiving Address · {chainCfg.label}</p>
                            <div className="flex items-center gap-2">
                              <p className="flex-1 min-w-0 text-[10px] font-mono text-[#CBD5E1] truncate">{platformDepositAddr}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(platformDepositAddr);
                                  setW3DepAddrCopied(true);
                                  setTimeout(() => setW3DepAddrCopied(false), 1500);
                                }}
                                className="shrink-0 p-1.5 rounded-lg transition-all hover:bg-white/5"
                                title="Copy address"
                              >
                                {w3DepAddrCopied
                                  ? <Check className="w-3 h-3 text-[#00DFA9]" />
                                  : <Copy className="w-3 h-3 text-[#64748B]" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Amount input */}
                        <div>
                          <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Amount (USDT)</label>
                          <div className="relative mt-1.5">
                            <input
                              type="number" min="10" step="1"
                              value={walletDepAmount}
                              onChange={e => setWalletDepAmount(e.target.value)}
                              disabled={walletProcessing}
                              className="w-full rounded-xl px-4 py-3 text-[15px] font-bold text-[#F8FAFC] pr-16 outline-none disabled:opacity-60"
                              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.25)' }}
                              placeholder="50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#A78BFA]">USDT</span>
                          </div>
                          {/* Quick amount presets */}
                          <div className="grid grid-cols-5 gap-1.5 mt-2">
                            {[25, 50, 100, 250, 500].map(v => {
                              const active = parseFloat(walletDepAmount || '0') === v;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setWalletDepAmount(String(v))}
                                  disabled={walletProcessing}
                                  className="py-1.5 rounded-lg text-[11px] font-black transition-all disabled:opacity-40"
                                  style={active
                                    ? { background: 'rgba(167,139,250,0.20)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.50)' }
                                    : { background: 'rgba(255,255,255,0.04)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                  ${v}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT</p>
                        </div>

                        {/* Confirmation progress */}
                        {walletPhase === 'confirming' && walletConfirmations && (
                          <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.20)' }}>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#38BDF8]">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Confirming on-chain
                              </span>
                              <span className="text-[11px] font-black text-[#38BDF8] tabular-nums">
                                {walletConfirmations.current} / {walletConfirmations.target}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(56,189,248,0.15)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, (walletConfirmations.current / Math.max(1, walletConfirmations.target)) * 100)}%`,
                                  background: '#38BDF8',
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-[#64748B]">Funds credit automatically once confirmed.</p>
                              {walletPendingTx && (
                                <a
                                  href={walletPendingTx.explorerUrl}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] font-bold text-[#38BDF8] hover:underline shrink-0"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Tx
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Deposit button */}
                        {(() => {
                          const amt = parseFloat(walletDepAmount || '0');
                          const belowMin = !(amt >= 10);
                          const insufficientUsdt = evmBalance !== null && amt > evmBalance;
                          const minGas = MIN_NATIVE_GAS[evmWallet.chainId] ?? 0.001;
                          const lowGas = gasBalance !== null && gasBalance < minGas;
                          const isDisabled = walletProcessing || belowMin || insufficientUsdt || lowGas;
                          return (
                            <div className="space-y-2">
                              {walletPhase === 'idle' && walletGasEstimate && !belowMin && !insufficientUsdt && (
                                <div className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px]" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.16)' }}>
                                  <span className="flex items-center gap-1.5 text-[#94A3B8]">
                                    <Info className="w-3.5 h-3.5 text-[#38BDF8]" /> Est. network fee
                                  </span>
                                  <span className="font-bold text-[#CBD5E1] tabular-nums">
                                    {walletGasEstimate.usd ? `~$${walletGasEstimate.usd}` : `~${walletGasEstimate.native} ${walletGasEstimate.symbol}`}
                                    <span className="text-[#64748B] font-medium"> · {walletGasEstimate.native} {walletGasEstimate.symbol}</span>
                                  </span>
                                </div>
                              )}
                              {lowGas && (
                                <div className="flex items-center gap-2 p-2.5 rounded-xl text-[10px]" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  <span className="text-red-400">Not enough {chainCfg.nativeToken} for gas — top up before depositing</span>
                                </div>
                              )}
                              <button
                                onClick={handleEvmDeposit}
                                disabled={isDisabled}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                                style={{ background: isDisabled ? 'rgba(0,223,169,0.4)' : 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: isDisabled ? 'none' : '0 0 20px rgba(0,223,169,0.30)' }}
                              >
                                {walletPhase === 'sending' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Approve in wallet…</>
                                ) : walletPhase === 'confirming' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Waiting for confirmation…</>
                                ) : walletPhase === 'submitting' ? (
                                  <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Verifying on-chain…</>
                                ) : belowMin ? (
                                  <>Minimum Top Up is 10 USDT</>
                                ) : insufficientUsdt ? (
                                  <>Insufficient USDT Balance</>
                                ) : lowGas ? (
                                  <>Insufficient {chainCfg.nativeToken} for Gas</>
                                ) : (
                                  <>Confirm Top Up · {amt} USDT <ChevronRight className="w-4 h-4" /></>
                                )}
                              </button>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                {/* Success */}
                {w3Connected && walletPhase === 'success' && walletResult && (
                  <div className="flex flex-col items-center py-6 gap-4 text-center">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,223,169,0.12)', border: '2px solid rgba(0,223,169,0.35)', boxShadow: '0 0 32px rgba(0,223,169,0.2)' }}>
                        <CheckCircle2 className="h-8 w-8 text-[#00DFA9]" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00DFA9] flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#0B0F14]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#F8FAFC]">
                        {walletResult.autoVerified ? 'Top Up Verified! ⚡' : 'Top Up Submitted!'}
                      </p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        {walletResult.autoVerified
                          ? <><span className="text-[#00DFA9] font-semibold">Automatically verified</span> — funds are in your account.</>
                          : <>Under review — usually credited within 5–30 min.</>}
                      </p>
                    </div>

                    {/* Amount + network + updated balance */}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-xl text-left" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-0.5">Amount</p>
                        <p className="text-[14px] font-black text-[#00DFA9]">${walletResult.amount} <span className="text-[10px] font-bold text-[#64748B]">USDT</span></p>
                      </div>
                      <div className="p-3 rounded-xl text-left" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-0.5">Network</p>
                        <p className="text-[14px] font-black text-[#F8FAFC]">{walletResult.network}</p>
                      </div>
                      {walletResult.autoVerified && (
                        <div className="col-span-2 p-3 rounded-xl text-left" style={{ background: 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.2)' }}>
                          <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-0.5">Updated Balance</p>
                          <p className="text-[16px] font-black text-[#00DFA9]">${balance.toFixed(2)} <span className="text-[10px] font-bold text-[#64748B]">USDT</span></p>
                        </div>
                      )}
                    </div>

                    {/* Transaction hash + explorer link */}
                    <div className="w-full flex items-center gap-2 p-3 rounded-xl text-left" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-[#64748B] uppercase tracking-wide mb-0.5">Transaction Hash</p>
                        <p className="text-[10px] font-mono text-[#CBD5E1] truncate">
                          {walletResult.txHash.slice(0, 22)}…{walletResult.txHash.slice(-8)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => navigator.clipboard.writeText(walletResult.txHash)}
                          className="p-1.5 rounded-lg transition-all hover:bg-white/5"
                          title="Copy hash"
                        >
                          <Copy className="w-3 h-3 text-[#64748B]" />
                        </button>
                        {walletResult.explorerUrl && (
                          <a
                            href={walletResult.explorerUrl}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-all"
                            style={{ border: '1px solid rgba(56,189,248,0.20)' }}
                          >
                            <ExternalLink className="w-3 h-3" /> View Tx
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full">
                      {walletResult.autoVerified ? (
                        <button
                          onClick={() => { resetWalletDeposit(); navigate('/'); }}
                          className="flex-1 py-2.5 rounded-xl text-[13px] font-black text-[#0B0F14]"
                          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                        >
                          Start Betting →
                        </button>
                      ) : (
                        <button
                          onClick={() => setTab('history')}
                          className="flex-1 py-2.5 rounded-xl text-[13px] font-black text-[#0B0F14]"
                          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                        >
                          View History →
                        </button>
                      )}
                      <button
                        onClick={resetWalletDeposit}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#38BDF8] border border-[#38BDF8]/25 hover:bg-[#38BDF8]/10 transition-all"
                      >
                        Top Up More
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Manual USDT flow ─────────────────────────────────────────── */}
          {depositMethod === 'manual' && (() => {
            const MANUAL_NETS = [
              { val: 'TRC-20'   as const, short: 'TRC-20',   fullName: 'Tron (TRC-20)',    coinLabel: 'USDT', color: '#00DFA9', badge: '⚡ Auto',    min: 'Min $10', autoVerify: true,  warning: 'Only send USDT on TRC-20 (Tron). Sending on any other network will result in permanent loss.' },
              { val: 'ERC-20'   as const, short: 'ERC-20',   fullName: 'Ethereum (ERC-20)',coinLabel: 'USDT', color: '#627EEA', badge: '⚡ Auto',    min: 'Min $10', autoVerify: true,  warning: 'Only send USDT on Ethereum (ERC-20). Do not send on TRC-20/Tron or other networks.' },
              { val: 'BSC'      as const, short: 'BEP-20',   fullName: 'BNB Smart Chain',  coinLabel: 'USDT', color: '#F0B90B', badge: '⚡ Auto',    min: 'Min $10', autoVerify: true,  warning: 'Only send USDT on BEP-20 (BSC). Sending on TRC-20 or Ethereum will result in loss.' },
              { val: 'SOLANA'   as const, short: 'Solana',   fullName: 'Solana (SPL)',     coinLabel: 'USDT', color: '#9945FF', badge: '⚡ Auto',    min: 'Min $10', autoVerify: true,  warning: 'Only send USDT SPL on Solana. Sending SOL or other tokens will result in permanent loss.' },
              { val: 'TON'      as const, short: 'TON',      fullName: 'TON Network',      coinLabel: 'USDT', color: '#0098EA', badge: '⚡ Auto',    min: 'Min $10', autoVerify: true,  warning: 'Only send USDT Jetton on TON. Sending native TON will result in loss.' },
              { val: 'BTC'      as const, short: 'Bitcoin',  fullName: 'Bitcoin Network',  coinLabel: 'BTC',  color: '#F7931A', badge: '🕐 Review', min: 'Admin',   autoVerify: false, warning: 'Only send native BTC. Admin converts to USDT and credits within 30 min.' },
            ];
            const net = MANUAL_NETS.find(n => n.val === manualNetwork) ?? MANUAL_NETS[0];
            const addr = depositInfo ? getManualAddress(manualNetwork, depositInfo) : '';
            const qrData = addr ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(addr)}&bgcolor=ffffff&color=000000&margin=6` : '';

            return (
              <>
                {/* ── Network summary strip ── */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-1 pb-1">
                  <span className="text-[9px] font-bold text-[#475569] uppercase tracking-wider shrink-0">6 Networks:</span>
                  {([
                    { name: 'TRC-20',  color: '#00DFA9' },
                    { name: 'ERC-20',  color: '#627EEA' },
                    { name: 'BEP-20',  color: '#F0B90B' },
                    { name: 'Solana',  color: '#9945FF' },
                    { name: 'TON',     color: '#0098EA' },
                    { name: 'Bitcoin', color: '#F7931A' },
                  ] as { name: string; color: string }[]).map(n => (
                    <span key={n.name} className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: `${n.color}18`, color: n.color, border: `1px solid ${n.color}30` }}>
                      {n.name}
                    </span>
                  ))}
                </div>

                {/* ── Step indicator ── */}
                <div className="flex items-center gap-2 px-1">
                  {['Select Network', 'Send Funds', 'Confirm TxID'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                          style={{ background: i === 0 ? net.color : i === 1 && addr ? net.color : 'rgba(255,255,255,0.07)', color: (i === 0 || (i === 1 && addr)) ? '#0B0F14' : '#64748B' }}>
                          {i + 1}
                        </div>
                        <span className="text-[10px] font-semibold hidden sm:block" style={{ color: i === 0 ? net.color : '#64748B' }}>{s}</span>
                      </div>
                      {i < 2 && <div className="flex-1 h-px bg-white/[0.07]" />}
                    </div>
                  ))}
                </div>

                {/* ── Network selector ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Choose Network
                    </p>
                  </div>
                  <div className="p-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {MANUAL_NETS.map(n => {
                      const isActive = manualNetwork === n.val;
                      return (
                        <button key={n.val}
                          onClick={() => { setManualNetwork(n.val); setCopied(false); setDepSuccess(false); setDepError(''); }}
                          className="relative rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all"
                          style={{
                            background: isActive ? `${n.color}18` : 'rgba(255,255,255,0.03)',
                            border: `1.5px solid ${isActive ? n.color + '70' : 'rgba(255,255,255,0.07)'}`,
                            boxShadow: isActive ? `0 0 12px ${n.color}18` : 'none',
                          }}>
                          {isActive && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: n.color }} />}
                          <span className="text-[11px] font-black" style={{ color: isActive ? n.color : '#94A3B8' }}>{n.short}</span>
                          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${n.color}15`, color: n.color, border: `1px solid ${n.color}25` }}>{n.badge}</span>
                          <span className="text-[7px] font-bold" style={{ color: n.color, opacity: 0.65 }}>{n.min}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Address card ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 100%)', border: `1px solid ${net.color}30` }}>
                  {/* Header */}
                  <div className="px-4 py-3 flex items-center gap-3 border-b border-white/[0.06]"
                    style={{ background: `linear-gradient(90deg, ${net.color}0A 0%, transparent 100%)` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${net.color}20`, border: `1px solid ${net.color}40` }}>
                      <span className="text-[9px] font-black" style={{ color: net.color }}>1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[#F8FAFC]">Send {net.coinLabel} to this address</p>
                      <p className="text-[10px] mt-0.5" style={{ color: net.color }}>{net.fullName}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${net.color}18`, color: net.color, border: `1px solid ${net.color}35` }}>
                      {net.badge}
                    </span>
                  </div>

                  <div className="p-4">
                    {addr ? (
                      <div className="flex flex-col sm:flex-row items-center gap-5">
                        {/* QR Code — generated dynamically for active address */}
                        <div className="relative shrink-0">
                          <div className="p-2.5 rounded-xl bg-white" style={{ boxShadow: `0 0 0 2px ${net.color}30, 0 8px 32px rgba(0,0,0,0.5)` }}>
                            <img src={qrData} alt={`${net.fullName} QR code`}
                              className="w-[140px] h-[140px] object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap"
                            style={{ background: '#0B0F14', color: net.color, borderColor: `${net.color}40` }}>
                            Scan to deposit
                          </div>
                        </div>

                        {/* Address + copy */}
                        <div className="flex-1 w-full space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                              {net.fullName} Wallet Address
                            </p>
                            <div className="flex items-start gap-2 rounded-xl p-3"
                              style={{ background: '#0B0F14', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <p className="flex-1 text-[11px] font-mono leading-relaxed break-all select-all" style={{ color: net.color }}>{addr}</p>
                              <button onClick={copyAddress}
                                className="shrink-0 p-2 rounded-lg transition-all mt-0.5"
                                style={{ background: copied ? `${net.color}20` : 'rgba(255,255,255,0.05)', color: copied ? net.color : '#64748B' }}>
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            {copied && (
                              <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: net.color }}>
                                <Check className="h-2.5 w-2.5" /> Address copied!
                              </p>
                            )}
                          </div>

                          {/* Warning */}
                          <div className="flex items-start gap-2 rounded-xl p-3"
                            style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.15)' }}>
                            <AlertCircle className="h-3.5 w-3.5 text-[#FACC15] shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[#FACC15]/80 leading-relaxed">{net.warning}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-6 gap-2 text-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                          <Lock className="h-5 w-5 text-[#64748B]" />
                        </div>
                        <p className="text-[13px] font-bold text-[#F8FAFC]">Address not configured</p>
                        <p className="text-[11px] text-[#64748B] max-w-xs">This network is not available right now. Please use NOWPayments or choose a different network.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Step 2: Submit TxID ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0E1520 100%)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div className="px-4 py-3 border-b border-white/[0.06]"
                    style={{ background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                        <span className="text-[9px] font-black text-[#38BDF8]">2</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#F8FAFC]">Submit Your Transaction ID</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">After sending, paste your TxHash to confirm</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {depSubmitting ? (
                      <div className="flex flex-col items-center py-10 gap-5 text-center">
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10"
                            style={{ background: 'radial-gradient(circle, #38BDF8, transparent)', animationDuration: '1.4s' }} />
                          <svg className="w-20 h-20 animate-spin" style={{ animationDuration: '1.1s' }} viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="#38BDF8" strokeWidth="3"
                              strokeDasharray="160" strokeDashoffset="120" strokeLinecap="round" style={{ opacity: 0.9 }} />
                          </svg>
                          <div className="absolute w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)' }}>
                            <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin" />
                          </div>
                        </div>
                        <div>
                          <p className="text-[16px] font-black text-[#F8FAFC]">Verifying on-chain…</p>
                          <p className="text-[11px] text-[#64748B] mt-1">Checking your transaction on the {manualNetwork} blockchain</p>
                        </div>
                        <div className="w-full max-w-xs space-y-2">
                          {['Looking up transaction hash', `Confirming ${net.coinLabel} transfer`, 'Validating recipient & amount'].map((step, i) => (
                            <div key={step} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                              <div className="w-4 h-4 rounded-full border-2 border-[#38BDF8]/40 flex items-center justify-center shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
                              </div>
                              <span className="text-[11px] text-[#64748B] text-left">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : depSuccess ? (
                      <div className="flex flex-col items-center py-8 gap-4 text-center">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{
                              background: depAutoVerified ? 'rgba(0,223,169,0.12)' : 'rgba(250,204,21,0.10)',
                              border: depAutoVerified ? '2px solid rgba(0,223,169,0.35)' : '2px solid rgba(250,204,21,0.30)',
                              boxShadow: depAutoVerified ? '0 0 32px rgba(0,223,169,0.2)' : '0 0 32px rgba(250,204,21,0.15)',
                            }}>
                            <CheckCircle2 className={`h-8 w-8 ${depAutoVerified ? 'text-[#00DFA9]' : 'text-[#FACC15]'}`} />
                          </div>
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${depAutoVerified ? 'bg-[#00DFA9]' : 'bg-[#FACC15]'}`}>
                            <Check className="w-3 h-3 text-[#0B0F14]" />
                          </div>
                        </div>
                        <div>
                          {depAutoVerified ? (
                            <>
                              <p className="text-[18px] font-black text-[#F8FAFC]">Top Up Credited! ⚡</p>
                              <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                                Your transaction was <span className="text-[#00DFA9] font-semibold">verified on-chain instantly</span>. Balance updated.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[18px] font-black text-[#F8FAFC]">Top Up Submitted!</p>
                              <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                                Under manual review — credited within <span className="text-[#38BDF8] font-semibold">5–30 minutes</span>.
                              </p>
                            </>
                          )}
                        </div>
                        {depAutoVerified ? (
                          <div className="flex items-center gap-2 bg-[#00DFA9]/5 border border-[#00DFA9]/15 rounded-xl px-4 py-2.5">
                            <Check className="h-3.5 w-3.5 text-[#00DFA9] shrink-0" />
                            <p className="text-[11px] text-[#00DFA9]/80">Funds are available in your wallet now</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-[#FACC15]/5 border border-[#FACC15]/15 rounded-xl px-4 py-2.5">
                            <Clock className="h-3.5 w-3.5 text-[#FACC15] shrink-0" />
                            <p className="text-[11px] text-[#FACC15]/80">You'll be notified when your deposit is approved</p>
                          </div>
                        )}
                        <button onClick={() => { setDepSuccess(false); setDepAutoVerified(false); }}
                          className="mt-1 px-5 py-2 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/25 hover:bg-[#38BDF8]/10 transition-all">
                          Submit another deposit
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={submitDeposit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Amount */}
                          <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                              <CircleDollarSign className="h-3 w-3" /> Amount Sent ({net.coinLabel})
                            </label>
                            <div className="relative">
                              <input type="number"
                                min={net.coinLabel === 'BTC' ? '0.00001' : net.coinLabel === 'XRP' ? '1' : String(depositInfo?.minDeposit ?? 10)}
                                step={net.coinLabel === 'BTC' ? '0.00000001' : net.coinLabel === 'XRP' ? '0.000001' : '0.01'}
                                value={depAmount} onChange={e => setDepAmount(e.target.value)}
                                placeholder={net.coinLabel === 'BTC' ? 'e.g. 0.001 BTC' : net.coinLabel === 'XRP' ? 'e.g. 50 XRP' : `Min ${depositInfo?.minDeposit ?? 10} USDT`}
                                className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#00DFA9]/60 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all pr-16" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 px-2 py-0.5 rounded-lg">{net.coinLabel}</span>
                            </div>
                            {!net.autoVerify ? (
                              <p className="text-[10px] text-[#64748B] mt-1.5 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" /> Admin converts to USDT and credits within 30 min
                              </p>
                            ) : (
                              <p className="text-[10px] text-[#00DFA9] mt-1.5 flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5" /> Auto-credited once confirmed on-chain
                              </p>
                            )}
                          </div>

                          {/* TxID */}
                          <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                              <ExternalLink className="h-3 w-3" /> Transaction Hash (TxID)
                            </label>
                            <input type="text" value={depTxHash} onChange={e => setDepTxHash(e.target.value)}
                              placeholder="Paste your TxHash here…"
                              className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[12px] font-mono text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/20 transition-all" />
                            <p className="text-[10px] text-[#64748B] mt-1.5">Find in your wallet's transaction history</p>
                          </div>
                        </div>

                        {/* Help box */}
                        <div className="rounded-xl p-3" style={{ background: '#0B0F14', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Where to find your TxID
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              { app: 'Trust Wallet', steps: 'History → tap tx → copy TxID' },
                              { app: 'Binance', steps: 'Wallet → Withdraw History → TxID' },
                              { app: 'OKX / Others', steps: 'Transaction History → Hash' },
                            ].map(({ app, steps }) => (
                              <div key={app} className="flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-[#38BDF8] mt-1.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] font-bold text-[#38BDF8]">{app}</p>
                                  <p className="text-[10px] text-[#64748B] leading-relaxed">{steps}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {depError && (
                          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3.5">
                            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                            <p className="text-[12px] text-red-400">{depError}</p>
                          </div>
                        )}

                        <button type="submit" disabled={depSubmitting || !addr}
                          className="w-full py-3.5 rounded-xl font-black text-[14px] text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.25)' }}>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm Top Up
                        </button>

                        <p className="text-center text-[10px] text-[#334155]">
                          Secured by on-chain verification · Min {depositInfo?.minDeposit ?? 10} USDT
                        </p>
                      </form>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
          {/* ── Recent Deposits ─────────────────────────────────────────── */}
          {txns.filter(t => t.type === 'deposit').slice(0, 3).length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Recent Deposits
                </p>
                <button onClick={() => setTab('history')}
                  className="text-[10px] font-semibold text-[#38BDF8] hover:opacity-75 transition-opacity">
                  View All →
                </button>
              </div>
              {txns.filter(t => t.type === 'deposit').slice(0, 3).map((tx, i) => (
                <div key={tx.id} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-white/[0.04]')}>
                  <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/10 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-[#00DFA9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#F8FAFC]">+${fmt(tx.amount)} USDT</p>
                    <p className="text-[10px] text-[#64748B]">{tx.network ?? 'TRC-20'} · {fmtDate(tx.createdAt)}</p>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WITHDRAW TAB ──────────────────────────────────────────────────── */}
      {tab === 'withdraw' && (
        <div className="space-y-4">

          {/* Balance card */}
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0E1520] to-[#0B1019] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#00DFA9]" />
              </div>
              <div>
                <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider mb-0.5">Available Balance</p>
                <p className="text-[22px] font-black text-[#F8FAFC] leading-none">
                  {fmt(balance)} <span className="text-[13px] font-bold text-[#00DFA9]">USDT</span>
                </p>
              </div>
            </div>
            {balance >= 100 && (
              <div className="text-right">
                <p className="text-[9px] text-[#64748B] uppercase tracking-wider">Withdrawable</p>
                <p className="text-[11px] font-bold text-[#00DFA9]">✓ Eligible</p>
              </div>
            )}
            {balance < 100 && balance > 0 && (
              <div className="text-right">
                <p className="text-[9px] text-[#FACC15] uppercase tracking-wider">Need</p>
                <p className="text-[11px] font-bold text-[#FACC15]">{fmt(100 - balance)} more</p>
              </div>
            )}
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E1520] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-[#38BDF8]/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center">
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#38BDF8]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#F8FAFC]">Request Withdrawal</p>
                  <p className="text-[10px] text-[#64748B]">Admin reviews and sends manually within 24 hours</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {wdProcessing ? (
                /* ── Processing animation ── */
                <div className="flex flex-col items-center py-10 gap-5 text-center">
                  <div className="relative w-20 h-20">
                    {/* Outer spinning ring */}
                    <svg className="absolute inset-0 animate-spin" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="36" stroke="#38BDF8" strokeWidth="2.5" strokeDasharray="56 170" strokeLinecap="round"/>
                    </svg>
                    {/* Inner spinning ring (opposite direction) */}
                    <svg className="absolute inset-0" style={{ animation: 'spin 1.4s linear infinite reverse' }} viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="27" stroke="#00DFA9" strokeWidth="2" strokeDasharray="36 133" strokeLinecap="round"/>
                    </svg>
                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ArrowUpRight className="h-7 w-7 text-[#38BDF8]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#F8FAFC]">Submitting Request…</p>
                    <p className="text-[12px] text-[#64748B] mt-1">Securely sending your withdrawal request</p>
                  </div>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"
                        style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                      />
                    ))}
                  </div>
                </div>
              ) : wdSuccess ? (
                /* ── Success state ── */
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-[#00DFA9]/10 border-2 border-[#00DFA9]/30 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-[#00DFA9]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#00DFA9] flex items-center justify-center">
                      <span className="text-[8px] font-black text-[#0B0F14]">✓</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[16px] font-bold text-[#F8FAFC]">Withdrawal Requested!</p>
                    <p className="text-[12px] text-[#64748B] mt-1 max-w-[260px] mx-auto leading-relaxed">
                      Your request is pending admin review. You'll receive your funds within 24 hours.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full max-w-xs">
                    <button onClick={() => { setWdSuccess(false); setTab('history'); }}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/30 hover:bg-[#38BDF8]/10 transition-all">
                      View History
                    </button>
                    <button onClick={() => setWdSuccess(false)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-[#F8FAFC] bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-all">
                      New Request
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitWithdrawal} className="space-y-5">

                  {/* Step 1 — Network */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-black text-[#38BDF8]">1</span>
                      <p className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider">Select Network</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([
                        { id: 'TRC-20', label: 'TRC-20', chain: 'Tron (USDT)',      color: '#00DFA9', desc: 'Low fees',    icon: 'TRX' },
                        { id: 'TRX',    label: 'TRX',    chain: 'Tron Coin',        color: '#EF4444', desc: 'Native TRX',  icon: 'TRX' },
                        { id: 'BSC',    label: 'BEP-20', chain: 'BNB Smart Chain',  color: '#F0B90B', desc: 'Low fees',    icon: 'BNB' },
                        { id: 'BTC',    label: 'BTC',    chain: 'Bitcoin',          color: '#F7931A', desc: 'Bitcoin',     icon: '₿'   },
                      ] as const).map(net => (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => { setWdNetwork(net.id); setWdAddress(''); }}
                          className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                            wdNetwork === net.id
                              ? 'border-[#38BDF8] bg-[#38BDF8]/10'
                              : 'border-white/[0.08] bg-[#0B0F14] hover:border-white/[0.15]'
                          }`}
                        >
                          {wdNetwork === net.id && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#38BDF8] flex items-center justify-center">
                              <span className="text-[7px] font-black text-[#0B0F14]">✓</span>
                            </span>
                        )}
                          <div className="w-6 h-6 rounded-lg mb-2 flex items-center justify-center" style={{ backgroundColor: net.color + '22', border: `1px solid ${net.color}44` }}>
                            <span className="text-[8px] font-black" style={{ color: net.color }}>{net.icon}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#F8FAFC]">{net.label}</p>
                          <p className="text-[9px] text-[#64748B]">{net.chain}</p>
                          <p className="text-[9px] mt-1 font-medium" style={{ color: net.color }}>{net.desc}</p>
                        </button>
                      ))}
                    </div>
                    {wdNetwork === 'TRX' && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                        <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-red-400/80 leading-relaxed">TRX withdrawals are processed as native Tron coin. Admin will convert your USDT balance and send TRX to your Tron address.</p>
                      </div>
                    )}
                    {wdNetwork === 'BSC' && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(240,185,11,0.06)', border: '1px solid rgba(240,185,11,0.18)' }}>
                        <AlertCircle className="h-3.5 w-3.5 text-[#F0B90B] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[#F0B90B]/80 leading-relaxed">Send your BSC (BEP-20) wallet address. Only send USDT on BNB Smart Chain to this address.</p>
                      </div>
                    )}
                    {wdNetwork === 'BTC' && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5" style={{ background: 'rgba(247,147,26,0.06)', border: '1px solid rgba(247,147,26,0.18)' }}>
                        <AlertCircle className="h-3.5 w-3.5 text-[#F7931A] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[#F7931A]/80 leading-relaxed">BTC withdrawals are processed as Bitcoin. Admin will convert your USDT balance and send BTC to your address.</p>
                      </div>
                    )}
                  </div>

                  {/* Step 2 — Amount */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-black text-[#38BDF8]">2</span>
                      <p className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider">Enter Amount</p>
                      <span className="ml-auto text-[10px] text-[#64748B]">Min: <span className="text-[#FACC15] font-bold">100 USDT</span></span>
                    </div>

                    {/* Quick % buttons */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setWdAmount((balance * pct / 100).toFixed(2))}
                          className="py-1.5 rounded-lg text-[10px] font-bold bg-[#0B0F14] border border-white/[0.08] text-[#64748B] hover:border-[#38BDF8]/40 hover:text-[#38BDF8] transition-all"
                        >
                          {pct === 100 ? 'MAX' : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="100"
                        max={balance}
                        step="0.01"
                        value={wdAmount}
                        onChange={e => setWdAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[18px] font-black text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#38BDF8]/50 transition-colors pr-20"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#00DFA9]">USDT</span>
                    </div>

                    {wdAmount && parseFloat(wdAmount) > 0 && (
                      <p className="text-[10px] text-[#64748B] mt-1.5">
                        Remaining after withdrawal:{' '}
                        <span className="text-[#F8FAFC] font-bold">
                          {fmt(Math.max(0, balance - parseFloat(wdAmount)))} USDT
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Step 3 — Wallet Address */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[9px] font-black text-[#38BDF8]">3</span>
                      <p className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider">
                        Your {wdNetwork} Wallet Address
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={wdAddress}
                        onChange={e => setWdAddress(e.target.value)}
                        placeholder={
                          wdNetwork === 'TRC-20' ? 'e.g. TQn5m… Tron USDT (TRC-20) address' :
                          wdNetwork === 'TRX'    ? 'e.g. TQn5m… Tron (TRX) address' :
                          wdNetwork === 'BSC'    ? 'e.g. 0x742d… BNB Smart Chain address' :
                          wdNetwork === 'BTC'    ? 'e.g. bc1q… or 1… or 3… Bitcoin address' :
                          'e.g. 0x742d… wallet address'
                        }
                        className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[12px] font-mono text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
                      />
                    </div>
                    <div className="flex items-start gap-1.5 mt-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2">
                      <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-400 leading-relaxed">
                        Always double-check your address. Withdrawals sent to incorrect addresses are <strong>irreversible</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-[#38BDF8]/[0.04] border border-[#38BDF8]/[0.12] rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                      <p className="text-[11px] font-bold text-[#38BDF8]">Withdrawal Terms</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ['Min. Amount', '100 USDT'],
                        ['Network', wdNetwork],
                        ['Processing', 'Within 24 hrs'],
                        ['Fees', 'None from us'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between bg-[#0B0F14] rounded-lg px-2.5 py-1.5">
                          <span className="text-[9px] text-[#64748B] font-semibold uppercase">{k}</span>
                          <span className="text-[10px] font-bold text-[#F8FAFC]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {wdError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <p className="text-[12px] text-red-400">{wdError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={wdSubmitting || balance < 100}
                    className="w-full py-3.5 rounded-xl font-bold text-[13px] bg-gradient-to-r from-[#38BDF8] to-[#60A5FA] text-[#0B0F14] hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#38BDF8]/10"
                  >
                    {wdSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...
                      </span>
                    ) : balance < 100 ? (
                      `Insufficient Balance (min 100 USDT)`
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ArrowUpRight className="h-4 w-4" /> Request Withdrawal
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-5">

          {/* ── Referral Earnings ────────────────────────────────────────── */}
          {referral.isLoaded && referral.commissions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-[#FACC15]" />
                  <p className="text-[13px] font-bold text-[#F8FAFC]">Referral Earnings</p>
                  {referral.pendingEarned > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/25">
                      ${fmt(referral.pendingEarned)} claimable
                    </span>
                  )}
                </div>
                {referral.pendingEarned > 0 && (
                  <button
                    onClick={async () => { await referral.claimPending(); loadData(); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#00DFA9] border border-[#00DFA9]/25 rounded-lg px-3 py-1.5 hover:bg-[#00DFA9]/10 transition-all">
                    <Gift className="h-3 w-3" /> Claim All
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-[#FACC15]/15 overflow-hidden bg-[#0E1520]">
                {referral.commissions.map((c, i) => (
                  <div key={c.id} className={cn('p-4', i > 0 && 'border-t border-white/[0.04]')}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#FACC15]/10 border border-[#FACC15]/15">
                        <Users className="h-4 w-4 text-[#FACC15]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-[#F8FAFC]">Referral Commission</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FACC15]/10 text-[#FACC15]">
                            Tier {c.level}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{fmtDate(c.date)}</p>
                        {c.referredAddress && (
                          <p className="text-[10px] text-[#64748B] mt-0.5">From: {c.referredAddress}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-bold text-[#FACC15]">+${fmt(c.earned)}</p>
                        <span className={cn(
                          'text-[10px] font-semibold',
                          c.status === 'paid' ? 'text-[#00DFA9]' : 'text-[#FACC15]'
                        )}>
                          {c.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {referral.paidEarned > 0 && (
                <div className="flex items-center justify-between text-[11px] text-[#64748B] px-1">
                  <span>Total earned from referrals</span>
                  <span className="font-bold text-[#FACC15]">${fmt(referral.totalEarned)} USDT</span>
                </div>
              )}
            </div>
          )}

          {/* ── Wallet Transactions ───────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Header + filter + refresh */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-[#F8FAFC]">Transaction History</p>
              <button onClick={loadData}
                className="flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-[#00DFA9] transition-colors shrink-0">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5">
              {(['all', 'deposit', 'withdrawal'] as const).map(f => (
                <button key={f} onClick={() => setHistoryFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all capitalize',
                    historyFilter === f
                      ? 'bg-[#00DFA9] text-[#0B0F14]'
                      : 'bg-white/[0.05] text-[#64748B] border border-white/[0.07] hover:text-[#94A3B8]'
                  )}>
                  {f === 'all' ? 'All' : f === 'deposit' ? '↓ Deposits' : '↑ Withdrawals'}
                </button>
              ))}
              {txns.length > 0 && (
                <span className="ml-auto text-[10px] text-[#475569] self-center">
                  {txns.filter(t => historyFilter === 'all' || t.type === historyFilter).length} txn{txns.filter(t => historyFilter === 'all' || t.type === historyFilter).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {(() => {
              const filtered = txns.filter(t => historyFilter === 'all' || t.type === historyFilter);
              if (filtered.length === 0) return (
                <div className="flex flex-col items-center py-14 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
                    <CircleDollarSign className="h-5 w-5 text-[#94A3B8]/30" />
                  </div>
                  <p className="text-[13px] text-[#94A3B8]/50">
                    {txns.length === 0 ? 'No transactions yet' : 'No transactions in this category'}
                  </p>
                </div>
              );
              return (
                <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-[#0E1520]">
                  {filtered.map((tx, i) => {
                    const isDeposit = tx.type === 'deposit';
                    const credit = isCredit(tx.type);
                    const networkColor = tx.network === 'TRC-20' ? '#00DFA9'
                      : tx.network === 'ERC-20' ? '#627EEA'
                      : tx.network === 'BTC' ? '#F7931A'
                      : tx.network === 'BEP-20' ? '#F0B90B'
                      : tx.network === 'Polygon' ? '#8247E5'
                      : tx.network === 'Solana' ? '#9945FF'
                      : '#64748B';
                    return (
                      <div key={tx.id} className={cn('px-4 py-3.5', i > 0 && 'border-t border-white/[0.04]')}>
                        <div className="flex items-start gap-3">

                          {/* Icon */}
                          <div className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                            isDeposit ? 'bg-[#00DFA9]/10 border border-[#00DFA9]/15' : 'bg-red-500/10 border border-red-500/15'
                          )}>
                            {isDeposit
                              ? <ArrowDownLeft className="h-4 w-4 text-[#00DFA9]" />
                              : <ArrowUpRight className="h-4 w-4 text-red-400" />}
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">

                            {/* Row 1: type + network + status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13px] font-bold text-[#F8FAFC]">
                                {isDeposit ? 'Top Up' : tx.type === 'withdrawal' ? 'Withdrawal' : tx.type}
                              </p>
                              {tx.network && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                  style={{ background: networkColor + '18', color: networkColor, border: `1px solid ${networkColor}30` }}>
                                  {tx.network}
                                </span>
                              )}
                              <span className="ml-auto"><StatusBadge status={tx.status} /></span>
                            </div>

                            {/* Row 2: date */}
                            <p className="text-[10px] text-[#475569] mt-0.5">{fmtDate(tx.createdAt)}</p>

                            {/* Row 3: amount prominent */}
                            <p className={cn('text-[16px] font-black mt-1.5 leading-none', credit ? 'text-[#00DFA9]' : 'text-red-400')}>
                              {credit ? '+' : '−'}{fmt(tx.amount)}
                              <span className="text-[10px] font-bold ml-1 text-[#64748B]">USDT</span>
                            </p>

                            {/* Row 4: txhash / address / rejection reason */}
                            {tx.txHash && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <a href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] text-[#38BDF8] hover:underline font-mono bg-[#38BDF8]/08 px-2 py-0.5 rounded-md border border-[#38BDF8]/15">
                                  {tx.txHash.slice(0, 8)}…{tx.txHash.slice(-6)}
                                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                </a>
                                {isDeposit && tx.verified === true && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> On-chain verified
                                  </span>
                                )}
                                {isDeposit && tx.verified === false && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <Clock className="h-2.5 w-2.5" /> Under review
                                  </span>
                                )}
                              </div>
                            )}
                            {tx.walletAddress && tx.type === 'withdrawal' && (
                              <p className="mt-1.5 text-[9px] text-[#475569] font-mono flex items-center gap-1">
                                <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                                To: {tx.walletAddress.slice(0, 10)}…{tx.walletAddress.slice(-6)}
                              </p>
                            )}
                            {tx.notes && tx.status === 'rejected' && (
                              <p className="mt-1.5 text-[10px] text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-2.5 w-2.5 shrink-0" /> {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
