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
  createdAt: string;
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
              {/* TRC-20 USDT — active */}
              <div
                className="relative rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-default"
                style={{
                  background: 'rgba(0,223,169,0.10)',
                  border: '2px solid rgba(0,223,169,0.50)',
                  boxShadow: '0 0 16px rgba(0,223,169,0.10)',
                }}
              >
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00DFA9] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-[#0B0F14]" />
                </div>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,223,169,0.18)', border: '1px solid rgba(0,223,169,0.35)' }}>
                  <QrCode className="w-4.5 h-4.5 text-[#00DFA9]" />
                </div>
                <p className="text-[11px] font-bold text-[#F8FAFC] text-center leading-tight">USDT Manual</p>
                <p className="text-[9px] text-[#00DFA9] font-semibold">TRC-20</p>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,223,169,0.15)', color: '#00DFA9', border: '1px solid rgba(0,223,169,0.3)' }}>
                  Active
                </span>
              </div>

              {/* Coming soon cards */}
              {([
                { name: 'NOWPayments', tag: '100+ coins', icon: Zap, color: '#38BDF8', bg: 'rgba(56,189,248,0.07)', border: 'rgba(56,189,248,0.14)' },
                { name: 'Binance Pay', tag: '0% fee',     icon: CreditCard, color: '#FACC15', bg: 'rgba(250,204,21,0.07)', border: 'rgba(250,204,21,0.14)' },
                { name: 'WalletConnect', tag: 'Web3',     icon: Wallet,    color: '#A78BFA', bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.14)' },
              ] as const).map(({ name, tag, icon: Icon, color, bg, border }) => (
                <div
                  key={name}
                  className="relative rounded-xl p-3 flex flex-col items-center gap-1.5"
                  style={{ background: bg, border: `1px solid ${border}`, opacity: 0.5 }}
                >
                  <div className="absolute top-1.5 right-1.5">
                    <Lock className="w-3 h-3 text-[#64748B]" />
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: bg, border: `1px solid ${border}` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color }} />
                  </div>
                  <p className="text-[11px] font-bold text-[#94A3B8] text-center leading-tight">{name}</p>
                  <p className="text-[9px] text-[#64748B]">{tag}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.15)', color: '#64748B', border: '1px solid rgba(100,116,139,0.2)' }}>
                    Soon
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Shield, label: 'Secure', sub: 'TRC-20 Network', color: '#00DFA9' },
              { icon: Clock,  label: 'Fast',   sub: '5–30 min',        color: '#38BDF8' },
              { icon: CircleDollarSign, label: 'Min 10 USDT', sub: 'No deposit fees', color: '#FACC15' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0E1520] p-3 text-center">
                <Icon className="h-4 w-4 mx-auto mb-1" style={{ color }} />
                <p className="text-[11px] font-bold text-[#F8FAFC]">{label}</p>
                <p className="text-[10px] text-[#64748B]">{sub}</p>
              </div>
            ))}
          </div>

          {/* QR + Address card */}
          <div className="rounded-2xl border border-white/[0.09] bg-[#0E1520] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[#00DFA9]/15 flex items-center justify-center">
                  <span className="text-[9px] font-black text-[#00DFA9]">1</span>
                </div>
                <p className="text-[12px] font-bold text-[#F8FAFC]">Send USDT to this address</p>
                <span className="ml-auto text-[10px] font-bold text-[#00DFA9] bg-[#00DFA9]/10 border border-[#00DFA9]/20 px-2 py-0.5 rounded-full">
                  TRC-20
                </span>
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
          <div className="rounded-2xl overflow-hidden"
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
              {depSuccess ? (
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
              <p className="text-[20px] font-black text-[#F8FAFC]">${fmt(balance)} <span className="text-[13px] font-bold text-[#00DFA9]">USDT</span></p>
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
                        <a
                          href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline font-mono">
                          {tx.txHash.length > 20 ? `${tx.txHash.slice(0, 10)}...${tx.txHash.slice(-8)}` : tx.txHash}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
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
