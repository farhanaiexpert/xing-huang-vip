import { useState } from 'react';
import { Link } from 'wouter';
import { Header } from '@/components/Header';
import { ConnectWalletModal } from '@/components/ConnectWalletModal';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ArrowLeft, TrendingUp, TrendingDown, BarChart2, Wallet, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

// ────────────────────────────────────────────────────────────────
// MOCK DATA
// ────────────────────────────────────────────────────────────────
type BetStatus = 'won' | 'lost' | 'pending';
type BetType   = 'single' | 'acca';

interface MockSelection {
  name: string;
  match: string;
  league: string;
  odds: number;
}

interface MockBet {
  id: string;
  type: BetType;
  status: BetStatus;
  isLive?: boolean;
  selections: MockSelection[];
  stake: number;
  returns: number;
  profit: number;
  placedAt: Date;
}

const NOW = Date.now();
const hrs  = (h: number) => new Date(NOW - h * 3_600_000);
const days = (d: number) => new Date(NOW - d * 86_400_000);

const MOCK_BETS: MockBet[] = [
  {
    id: 'BET-48291',
    type: 'single',
    status: 'won',
    selections: [{ name: 'Arsenal Win', match: 'Arsenal vs Chelsea', league: 'Premier League', odds: 1.85 }],
    stake: 10, returns: 18.50, profit: 8.50,
    placedAt: hrs(2),
  },
  {
    id: 'BET-48156',
    type: 'single',
    status: 'pending',
    isLive: true,
    selections: [{ name: 'Djokovic Win', match: 'Djokovic vs Alcaraz', league: 'ATP Masters Rome', odds: 1.55 }],
    stake: 25, returns: 38.75, profit: 13.75,
    placedAt: hrs(1),
  },
  {
    id: 'BET-47903',
    type: 'acca',
    status: 'won',
    selections: [
      { name: 'Barcelona Win',  match: 'Barcelona vs Real Madrid',    league: 'La Liga',       odds: 2.10 },
      { name: 'PSG Win',        match: 'PSG vs Lyon',                  league: 'Ligue 1',       odds: 1.72 },
      { name: 'Man City Win',   match: 'Man City vs Tottenham',        league: 'Premier League', odds: 1.85 },
      { name: 'Lakers Win',     match: 'Lakers vs Celtics',            league: 'NBA Playoffs',  odds: 1.95 },
    ],
    stake: 5, returns: 115.72, profit: 110.72,
    placedAt: days(5),
  },
  {
    id: 'BET-47742',
    type: 'single',
    status: 'lost',
    selections: [{ name: 'Man City Win', match: 'Man City vs Liverpool', league: 'Premier League', odds: 2.10 }],
    stake: 20, returns: 0, profit: -20,
    placedAt: days(3),
  },
  {
    id: 'BET-47601',
    type: 'single',
    status: 'pending',
    selections: [{ name: 'Over 2.5 Goals', match: 'Arsenal vs Chelsea', league: 'Premier League', odds: 1.72 }],
    stake: 15, returns: 25.80, profit: 10.80,
    placedAt: hrs(2),
  },
  {
    id: 'BET-47388',
    type: 'single',
    status: 'lost',
    selections: [{ name: 'Newcastle Win', match: 'Newcastle vs West Ham', league: 'Premier League', odds: 3.90 }],
    stake: 10, returns: 0, profit: -10,
    placedAt: days(7),
  },
  {
    id: 'BET-47155',
    type: 'single',
    status: 'won',
    selections: [{ name: 'Real Madrid Win', match: 'Real Madrid vs Atletico Madrid', league: 'La Liga', odds: 1.65 }],
    stake: 30, returns: 49.50, profit: 19.50,
    placedAt: days(4),
  },
  {
    id: 'BET-46980',
    type: 'acca',
    status: 'lost',
    selections: [
      { name: 'Sinner Win',    match: 'Sinner vs Ruud',    league: 'ATP Masters Rome', odds: 1.45 },
      { name: 'Alcaraz Win',   match: 'Alcaraz vs Zverev', league: 'ATP Masters Rome', odds: 1.70 },
    ],
    stake: 15, returns: 0, profit: -15,
    placedAt: days(6),
  },
];

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────
function timeAgo(date: Date): string {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function totalOdds(selections: MockSelection[]): number {
  return selections.reduce((acc, s) => acc * s.odds, 1);
}

// ────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────
type Filter = 'all' | 'open' | 'settled';

export function MyBets() {
  const [filter, setFilter] = useState<Filter>('all');
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected } = useWallet();
  const { t } = useI18n();

  const filtered = MOCK_BETS.filter(b => {
    if (filter === 'open')    return b.status === 'pending';
    if (filter === 'settled') return b.status !== 'pending';
    return true;
  });

  // Stats
  const settled    = MOCK_BETS.filter(b => b.status !== 'pending');
  const won        = settled.filter(b => b.status === 'won');
  const winRate    = settled.length > 0 ? Math.round((won.length / settled.length) * 100) : 0;
  const netPL      = MOCK_BETS.reduce((acc, b) => acc + (b.status === 'pending' ? 0 : b.profit), 0);
  const totalStake = MOCK_BETS.reduce((acc, b) => acc + b.stake, 0);

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

            <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">{t('Connect your wallet')}</h2>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-8">
              {t('Your bet history is linked to your wallet address. Connect to view your bets.')}
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
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white">
      <Header />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">

        {/* ── Back + Title ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC] leading-none">{t('My Bets')}</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">{MOCK_BETS.length} bets placed</p>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label={t('Win Rate')}
            value={`${winRate}%`}
            sub={`${won.length} of ${settled.length} ${t('settled')}`}
            icon={<BarChart2 className="h-4 w-4" />}
            color="blue"
          />
          <StatCard
            label={t('Net P&L')}
            value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} USDT`}
            sub={`${totalStake.toFixed(2)} USDT staked`}
            icon={netPL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            color={netPL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label={t('Open Bets')}
            value={String(MOCK_BETS.filter(b => b.status === 'pending').length)}
            sub={t('awaiting result')}
            icon={<Clock className="h-4 w-4" />}
            color="amber"
          />
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
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
              {t(f)}
              {f === 'open' && (
                <span className="ml-1.5 text-[9px] bg-[#FACC15]/15 text-[#FACC15] px-1.5 py-0.5 rounded-full font-bold">
                  {MOCK_BETS.filter(b => b.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Bet list ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-[#94A3B8]/50 text-sm">No bets to show</div>
          )}
          {filtered.map(bet => <BetCard key={bet.id} bet={bet} />)}
        </div>

        {/* ── Responsible gambling ─────────────────────────────────── */}
        <div className="mt-10 text-center">
          <p className="text-[10px] text-[#94A3B8]/30">
            Please gamble responsibly · 18+ only · BeGambleAware.org · GamStop
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// STAT CARD
// ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: 'green' | 'red' | 'blue' | 'amber';
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

// ────────────────────────────────────────────────────────────────
// BET CARD
// ────────────────────────────────────────────────────────────────
function BetCard({ bet }: { bet: MockBet }) {
  const [expanded, setExpanded] = useState(false);
  const isAcca    = bet.type === 'acca';
  const odds      = isAcca ? totalOdds(bet.selections) : bet.selections[0]?.odds ?? 1;
  const mainSel   = bet.selections[0];

  const statusConfig = {
    won:     { label: 'Won',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, bg: 'bg-[#22C55E]/10', border: 'border-[#22C55E]/25', text: 'text-[#22C55E]', leftBar: 'bg-[#22C55E]' },
    lost:    { label: 'Lost',    icon: <XCircle      className="h-3.5 w-3.5" />, bg: 'bg-[#EF4444]/5',  border: 'border-[#EF4444]/20', text: 'text-[#EF4444]', leftBar: 'bg-[#EF4444]' },
    pending: { label: bet.isLive ? 'Live' : 'Pending', icon: <Clock className="h-3.5 w-3.5" />, bg: 'bg-[#FACC15]/5', border: 'border-[#FACC15]/20', text: 'text-[#FACC15]', leftBar: 'bg-[#FACC15]' },
  };
  const s = statusConfig[bet.status];

  return (
    <div className={cn('relative rounded-xl border overflow-hidden transition-all duration-200', s.bg, s.border)}>
      {/* Left status bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', s.leftBar)} />

      <div className="pl-4 pr-3 py-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type + ref */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', s.text, s.bg)}>
                {isAcca ? `${bet.selections.length}-Fold Acca` : 'Single'}
              </span>
              <span className="text-[9px] text-[#94A3B8]/40 font-mono">#{bet.id}</span>
              {bet.isLive && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
                  <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            {/* Main selection */}
            <p className="text-sm font-semibold text-[#F8FAFC] leading-snug">{mainSel.name}</p>
            <p className="text-xs text-[#94A3B8] leading-none mt-0.5">
              {mainSel.match}
              {isAcca && bet.selections.length > 1 && (
                <span className="text-[#94A3B8]/50"> +{bet.selections.length - 1} more</span>
              )}
            </p>
          </div>

          {/* Status badge */}
          <div className={cn('flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg text-xs font-semibold', s.text, s.bg)}>
            {s.icon}
            {s.label}
          </div>
        </div>

        {/* Odds + stake + returns row */}
        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-white/5">
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">Odds</p>
            <p className="text-sm font-black text-[#FACC15] tabular-nums">{odds.toFixed(2)}</p>
          </div>
          <div className="w-px h-6 bg-[#253241]" />
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">Stake</p>
            <p className="text-sm font-bold text-[#F8FAFC]">{bet.stake.toFixed(2)} USDT</p>
          </div>
          <div className="w-px h-6 bg-[#253241]" />
          <div className="text-center">
            <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">
              {bet.status === 'pending' ? 'Pot. Returns' : 'Returns'}
            </p>
            <p className={cn('text-sm font-bold tabular-nums', bet.status === 'won' ? 'text-[#22C55E]' : bet.status === 'lost' ? 'text-[#94A3B8]/50 line-through' : 'text-[#F8FAFC]')}>
              {bet.status === 'lost' ? '0.00 USDT' : `${bet.returns.toFixed(2)} USDT`}
            </p>
          </div>
          {bet.status !== 'pending' && (
            <>
              <div className="w-px h-6 bg-[#253241]" />
              <div className="text-center">
                <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider leading-none mb-0.5">P&L</p>
                <p className={cn('text-sm font-bold tabular-nums', bet.profit > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
                  {bet.profit > 0 ? '+' : ''}{bet.profit.toFixed(2)} USDT
                </p>
              </div>
            </>
          )}

          {/* Expand button (accas) */}
          {isAcca && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="ml-auto p-1.5 rounded-lg text-[#94A3B8]/50 hover:text-[#94A3B8] hover:bg-[#253241]/40 transition-all"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Expanded selections (acca) */}
        {isAcca && expanded && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
            {bet.selections.map((sel, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#F8FAFC] truncate">{sel.name}</p>
                  <p className="text-[10px] text-[#94A3B8]/60 truncate">{sel.match} · {sel.league}</p>
                </div>
                <span className="text-xs font-bold text-[#FACC15] tabular-nums shrink-0">{sel.odds.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[9px] text-[#94A3B8]/30 mt-2 text-right">{timeAgo(bet.placedAt)}</p>
      </div>
    </div>
  );
}

export default MyBets;
