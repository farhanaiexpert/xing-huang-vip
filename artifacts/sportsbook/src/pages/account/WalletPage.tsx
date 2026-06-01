import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useEvmWallet } from '@/hooks/useEvmWallet';
import { useAutoDeposit, USDT_ABI, TRON_USDT_CONTRACT } from '@/hooks/useAutoDeposit';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, CheckCircle2,
  Clock, XCircle, RefreshCw, Loader2, CircleDollarSign, Shield,
  AlertCircle, ExternalLink, Info, QrCode, Zap, CreditCard, Lock,
  ChevronRight,
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

interface CmPayment {
  uuid: string;
  address: string | null;
  amount: number;
  network: string;
  paymentUrl: string;
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

// ── Main component ─────────────────────────────────────────────────────────────
export function WalletPage() {
  const { isAuthenticated, user } = useAuth();
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

  // NOWPayments
  const [depositMethod, setDepositMethod] = useState<'nowpayments' | 'manual' | 'wallet' | 'cryptomus'>(() => {
    const hint = sessionStorage.getItem('cupbett_deposit_method');
    sessionStorage.removeItem('cupbett_deposit_method');
    if (hint === 'manual') return 'manual';
    if (hint === 'wallet') return 'wallet';
    if (hint === 'cryptomus') return 'cryptomus';
    return 'nowpayments';
  });
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

  // Cryptomus
  const [cmAvailable, setCmAvailable]   = useState<boolean | null>(null);
  const [cmState, setCmState]           = useState<'idle' | 'creating' | 'paying' | 'success' | 'expired' | 'failed'>('idle');
  const [cmAmount, setCmAmount]         = useState('');
  const [cmNetwork, setCmNetwork]       = useState<'trc20' | 'erc20'>('trc20');
  const [cmPayment, setCmPayment]       = useState<CmPayment | null>(null);
  const [cmTimeLeft, setCmTimeLeft]     = useState(0);
  const [cmError, setCmError]           = useState('');
  const [cmAddrCopied, setCmAddrCopied] = useState(false);

  // Withdrawal form
  const [wdAmount, setWdAmount]       = useState('');
  const [wdAddress, setWdAddress]     = useState('');
  const [wdNetwork, setWdNetwork]     = useState<'TRC-20' | 'ERC-20'>('TRC-20');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdProcessing, setWdProcessing] = useState(false);
  const [wdError, setWdError]         = useState('');
  const [wdSuccess, setWdSuccess]     = useState(false);

