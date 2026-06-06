import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { useBetHistory, PlacedBet } from '@/hooks/useBetHistory';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { formatOdds, OddsFormat } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  Receipt, TrendingUp, TrendingDown, Loader2, RefreshCw,
  Zap, Target, Trophy, BarChart3, Minus, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Filter = 'all' | 'open' | 'won' | 'lost' | 'void';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',  label: 'All'  },
  { key: 'open', label: 'Open' },
  { key: 'won',  label: 'Won'  },
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

function fmtDate(d: Date) {
  const now  = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function fmtDateFull(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function kickoffCountdown(kt: string): string | null {
  if (!kt) return null;
  const [dayPart, timePart] = kt.split(', ');
  if (!timePart) return null;
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const now    = new Date();
  const target = new Date(now);
  if (dayPart === 'Today') {
    target.setHours(h, m, 0, 0);
  } else if (dayPart === 'Tomorrow') {
    target.setDate(target.getDate() + 1);
    target.setHours(h, m, 0, 0);
  } else {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const idx  = days.indexOf(dayPart);
    if (idx === -1) return null;
    const diff = ((idx - now.getDay() + 7) % 7) || 7;
    target.setDate(target.getDate() + diff);
    target.setHours(h, m, 0, 0);
  }
  const diffMins = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMins <= 0) return null;
  if (diffMins < 60) return `${diffMins}m`;
  const hrs = Math.floor(diffMins / 60), mins = diffMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function sportEmoji(leagueName: string, matchName = ''): string {
  const t = `${leagueName} ${matchName}`.toLowerCase();
  if (/basketball|nba|euroleague/.test(t)) return '🏀';
  if (/tennis|atp|wta|wimbledon/.test(t))  return '🎾';
  if (/cricket/.test(t))                    return '🏏';
  if (/hockey|nhl/.test(t))                return '🏒';
  if (/baseball|mlb/.test(t))              return '⚾';
  if (/rugby/.test(t))                      return '🏉';
  if (/volleyball/.test(t))                return '🏐';
  if (/table.tennis|ping.pong/.test(t))    return '🏓';
  if (/mma|ufc|boxing|fight/.test(t))      return '🥊';
  if (/snooker|darts/.test(t))             return '🎯';
  if (/american.football|nfl/.test(t))     return '🏈';
  return '⚽';
}

const PAGE_SIZE = 10;

// ── Status styling config ─────────────────────────────────────────────────────

const STATUS_CFG = {
  open: {
    bar:    'bg-[#38BDF8]',
    bg:     'bg-gradient-to-r from-[#38BDF8]/5 to-transparent',
    border: 'border-[#38BDF8]/20',
    label:  'Open',
    color:  '#38BDF8',
    icon:   null,
  },
  won: {
    bar:    'bg-[#00DFA9]',
    bg:     'bg-gradient-to-r from-[#00DFA9]/6 to-transparent',
    border: 'border-[#00DFA9]/20',
    label:  'Won',
    color:  '#00DFA9',
    icon:   CheckCircle2,
  },
  lost: {
    bar:    'bg-[#EF4444]',
    bg:     'bg-gradient-to-r from-[#EF4444]/5 to-transparent',
    border: 'border-[#EF4444]/18',
    label:  'Lost',
    color:  '#EF4444',
    icon:   XCircle,
  },
  void: {
    bar:    'bg-[#64748B]',
    bg:     'bg-gradient-to-r from-[#64748B]/5 to-transparent',
    border: 'border-[#64748B]/20',
    label:  'Void',
    color:  '#64748B',
    icon:   Minus,
  },
  all: {
    bar:    'bg-[#64748B]',
    bg:     '',
    border: 'border-white/[0.07]',
    label:  '',
    color:  '#64748B',
    icon:   null,
  },
} as const;

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const k   = statusKey(status);
  const cfg = STATUS_CFG[k] ?? STATUS_CFG.open;
  if (k === 'open') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
        style={{ color: '#38BDF8', background: 'rgba(56,189,248,0.10)', borderColor: 'rgba(56,189,248,0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
        Open
      </span>
    );
  }
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ color: cfg.color, background: `${cfg.color}18`, borderColor: `${cfg.color}30` }}>
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

