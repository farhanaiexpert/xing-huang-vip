import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { Flame, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface PopularBet {
  id: string;
  selectionName: string;
  marketName: string;
  matchName: string;
  leagueName: string;
  flag: string;
  matchId: string;
  marketId: string;
  selectionType: string;
  odds: number;
  betCount: number;
  isLive?: boolean;
  badge?: { label: string; color: string };
}

const POPULAR_BETS: PopularBet[] = [
  {
    id: 'pb1', selectionName: 'Arsenal Win', marketName: 'Match Result',
    matchName: 'Arsenal vs Chelsea', leagueName: 'Premier League', flag: '🇬🇧',
    matchId: 'm1', marketId: 'mkt_m1_mr', selectionType: '1', odds: 1.85,
    betCount: 2847, isLive: true, badge: { label: 'LIVE', color: '#EF4444' },
  },
  {
    id: 'pb2', selectionName: 'Both Teams to Score — Yes', marketName: 'BTTS',
    matchName: 'Barcelona vs Real Madrid', leagueName: 'La Liga', flag: '🇪🇸',
    matchId: 'm4', marketId: 'mkt_m4_btts', selectionType: 'Yes', odds: 1.60,
    betCount: 1923, isLive: true, badge: { label: 'LIVE', color: '#EF4444' },
  },
  {
    id: 'pb3', selectionName: 'Man City Win', marketName: 'Match Result',
    matchName: 'Man City vs Liverpool', leagueName: 'Premier League', flag: '🇬🇧',
    matchId: 'm2', marketId: 'mkt_m2_mr', selectionType: '1', odds: 2.10,
    betCount: 1654, badge: { label: 'ACCA BOOST', color: '#00DFA9' },
  },
  {
    id: 'pb4', selectionName: 'Over 2.5 Goals', marketName: 'Over/Under 2.5',
    matchName: 'PSG vs Lyon', leagueName: 'Ligue 1', flag: '🇫🇷',
    matchId: 'lf1', marketId: 'mkt_lf1_ou25', selectionType: 'O 2.5', odds: 1.72,
    betCount: 1312, isLive: true,
  },
  {
    id: 'pb5', selectionName: 'Djokovic Win', marketName: 'Match Winner',
    matchName: 'Djokovic vs Alcaraz', leagueName: 'ATP Masters Rome', flag: '🇮🇹',
    matchId: 'm10', marketId: 'mkt_m10_mw', selectionType: '1', odds: 1.55,
    betCount: 1187, isLive: true,
  },
  {
    id: 'pb6', selectionName: 'PSG Win', marketName: 'Match Result',
    matchName: 'PSG vs Bayern Munich', leagueName: 'Champions League', flag: '🇪🇺',
    matchId: 'm6', marketId: 'mkt_m6_mr', selectionType: '1', odds: 2.75,
    betCount: 988, badge: { label: 'PRICE BOOST', color: '#FACC15' },
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function PopularBets() {
  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-[#EF4444]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]/60">
            Popular Bets
          </h2>
          <div className="h-px w-8 bg-[#253241]" />
        </div>
        <button className="text-[11px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors">
          View All →
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {POPULAR_BETS.map(bet => (
            <PopularBetCard key={bet.id} bet={bet} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}

function PopularBetCard({ bet }: { bet: PopularBet }) {
  return (
    <div className={cn(
      'w-[210px] shrink-0 rounded-xl flex flex-col gap-0',
      'bg-[#121821] border border-[#253241]',
      'hover:border-[#2E3D50] hover:bg-[#18212B]',
      'transition-all duration-200 cursor-pointer group',
    )}>
      {/* Top accent */}
      <div className="h-[2px] w-full rounded-tl-xl bg-gradient-to-r from-[#253241] via-[#2E3D50] to-transparent" />

      <div className="p-3.5 flex flex-col gap-3">
        {/* League + badges */}
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[10px] text-[#94A3B8]/50 flex items-center gap-1 truncate">
            {bet.flag} {bet.leagueName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {bet.isLive && !bet.badge && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444]">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                LIVE
              </span>
            )}
            {bet.badge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: bet.badge.color, backgroundColor: `${bet.badge.color}18` }}
              >
                {bet.badge.label}
              </span>
            )}
          </div>
        </div>

        {/* Match name */}
        <div>
          <p className="text-[11px] text-[#94A3B8]/60 leading-none mb-1 truncate">{bet.matchName}</p>
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight line-clamp-2">
            {bet.selectionName}
          </p>
          <p className="text-[10px] text-[#94A3B8]/40 mt-0.5">{bet.marketName}</p>
        </div>

        {/* Odds + bets */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/40">
            <TrendingUp className="h-2.5 w-2.5" />
            <span className="font-semibold text-[#94A3B8]/60">{formatCount(bet.betCount)}</span>
            <span>bets</span>
          </div>
          <OddsButton
            matchId={bet.matchId}
            marketId={bet.marketId}
            matchName={bet.matchName}
            leagueName={bet.leagueName}
            marketName={bet.marketName}
            selectionType={bet.selectionType}
            selectionName={bet.selectionName}
            odds={bet.odds}
            isLive={bet.isLive}
          />
        </div>
      </div>
    </div>
  );
}
