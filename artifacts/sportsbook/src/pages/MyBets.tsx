import { useState, ReactNode } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { useWallet } from '@/hooks/useWallet';
import { useBetHistory, PlacedBet } from '@/hooks/useBetHistory';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, MinusCircle,
  ChevronDown, ChevronUp, ArrowLeft,
  TrendingUp, TrendingDown, BarChart2, Wallet, ShieldCheck,
} from 'lucide-react';

type Filter = 'all' | 'open' | 'settled';

function isOpen(b: PlacedBet) {
  return !b.status || b.status === 'open' || b.status === 'pending';
}
function isSettled(b: PlacedBet) {
  return b.status === 'won' || b.status === 'lost' || b.status === 'void' || b.status === 'voided';
}

function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function MyBets() {
  const [filter, setFilter] = useState<Filter>('all');
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected } = useWallet();
  const { bets, isLoading } = useBetHistory();

  const filtered = bets.filter(b => {
    if (filter === 'open')    return isOpen(b);
    if (filter === 'settled') return isSettled(b);
    return true;
  });

  const settledBets = bets.filter(isSettled);
  const wonBets     = bets.filter(b => b.status === 'won');
  const lostBets    = bets.filter(b => b.status === 'lost');
  const winRate     = settledBets.length > 0 ? Math.round((wonBets.length / settledBets.filter(b => b.status === 'won' || b.status === 'lost').length) * 100) : 0;
  const netPL       = wonBets.reduce((acc, b) => acc + (b.estimatedPayout - b.stake), 0)
                    + lostBets.reduce((acc, b) => acc + (-b.stake), 0);
  const totalStake  = bets.reduce((acc, b) => acc + b.stake, 0);
  const openCount   = bets.filter(isOpen).length;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm w-full">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-3xl bg-[#00DFA9]/5 blur-2xl scale-[2]" />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)]">
                <Wallet className="h-9 w-9 text-[#94A3B8]/40" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Connect your wallet</h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-8">
              Your bet history is tied to your wallet. Connect to view your open and settled bets.
            </p>
            <button
              onClick={() => setWalletOpen(true)}
              className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
            >
              <Wallet className="h-4 w-4 shrink-0" />
              Connect Wallet
            </button>
            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#94A3B8]/40">
              <ShieldCheck className="h-3.5 w-3.5" />
              Non-custodial · Your keys, your bets
            </div>
          </div>
        </div>
        <ConnectWalletModal open={walletOpen} onOpenChange={setWalletOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white pb-14 xl:pb-0">
      <Header />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC] leading-none">My Bets</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">{bets.length} bets placed</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            sub={`${wonBets.length} of ${settledBets.filter(b => b.status === 'won' || b.status === 'lost').length} settled`}
            icon={<BarChart2 className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label="Net P&L"
            value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} USDT`}
            sub={`${totalStake.toFixed(2)} USDT staked`}
            icon={netPL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            color={netPL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Open Bets"
            value={String(openCount)}
            sub="awaiting result"
            icon={<Clock className="h-4 w-4" />}
            color="amber"
          />
        </div>

        <div className="flex gap-1 mb-4 bg-[#121821] border border-[#253241] rounded-xl p-1">
          {(['all', 'open', 'settled'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-150',
                filter === f
                  ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm'
                  : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
              )}
            >
              {f}
              {f === 'open' && openCount > 0 && (
                <span className="ml-1.5 text-[9px] bg-[#FACC15]/15 text-[#FACC15] px-1.5 py-0.5 rounded-full font-bold">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading && bets.length === 0 && (
            <div className="text-center py-16 text-[#94A3B8]/50 text-sm">Loading bets…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-[#94A3B8]/50 text-sm">No bets to show</div>
          )}
          {filtered.map(bet => <BetCard key={bet.betId} bet={bet} />)}
        </div>

        <div className="mt-10 text-center">
          <p className="text-[10px] text-[#94A3B8]/30">
            Please gamble responsibly · 18+ only · BeGambleAware.org · GamStop
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: ReactNode; color: 'green' | 'red' | 'blue' | 'amber';
}) {
  const colors = {
    green: { bg: 'bg-[#22C55E]/5', border: 'border-[#22C55E]/15', icon: 'text-[#22C55E] bg-[#22C55E]/10', val: 'text-[#22C55E]' },
    red:   { bg: 'bg-[#EF4444]/5', border: 'border-[#EF4444]/15', icon: 'text-[#EF4444] bg-[#EF4444]/10', val: 'text-[#EF4444]' },
    blue:  { bg: 'bg-[#38BDF8]/5', border: 'border-[#38BDF8]/15', icon: 'text-[#38BDF8] bg-[#38BDF8]/10', val: 'text-[#F8FAFC]' },
    amber: { bg: 'bg-[#FACC15]/5', border: 'border-[#FACC15]/15', icon: 'text-[#FACC15] bg-[#FACC15]/10', val: 'text-[#FACC15]' },
  };
  const c = colors[color];
  return (
    <div className={cn('rounded-xl border p-3', c.bg, c.border)}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', c.icon)}>
        {icon}
      </div>
      <p className={cn('text-lg font-black leading-none', c.val)}>{value}</p>
      <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 leading-none">{label}</p>
      <p className="text-[9px] text-[#94A3B8]/40 mt-1 leading-none">{sub}</p>
    </div>
  );
}

function BetCard({ bet }: { bet: PlacedBet }) {
  const [expanded, setExpanded] = useState(false);
  const { format: oddsFormat } = useOddsFormat();

  const status = bet.status ?? 'open';
  const isPending = isOpen(bet);
  const isVoid    = status === 'void' || status === 'voided';
  const isWon     = status === 'won';
  const isLost    = status === 'lost';
  const isAnyLive = bet.selections.some(s => s.isLive);
  const isAcca    = bet.betType === 'acca';

  const returns = isWon ? bet.estimatedPayout : isVoid ? bet.stake : 0;
  const profit  = isWon ? bet.estimatedPayout - bet.stake : isLost ? -bet.stake : 0;

  const statusConfig = {
    won:     { label: 'Won',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]', leftBar: 'bg-[#22C55E]' },
    lost:    { label: 'Lost',    icon: <XCircle      className="h-3.5 w-3.5" />, bg: 'bg-[#EF4444]/5',  border: 'border-[#EF4444]/20', text: 'text-[#EF4444]', leftBar: 'bg-[#EF4444]' },
    void:    { label: 'Void',    icon: <MinusCircle  className="h-3.5 w-3.5" />, bg: 'bg-[#94A3B8]/5',  border: 'border-[#94A3B8]/20', text: 'text-[#94A3B8]', leftBar: 'bg-[#94A3B8]' },
    pending: { label: isAnyLive ? 'Live' : 'Open', icon: <Clock className="h-3.5 w-3.5" />, bg: 'bg-[#FACC15]/5', border: 'border-[#FACC15]/20', text: 'text-[#FACC15]', leftBar: 'bg-[#FACC15]' },
  };

  const sKey = isWon ? 'won' : isLost ? 'lost' : isVoid ? 'void' : 'pending';
  const s = statusConfig[sKey];
  const mainSel = bet.selections[0];

  return (
    <div className={cn('relative rounded-xl border overflow-hidden transition-all duration-200', s.bg, s.border)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', s.leftBar)} />

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', s.text, s.bg)}>
                {isAcca ? `${bet.selections.length}-Fold Acca` : 'Single'}
              </span>
              <span className="text-[9px] text-[#94A3B8]/40 font-mono">{bet.betId}</span>
              {isAnyLive && isPending && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
                  <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-[#F8FAFC] leading-snug">
              {mainSel?.selectionName || mainSel?.selectionType || '—'}
            </p>
            <p className="text-xs text-[#94A3B8] leading-none mt-0.5">
              {mainSel?.matchName}
              {isAcca && bet.selections.length > 1 && (
                <span className="text-[#94A3B8]/50"> +{bet.selections.length - 1} more</span>
              )}
            </p>
          </div>

          <div className={cn('flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-xs font-semibold', s.text, s.bg)}>
            {s.icon}
            {s.label}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/5">
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">Odds</p>
            <p className="text-sm font-black text-[#FACC15] tabular-nums">{formatOdds(bet.totalOdds, oddsFormat)}</p>
          </div>
          <div className="w-px h-6 bg-[#253241]" />
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">Stake</p>
            <p className="text-sm font-bold text-[#F8FAFC]">{bet.stake.toFixed(2)} USDT</p>
          </div>
          <div className="w-px h-6 bg-[#253241]" />
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">
              {isPending ? 'Pot. Return' : isVoid ? 'Refunded' : 'Returns'}
            </p>
            <p className={cn('text-sm font-bold tabular-nums',
              isWon ? 'text-[#22C55E]' : isLost ? 'text-[#94A3B8]/50 line-through' : isVoid ? 'text-[#94A3B8]' : 'text-[#F8FAFC]'
            )}>
              {isLost ? '0.00 USDT' : `${(isPending ? bet.estimatedPayout : returns).toFixed(2)} USDT`}
            </p>
          </div>
          {!isPending && !isVoid && (
            <>
              <div className="w-px h-6 bg-[#253241]" />
              <div className="text-center">
                <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">P&L</p>
                <p className={cn('text-sm font-bold tabular-nums', profit > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                  {profit > 0 ? '+' : ''}{profit.toFixed(2)} USDT
                </p>
              </div>
            </>
          )}

          {isAcca && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="ml-auto p-1.5 rounded-lg text-[#94A3B8]/50 hover:text-[#94A3B8] hover:bg-[#253241]/40 transition-all"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {isAcca && expanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
            {bet.selections.map((sel, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">{sel.selectionName || sel.selectionType}</p>
                  <p className="text-[10px] text-[#94A3B8]/60 truncate">{sel.matchName}{sel.leagueName ? ` · ${sel.leagueName}` : ''}</p>
                </div>
                <span className="text-xs font-bold text-[#FACC15] tabular-nums shrink-0">{formatOdds(sel.odds, oddsFormat)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[9px] text-[#94A3B8]/30 mt-2 text-right">{timeAgo(bet.placedAt)}</p>
      </div>
    </div>
  );
}

export default MyBets;
