import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import {
  ArrowDownLeft, ArrowUpRight, Receipt, Trophy, Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { CircleDollarSign } from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: string;
  status: string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

type Range = '7d' | '30d' | '90d' | 'all';
type TxFilter = 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win' | 'credit';

const RANGES: { key: Range; label: string }[] = [
  { key: '7d',  label: 'Last 7d'  },
  { key: '30d', label: 'Last 30d' },
  { key: '90d', label: 'Last 90d' },
  { key: 'all', label: 'All time' },
];

const TYPE_FILTERS: { key: TxFilter; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'deposit',    label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'bet',        label: 'Bets' },
  { key: 'win',        label: 'Winnings' },
  { key: 'credit',     label: 'Credits' },
];

function fmtAmt(amount: string) {
  return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function txLabel(type: string) {
  const m: Record<string, string> = {
    deposit:    'Top Up',
    withdrawal: 'Withdrawal',
    bet:        'Bet Placed',
    debit:      'Bet Placed',
    win:        'Winnings',
    credit:     'Credit',
    bonus:      'Bonus Credit',
  };
  return m[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function isCredit(type: string) {
  return type === 'deposit' || type === 'win' || type === 'credit' || type === 'bonus';
}

function txColor(type: string) {
  if (type === 'deposit')                    return '#00DFA9';
  if (type === 'withdrawal')                 return '#EF4444';
  if (type === 'win')                        return '#FACC15';
  if (type === 'credit' || type === 'bonus') return '#00DFA9';
  return '#38BDF8';
}

/** Returns true when tx.type matches the active filter key */
function matchesFilter(type: string, filter: TxFilter): boolean {
  if (filter === 'all')        return true;
  if (filter === 'bet')        return type === 'bet' || type === 'debit';
  if (filter === 'win')        return type === 'win';
  if (filter === 'credit')     return type === 'credit' || type === 'bonus';
  return type === filter;
}

function TxRow({ tx, runningBalance }: { tx: Transaction; runningBalance?: number }) {
  const credit = isCredit(tx.type);
  const color = txColor(tx.type);
  const statusColor =
    tx.status === 'completed'  ? '#00DFA9' :
    tx.status === 'confirming' ? '#38BDF8' :
    tx.status === 'pending'    ? '#FACC15' :
    (tx.status === 'failed' || tx.status === 'rejected') ? '#EF4444' : '#64748B';
  return (
    <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
        {tx.type === 'deposit'    && <ArrowDownLeft className="h-3.5 w-3.5" style={{ color }} />}
        {tx.type === 'withdrawal' && <ArrowUpRight  className="h-3.5 w-3.5" style={{ color }} />}
        {tx.type === 'win'        && <Trophy        className="h-3.5 w-3.5" style={{ color }} />}
        {(tx.type !== 'deposit' && tx.type !== 'withdrawal' && tx.type !== 'win') && (
          <Receipt className="h-3.5 w-3.5" style={{ color }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[12px] font-semibold text-[#F8FAFC] leading-tight">{txLabel(tx.type)}</p>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize shrink-0 leading-none"
            style={{ background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>
            {tx.status}
          </span>
        </div>
        <p className="text-[10px] text-[#64748B] mt-0.5 leading-tight">{fmtDate(tx.createdAt)}</p>
        {tx.reference && (
          <p className="text-[9px] text-[#475569] font-mono truncate mt-0.5">{tx.reference}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold leading-tight" style={{ color: credit ? '#00DFA9' : '#EF4444' }}>
          {credit ? '+' : '-'}{fmtAmt(tx.amount)}
        </p>
        <p className="text-[9px] text-[#64748B] leading-none mt-0.5">USDT</p>
        {runningBalance !== undefined && (
          <p className="text-[9px] text-[#334155] font-mono mt-0.5">
            ≈{runningBalance.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const { isAuthenticated } = useAuth();
  const [all, setAll] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('30d');
  const [typeFilter, setTypeFilter] = useState<TxFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    api.get<Transaction[]>('/wallet/transactions')
      .then(data => setAll([...data].reverse()))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<Range, number> = {
      '7d':  7  * 86400_000,
      '30d': 30 * 86400_000,
      '90d': 90 * 86400_000,
      'all': Infinity,
    };
    const cutoff = cutoffs[range];
    return all.filter(tx => {
      const old = now - new Date(tx.createdAt).getTime() > cutoff;
      if (old) return false;
      if (!matchesFilter(tx.type, typeFilter)) return false;
      return true;
    });
  }, [all, range, typeFilter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalDeposits    = all.filter(t => t.type === 'deposit')    .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalWithdrawals = all.filter(t => t.type === 'withdrawal') .reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalWinnings    = all.filter(t => t.type === 'win')        .reduce((s, t) => s + parseFloat(t.amount), 0);

  // Running balance map: compute on chrono order (all is newest-first, so reverse to get oldest-first)
  const runningBalances = useMemo(() => {
    const chrono = [...all].reverse();
    let bal = 0;
    const map = new Map<number, number>();
    for (const tx of chrono) {
      const amt = parseFloat(tx.amount);
      bal += isCredit(tx.type) ? amt : -amt;
      map.set(tx.id, bal);
    }
    return map;
  }, [all]);

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-[16px] font-bold text-[#F8FAFC]">Transactions</h2>

      {/* Summary tiles */}
      {!loading && all.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Deposited', value: totalDeposits,    color: '#00DFA9' },
            { label: 'Withdrawn', value: totalWithdrawals, color: '#EF4444' },
            { label: 'Winnings',  value: totalWinnings,    color: '#FACC15' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2.5 border border-white/[0.07] bg-[#0E1520]">
              <div className="h-[2px] rounded-full mb-2" style={{ background: s.color }} />
              <p className="text-[13px] font-black leading-none" style={{ color: s.color }}>{s.value.toFixed(2)}</p>
              <p className="text-[9px] font-bold text-[#94A3B8] mt-0.5">USDT</p>
              <p className="text-[9px] text-[#475569] mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-1.5">
        {/* Date range row */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => { setRange(r.key); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all cursor-pointer shrink-0',
                range === r.key
                  ? 'bg-[#00DFA9]/15 text-[#00DFA9] border-[#00DFA9]/35'
                  : 'bg-[#0B0F14] text-[#64748B] border-white/[0.08] hover:text-[#F8FAFC] hover:border-white/15'
              )}>
              {r.label}
            </button>
          ))}
        </div>
        {/* Type filter row */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TYPE_FILTERS.map(f => (
            <button key={f.key} onClick={() => { setTypeFilter(f.key); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all cursor-pointer shrink-0',
                typeFilter === f.key
                  ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/35'
                  : 'bg-[#0B0F14] text-[#64748B] border-white/[0.08] hover:text-[#F8FAFC] hover:border-white/15'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[#00DFA9] animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
            <CircleDollarSign className="h-6 w-6 text-[#94A3B8]/30" />
          </div>
          <p className="text-[13px] text-[#94A3B8]/50">No transactions found</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0A0F16]">
              <SlidersHorizontal className="h-3 w-3 text-[#64748B]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            {paginated.map((tx, i) => (
              <div key={tx.id} className={cn(i > 0 && 'border-t border-white/[0.04]')}>
                <TxRow tx={tx} runningBalance={runningBalances.get(tx.id)} />
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed">
                ← Prev
              </button>
              <span className="text-[12px] text-[#64748B]">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
