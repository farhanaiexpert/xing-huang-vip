import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { useWallet } from '@/hooks/useWallet';
import { useBetHistory, PlacedBet } from '@/hooks/useBetHistory';
import { useOddsFormat } from '@/hooks/useOddsFormat';
import { formatOdds } from '@/lib/oddsFormat';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
  ArrowLeft, TrendingUp, TrendingDown, BarChart2,
  Wallet, ShieldCheck, Search, X, SlidersHorizontal, Calendar,
  FileText,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────
type FilterKey = 'all' | 'active';

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────
function formatDate(date: Date): string {
  const now  = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ────────────────────────────────────────────────────────────────
// FILTER DEFINITIONS
// ────────────────────────────────────────────────────────────────
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'All'    },
  { key: 'active', label: 'Active' },
];

// ────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────
export function BetHistory() {
  const { isConnected } = useWallet();
  const { bets }        = useBetHistory();
  const [filter,     setFilter]     = useState<FilterKey>('all');
  const [search,     setSearch]     = useState('');
  const [walletOpen, setWalletOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = bets;
    if (filter === 'active') list = list.filter(b => b.betType === b.betType); // all placed bets are active
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.betId.toLowerCase().includes(q) ||
        b.selections.some(s =>
          (s.selectionName || s.selectionType).toLowerCase().includes(q) ||
          s.matchName.toLowerCase().includes(q) ||
          (s.leagueName || '').toLowerCase().includes(q)
        )
      );
    }
    return list;
  }, [bets, filter, search]);

  const totalStake  = bets.reduce((acc, b) => acc + b.stake, 0);
  const potReturn   = bets.reduce((acc, b) => acc + b.estimatedPayout, 0);
  const openCount   = bets.filter(b => !b.status || b.status === 'open' || b.status === 'pending').length;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white animate-in fade-in duration-200 pb-14 xl:pb-0">
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
              Your bet history is linked to your wallet address. Connect to view your bets.
            </p>
            <button
              onClick={() => setWalletOpen(true)}
              className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-[#00DFA9] text-[#0B0F14] hover:shadow-[0_0_28px_rgba(0,223,169,0.5)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
            >
              <Wallet className="h-4 w-4 shrink-0" />
              Connect Wallet
            </button>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-[#94A3B8]/40">
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
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white animate-in fade-in duration-200 pb-14 xl:pb-0">
      <Header />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">

        {/* ── Title bar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[#F8FAFC] leading-none">Bet History</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">{bets.length} total bet{bets.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* ── Stats row (only when bets exist) ───────────────────── */}
        {bets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Total Bets"
              value={String(bets.length)}
              sub={`${bets.length} placed`}
              icon={<Calendar className="h-4 w-4" />}
              color="purple"
            />
            <StatCard
              label="Open Bets"
              value={String(openCount)}
              sub="awaiting result"
              icon={<Clock className="h-4 w-4" />}
              color="amber"
            />
            <StatCard
              label="Total Staked"
              value={`${totalStake.toFixed(2)} USDT`}
              sub="across all bets"
              icon={<BarChart2 className="h-4 w-4" />}
              color="blue"
            />
            <StatCard
              label="Pot. Returns"
              value={`${potReturn.toFixed(2)} USDT`}
              sub="if all win"
              icon={<TrendingUp className="h-4 w-4" />}
              color="green"
            />
          </div>
        )}

        {/* ── Search ─────────────────────────────────────────────── */}
        {bets.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Bet ID, team name or league…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 bg-[#121821] border border-[#253241] rounded-xl pl-9 pr-10 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus:outline-none focus:border-[#00DFA9]/50 focus:ring-1 focus:ring-[#00DFA9]/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#94A3B8]/50 hover:text-[#94A3B8] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* ── Filter tabs ────────────────────────────────────────── */}
        {bets.length > 0 && (
          <div className="flex gap-1 mb-5 bg-[#121821] border border-[#253241] rounded-xl p-1 overflow-x-auto">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? bets.length : bets.length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150',
                    filter === f.key
                      ? 'bg-[#18212B] text-[#F8FAFC] shadow-sm'
                      : 'text-[#94A3B8]/60 hover:text-[#94A3B8]'
                  )}
                >
                  {f.label}
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                    filter === f.key ? 'bg-[#253241] text-[#94A3B8]' : 'bg-[#253241]/50 text-[#94A3B8]/50'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Bet list ───────────────────────────────────────────── */}
        <div className="space-y-3">
          {bets.length === 0 ? (
            <NoBetsState />
          ) : filtered.length === 0 ? (
            <EmptySearchState search={search} onClear={() => { setSearch(''); setFilter('all'); }} />
          ) : (
            filtered.map(bet => <BetCard key={bet.betId} bet={bet} />)
          )}
        </div>

        {bets.length > 0 && (
          <div className="mt-10 text-center">
            <p className="text-[10px] text-[#94A3B8]/30">
              All bets are pending · 18+ · Bet responsibly
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// STAT CARD
// ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: 'green' | 'red' | 'blue' | 'amber' | 'purple';
}) {
  const C = {
    green:  { bg: 'bg-[#22C55E]/5',  border: 'border-[#22C55E]/15', icon: 'text-[#22C55E] bg-[#22C55E]/10',  val: 'text-[#22C55E]' },
    red:    { bg: 'bg-[#EF4444]/5',  border: 'border-[#EF4444]/15', icon: 'text-[#EF4444] bg-[#EF4444]/10',  val: 'text-[#EF4444]' },
    blue:   { bg: 'bg-[#38BDF8]/5',  border: 'border-[#38BDF8]/15', icon: 'text-[#38BDF8] bg-[#38BDF8]/10',  val: 'text-[#F8FAFC]' },
    amber:  { bg: 'bg-[#FACC15]/5',  border: 'border-[#FACC15]/15', icon: 'text-[#FACC15] bg-[#FACC15]/10',  val: 'text-[#FACC15]' },
    purple: { bg: 'bg-[#A78BFA]/5',  border: 'border-[#A78BFA]/15', icon: 'text-[#A78BFA] bg-[#A78BFA]/10',  val: 'text-[#F8FAFC]' },
  }[color];
  return (
    <div className={cn('rounded-xl border p-3', C.bg, C.border)}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', C.icon)}>{icon}</div>
      <p className={cn('text-lg font-black leading-none', C.val)}>{value}</p>
      <p className="text-[10px] text-[#94A3B8]/60 mt-0.5 leading-none">{label}</p>
      <p className="text-[9px] text-[#94A3B8]/40 mt-1 leading-none truncate">{sub}</p>
    </div>
  );
}

function kickoffCountdown(kt: string): string | null {
  if (!kt) return null;
  const [dayPart, timePart] = kt.split(', ');
  if (!timePart) return null;
  const [hStr, mStr] = timePart.split(':');
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return null;
  const now = new Date();
  const target = new Date(now);
  if (dayPart === 'Today') {
    target.setHours(h, m, 0, 0);
  } else if (dayPart === 'Tomorrow') {
    target.setDate(target.getDate() + 1);
    target.setHours(h, m, 0, 0);
  } else {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const idx = days.indexOf(dayPart);
    if (idx === -1) return null;
    const diff = ((idx - now.getDay() + 7) % 7) || 7;
    target.setDate(target.getDate() + diff);
    target.setHours(h, m, 0, 0);
  }
  const diffMins = Math.round((target.getTime() - now.getTime()) / 60000);
  if (diffMins <= 0) return null;
  if (diffMins < 60) return `Kicks off in ${diffMins}m`;
  const hrs = Math.floor(diffMins / 60), mins = diffMins % 60;
  return mins > 0 ? `Kicks off in ${hrs}h ${mins}m` : `Kicks off in ${hrs}h`;
}

// ────────────────────────────────────────────────────────────────
// BET CARD
// ────────────────────────────────────────────────────────────────
function BetCard({ bet }: { bet: PlacedBet }) {
  const [expanded, setExpanded] = useState(false);
  const { format } = useOddsFormat();
  const isAcca  = bet.betType === 'acca';
  const mainSel = bet.selections[0];

  return (
    <div className="relative rounded-xl border overflow-hidden transition-all duration-200 bg-[#FACC15]/5 border-[#FACC15]/20">
      {/* Left status bar — amber for pending/active */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FACC15]" />

      <div className="pl-4 pr-3 py-3">

        {/* Top row: type + ID + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded text-[#FACC15] bg-[#FACC15]/5">
              {isAcca ? `${bet.selections.length}-Fold Acca` : 'Single'}
            </span>
            <span className="text-[10px] font-mono text-[#94A3B8]/50 bg-[#0B0F14] border border-[#253241] px-1.5 py-0.5 rounded">
              {bet.betId}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#FACC15] bg-[#FACC15]/5">
              <Clock className="h-3.5 w-3.5" />
              Active
            </div>
            {bet.selections.some(s => s.isLive) ? (
              <span className="flex items-center gap-0.5 text-[9px] text-[#EF4444]/80">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse inline-block" />
                In play
              </span>
            ) : (() => {
              const kt = bet.selections[0]?.kickoffTime;
              const cd = kt ? kickoffCountdown(kt) : null;
              return cd
                ? <span className="text-[9px] text-[#FACC15]/70">🕐 {cd}</span>
                : <span className="text-[9px] text-[#64748B]">Awaiting result</span>;
            })()}
          </div>
        </div>

        {/* Main selection */}
        <div className="mb-2">
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-snug">
            {mainSel.selectionName || mainSel.selectionType}
          </p>
          <p className="text-[11px] text-[#94A3B8] leading-none mt-0.5">
            {mainSel.matchName}
            {isAcca && bet.selections.length > 1 && (
              <span className="text-[#94A3B8]/50"> +{bet.selections.length - 1} more</span>
            )}
          </p>
          {mainSel.leagueName && (
            <p className="text-[10px] text-[#94A3B8]/50 mt-0.5">{mainSel.leagueName}</p>
          )}
        </div>

        {/* Odds / Stake / Pot. Returns */}
        <div className="flex items-center gap-3 pt-2.5 border-t border-white/5 flex-wrap">
          <DataPill label="Odds"        value={formatOdds(bet.totalOdds, format)} accent="yellow" />
          <div className="w-px h-6 bg-[#253241]" />
          <DataPill label="Stake"       value={`${bet.stake.toFixed(2)} USDT`} />
          <div className="w-px h-6 bg-[#253241]" />
          <DataPill label="Pot. Return" value={`${bet.estimatedPayout.toFixed(2)} USDT`} accent="green" />
          {isAcca && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="ml-auto p-1.5 rounded-lg text-[#94A3B8]/50 hover:text-[#94A3B8] hover:bg-[#253241]/40 transition-all"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Expanded acca legs */}
        {isAcca && expanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2 animate-in fade-in duration-150">
            {bet.selections.map((sel, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-[#0B0F14] rounded-lg px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">
                    {sel.selectionName || sel.selectionType}
                  </p>
                  <p className="text-[10px] text-[#94A3B8]/60 truncate">
                    {sel.matchName}{sel.leagueName ? ` · ${sel.leagueName}` : ''}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FACC15] tabular-nums shrink-0">
                  {formatOdds(sel.odds, format)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] text-[#94A3B8]/30 mt-2 text-right">{formatDate(bet.placedAt)}</p>
      </div>
    </div>
  );
}

function DataPill({ label, value, accent }: {
  label: string; value: string;
  accent?: 'yellow' | 'green' | 'red';
}) {
  return (
    <div className="text-center min-w-0">
      <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={cn(
        'text-sm font-bold tabular-nums leading-none',
        accent === 'yellow' ? 'text-[#FACC15]' :
        accent === 'green'  ? 'text-[#22C55E]' :
        accent === 'red'    ? 'text-[#EF4444]' : 'text-[#F8FAFC]',
      )}>
        {value}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// EMPTY STATES
// ────────────────────────────────────────────────────────────────
function NoBetsState() {
  return (
    <div className="text-center py-20 animate-in fade-in duration-200">
      <div className="relative mx-auto w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-3xl bg-[#253241]/20 blur-2xl scale-150" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#18212B] to-[#121821] border border-[#253241] flex items-center justify-center">
          <FileText className="h-8 w-8 text-[#94A3B8]/30" />
        </div>
      </div>
      <p className="text-[17px] font-bold text-[#F8FAFC] mb-2">No bets placed yet</p>
      <p className="text-sm text-[#94A3B8]/60 leading-relaxed max-w-xs mx-auto">
        Your placed bets will appear here. Head to the home page and pick your first selection!
      </p>
      <Link href="/">
        <button className="mt-6 h-10 px-6 rounded-xl bg-[#00DFA9] text-[#0B0F14] text-sm font-bold hover:shadow-[0_0_20px_rgba(0,223,169,0.4)] hover:scale-[1.02] transition-all duration-200">
          Browse Markets
        </button>
      </Link>
    </div>
  );
}

function EmptySearchState({ search, onClear }: { search: string; onClear: () => void }) {
  return (
    <div className="text-center py-16 animate-in fade-in duration-200">
      <div className="relative mx-auto w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-[#253241]/30 blur-xl scale-150" />
        <div className="relative w-16 h-16 rounded-2xl bg-[#121821] border border-[#253241] flex items-center justify-center">
          <Search className="h-7 w-7 text-[#94A3B8]/30" />
        </div>
      </div>
      <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1">No bets found</p>
      <p className="text-sm text-[#94A3B8]/60 mb-4">
        {search ? `No results for "${search}"` : 'No bets match this filter'}
      </p>
      <button
        onClick={onClear}
        className="text-sm font-semibold text-[#00DFA9] hover:text-[#00DFA9]/80 transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

export default BetHistory;