  const [bonusBalance, setBonusBalance] = useState<number>(0);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    try {
      const [info, bal, history, cmCheck] = await Promise.all([
        api.get<DepositInfo>('/wallet/deposit-info'),
        api.get<{ balance: string; bonusBalance?: string }>('/wallet/balance'),
        api.get<Transaction[]>('/wallet/transactions'),
        api.get<{ available: boolean }>('/wallet/deposit/cryptomus/available').catch(() => ({ available: false })),
      ]);
      setDepositInfo(info);
      setBalance(parseFloat(bal.balance));
      setBonusBalance(parseFloat(bal.bonusBalance ?? '0'));
      setTxns(history);
      setCmAvailable(cmCheck.available);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  const [, navigate] = useLocation();
  const evmWallet = useEvmWallet();
  const w3Address   = evmWallet.address;
  const w3Connected = evmWallet.isConnected;
  const {
    depositAmount: walletDepAmount, setDepositAmount: setWalletDepAmount,
    depositPhase: walletPhase, depositError: walletError, depositResult: walletResult,
    isProcessing: walletProcessing, hasTronLink, chainCfg,
    handleEvmDeposit, handleTronDeposit, resetDeposit: resetWalletDeposit,
  } = useAutoDeposit({ onSuccess: loadData });

  // ── EVM USDT balance (eth_call) ───────────────────────────────────────────
  const [evmBalanceRaw, setEvmBalanceRaw] = useState<bigint | undefined>(undefined);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!e || !w3Address || !w3Connected || !chainCfg) { setEvmBalanceRaw(undefined); return; }
    const owner = w3Address.toLowerCase().replace('0x', '').padStart(64, '0');
    e.request({ method: 'eth_call', params: [{ to: chainCfg.address, data: '0x70a08231' + owner }, 'latest'] })
      .then((hex: string) => { if (hex && hex !== '0x') setEvmBalanceRaw(BigInt(hex)); })
      .catch(() => {});
  }, [w3Address, w3Connected, chainCfg]);
  const evmBalance = (evmBalanceRaw !== undefined && chainCfg)
    ? Number(evmBalanceRaw) / Math.pow(10, chainCfg.decimals)
    : null;

  // ── TronLink USDT balance ─────────────────────────────────────────────────
  const [tronBalance, setTronBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!hasTronLink) { setTronBalance(null); return; }
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tronWeb = (window as any).tronWeb;
        const contract = await tronWeb.contract().at(TRON_USDT_CONTRACT);
        const raw = await contract.balanceOf(tronWeb.defaultAddress.base58).call();
        if (!cancelled) setTronBalance(Number(raw) / 1_000_000);
      } catch { if (!cancelled) setTronBalance(null); }
    })();
    return () => { cancelled = true; };
  }, [hasTronLink]);

  // Whichever wallet is active, pick its balance
  const walletBalance = w3Connected ? evmBalance : hasTronLink ? tronBalance : null;

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
    if (!wdAddress.trim()) { setWdError(`Enter your USDT ${wdNetwork} wallet address`); return; }
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

  // ── Cryptomus handlers ───────────────────────────────────────────────────────
  async function createCmPayment() {
    const amount = parseFloat(cmAmount);
    if (!cmAmount || isNaN(amount) || amount < 10) { setCmError('Minimum deposit is 10 USDT'); return; }
    setCmState('creating'); setCmError('');
    try {
      const result = await api.post<CmPayment & { paymentStatus: string }>(
        '/wallet/deposit/cryptomus/create', { amount, network: cmNetwork }
      );
      setCmPayment(result);
      setCmTimeLeft(result.expiresAt
        ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
        : 900); // 15-minute default matches backend lifetime
      setCmState('paying');
      loadData();
    } catch (err: unknown) {
      setCmError(err instanceof Error ? err.message : 'Failed to create payment');
      setCmState('idle');
    }
  }

  function copyCmAddress() {
    if (!cmPayment?.address) return;
    navigator.clipboard.writeText(cmPayment.address);
    setCmAddrCopied(true);
    setTimeout(() => setCmAddrCopied(false), 2000);
  }

  function resetCm() {
    setCmState('idle'); setCmPayment(null);
    setCmAmount(''); setCmError(''); setCmTimeLeft(0);
  }

  // Cryptomus countdown
  useEffect(() => {
    if (cmState !== 'paying' || cmTimeLeft <= 0) return;
    const id = setInterval(() => {
      setCmTimeLeft(prev => {
        if (prev <= 1) { setCmState('expired'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cmState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cryptomus auto-poll every 12 s
  useEffect(() => {
    if (cmState !== 'paying' || !cmPayment) return;
    const id = setInterval(async () => {
      try {
        const r = await api.get<{ status: string; credited: boolean }>(
          `/wallet/deposit/cryptomus/${cmPayment.uuid}/status`
        );
        if (r.credited || r.status === 'paid' || r.status === 'paid_over') {
          setCmState('success'); loadData();
        } else if (r.status === 'fail' || r.status === 'cancel' || r.status === 'wrong_amount' || r.status === 'wrong_amount_waiting' || r.status === 'system_fail') {
          setCmState('failed');
        }
      } catch { /* silent */ }
    }, 12_000);
    return () => clearInterval(id);
  }, [cmState, cmPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-7 w-7 text-[#00DFA9] animate-spin" />
    </div>
  );

  const pendingDeposits   = txns.filter(t => t.type === 'deposit'    && t.status === 'pending').length;
  const pendingWithdrawals = txns.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;

  return (
    <div className="space-y-5">

      {/* ── Balance hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-6"
        style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 50%, #0B0F14 100%)' }}>
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.15) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Available Balance</p>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-[42px] font-black text-[#F8FAFC] leading-none"
              style={{ textShadow: '0 0 40px rgba(0,223,169,0.2)' }}>
              ${fmt(balance)}
            </span>
            <span className="text-[16px] font-bold text-[#00DFA9] mb-1.5">USDT</span>
          </div>
          {bonusBalance > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#FACC15]/30"
              style={{ background: 'rgba(250,204,21,0.08)' }}>
              <span className="text-[#FACC15] text-[10px]">✦</span>
              <span className="text-[11px] font-bold text-[#FACC15]">+${fmt(bonusBalance)} Bonus</span>
              <span className="text-[10px] text-[#64748B]">· non-withdrawable</span>
            </div>
          )}

          {(pendingDeposits > 0 || pendingWithdrawals > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pendingDeposits > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-2.5 py-1 rounded-full">
                  <Clock className="h-3 w-3" /> {pendingDeposits} deposit{pendingDeposits > 1 ? 's' : ''} pending review
                </span>
              )}
              {pendingWithdrawals > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2.5 py-1 rounded-full">
                  <Clock className="h-3 w-3" /> {pendingWithdrawals} withdrawal{pendingWithdrawals > 1 ? 's' : ''} pending
                </span>
              )}
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
            {t === 'deposit' ? '↓ Deposit' : t === 'withdraw' ? '↑ Withdraw' : '📋 History'}
          </button>
        ))}
      </div>

      {/* ── DEPOSIT TAB ───────────────────────────────────────────────────── */}
      {tab === 'deposit' && (
        <div className="space-y-4">

          {/* ── Method selector ─────────────────────────────────────────── */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-0.5">Choose Deposit Method</p>

            {/* NOWPayments */}
            {(() => {
              const active = depositMethod === 'nowpayments';
              return (
                <button onClick={() => { setDepositMethod('nowpayments'); resetNpp(); }}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 text-left group"
                  style={active
                    ? { background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.05) 100%)', border: '2px solid rgba(56,189,248,0.50)', boxShadow: '0 0 28px rgba(56,189,248,0.10)' }
                    : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                    <Zap className="w-5 h-5 text-[#38BDF8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#F8FAFC]">NOWPayments</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.20)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.40)' }}>★ Recommended</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.30)' }}>Auto Credit</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-tight">300+ cryptocurrencies · ~5–15 min confirmation · No TxHash needed</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['TRC-20','ERC-20','BEP-20','Polygon','Arbitrum','TON','Solana','+more'].map(n => (
                        <span key={n} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[#94A3B8]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                  {active
                    ? <div className="shrink-0 w-6 h-6 rounded-full bg-[#38BDF8] flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.5)]"><Check className="w-3.5 h-3.5 text-[#0B0F14]" /></div>
                    : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                </button>
              );
            })()}

            {/* Cryptomus */}
            {cmAvailable === false ? (
              <div className="w-full rounded-2xl p-4 flex items-center gap-4 cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.45 }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,223,169,0.10)', border: '1px solid rgba(0,223,169,0.20)' }}>
                  <CircleDollarSign className="w-5 h-5 text-[#00DFA9]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-bold text-[#94A3B8]">Cryptomus</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-[#64748B]" style={{ background: 'rgba(100,116,139,0.20)', border: '1px solid rgba(100,116,139,0.25)' }}>Unavailable</span>
                  </div>
                  <p className="text-[11px] text-[#475569]">Currently unavailable in your region</p>
                </div>
                <Lock className="w-4 h-4 text-[#475569] shrink-0" />
              </div>
            ) : (() => {
              const active = depositMethod === 'cryptomus';
              return (
                <button onClick={() => { setDepositMethod('cryptomus'); resetCm(); }}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 text-left group"
                  style={active
                    ? { background: 'linear-gradient(135deg, rgba(0,223,169,0.12) 0%, rgba(0,223,169,0.05) 100%)', border: '2px solid rgba(0,223,169,0.50)', boxShadow: '0 0 28px rgba(0,223,169,0.10)' }
                    : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.30)' }}>
                    <CircleDollarSign className="w-5 h-5 text-[#00DFA9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#F8FAFC]">Cryptomus</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.20)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.40)' }}>Lowest Fees</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.30)' }}>Auto Credit</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-tight">USDT only · ~15–30 min confirmation · Zero platform fee</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['TRC-20','ERC-20'].map(n => (
                        <span key={n} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[#94A3B8]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                  {active
                    ? <div className="shrink-0 w-6 h-6 rounded-full bg-[#00DFA9] flex items-center justify-center shadow-[0_0_12px_rgba(0,223,169,0.5)]"><Check className="w-3.5 h-3.5 text-[#0B0F14]" /></div>
                    : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                </button>
              );
            })()}

            {/* USDT Manual */}
            {(() => {
              const active = depositMethod === 'manual';
              return (
                <button onClick={() => setDepositMethod('manual')}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 text-left group"
                  style={active
                    ? { background: 'linear-gradient(135deg, rgba(0,223,169,0.10) 0%, rgba(0,223,169,0.04) 100%)', border: '2px solid rgba(0,223,169,0.42)', boxShadow: '0 0 24px rgba(0,223,169,0.08)' }
                    : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.30)' }}>
                    <QrCode className="w-5 h-5 text-[#00DFA9]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#F8FAFC]">USDT Manual</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(250,204,21,0.18)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.35)' }}>Most Popular</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-tight">Send USDT directly · Manual verification · 11 networks supported</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['TRC-20','ERC-20','BEP-20','Polygon','Arbitrum','Base','Solana','TON','XRP','BTC'].map(n => (
                        <span key={n} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[#94A3B8]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                  {active
                    ? <div className="shrink-0 w-6 h-6 rounded-full bg-[#00DFA9] flex items-center justify-center shadow-[0_0_12px_rgba(0,223,169,0.5)]"><Check className="w-3.5 h-3.5 text-[#0B0F14]" /></div>
                    : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                </button>
              );
            })()}

            {/* Web3 Wallet */}
            {(() => {
              const active = depositMethod === 'wallet';
              return (
                <button onClick={() => setDepositMethod('wallet')}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 text-left group"
                  style={active
                    ? { background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.05) 100%)', border: '2px solid rgba(167,139,250,0.50)', boxShadow: '0 0 28px rgba(167,139,250,0.10)' }
                    : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.30)' }}>
                    <Wallet className="w-5 h-5 text-[#A78BFA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold text-[#F8FAFC]">Web3 Wallet</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.22)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.40)' }}>⚡ Instant</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-tight">MetaMask · Trust Wallet · OKX · Coinbase · Auto-verified on-chain</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {['Ethereum','BSC','Polygon','Arbitrum','Base','Optimism','TRC-20','Solana'].map(n => (
                        <span key={n} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md text-[#94A3B8]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>{n}</span>
                      ))}
                    </div>
                  </div>
                  {active
                    ? <div className="shrink-0 w-6 h-6 rounded-full bg-[#A78BFA] flex items-center justify-center shadow-[0_0_12px_rgba(167,139,250,0.5)]"><Check className="w-3.5 h-3.5 text-[#0B0F14]" /></div>
                    : <ChevronRight className="w-4 h-4 text-[#475569] shrink-0 group-hover:text-[#94A3B8] transition-colors" />}
                </button>
              );
            })()}

            {/* Binance Pay — Coming Soon */}
            <div className="w-full rounded-2xl p-4 flex items-center gap-4 cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(250,204,21,0.20)', opacity: 0.50 }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.20)' }}>
                <CreditCard className="w-5 h-5 text-[#FACC15]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[14px] font-bold text-[#94A3B8]">Binance Pay</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-[#64748B]" style={{ background: 'rgba(100,116,139,0.18)', border: '1px solid rgba(100,116,139,0.28)' }}>Coming Soon</span>
                </div>
                <p className="text-[11px] text-[#475569] leading-tight">Zero fees · Instant · BNB · BUSD · USDT</p>
              </div>
              <Lock className="w-4 h-4 text-[#475569] shrink-0" />
            </div>
          </div>

          {/* Trust elements */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                    <p className="text-[14px] font-bold text-[#F8FAFC]">Quick Deposit via NOWPayments</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Enter amount → get unique address → pay → auto-credited</p>
                  </div>
                </div>
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
                      <p className="text-[18px] font-black text-[#F8FAFC]">Deposit Credited! ⚡</p>
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
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0E1228 100%)', border: '1px solid rgba(167,139,250,0.20)' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(90deg, rgba(167,139,250,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.30)' }}>
                    <Wallet className="h-4 w-4 text-[#A78BFA]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#F8FAFC]">Web3 Wallet Deposit</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Send USDT in one click — no TxHash needed</p>
                  </div>
                </div>
              </div>
              <div className="p-5">

                {/* Not connected */}
                {!w3Connected && !hasTronLink && walletPhase === 'idle' && (
                  <div className="flex flex-col items-center py-6 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.12)', border: '2px solid rgba(167,139,250,0.25)' }}>
                      <Wallet className="h-8 w-8 text-[#A78BFA]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-[#F8FAFC]">Connect Your Wallet</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Connect MetaMask, Trust Wallet, OKX, TronLink or any other wallet to deposit USDT instantly.
                      </p>
                    </div>
                    <button
                      onClick={() => void evmWallet.connect()}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-black text-white transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
                    >
                      <Wallet className="w-4 h-4" /> Connect Wallet <ChevronRight className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-[#64748B]">Supports 300+ wallets · ETH · BSC · Polygon · Arbitrum · Optimism · TRC-20</p>
                  </div>
                )}

                {/* Connected — deposit form */}
                {(w3Connected || hasTronLink) && walletPhase !== 'success' && (
                  <div className="space-y-4">
                    {/* Connected status */}
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,223,169,0.05)', border: '1px solid rgba(0,223,169,0.15)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.25)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00DFA9]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[#00DFA9]">Wallet Connected</p>
                        {w3Address && (
                          <p className="text-[10px] font-mono text-[#64748B] truncate">
                            {w3Address.slice(0, 10)}…{w3Address.slice(-8)}
                            {chainCfg && <span className="ml-1.5 font-sans" style={{ color: chainCfg.color }}>· {chainCfg.label}</span>}
                          </p>
                        )}
                        {hasTronLink && !w3Connected && <p className="text-[10px] text-[#64748B]">TronLink · TRC-20</p>}
                      </div>
                    </div>

                    {/* Unsupported chain warning */}
                    {w3Connected && !chainCfg && !hasTronLink && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.20)' }}>
                        <AlertCircle className="w-4 h-4 text-[#FACC15] shrink-0 mt-0.5" />
                        <p className="text-[#FACC15]">Switch to <strong>Ethereum, BNB Chain,</strong> or <strong>Polygon</strong> to deposit, or use TronLink for TRC-20.</p>
                      </div>
                    )}

                    {/* Error banner */}
                    {walletPhase === 'error' && walletError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-red-400 flex-1">{walletError}</p>
                      </div>
                    )}

                    {/* Amount input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Amount (USDT)</label>
                        {walletBalance !== null && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#64748B]">
                              Available: <span className="text-[#A78BFA] font-bold">{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setWalletDepAmount(Math.floor(walletBalance).toString())}
                              disabled={walletProcessing || walletBalance < 10}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black transition-all disabled:opacity-40"
                              style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.30)' }}
                            >
                              MAX
                            </button>
                          </div>
                        )}
                        {walletBalance === null && (w3Connected || hasTronLink) && (
                          <span className="text-[10px] text-[#64748B] flex items-center gap-1">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Fetching balance…
                          </span>
                        )}
                      </div>
                      <div className="relative">
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
                      <p className="text-[10px] text-[#64748B] mt-1">Minimum: 10 USDT</p>
                    </div>

                    {/* Deposit buttons */}
                    <div className="space-y-2">
                      {chainCfg && (
                        <button
                          onClick={handleEvmDeposit}
                          disabled={walletProcessing}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black text-[#0B0F14] transition-all hover:scale-[1.01] disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
                          style={{ background: walletProcessing ? 'rgba(0,223,169,0.5)' : 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: walletProcessing ? 'none' : '0 0 20px rgba(0,223,169,0.30)' }}
                        >
                          {walletPhase === 'sending' ? (
                            <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Approve in wallet…</>
                          ) : walletPhase === 'confirming' ? (
                            <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Waiting for confirmation…</>
                          ) : walletPhase === 'submitting' ? (
                            <><span className="w-4 h-4 border-2 border-[#0B0F14]/30 border-t-[#0B0F14] rounded-full animate-spin" /> Verifying on-chain…</>
                          ) : (
                            <>Deposit via {chainCfg.label}<ChevronRight className="w-4 h-4" /></>
                          )}
                        </button>
                      )}
                      {hasTronLink && (
                        <button
                          onClick={handleTronDeposit}
                          disabled={walletProcessing}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-black transition-all hover:scale-[1.01] disabled:opacity-70 disabled:cursor-wait disabled:scale-100"
                          style={{ background: walletProcessing ? 'rgba(255,255,255,0.05)' : 'rgba(0,223,169,0.08)', border: '1px solid rgba(0,223,169,0.30)', color: '#00DFA9' }}
                        >
                          {walletPhase === 'sending' ? (
                            <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Approve in TronLink…</>
                          ) : walletPhase === 'confirming' ? (
                            <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Waiting for confirmation…</>
                          ) : walletPhase === 'submitting' ? (
                            <><span className="w-4 h-4 border-2 border-[#00DFA9]/30 border-t-[#00DFA9] rounded-full animate-spin" /> Verifying on-chain…</>
                          ) : (
                            <>Deposit via TronLink TRC-20<ChevronRight className="w-4 h-4" /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Success */}
                {walletPhase === 'success' && walletResult && (
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
                      <p className="text-[18px] font-black text-[#F8FAFC]">
                        {walletResult.autoVerified ? 'Deposit Verified! ⚡' : 'Deposit Submitted!'}
                      </p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        {walletResult.autoVerified
                          ? <><span className="text-[#00DFA9] font-semibold">Automatically verified</span> — funds are in your account.</>
                          : <>Under review — usually credited within 5–30 min.</>}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={resetWalletDeposit}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-black text-[#0B0F14]"
                        style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}
                      >
                        Deposit More
                      </button>
                      <button
                        onClick={() => setTab('history')}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#38BDF8] border border-[#38BDF8]/25 hover:bg-[#38BDF8]/10 transition-all"
                      >
                        View History →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Cryptomus USDT auto-pay panel ───────────────────────────── */}
          {depositMethod === 'cryptomus' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #060E1A 0%, #071A12 100%)', border: '1px solid rgba(0,223,169,0.20)' }}>
              <div className="px-5 py-4 border-b border-white/[0.06]" style={{ background: 'linear-gradient(90deg, rgba(0,223,169,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,223,169,0.15)', border: '1px solid rgba(0,223,169,0.30)' }}>
                    <CircleDollarSign className="h-4 w-4 text-[#00DFA9]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#F8FAFC]">Quick Deposit via Cryptomus</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">USDT TRC-20 or ERC-20 — auto-credited on confirmation</p>
                  </div>
                </div>
              </div>
              <div className="p-5">

                {/* IDLE */}
                {cmState === 'idle' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                          <CircleDollarSign className="h-3 w-3" /> Amount (USDT)
                        </label>
                        <div className="relative">
                          <input type="number" min="10" step="0.01" value={cmAmount}
                            onChange={e => { setCmAmount(e.target.value); setCmError(''); }}
                            placeholder="Min 10 USDT"
                            className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#00DFA9]/60 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all pr-16" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 px-2 py-0.5 rounded-lg">USDT</span>
                        </div>
                        {cmAmount && !isNaN(parseFloat(cmAmount)) && parseFloat(cmAmount) > 0 && (
                          <div className="mt-1.5 px-1">
                            {parseFloat(cmAmount) < 10
                              ? <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> Minimum deposit is 10 USDT</span>
                              : <span className="text-[10px] text-[#00DFA9]">✓ You will receive ≈ {parseFloat(cmAmount).toFixed(2)} USDT</span>}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                          <Zap className="h-3 w-3" /> Network
                        </label>
                        <select value={cmNetwork} onChange={e => setCmNetwork(e.target.value as 'trc20' | 'erc20')}
                          className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#00DFA9]/60 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all">
                          <option value="trc20">USDT (TRC-20 / Tron)</option>
                          <option value="erc20">USDT (ERC-20 / Ethereum)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <p className="text-[10px] text-[#64748B] font-semibold mr-0.5">Quick:</p>
                      {[10, 25, 50, 100, 250, 500, 1000].map(amt => (
                        <button key={amt} type="button" onClick={() => { setCmAmount(String(amt)); setCmError(''); }}
                          className={cn('text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all',
                            cmAmount === String(amt)
                              ? 'bg-[#00DFA9]/20 text-[#00DFA9] border border-[#00DFA9]/40'
                              : 'bg-white/5 text-[#64748B] border border-white/[0.07] hover:bg-white/10 hover:text-white')}>
                          ${amt}
                        </button>
                      ))}
                    </div>
                    {cmError && (
                      <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <p className="text-[12px] text-red-400">{cmError}</p>
                      </div>
                    )}
                    <button onClick={createCmPayment}
                      className="w-full py-3.5 rounded-xl font-black text-[14px] text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.30)' }}>
                      <Zap className="h-4 w-4" /> Generate Payment Address
                    </button>
                    <p className="text-center text-[10px] text-[#64748B]">
                      A unique address is generated for each deposit — balance is credited automatically when confirmed
                    </p>
                  </div>
                )}

                {/* CREATING */}
                {cmState === 'creating' && (
                  <div className="flex flex-col items-center py-12 gap-5 text-center">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10" style={{ background: 'radial-gradient(circle, #00DFA9, transparent)', animationDuration: '1.4s' }} />
                      <svg className="w-20 h-20 animate-spin" style={{ animationDuration: '1.1s' }} viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#00DFA9" strokeWidth="3" strokeDasharray="160" strokeDashoffset="120" strokeLinecap="round" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#38BDF8" strokeWidth="1" strokeDasharray="213" strokeLinecap="round" style={{ opacity: 0.15 }} />
                      </svg>
                      <div className="absolute w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,223,169,0.12)', border: '1px solid rgba(0,223,169,0.3)' }}>
                        <CircleDollarSign className="w-6 h-6 text-[#00DFA9]" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[16px] font-black text-[#F8FAFC]">Generating address…</p>
                      <p className="text-[11px] text-[#64748B] mt-1">Connecting to Cryptomus gateway</p>
                    </div>
                  </div>
                )}

                {/* PAYING */}
                {cmState === 'paying' && cmPayment && (
                  <div className="space-y-4">
                    {/* Timer */}
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                      style={{ background: cmTimeLeft < 300 ? 'rgba(239,68,68,0.08)' : 'rgba(0,223,169,0.08)', border: `1px solid ${cmTimeLeft < 300 ? 'rgba(239,68,68,0.25)' : 'rgba(0,223,169,0.25)'}` }}>
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${cmTimeLeft < 300 ? 'text-red-400' : 'text-[#00DFA9]'}`} />
                        <span className="text-[12px] font-bold text-[#F8FAFC]">Payment expires in</span>
                      </div>
                      <span className={`text-[16px] font-black tabular-nums ${cmTimeLeft < 300 ? 'text-red-400' : 'text-[#00DFA9]'}`}>
                        {Math.floor(cmTimeLeft / 3600)}:{String(Math.floor((cmTimeLeft % 3600) / 60)).padStart(2, '0')}:{String(cmTimeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Payment status tracker */}
                    <div className="flex items-center w-full px-1">
                      {['Waiting','Detected','Confirming','Confirmed','Credited'].map((step, i, arr) => (
                        <div key={step} className="flex items-center flex-1 min-w-0">
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <div className={cn('w-5 h-5 rounded-full flex items-center justify-center',
                              i === 0 ? 'border border-[#00DFA9]/50 bg-[#00DFA9]/10' : 'border border-white/[0.08] bg-white/[0.03]')}>
                              {i === 0
                                ? <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] animate-pulse block" />
                                : <span className="text-[8px] font-bold text-[#475569]">{i+1}</span>}
                            </div>
                            <span className={cn('text-[8px] font-semibold leading-tight text-center whitespace-nowrap',
                              i === 0 ? 'text-[#00DFA9]' : 'text-[#475569]')}>{step}</span>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 h-px mx-1 mb-4" style={{ background: i === 0 ? 'linear-gradient(90deg, rgba(0,223,169,0.4) 0%, rgba(255,255,255,0.06) 100%)' : 'rgba(255,255,255,0.06)' }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pay on Cryptomus button */}
                    {cmPayment.paymentUrl && (
                      <a href={cmPayment.paymentUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-[14px] text-[#0B0F14] transition-all hover:scale-[1.01]"
                        style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.25)' }}>
                        <ExternalLink className="h-4 w-4" /> Pay on Cryptomus
                      </a>
                    )}

                    {/* QR + address (if address is available) */}
                    {cmPayment.address && (
                      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-[#0B0F14] border border-white/[0.07]">
                        <div className="p-2 rounded-xl bg-white flex-shrink-0" style={{ boxShadow: '0 0 0 1px rgba(0,223,169,0.2)' }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(cmPayment.address)}`}
                            alt="Payment address QR" className="w-[140px] h-[140px] object-contain" />
                        </div>
                        <div className="flex-1 w-full space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Send Exactly</p>
                            <div className="flex items-center gap-2 bg-[#00DFA9]/5 border border-[#00DFA9]/20 rounded-xl px-4 py-2.5">
                              <span className="text-[18px] font-black text-[#F8FAFC] tabular-nums">{cmPayment.amount}</span>
                              <span className="text-[12px] font-bold text-[#00DFA9]">USDT</span>
                              <span className="text-[10px] text-[#64748B] ml-auto">{cmPayment.network === 'TRON' ? 'TRC-20' : 'ERC-20'}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">To This Address</p>
                            <div className="flex items-center gap-2 bg-[#0E1520] border border-white/[0.08] rounded-xl px-3 py-2">
                              <p className="flex-1 text-[11px] font-mono text-[#94A3B8] break-all leading-relaxed select-all">{cmPayment.address}</p>
                              <button onClick={copyCmAddress}
                                className={cn('shrink-0 p-2 rounded-lg transition-all', cmAddrCopied ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/5 text-[#64748B] hover:bg-white/10 hover:text-white')}>
                                {cmAddrCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            {cmAddrCopied && <p className="text-[10px] text-[#00DFA9] mt-1 flex items-center gap-1"><Check className="h-2.5 w-2.5" /> Address copied</p>}
                          </div>
                        </div>
                      </div>
                    )}

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
                        Send <strong>exactly</strong> the amount shown. You can also tap "Pay on Cryptomus" to use the hosted payment page.
                      </p>
                    </div>
                    <button onClick={resetCm}
                      className="w-full py-2.5 rounded-xl text-[12px] font-bold text-[#64748B] border border-white/[0.07] hover:text-white hover:bg-white/5 transition-all">
                      ← Start a new payment
                    </button>
                  </div>
                )}

                {/* SUCCESS */}
                {cmState === 'success' && (
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
                      <p className="text-[18px] font-black text-[#F8FAFC]">Deposit Credited! ⚡</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Your Cryptomus payment was confirmed and <span className="text-[#00DFA9] font-semibold">automatically credited</span> to your account.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-[#00DFA9]/5 border border-[#00DFA9]/15 rounded-xl px-4 py-2.5">
                      <Check className="h-3.5 w-3.5 text-[#00DFA9] shrink-0" />
                      <p className="text-[11px] text-[#00DFA9]/80">Funds are available in your wallet now</p>
                    </div>
                    <button onClick={resetCm}
                      className="mt-1 px-5 py-2 rounded-xl text-[12px] font-bold text-[#00DFA9] border border-[#00DFA9]/25 hover:bg-[#00DFA9]/10 transition-all">
                      Make another deposit
                    </button>
                  </div>
                )}

                {/* EXPIRED / FAILED */}
                {(cmState === 'expired' || cmState === 'failed') && (
                  <div className="flex flex-col items-center py-8 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.10)', border: '2px solid rgba(239,68,68,0.25)' }}>
                      <XCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#F8FAFC]">{cmState === 'expired' ? 'Payment Expired' : 'Payment Failed'}</p>
                      <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                        {cmState === 'expired'
                          ? 'This payment session has expired. Please generate a new address to deposit.'
                          : 'The payment was not completed. Please try again or use another deposit method.'}
                      </p>
                    </div>
                    <button onClick={resetCm}
                      className="px-5 py-2.5 rounded-xl font-black text-[13px] text-[#0B0F14] transition-all hover:scale-[1.01]"
                      style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)' }}>
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Manual USDT flow ─────────────────────────────────────────── */}
          {depositMethod === 'manual' && (() => {
            const MANUAL_NETS = [
              { val: 'TRC-20'   as const, short: 'TRC-20',   fullName: 'Tron (TRC-20)',       coinLabel: 'USDT', color: '#00DFA9', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT on TRC-20 (Tron). Sending on any other network will result in permanent loss.' },
              { val: 'ERC-20'   as const, short: 'ERC-20',   fullName: 'Ethereum (ERC-20)',    coinLabel: 'USDT', color: '#627EEA', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT on Ethereum (ERC-20). Do not send on TRC-20/Tron or other networks.' },
              { val: 'BSC'      as const, short: 'BEP-20',   fullName: 'BNB Smart Chain',      coinLabel: 'USDT', color: '#F0B90B', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT on BEP-20 (BSC). Sending on TRC-20 or Ethereum will result in loss.' },
              { val: 'POLYGON'  as const, short: 'Polygon',  fullName: 'Polygon (MATIC)',       coinLabel: 'USDT', color: '#8247E5', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT on Polygon. Do not send on other EVM networks.' },
              { val: 'ARBITRUM' as const, short: 'Arbitrum', fullName: 'Arbitrum One',          coinLabel: 'USDT', color: '#28A0F0', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT on Arbitrum One. Do not send on other EVM networks.' },
              { val: 'SOLANA'   as const, short: 'Solana',   fullName: 'Solana (SPL)',          coinLabel: 'USDT', color: '#9945FF', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT SPL on Solana. Sending SOL or other tokens will result in permanent loss.' },
              { val: 'TON'      as const, short: 'TON',      fullName: 'TON Network',           coinLabel: 'USDT', color: '#0098EA', badge: '⚡ Auto', autoVerify: true,  warning: 'Only send USDT Jetton on TON. Sending native TON will result in loss.' },
              { val: 'BTC'      as const, short: 'Bitcoin',  fullName: 'Bitcoin Network',       coinLabel: 'BTC',  color: '#F7931A', badge: '🕐 Review', autoVerify: false, warning: 'Only send native BTC. Admin converts to USDT and credits within 30 min.' },
              { val: 'XRP'      as const, short: 'XRP',      fullName: 'XRP Ledger',            coinLabel: 'XRP',  color: '#346AA9', badge: '🕐 Review', autoVerify: false, warning: 'Only send native XRP. Admin converts to USDT and credits within 30 min.' },
            ];
            const net = MANUAL_NETS.find(n => n.val === manualNetwork) ?? MANUAL_NETS[0];
            const addr = depositInfo ? getManualAddress(manualNetwork, depositInfo) : '';
            const qrData = addr ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(addr)}&bgcolor=ffffff&color=000000&margin=6` : '';

            return (
              <>
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
                              <p className="text-[18px] font-black text-[#F8FAFC]">Deposit Credited! ⚡</p>
                              <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                                Your transaction was <span className="text-[#00DFA9] font-semibold">verified on-chain instantly</span>. Balance updated.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[18px] font-black text-[#F8FAFC]">Deposit Submitted!</p>
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
                          Confirm Deposit
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
                    <div className="grid grid-cols-2 gap-2.5">
                      {([
                        { id: 'TRC-20', label: 'TRC-20', chain: 'Tron Network', color: '#00DFA9', desc: 'Lower fees, faster' },
                        { id: 'ERC-20', label: 'ERC-20', chain: 'Ethereum Network', color: '#627EEA', desc: 'Wider compatibility' },
                      ] as const).map(net => (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => { setWdNetwork(net.id); setWdAddress(''); }}
                          className={`relative p-3.5 rounded-xl border-2 text-left transition-all ${
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
                            <span className="text-[8px] font-black" style={{ color: net.color }}>{net.id.split('-')[0]}</span>
                          </div>
                          <p className="text-[12px] font-bold text-[#F8FAFC]">{net.label}</p>
                          <p className="text-[10px] text-[#64748B]">{net.chain}</p>
                          <p className="text-[9px] mt-1 font-medium" style={{ color: net.color }}>{net.desc}</p>
                        </button>
                      ))}
                    </div>
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
                        placeholder={wdNetwork === 'TRC-20' ? 'e.g. TQn5m... Tron USDT address' : 'e.g. 0x742d... Ethereum USDT address'}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#F8FAFC]">Transaction History</p>
            <button onClick={loadData}
              className="flex items-center gap-1.5 text-[11px] text-[#64748B] hover:text-[#00DFA9] transition-colors">
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {txns.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
                <CircleDollarSign className="h-5 w-5 text-[#94A3B8]/30" />
              </div>
              <p className="text-[13px] text-[#94A3B8]/50">No transactions yet</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-[#0E1520]">
              {txns.map((tx, i) => (
                <div key={tx.id} className={cn('p-4', i > 0 && 'border-t border-white/[0.04]')}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      tx.type === 'deposit' ? 'bg-[#00DFA9]/10' : 'bg-red-500/10'
                    )}>
                      {tx.type === 'deposit'
                        ? <ArrowDownLeft className="h-4 w-4 text-[#00DFA9]" />
                        : <ArrowUpRight className="h-4 w-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#F8FAFC] capitalize">
                          {tx.type === 'deposit' ? 'Deposit' : tx.type === 'withdrawal' ? 'Withdrawal' : tx.type}
                        </p>
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                          tx.network === 'TRC-20' ? 'bg-[#38BDF8]/10 text-[#38BDF8]' : 'bg-white/5 text-[#64748B]'
                        )}>{tx.network ?? 'TRC-20'}</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">{fmtDate(tx.createdAt)}</p>
                      {tx.txHash && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <a
                            href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline font-mono">
                            {tx.txHash.length > 20 ? `${tx.txHash.slice(0, 10)}...${tx.txHash.slice(-8)}` : tx.txHash}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                          {tx.type === 'deposit' && (
                            tx.verified === true ? (
                              <span title={tx.verificationNote ?? 'Auto-verified on the Tron blockchain'}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/20">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Verified on-chain
                              </span>
                            ) : tx.verified === false ? (
                              <span title={tx.verificationNote ?? 'Under manual review by our team'}
                                className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="h-2.5 w-2.5" /> Under review
                              </span>
                            ) : null
                          )}
                        </div>
                      )}
                      {tx.walletAddress && tx.type === 'withdrawal' && (
                        <p className="mt-1 text-[10px] text-[#64748B] font-mono">
                          To: {tx.walletAddress.slice(0, 8)}...{tx.walletAddress.slice(-6)}
                        </p>
                      )}
                      {tx.notes && tx.status === 'rejected' && (
                        <p className="mt-1 text-[10px] text-red-400">Reason: {tx.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-[14px] font-bold', isCredit(tx.type) ? 'text-[#00DFA9]' : 'text-red-400')}>
                        {isCredit(tx.type) ? '+' : '−'}${fmt(tx.amount)}
                      </p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
