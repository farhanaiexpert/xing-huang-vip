import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { Flame, TrendingUp } from 'lucide-react';
import { useOddsData } from '../hooks/useOddsData';
import type { League } from '../types';

// ── Country flag lookup ───────────────────────────────────────────────────────
const COUNTRY_FLAG: Record<string, string> = {
  GB: '🇬🇧', ES: '🇪🇸', IT: '🇮🇹', DE: '🇩🇪', FR: '🇫🇷',
  US: '🇺🇸', BR: '🇧🇷', AR: '🇦🇷', MX: '🇲🇽', PT: '🇵🇹',
  TR: '🇹🇷', NL: '🇳🇱', BE: '🇧🇪', KR: '🇰🇷', JP: '🇯🇵',
  EU: '🇪🇺', AU: '🇦🇺',
};

function getFlag(league: League): string {
  return COUNTRY_FLAG[league.countryCode ?? ''] ?? '🏆';
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── Build popular bet entries from real league data ───────────────────────────
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
  sportKey?: string;
}

function buildPopularBets(allLeagues: League[]): PopularBet[] {
  const bets: PopularBet[] = [];
  const seen = new Set<string>();

  for (const league of allLeagues) {
    for (const match of league.matches) {
      if (bets.length >= 6) break;
      if (seen.has(match.id)) continue;
      seen.add(match.id);

      const isSoccer  = league.sportKey?.startsWith('soccer_') ?? false;
      const isTennis  = league.sportKey?.startsWith('tennis_') ?? false;
      const matchName = match.team2 ? `${match.team1} vs ${match.team2}` : match.team1;
      const marketName = isSoccer ? 'Match Result' : isTennis ? 'To Win Match' : 'Match Winner';

      // Pseudo-random (but stable per match) bet count for engagement display
      let hash = 0;
      for (let i = 0; i < match.id.length; i++) hash = (hash * 31 + match.id.charCodeAt(i)) >>> 0;
      const betCount = 400 + (hash % 2600);

      bets.push({
        id:            `pb_${match.id}`,
        selectionName: `${match.team1} Win`,
        marketName,
        matchName,
        leagueName: league.name,
        flag:       getFlag(league),
        matchId:    match.id,
        marketId:   `mkt_${match.id}_mr`,
        selectionType: '1',
        odds:       match.odds.home,
        betCount,
        isLive:     match.isLive,
        sportKey:   match.sportKey ?? league.sportKey,
      });
    }
    if (bets.length >= 6) break;
  }

  return bets;
}

// ── Card component ────────────────────────────────────────────────────────────
function PopularBetCard({ bet }: { bet: PopularBet }) {
  return (
    <div className="w-[210px] shrink-0 rounded-xl flex flex-col bg-[#121821] border border-[#253241] hover:border-[#2E3D50] hover:bg-[#18212B] transition-all duration-200 cursor-pointer group">
      <div className="h-[2px] w-full rounded-tl-xl bg-gradient-to-r from-[#253241] via-[#2E3D50] to-transparent" />

      <div className="p-3.5 flex flex-col gap-3">
        {/* League + live badge */}
        <div className="flex items-center gap-1.5 justify-between">
          <span className="text-[10px] text-[#94A3B8]/50 flex items-center gap-1 truncate">
            {bet.flag} {bet.leagueName}
          </span>
          {bet.isLive && (
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444] shrink-0">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Match + selection */}
        <div>
          <p className="text-[11px] text-[#94A3B8]/60 leading-none mb-1 truncate">{bet.matchName}</p>
          <p className="text-[13px] font-semibold text-[#F8FAFC] leading-tight line-clamp-2">{bet.selectionName}</p>
          <p className="text-[10px] text-[#94A3B8]/40 mt-0.5">{bet.marketName}</p>
        </div>

        {/* Bets count + odds button */}
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
            sportKey={bet.sportKey}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PopularBets() {
  const { allLeagues } = useOddsData();

  const bets = useMemo(() => buildPopularBets(allLeagues), [allLeagues]);

  if (bets.length < 2) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-[#EF4444]" />
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]/60">Popular Bets</h2>
          <div className="h-px w-8 bg-[#253241]" />
        </div>
        <button className="text-[11px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors">
          View All →
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {bets.map(bet => (
            <PopularBetCard key={bet.id} bet={bet} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
