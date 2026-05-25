import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Receipt, Trophy,
  RefreshCw, ExternalLink, Loader2, CircleDollarSign,
} from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

function fmtAmt(amount: string) {
  return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function TxIcon({ type }: { type: string }) {
  if (type === 'deposit')    return <ArrowDownLeft className="h-4 w-4 text-[#00DFA9]" />;
  if (type === 'withdrawal') return <ArrowUpRight  className="h-4 w-4 text-[#EF4444]" />;
  if (type === 'win')        return <Trophy        className="h-4 w-4 text-[#FACC15]" />;
  return <Receipt className="h-4 w-4 text-[#38BDF8]" />;
}

function txColor(type: string) {
  if (type === 'deposit') return '#00DFA9';
  if (type === 'withdrawal') return '#EF4444';
  if (type === 'win') return '#FACC15';
  return '#38BDF8';
}

function txBg(type: string) {
  if (type === 'deposit') return 'rgba(0,223,169,0.08)';
  if (type === 'withdrawal') return 'rgba(239,68,68,0.08)';
  if (type === 'win') return 'rgba(250,204,21,0.08)';
  return 'rgba(56,189,248,0.08)';
}

function txLabel(type: string) {
  const m: Record<string, string> = {
    deposit: 'Deposit', withdrawal: 'Withdrawal',
    bet: 'Bet Placed', win: 'Winnings', bonus: 'Bonus',
  };
  return m[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function isCredit(type: string) {
  return type === 'deposit' || type === 'win' || type === 'bonus';
}

export function WalletPage() {
  const { balance, refreshBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadTxns() {
    if (!isAuthenticated) return;
    try {
      const data = await api.get<Transaction[]>('/wallet/transactions');
      setTxns([...data].reverse().slice(0, 15));
    } catch { setTxns([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTxns(); }, [isAuthenticated]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refreshBalance(), loadTxns()]);
    setRefreshing(false);
  }

  return (
    <div className="space-y-5">

      {/* ── Balance hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[#00DFA9]/20 p-6"
        style={{ background: 'linear-gradient(135deg, #071A12 0%, #0A1A10 50%, #0B0F14 100%)' }}>
        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,223,169,0.15) 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/12 border border-[#00DFA9]/25 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-[#00DFA9]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Available Balance</p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="ml-auto p-1.5 rounded-lg text-[#64748B] hover:text-[#00DFA9] hover:bg-[#00DFA9]/10 transition-all cursor-pointer"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            </button>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-[42px] font-black text-[#F8FAFC] leading-none" style={{ textShadow: '0 0 40px rgba(0,223,169,0.2)' }}>
              ${balance.toFixed(2)}
            </span>
            <span className="text-[16px] font-bold text-[#00DFA9] mb-1.5">USDT</span>
          </div>
          <div className="flex gap-3 mt-5">
            <a
              href="https://secureconnectchain.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#0B0F14] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #00DFA9 0%, #00C49A 100%)', boxShadow: '0 0 20px rgba(0,223,169,0.3)' }}
            >
              <ArrowDownLeft className="h-4 w-4" />
              Deposit
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <a
              href="https://secureconnectchain.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] text-[#94A3B8] border border-white/[0.12] bg-white/[0.04] hover:border-white/[0.2] hover:text-[#F8FAFC] transition-all cursor-pointer"
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </a>
          </div>
        </div>
      </div>

      {/* ── Recent transactions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-bold text-[#F8FAFC]">Recent Transactions</p>
          <a href="/account/transactions" className="text-[11px] text-[#00DFA9] hover:underline">View all →</a>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-[#00DFA9] animate-spin" />
          </div>
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
              <CircleDollarSign className="h-6 w-6 text-[#94A3B8]/30" />
            </div>
            <p className="text-[13px] text-[#94A3B8]/50">No transactions yet</p>
            <p className="text-[11px] text-[#94A3B8]/30 text-center">Deposits, withdrawals and winnings<br/>will appear here</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden bg-[#0E1520]">
            {txns.map((tx, i) => (
              <div key={tx.id} className={cn(
                'flex items-center gap-3 px-4 py-3.5',
                i > 0 && 'border-t border-white/[0.04]'
              )}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: txBg(tx.type), border: `1px solid ${txColor(tx.type)}20` }}>
                  <TxIcon type={tx.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#F8FAFC]">{txLabel(tx.type)}</p>
                  <p className="text-[11px] text-[#64748B]">{fmtDate(tx.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold" style={{ color: isCredit(tx.type) ? '#00DFA9' : '#EF4444' }}>
                    {isCredit(tx.type) ? '+' : '-'}${fmtAmt(tx.amount)}
                  </p>
                  <p className="text-[10px] text-[#64748B] capitalize">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
