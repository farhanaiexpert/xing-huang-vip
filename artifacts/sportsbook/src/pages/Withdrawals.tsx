import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { useWallet } from '@/hooks/useWallet';
import {
  useCreateWithdrawal,
  useGetMyWithdrawals,
  getGetMyWithdrawalsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Wallet, Clock, CheckCircle2, XCircle, AlertCircle,
  ArrowDownToLine, ShieldCheck, Loader2, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type WStatus = 'pending' | 'approved' | 'rejected' | 'processed';

function StatusBadge({ status }: { status: WStatus }) {
  const cfg = {
    pending:   { label: 'Pending',   color: 'text-[#FACC15] bg-[#FACC15]/10 border-[#FACC15]/20', icon: <Clock className="h-3 w-3" /> },
    approved:  { label: 'Approved',  color: 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20', icon: <CheckCircle2 className="h-3 w-3" /> },
    rejected:  { label: 'Rejected',  color: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20', icon: <XCircle className="h-3 w-3" /> },
    processed: { label: 'Processed', color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20', icon: <CheckCircle2 className="h-3 w-3" /> },
  }[status] ?? { label: status, color: 'text-[#94A3B8] bg-white/5 border-white/10', icon: null };

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', cfg.color)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function formatDate(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function shortenAddr(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function Withdrawals() {
  const { isConnected, balance, address, openLoginModal } = useWallet();
  const queryClient = useQueryClient();
  const [amount, setAmount]     = useState('');
  const [wallet, setWallet]     = useState('');
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: withdrawalsData, isLoading: listLoading } = useGetMyWithdrawals({
    query: { enabled: isConnected, queryKey: getGetMyWithdrawalsQueryKey() },
  });

  const createMutation = useCreateWithdrawal({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyWithdrawalsQueryKey() });
        setAmount('');
        setWallet('');
        setFormError('');
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Request failed';
        setFormError(msg);
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setFormError('Enter a valid amount greater than 0');
      return;
    }
    if (amt < 10) {
      setFormError('Minimum withdrawal is 10 USDT');
      return;
    }
    if (amt > balance) {
      setFormError('Insufficient balance');
      return;
    }
    if (!wallet || wallet.trim().length < 10) {
      setFormError('Enter a valid wallet address (minimum 10 characters)');
      return;
    }
    createMutation.mutate({ data: { amount: amt, walletAddress: wallet.trim() } });
  }

  function handleMax() {
    setAmount(balance > 0 ? balance.toFixed(2) : '');
  }

  const withdrawals = withdrawalsData?.withdrawals ?? [];

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white animate-in fade-in duration-200 pb-14 xl:pb-0">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm w-full">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-3xl bg-[#00DFA9]/5 blur-2xl scale-[2]" />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241]">
                <Wallet className="h-9 w-9 text-[#94A3B8]/40" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Sign in to withdraw</h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-8">
              You need to be signed in to submit a withdrawal request.
            </p>
            <button
              onClick={() => openLoginModal('signin')}
              className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
            >
              <Wallet className="h-4 w-4 shrink-0" />
              Sign In
            </button>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#94A3B8]/40">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure · Encrypted · Non-custodial
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white animate-in fade-in duration-200 pb-14 xl:pb-0">
      <Header />

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6">

        {/* Title bar */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#F8FAFC] leading-none">Withdraw Funds</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">Request a USDT withdrawal to your wallet</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#94A3B8]/60 uppercase tracking-wider">Available</p>
            <p className="text-lg font-black text-[#00DFA9] tabular-nums">${balance.toFixed(2)}</p>
            <p className="text-[10px] text-[#94A3B8]/40">USDT</p>
          </div>
        </div>

        {/* Success banner */}
        {submitted && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/25 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
            <p className="text-sm text-[#22C55E] font-medium">Withdrawal request submitted! Our team will review it shortly.</p>
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl border border-[#253241] bg-[#121821] p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
              <ArrowDownToLine className="h-4 w-4 text-[#00DFA9]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">New Withdrawal Request</p>
              <p className="text-[11px] text-[#94A3B8]/60">Withdrawals are processed within 24–48 hours</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Amount (USDT)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#94A3B8]/60">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="10"
                  max={balance}
                  step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setFormError(''); }}
                  placeholder="0.00"
                  className="w-full h-11 bg-[#0B0F14] border border-[#253241] rounded-xl pl-8 pr-16 text-sm font-bold text-[#F8FAFC] placeholder:text-[#94A3B8]/30 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleMax}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#00DFA9] hover:text-[#00DFA9]/80 transition-colors uppercase tracking-wider"
                >
                  Max
                </button>
              </div>
              <p className="text-[10px] text-[#94A3B8]/40 mt-1">Minimum: 10 USDT · Available: ${balance.toFixed(2)} USDT</p>
            </div>

            {/* Wallet address */}
            <div>
              <label className="block text-xs font-semibold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                Destination Wallet Address
              </label>
              <input
                type="text"
                value={wallet}
                onChange={e => { setWallet(e.target.value); setFormError(''); }}
                placeholder={address ?? 'Enter USDT wallet address (TRC-20 or ERC-20)'}
                className="w-full h-11 bg-[#0B0F14] border border-[#253241] rounded-xl px-3 text-sm font-mono text-[#F8FAFC] placeholder:text-[#94A3B8]/30 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all"
              />
              {address && (
                <button
                  type="button"
                  onClick={() => setWallet(address)}
                  className="mt-1.5 text-[11px] text-[#00DFA9]/70 hover:text-[#00DFA9] transition-colors"
                >
                  Use connected address ({address.slice(0, 8)}…{address.slice(-4)})
                </button>
              )}
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                <AlertCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />
                <p className="text-xs text-[#EF4444]">{formError}</p>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[#FACC15]/5 border border-[#FACC15]/15">
              <AlertCircle className="h-3.5 w-3.5 text-[#FACC15]/70 shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#FACC15]/70 leading-relaxed">
                Double-check your wallet address. Withdrawals sent to an incorrect address cannot be recovered.
              </p>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || balance <= 0}
              className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(0,223,169,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><ArrowDownToLine className="h-4 w-4" /> Submit Withdrawal Request</>
              )}
            </button>
          </form>
        </div>

        {/* History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Request History</h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: getGetMyWithdrawalsQueryKey() })}
              className="p-1.5 rounded-lg text-[#94A3B8]/50 hover:text-[#94A3B8] hover:bg-[#253241]/50 transition-all"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {listLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl bg-[#121821] border border-[#253241] animate-pulse" />
              ))}
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="rounded-xl border border-[#253241] bg-[#121821] py-14 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#253241]/40 flex items-center justify-center mb-3">
                <ArrowDownToLine className="h-6 w-6 text-[#94A3B8]/30" />
              </div>
              <p className="text-sm font-semibold text-[#94A3B8]/60">No withdrawal requests yet</p>
              <p className="text-xs text-[#94A3B8]/30 mt-1">Requests you submit will appear here</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {withdrawals.map(w => (
                <div key={w.id} className="rounded-xl border border-[#253241] bg-[#121821] px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-base font-black text-[#F8FAFC] tabular-nums">
                        ${parseFloat(w.amount).toFixed(2)}
                      </span>
                      <span className="text-xs text-[#94A3B8]/60 ml-1.5">{w.currency}</span>
                    </div>
                    <StatusBadge status={w.status as WStatus} />
                  </div>
                  <p className="text-[11px] font-mono text-[#94A3B8]/50 truncate mb-1">{shortenAddr(w.walletAddress)}</p>
                  {w.note && (
                    <p className="text-[11px] text-[#94A3B8]/60 italic mb-1">"{w.note}"</p>
                  )}
                  <p className="text-[10px] text-[#94A3B8]/30">{formatDate(w.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Withdrawals;
