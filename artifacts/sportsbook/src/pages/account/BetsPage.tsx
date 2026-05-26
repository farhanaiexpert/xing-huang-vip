import { useState, useMemo } from 'react';
import { useBetHistory, PlacedBet } from '@/hooks/useBetHistory';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Receipt, TrendingUp, TrendingDown, Loader2, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Filter = 'all' | 'open' | 'won' | 'lost' | 'void';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',  label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'won',  label: 'Won' },
  { key: 'lost', label: 'Lost' },
  { key: 'void', label: 'Void' },
];

function statusKey(status?: string): Filter {
  if (!status || status === 'open' || status === 'pending') return 'open';
  if (status === 'won' || status === 'settled') return 'won';
  if (status === 'lost') return 'lost';
  if (status === 'void' || status === 'voided') return 'void';
  return 'open';
}

function StatusBadge({ status }: { status?: string }) {
  const k = statusKey(status);
  if (k === 'open') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border"
        style={{ color: '#38BDF8', background: 'rgba(56,189,248,0.12)', borderColor: 'rgba(56,189,248,0.30)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
        Open
      </span>
    );
  }
  const cfg: Partial<Record<Filter, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }>> = {
    won:  { label: 'Won',   color: '#00DFA9', bg: 'rgba(0,223,169,0.12)',    icon: CheckCircle2 },
    lost: { label: 'Lost',  color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    icon: XCircle      },
    void: { label: 'Void',  color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: Clock        },
    all:  { label: 'All',   color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', icon: Clock        },
  };
  const c = cfg[k] ?? cfg['all']!;
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border"
      style={{ color: c.color, background: c.bg, borderColor: `${c.color}30` }}>
      <Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

function fmtDate(d: Date) {
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

const PAGE_SIZE = 10;

function BetCard({ bet }: { bet: PlacedBet }) {
  const [open, setOpen] = useState(false);
  const { format } = useOddsFormat();
  const k = statusKey(bet.status);
  const profit = bet.estimatedPayout - bet.stake;
  const settled = k === 'won' || k === 'lost';

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0E1520] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        {/* Left */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-bold text-[#64748B] font-mono">{bet.betId}</span>
            <span className={cn(
              'px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider',
              bet.betType === 'acca'
                ? 'bg-[#A78BFA]/12 text-[#A78BFA] border border-[#A78BFA]/25'
                : 'bg-[#38BDF8]/12 text-[#38BDF8] border border-[#38BDF8]/25'
            )}>
              {bet.betType === 'acca' ? `Acca ×${bet.selections.length}` : 'Single'}
            </span>
            <StatusBadge status={bet.status} />
          </div>
          <p className="text-[12px] text-[#94A3B8]/70 truncate">
            {bet.selections.map(s => s.selectionName || s.matchName).join(' · ')}
          </p>
          {k === 'open' && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1">
              {bet.selections.some(s => s.isLive) ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse inline-block" /><span className="text-[#EF4444]/80">In play</span></>
              ) : (
                <span className="text-[#64748B]">⏱ Placed {fmtDate(bet.placedAt)}</span>
              )}
            </p>
          )}
        </div>

        {/* Right */}
        <div className="text-right shrink-0 min-w-[80px]">
          <p className="text-[13px] font-bold text-[#F8FAFC]">${bet.stake.toFixed(2)}</p>
          {k === 'won' ? (
            <p className="text-[11px] font-bold text-[#00DFA9]">🏆 +${profit.toFixed(2)}</p>
          ) : k === 'lost' ? (
            <p className="text-[11px] font-bold text-[#EF4444]">-${bet.stake.toFixed(2)}</p>
          ) : k === 'void' ? (
            <p className="text-[11px] font-semibold text-[#94A3B8]">Refunded</p>
          ) : (
            <p className="text-[11px] text-[#64748B]">Pot ${bet.estimatedPayout.toFixed(2)}</p>
          )}
          <p className="text-[10px] text-[#475569] mt-0.5">{fmtDate(bet.placedAt)}</p>
        </div>

        <div className="text-[#94A3B8]/30 ml-1 shrink-0">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded legs */}
      {open && (
        <div className="border-t border-white/[0.06] bg-[#0A0F16]">
          <div className="px-4 py-3 space-y-0">
            {bet.selections.map((sel, i) => (
              <div key={sel.id} className={cn(
                'flex items-start gap-3 py-2.5',
                i > 0 && 'border-t border-white/[0.04]'
              )}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]/50 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[12px] font-semibold text-[#F8FAFC]">{sel.selectionName}</p>
                    {sel.isLive && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/25 text-[#EF4444] text-[9px] font-bold uppercase tracking-wider">
                        <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
                    {sel.matchName} · {sel.marketName}
                    {sel.scoreAtPlacement && (
                      <span className="ml-1.5 text-[#EF4444]/70">({sel.scoreAtPlacement})</span>
                    )}
                  </p>
                </div>
                <span className="text-[12px] font-bold text-[#FACC15] shrink-0">{formatOdds(sel.odds, format)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-black/20">
            <div className="flex items-center gap-4 text-[11px] text-[#64748B]">
              <span>Stake: <span className="text-[#F8FAFC] font-semibold">${bet.stake.toFixed(2)}</span></span>
              <span>Odds: <span className="text-[#FACC15] font-semibold">{formatOdds(bet.totalOdds, format)}</span></span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {k === 'won' ? (
                <><TrendingUp className="h-3 w-3 text-[#00DFA9]" /><span className="text-[#00DFA9] font-bold">+${profit.toFixed(2)}</span></>
              ) : k === 'lost' ? (
                <><TrendingDown className="h-3 w-3 text-[#EF4444]" /><span className="text-[#EF4444] font-bold">-${bet.stake.toFixed(2)}</span></>
              ) : (
                <span className="text-[#64748B]">Potential: ${bet.estimatedPayout.toFixed(2)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BetsPage() {
  const { bets, isLoading, refresh } = useBetHistory();
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return bets;
    return bets.filter(b => statusKey(b.status) === filter);
  }, [bets, filter]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const counts: Record<Filter, number> = {
    all:  bets.length,
    open: bets.filter(b => statusKey(b.status) === 'open').length,
    won:  bets.filter(b => statusKey(b.status) === 'won').length,
    lost: bets.filter(b => statusKey(b.status) === 'lost').length,
    void: bets.filter(b => statusKey(b.status) === 'void').length,
  };

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#F8FAFC]">My Bets</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#64748B] border border-white/[0.08] bg-[#0E1520] hover:text-[#00DFA9] hover:border-[#00DFA9]/30 transition-all cursor-pointer"
        >
          <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all duration-150 cursor-pointer',
              filter === f.key
                ? 'bg-[#00DFA9]/12 text-[#00DFA9] border-[#00DFA9]/30'
                : 'bg-[#0E1520] text-[#94A3B8]/55 border-white/[0.06] hover:text-[#F8FAFC]'
            )}
          >
            {f.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-md text-[9px] font-bold',
              filter === f.key ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-white/[0.06] text-[#64748B]'
            )}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Bet list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[#00DFA9] animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#0E1520] border border-white/[0.07] flex items-center justify-center">
            <Receipt className="h-6 w-6 text-[#94A3B8]/30" />
          </div>
          <p className="text-[14px] text-[#94A3B8]/50">
            {filter === 'all' ? 'No bets placed yet' : `No ${filter} bets`}
          </p>
          {!isAuthenticated && <p className="text-[12px] text-[#94A3B8]/30">Sign in to view your bet history</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map(b => <BetCard key={b.betId} bet={b} />)}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-[12px] text-[#64748B]">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