// ── LegRow (expanded acca leg) ────────────────────────────────────────────────

function LegRow({ sel, idx, total, format }: {
  sel: PlacedBet['selections'][number];
  idx: number;
  total: number;
  format: OddsFormat;
}) {
  const isLast = idx === total - 1;
  return (
    <div className={cn('flex items-start gap-3 py-2.5', !isLast && 'border-b border-white/[0.04]')}>
      <div className="flex flex-col items-center shrink-0 mt-1">
        <div className="w-5 h-5 rounded-full bg-[#0B0F14] border border-[#253241] flex items-center justify-center">
          <span className="text-[9px] font-bold text-[#64748B]">{idx + 1}</span>
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#253241] mt-1 min-h-[8px]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#F8FAFC] leading-snug">{sel.selectionName || sel.selectionType}</p>
        <p className="text-[10px] text-[#64748B] mt-0.5 leading-snug">
          {sel.matchName}
          {sel.marketName ? <span className="text-[#64748B]"> · {sel.marketName}</span> : null}
          {sel.scoreAtPlacement ? <span className="text-[#EF4444]/70"> ({sel.scoreAtPlacement})</span> : null}
        </p>
        {sel.leagueName ? <p className="text-[10px] text-[#64748B] mt-0.5">{sel.leagueName}</p> : null}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[13px] font-bold text-[#FACC15]">{formatOdds(sel.odds, format)}</span>
        {sel.isLive && (
          <span className="flex items-center gap-0.5 text-[10px] text-[#EF4444]/80 font-semibold">
            <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
            LIVE
          </span>
        )}
      </div>
    </div>
  );
}

// ── BetCard ───────────────────────────────────────────────────────────────────

function BetCard({ bet, isHighlighted }: { bet: PlacedBet; isHighlighted?: boolean }) {
  const [open,    setOpen]    = useState(isHighlighted ?? false);
  const [tooltip, setTooltip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { format } = useOddsFormat();

  const k       = statusKey(bet.status);
  const cfg     = STATUS_CFG[k];
  const isAcca  = bet.betType === 'acca';
  const profit  = bet.estimatedPayout - bet.stake;
  const mainSel = bet.selections[0];

  useEffect(() => {
    if (isHighlighted && cardRef.current)
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [isHighlighted]);

  const emoji   = sportEmoji(mainSel?.leagueName ?? '', mainSel?.matchName ?? '');
  const inPlay  = bet.selections.some(s => s.isLive);
  const cd      = !inPlay ? kickoffCountdown(bet.selections[0]?.kickoffTime ?? '') : null;

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative rounded-2xl border overflow-hidden transition-all duration-300',
        cfg.bg, cfg.border,
        isHighlighted && 'ring-1 ring-[#00DFA9]/40 shadow-[0_0_24px_rgba(0,223,169,0.12)]',
      )}
    >
      {/* Left status bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', cfg.bar)} />

      {/* ── Card body ─────────────────────────────────────────────────── */}
      <div className="pl-4 pr-3 pt-3 pb-0">

        {/* Row 1: type / ID / highlight tag / status */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={cn(
            'px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
            isAcca
              ? 'text-[#A78BFA] bg-[#A78BFA]/10 border-[#A78BFA]/25'
              : 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/25',
          )}>
            {isAcca ? `${bet.selections.length}-Fold Acca` : 'Single'}
          </span>
          <span className="text-[10px] font-mono text-[#64748B]">{bet.betId}</span>
          {isHighlighted && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#00DFA9]/15 text-[#00DFA9] border border-[#00DFA9]/30">
              ← from stats
            </span>
          )}
          <div className="ml-auto shrink-0">
            <StatusBadge status={bet.status} />
          </div>
        </div>

        {/* Row 2: sport icon + match + live/kickoff */}
        <div className="flex items-start gap-2 mb-2">
          <span className="text-lg leading-none mt-0.5 shrink-0">{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#F8FAFC] leading-snug truncate">
              {mainSel?.matchName ?? '—'}
              {isAcca && bet.selections.length > 1 && (
                <span className="text-[#94A3B8] font-normal"> +{bet.selections.length - 1} leg{bet.selections.length > 2 ? 's' : ''}</span>
              )}
            </p>
            {mainSel?.leagueName && (
              <p className="text-[11px] text-[#94A3B8] leading-none mt-1 truncate">{mainSel.leagueName}</p>
            )}
          </div>
          {/* Live / countdown badge */}
          {inPlay ? (
            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EF4444]/12 border border-[#EF4444]/25 text-[#EF4444] text-[10px] font-bold">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              LIVE
            </span>
          ) : cd ? (
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-[#FACC15]/70 font-semibold">
              <Clock className="h-2.5 w-2.5" />
              {cd}
            </span>
          ) : null}
        </div>

        {/* Row 3: selection name + market */}
        <div className="mb-3 pl-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ArrowRight className="h-2.5 w-2.5 text-[#64748B] shrink-0" />
            <span className="text-[13px] font-semibold text-[#CBD5E1]">
              {mainSel?.selectionName || mainSel?.selectionType || '—'}
            </span>
            {mainSel?.marketName && (
              <span className="text-[10px] text-[#64748B]">· {mainSel.marketName}</span>
            )}
            {mainSel?.scoreAtPlacement && (
              <span className="text-[10px] text-[#EF4444]/60">({mainSel.scoreAtPlacement})</span>
            )}
          </div>
        </div>

        {/* Row 4: odds / stake / result */}
        <div className="flex items-center gap-0 border-t border-white/[0.05] -mx-3 px-3 py-2.5">

          {/* Odds */}
          <div className="flex-1 text-center border-r border-white/[0.06]">
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Odds</p>
            <p className="text-[15px] font-black text-[#FACC15] tabular-nums">
              {formatOdds(bet.totalOdds, format)}
            </p>
          </div>

          {/* Stake */}
          <div className="flex-1 text-center border-r border-white/[0.06]">
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Stake</p>
            <p className="text-[15px] font-bold text-[#F8FAFC] tabular-nums">
              {bet.stake.toFixed(2)}
              <span className="text-[10px] text-[#64748B] ml-0.5">USDT</span>
            </p>
          </div>

          {/* Return / result */}
          <div className="flex-1 text-center">
            {k === 'won' ? (
              <>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Won</p>
                <p className="text-[15px] font-black tabular-nums" style={{ color: '#00DFA9' }}>
                  +{profit.toFixed(2)}
                  <span className="text-[10px] ml-0.5" style={{ color: '#00DFA9', opacity: 0.7 }}>USDT</span>
                </p>
              </>
            ) : k === 'lost' ? (
              <>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Lost</p>
                <p className="text-[15px] font-black text-[#EF4444] tabular-nums">
                  -{bet.stake.toFixed(2)}
                  <span className="text-[10px] text-[#EF4444]/70 ml-0.5">USDT</span>
                </p>
              </>
            ) : k === 'void' ? (
              <>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Refund</p>
                <p className="text-[15px] font-bold text-[#64748B] tabular-nums">
                  {bet.stake.toFixed(2)}
                  <span className="text-[10px] text-[#64748B] ml-0.5">USDT</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-1 font-semibold">Potential</p>
                <p className="text-[15px] font-bold text-[#38BDF8] tabular-nums">
                  {bet.estimatedPayout.toFixed(2)}
                  <span className="text-[10px] text-[#38BDF8]/60 ml-0.5">USDT</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer: timestamp + expand */}
        <div
          className={cn(
            'flex items-center justify-between pb-2.5 pt-1',
            isAcca && 'cursor-pointer',
          )}
          onClick={() => isAcca && setOpen(v => !v)}
        >
          <div
            className="relative"
            onMouseEnter={() => setTooltip(true)}
            onMouseLeave={() => setTooltip(false)}
          >
            <p className="text-[10px] text-[#64748B]">{fmtDate(bet.placedAt)}</p>
            {tooltip && (
              <div className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-lg bg-[#1E2A38] border border-[#253241] text-[10px] text-[#CBD5E1] whitespace-nowrap z-10 shadow-xl">
                {fmtDateFull(bet.placedAt)}
              </div>
            )}
          </div>
          {isAcca && (
            <button className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#94A3B8] transition-colors">
              {open
                ? <><ChevronUp className="h-3.5 w-3.5" /><span>Hide legs</span></>
                : <><ChevronDown className="h-3.5 w-3.5" /><span>View {bet.selections.length} legs</span></>}
            </button>
          )}
        </div>
      </div>

      {/* Expanded acca legs */}
      {isAcca && open && (
        <div className="border-t border-white/[0.06] bg-black/20 px-4 py-1 animate-in fade-in duration-150">
          {bet.selections.map((sel, i) => (
            <LegRow key={sel.id} sel={sel} idx={i} total={bet.selections.length} format={format} />
          ))}
          {/* Acca summary footer */}
          <div className="flex items-center justify-between py-2 border-t border-white/[0.05] mt-1">
            <span className="text-[10px] text-[#64748B]">
              Combined odds: <span className="text-[#FACC15] font-bold">{formatOdds(bet.totalOdds, format)}</span>
            </span>
            <span className="text-[10px] text-[#64748B]">
              Stake: <span className="text-[#F8FAFC] font-semibold">{bet.stake.toFixed(2)} USDT</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatBar({ bets }: { bets: PlacedBet[] }) {
  const total     = bets.length;
  const openBets  = bets.filter(b => statusKey(b.status) === 'open');
  const wonBets   = bets.filter(b => statusKey(b.status) === 'won');
  const lostBets  = bets.filter(b => statusKey(b.status) === 'lost');

  const totalWon   = wonBets.reduce((a, b) => a + b.estimatedPayout, 0);
  const stakeWon   = wonBets.reduce((a, b) => a + b.stake, 0);
  const stakeLost  = lostBets.reduce((a, b) => a + b.stake, 0);
  const netPnL     = totalWon - stakeWon - stakeLost;
  const openPot    = openBets.reduce((a, b) => a + b.estimatedPayout, 0);

  const stats = [
    {
      icon: <BarChart3 className="h-3.5 w-3.5" />,
      label: 'Total Bets',
      value: String(total),
      sub: `${openBets.length} open`,
      color: '#A78BFA',
    },
    {
      icon: <Trophy className="h-3.5 w-3.5" />,
      label: 'Win Rate',
      value: (wonBets.length + lostBets.length) > 0
        ? `${Math.round(wonBets.length / (wonBets.length + lostBets.length) * 100)}%`
        : '—',
      sub: `${wonBets.length}W · ${lostBets.length}L`,
      color: '#FACC15',
    },
    {
      icon: netPnL >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />,
      label: 'Net P&L',
      value: `${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)}`,
      sub: 'on settled bets',
      color: netPnL >= 0 ? '#00DFA9' : '#EF4444',
    },
    {
      icon: <Zap className="h-3.5 w-3.5" />,
      label: 'Open Returns',
      value: openPot.toFixed(2),
      sub: `${openBets.length} pending`,
      color: '#38BDF8',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      {stats.map(s => (
        <div key={s.label} className="rounded-xl border border-white/[0.08] bg-[#0A0F16] p-3">
          <div className="flex items-center gap-1.5 mb-2" style={{ color: s.color }}>
            {s.icon}
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8]">{s.label}</span>
          </div>
          <p className="text-[20px] font-black tabular-nums leading-none" style={{ color: s.color }}>
            {s.value}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── BetsPage ──────────────────────────────────────────────────────────────────

export function BetsPage() {
  const { bets, isLoading, refresh } = useBetHistory();
  const { isAuthenticated } = useAuth();
  const search = useSearch();

  const highlightNumericId = new URLSearchParams(search).get('highlight');
  const highlightedBetId   = highlightNumericId ? `#BET-${highlightNumericId}` : null;

  const [filter,     setFilter]     = useState<Filter>('all');
  const [page,       setPage]       = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return bets;
    return bets.filter(b => statusKey(b.status) === filter);
  }, [bets, filter]);

  const pages     = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (!highlightedBetId || !bets.length) return;
    const idx = bets.findIndex(b => b.betId === highlightedBetId);
    if (idx === -1) return;
    setFilter('all');
    setPage(Math.floor(idx / PAGE_SIZE) + 1);
  }, [highlightedBetId, bets]);

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

  const FILTER_COLORS: Record<Filter, string> = {
    all:  '#94A3B8',
    open: '#38BDF8',
    won:  '#00DFA9',
    lost: '#EF4444',
    void: '#64748B',
  };

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#F8FAFC]">My Bets</h2>
          {bets.length > 0 && (
            <p className="text-[11px] text-[#64748B] mt-0.5">{bets.length} bet{bets.length !== 1 ? 's' : ''} placed</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#64748B] border border-white/[0.08] bg-[#0E1520] hover:text-[#00DFA9] hover:border-[#00DFA9]/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Highlight notice ───────────────────────────────────────────── */}
      {highlightedBetId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00DFA9]/6 border border-[#00DFA9]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9]" />
          <p className="text-[11px] text-[#00DFA9]/80">Showing bet linked from stats — scroll to highlighted card</p>
        </div>
      )}

      {/* ── Stats bar (when bets exist) ────────────────────────────────── */}
      {bets.length > 0 && <StatBar bets={bets} />}

      {/* ── Filter tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          const col    = FILTER_COLORS[f.key];
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold whitespace-nowrap border transition-all duration-150 cursor-pointer',
                active ? 'bg-[#0E1520]' : 'bg-[#0A0F16] text-[#64748B] border-white/[0.06] hover:text-[#94A3B8]',
              )}
              style={active ? { color: col, borderColor: `${col}35` } : {}}
            >
              {f.label}
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold"
                style={active
                  ? { color: col, background: `${col}20` }
                  : { color: '#94A3B8', background: 'rgba(255,255,255,0.06)' }}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Bet list ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-[#00DFA9] animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0A0F16] border border-white/[0.07] flex items-center justify-center">
            <Receipt className="h-6 w-6 text-[#94A3B8]/25" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#94A3B8]/60">
              {filter === 'all' ? 'No bets placed yet' : `No ${filter} bets`}
            </p>
            {!isAuthenticated && (
              <p className="text-[13px] text-[#64748B] mt-1">Sign in to view your bet history</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map(b => (
            <BetCard
              key={b.betId}
              bet={b}
              isHighlighted={highlightedBetId ? b.betId === highlightedBetId : false}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-[11px] text-[#64748B] tabular-nums">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-[#94A3B8] border border-white/[0.08] disabled:opacity-30 hover:border-[#00DFA9]/40 hover:text-[#00DFA9] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Footer note ────────────────────────────────────────────────── */}
      {bets.length > 0 && (
        <p className="text-center text-[10px] text-[#64748B]/60 pt-2">
          All amounts in USDT · 18+ · Bet responsibly
        </p>
      )}
    </div>
  );
}
