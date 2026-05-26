import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check, CheckCircle2,
  Clock, XCircle, RefreshCw, Loader2, CircleDollarSign, Shield,
  AlertCircle, ExternalLink, Info, QrCode, Zap, CreditCard, Lock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DepositInfo {
  address: string;
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
  if (status === 'pending') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#FACC15]">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
  if (status === 'rejected') return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
      <XCircle className="h-3 w-3" /> Rejected
    </span>
  );
  return <span className="text-[10px] text-[#64748B] capitalize">{status}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WalletPage() {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
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
  const [depositMethod, setDepositMethod] = useState<'nowpayments' | 'manual'>(() => {
    const hint = sessionStorage.getItem('cupbett_deposit_method');
    sessionStorage.removeItem('cupbett_deposit_method');
    return (hint === 'manual' ? 'manual' : 'nowpayments') as 'nowpayments' | 'manual';
  });
  const [nppState, setNppState]       = useState<'idle' | 'creating' | 'paying' | 'success' | 'expired' | 'failed'>('idle');
  const [nppAmount, setNppAmount]     = useState('');
  const [nppCurrency, setNppCurrency] = useState('usdttrc20');
  const [nppPayment, setNppPayment]   = useState<NppPayment | null>(null);
  const [nppTimeLeft, setNppTimeLeft] = useState(0);
  const [nppError, setNppError]       = useState('');
  const [nppAddrCopied, setNppAddrCopied] = useState(false);

  // Withdrawal form
  const [wdAmount, setWdAmount]     = useState('');
  const [wdAddress, setWdAddress]   = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdError, setWdError]       = useState('');
  const [wdSuccess, setWdSuccess]   = useState(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [info, bal, history] = await Promise.all([
        api.get<DepositInfo>('/wallet/deposit-info'),
        api.get<{ balance: string }>('/wallet/balance'),
        api.get<Transaction[]>('/wallet/transactions'),
      ]);
      setDepositInfo(info);
      setBalance(parseFloat(bal.balance));
      setTxns(history);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { loadData(); }, [loadData]);

  function copyAddress() {
    if (!depositInfo) return;
    navigator.clipboard.writeText(depositInfo.address);
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
      const result = await api.post<{ autoVerified?: boolean }>('/wallet/deposit', { amount, txHash: depTxHash.trim(), network: 'TRC-20' });
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
    if (amount > balance) { setWdError('Amount exceeds your available balance'); return; }
    if (!wdAddress.trim()) { setWdError('Enter your USDT TRC-20 wallet address'); return; }
    setWdSubmitting(true);
    try {
      await api.post('/wallet/withdraw', { amount, walletAddress: wdAddress.trim(), network: 'TRC-20' });
      setWdSuccess(true);
      setWdAmount('');
      setWdAddress('');
      loadData();
    } catch (err: unknown) {
      setWdError(err instanceof Error ? err.message : 'Submission failed');
    } finally { setWdSubmitting(false); }
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
      setNppPayment(result);
      setNppTimeLeft(result.expiresAt
        ? Math.max(0, Math.floor((new Date(result.expiresAt).getTime() - Date.now()) / 1000))
        : 20 * 60);
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
          setNppState('success'); loadData();
        } else if (r.status === 'failed' || r.status === 'refunded') {
          setNppState('failed');
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
          <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] p-4">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">Choose Deposit Method</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              {/* NOWPayments — active default */}
              <button onClick={() => { setDepositMethod('nowpayments'); resetNpp(); }}
                className="relative rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all text-left"
                style={depositMethod === 'nowpayments' ? { background: 'rgba(56,189,248,0.10)', border: '2px solid rgba(56,189,248,0.50)', boxShadow: '0 0 16px rgba(56,189,248,0.10)' }
                  : { background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.14)' }}>
                {depositMethod === 'nowpayments' && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#38BDF8] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#0B0F14]" />
                  </div>
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                  <Zap className="w-4.5 h-4.5 text-[#38BDF8]" />
                </div>
                <p className="text-[11px] font-bold text-[#F8FAFC] text-center leading-tight">NOWPayments</p>
                <p className="text-[9px] text-[#38BDF8] font-semibold">300+ coins</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)' }}>Auto</span>
              </button>

              {/* Manual TRC-20 */}
              <button onClick={() => setDepositMethod('manual')}
                className="relative rounded-xl p-3 flex flex-col items-center gap-1.5 transition-all text-left"
                style={depositMethod === 'manual' ? { background: 'rgba(0,223,169,0.10)', border: '2px solid rgba(0,223,169,0.50)', boxShadow: '0 0 16px rgba(0,223,169,0.10)' }
                  : { background: 'rgba(0,223,169,0.04)', border: '1px solid rgba(0,223,169,0.14)' }}>
                {depositMethod === 'manual' && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00DFA9] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-[#0B0F14]" />
                  </div>
                )}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,223,169,0.18)', border: '1px solid rgba(0,223,169,0.35)' }}>
                  <QrCode className="w-4.5 h-4.5 text-[#00DFA9]" />
                </div>
                <p className="text-[11px] font-bold text-[#F8FAFC] text-center leading-tight">USDT Manual</p>
                <p className="text-[9px] text-[#00DFA9] font-semibold">TRC-20</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }}>Manual</span>
              </button>

              {/* Coming soon — Binance Pay */}
              <div className="relative rounded-xl p-3 flex flex-col items-center gap-1.5" style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.14)', opacity: 0.5 }}>
                <div className="absolute top-1.5 right-1.5"><Lock className="w-3 h-3 text-[#64748B]" /></div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.14)' }}>
                  <CreditCard className="w-4.5 h-4.5 text-[#FACC15]" />
                </div>
                <p className="text-[11px] font-bold text-[#94A3B8] text-center leading-tight">Binance Pay</p>
                <p className="text-[9px] text-[#64748B]">0% fee</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.2)' }}>Soon</span>
              </div>

              {/* Coming soon — WalletConnect */}
              <div className="relative rounded-xl p-3 flex flex-col items-center gap-1.5" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.14)', opacity: 0.5 }}>
                <div className="absolute top-1.5 right-1.5"><Lock className="w-3 h-3 text-[#64748B]" /></div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.14)' }}>
                  <Wallet className="w-4.5 h-4.5 text-[#A78BFA]" />
                </div>
                <p className="text-[11px] font-bold text-[#94A3B8] text-center leading-tight">WalletConnect</p>
                <p className="text-[9px] text-[#64748B]">Web3</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.2)' }}>Soon</span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {(depositMethod === 'nowpayments' ? [
              { icon: Shield, label: 'Secure', sub: '300+ currencies', color: '#38BDF8' },
              { icon: Zap, label: 'Auto Credit', sub: 'No TxHash needed', color: '#00DFA9' },
              { icon: CircleDollarSign, label: 'Min 10 USDT', sub: '~20 min window', color: '#FACC15' },
            ] : [
              { icon: Shield, label: 'Secure', sub: 'TRC-20 Network', color: '#00DFA9' },
              { icon: Clock, label: 'Fast', sub: '5–30 min', color: '#38BDF8' },
              { icon: CircleDollarSign, label: 'Min 10 USDT', sub: 'No deposit fees', color: '#FACC15' },
            ]).map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0E1520] p-3 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
                <p className="text-[11px] font-bold text-[#F8FAFC]">{label}</p>
                <p className="text-[10px] text-[#64748B]">{sub}</p>
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
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                          <Zap className="h-3 w-3" /> Pay With
                        </label>
                        <select value={nppCurrency} onChange={e => setNppCurrency(e.target.value)}
                          className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/20 transition-all">
                          <option value="usdttrc20">USDT (TRC-20 / Tron)</option>
                          <option value="usdterc20">USDT (ERC-20 / Ethereum)</option>
                          <option value="btc">Bitcoin (BTC)</option>
                          <option value="eth">Ethereum (ETH)</option>
                          <option value="bnbbsc">BNB (BSC / BEP-20)</option>
                          <option value="ltc">Litecoin (LTC)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <p className="text-[10px] text-[#64748B] font-semibold">Quick:</p>
                      {[10, 50, 100, 250, 500].map(amt => (
                        <button key={amt} type="button" onClick={() => setNppAmount(String(amt))}
                          className={cn('text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all',
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

          {/* ── Manual TRC-20 flow ──────────────────────────────────────── */}
          {depositMethod === 'manual' && (
            <>
              {/* QR + Address card */}
              <div className="rounded-2xl border border-white/[0.09] bg-[#0E1520] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#00DFA9]/15 flex items-center justify-center">
                      <span className="text-[9px] font-black text-[#00DFA9]">1</span>
                    </div>
                    <p className="text-[12px] font-bold text-[#F8FAFC]">Send USDT to this address</p>
                    <span className="ml-auto text-[10px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 border border-[#00DFA9]/20 px-2 py-0.5 rounded-full">TRC-20</span>
                  </div>
                </div>

            <div className="p-4 flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code */}
              <div className="relative flex-shrink-0">
                <div className="p-2.5 rounded-xl bg-white" style={{ boxShadow: '0 0 0 1px rgba(0,223,169,0.2), 0 4px 24px rgba(0,0,0,0.4)' }}>
                  {depositInfo?.qrImageUrl ? (
                    <img
                      src={depositInfo.qrImageUrl}
                      alt="USDT TRC-20 deposit address QR code"
                      className="w-[130px] h-[130px] object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-[130px] h-[130px] flex items-center justify-center bg-white rounded">
                      <p className="text-[10px] text-gray-400 text-center px-2">QR Code<br/>Loading...</p>
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#00DFA9] bg-[#0B0F14] px-2 rounded-full border border-[#00DFA9]/30 whitespace-nowrap">
                  Scan to deposit
                </div>
              </div>

              {/* Address */}
              <div className="flex-1 w-full">
                <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Wallet Address</p>
                <div className="flex items-center gap-2 bg-[#0B0F14] border border-white/[0.08] rounded-xl p-3">
                  <p className="flex-1 text-[11px] font-mono text-[#94A3B8] break-all leading-relaxed select-all">
                    {depositInfo?.address ?? '—'}
                  </p>
                  <button onClick={copyAddress}
                    className={cn(
                      'shrink-0 p-2 rounded-lg transition-all',
                      copied
                        ? 'bg-[#00DFA9]/20 text-[#00DFA9]'
                        : 'bg-white/5 text-[#64748B] hover:bg-white/10 hover:text-white'
                    )}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-[#00DFA9] mt-1 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" /> Address copied to clipboard
                  </p>
                )}

                <div className="mt-3 flex items-start gap-2 bg-[#FACC15]/5 border border-[#FACC15]/15 rounded-xl p-3">
                  <AlertCircle className="h-3.5 w-3.5 text-[#FACC15] shrink-0 mt-0.5" />
                  <p className="text-[10px] text-[#FACC15]/80 leading-relaxed">
                    Only send <strong>USDT on TRC-20 (Tron)</strong> network. Sending other coins or using a different network will result in permanent loss of funds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 – Submit TxID (redesigned) */}
          <div className="rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0E1520 100%)', border: '1px solid rgba(56,189,248,0.20)' }}>

            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06]"
              style={{ background: 'linear-gradient(90deg, rgba(56,189,248,0.06) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.30)' }}>
                  <span className="text-[11px] font-black text-[#38BDF8]">2</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#F8FAFC]">Submit Your Transaction ID</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    After sending USDT, paste your TxHash below to confirm
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {depSubmitting ? (
                /* ── Verifying state ── */
                <div className="flex flex-col items-center py-10 gap-5 text-center">
                  {/* Outer pulsing ring */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-24 h-24 rounded-full animate-ping opacity-10"
                      style={{ background: 'radial-gradient(circle, #38BDF8, transparent)', animationDuration: '1.4s' }} />
                    <div className="absolute w-20 h-20 rounded-full opacity-20 animate-pulse"
                      style={{ background: 'conic-gradient(from 0deg, #38BDF8, #00DFA9, #38BDF8)', animationDuration: '2s' }} />
                    {/* Spinning arc */}
                    <svg className="w-20 h-20 animate-spin" style={{ animationDuration: '1.1s' }} viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#38BDF8" strokeWidth="3"
                        strokeDasharray="160" strokeDashoffset="120" strokeLinecap="round"
                        style={{ opacity: 0.9 }} />
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#00DFA9" strokeWidth="1"
                        strokeDasharray="213" strokeLinecap="round" style={{ opacity: 0.15 }} />
                    </svg>
                    {/* Centre icon */}
                    <div className="absolute w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)' }}>
                      <svg className="w-6 h-6 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <p className="text-[16px] font-black text-[#F8FAFC] tracking-tight">Verifying on-chain…</p>
                    <p className="text-[11px] text-[#64748B] mt-1">Checking your transaction on the Tron blockchain</p>
                  </div>

                  {/* Animated step list */}
                  <div className="w-full max-w-xs space-y-2">
                    {[
                      'Looking up transaction hash',
                      'Confirming USDT TRC-20 transfer',
                      'Validating recipient & amount',
                    ].map((step, i) => (
                      <div key={step}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                        style={{ animationDelay: `${i * 0.3}s` }}>
                        <div className="w-4 h-4 rounded-full border-2 border-[#38BDF8]/40 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" style={{ animationDelay: `${i * 0.4}s` }} />
                        </div>
                        <span className="text-[11px] text-[#64748B] text-left">{step}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-[#334155] italic">This usually completes in a few seconds</p>
                </div>
              ) : depSuccess ? (
                /* ── Success state ── */
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
                          Your transaction was <span className="text-[#00DFA9] font-semibold">verified on-chain instantly</span>. Your balance has been updated.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[18px] font-black text-[#F8FAFC]">Deposit Submitted! 🎉</p>
                        <p className="text-[12px] text-[#64748B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                          Your transaction is under manual review and will be credited within{' '}
                          <span className="text-[#38BDF8] font-semibold">5–30 minutes</span>.
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
                /* ── Form ── */
                <form onSubmit={submitDeposit} className="space-y-4">

                  {/* Amount + TxID side by side on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Amount */}
                    <div className="group">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        <CircleDollarSign className="h-3 w-3" />
                        Amount Sent (USDT)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="10"
                          step="0.01"
                          value={depAmount}
                          onChange={e => setDepAmount(e.target.value)}
                          placeholder={`Min ${depositInfo?.minDeposit ?? 10} USDT`}
                          className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#00DFA9]/60 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 px-2 py-0.5 rounded-lg">
                          USDT
                        </span>
                      </div>
                    </div>

                    {/* TxID / TxHash */}
                    <div className="group">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                        <ExternalLink className="h-3 w-3" />
                        Transaction Hash (TxID)
                      </label>
                      <input
                        type="text"
                        value={depTxHash}
                        onChange={e => setDepTxHash(e.target.value)}
                        placeholder="Paste TxHash — e.g. abc123...xyz"
                        className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-4 py-3 text-[12px] font-mono text-[#F8FAFC] placeholder:text-[#2D3748] focus:outline-none focus:border-[#38BDF8]/60 focus:ring-1 focus:ring-[#38BDF8]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Where to find TxID help box */}
                  <div className="rounded-xl bg-[#0B0F14]/80 border border-white/[0.06] p-3">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Info className="h-3 w-3" /> Where to find your TxID
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { app: 'Trust Wallet', steps: 'Wallet → History → tap transaction → copy TxID' },
                        { app: 'Binance',      steps: 'Wallet → Withdraw History → tap transaction → TxID' },
                        { app: 'OKX / Others', steps: 'Transaction History → Details → Transaction Hash' },
                      ].map(({ app, steps }) => (
                        <div key={app} className="flex flex-col gap-0.5">
                          <p className="text-[10px] font-bold text-[#38BDF8]">{app}</p>
                          <p className="text-[10px] text-[#64748B] leading-relaxed">{steps}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {depError && (
                    <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl p-3.5">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-[12px] text-red-400">{depError}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={depSubmitting}
                    className="w-full py-3.5 rounded-xl font-black text-[14px] text-[#0B0F14] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 24px rgba(0,223,169,0.30)' }}
                  >
                    {depSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verifying & Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Deposit
                      </>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-[#64748B]">
                    ⚡ Deposits are verified on-chain within {depositInfo?.processingTime ?? '5–30 min'} of submission
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0E1520] p-4">
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-3">How deposits work</p>
            <div className="space-y-2.5">
              {[
                { n: '1', text: 'Copy the TRC-20 wallet address above or scan the QR code' },
                { n: '2', text: 'Send USDT from Trust Wallet, Binance, or any TRC-20 wallet' },
                { n: '3', text: 'Copy your Transaction Hash (TxID) from your wallet history' },
                { n: '4', text: 'Paste it in the form above and click Confirm Deposit' },
                { n: '5', text: 'Our team verifies on-chain and credits your account within 30 min' },
              ].map(({ n, text }) => (
                <div key={n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center text-[9px] font-black text-[#00DFA9] shrink-0 mt-0.5">
                    {n}
                  </span>
                  <p className="text-[11px] text-[#94A3B8]">{text}</p>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* ── WITHDRAW TAB ──────────────────────────────────────────────────── */}
      {tab === 'withdraw' && (
        <div className="space-y-4">

          {/* Balance available */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0E1520] p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-[#00DFA9]" />
            </div>
            <div>
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Available to Withdraw</p>
              <p className="text-[20px] font-black text-[#F8FAFC]">{fmt(balance)} <span className="text-[13px] font-bold text-[#00DFA9]">USDT</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.09] bg-[#0E1520] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[12px] font-bold text-[#F8FAFC]">Request Withdrawal</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">Processed within 24 hours after admin approval</p>
            </div>

            <div className="p-4">
              {wdSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-[#38BDF8]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#F8FAFC]">Withdrawal requested!</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      Your withdrawal will be processed within 24 hours. You'll see the status update in History.
                    </p>
                  </div>
                  <button onClick={() => { setWdSuccess(false); setTab('history'); }}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#38BDF8] border border-[#38BDF8]/30 hover:bg-[#38BDF8]/10 transition-all">
                    View in History
                  </button>
                </div>
              ) : (
                <form onSubmit={submitWithdrawal} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Amount (USDT)</label>
                      <button type="button"
                        onClick={() => setWdAmount(Math.max(0, balance - 1).toFixed(2))}
                        className="text-[10px] text-[#00DFA9] hover:underline">
                        Max: ${fmt(balance)}
                      </button>
                    </div>
                    <input
                      type="number"
                      min="10"
                      max={balance}
                      step="0.01"
                      value={wdAmount}
                      onChange={e => setWdAmount(e.target.value)}
                      placeholder="Minimum 10 USDT"
                      className="w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-[#F8FAFC] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                      Your USDT Wallet Address (TRC-20)
                    </label>
                    <input
                      type="text"
                      value={wdAddress}
                      onChange={e => setWdAddress(e.target.value)}
                      placeholder="T... (your TRC-20 wallet address)"
                      className="mt-1.5 w-full bg-[#0B0F14] border border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] font-mono text-[#F8FAFC] placeholder:text-[#374151] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1 flex items-center gap-1">
                      <Info className="h-2.5 w-2.5" />
                      Double-check your address. Withdrawals to wrong addresses cannot be reversed.
                    </p>
                  </div>

                  <div className="bg-[#38BDF8]/5 border border-[#38BDF8]/15 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Info className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                      <p className="text-[11px] font-bold text-[#38BDF8]">Withdrawal Info</p>
                    </div>
                    <ul className="space-y-1 ml-5">
                      {['Minimum withdrawal: 10 USDT', 'Network: TRC-20 (Tron) only', 'Processing time: within 24 hours', 'No withdrawal fees charged by us'].map(t => (
                        <li key={t} className="text-[10px] text-[#64748B] list-disc">{t}</li>
                      ))}
                    </ul>
                  </div>

                  {wdError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <p className="text-[12px] text-red-400">{wdError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={wdSubmitting || balance < 10}
                    className="w-full py-3 rounded-xl font-bold text-[13px] border border-[#38BDF8]/30 text-[#38BDF8] bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {wdSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </span>
                    ) : balance < 10 ? 'Insufficient Balance' : 'Request Withdrawal'}
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
