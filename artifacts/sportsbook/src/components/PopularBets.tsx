import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { Flame } from 'lucide-react';
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

// ── Data shape ────────────────────────────────────────────────────────────────
interface PopularBet {
  id:            string;
  matchId:       string;
  marketId:      string;
  matchName:     string;
  leagueName:    string;
  flag:          string;
  marketName:    string;
  sportKey:      string | undefined;
  homeTeam:      string;
  homeOdds:      number;
  awayTeam:      string;
  awayOdds:      number;
  drawOdds?:     number;
  betCount:      number;
  isLive?:       boolean;
}

// ── Build entries from real league data ───────────────────────────────────────
function buildPopularBets(allLeagues: League[]): PopularBet[] {
  const bets: PopularBet[] = [];
  const seen = new Set<string>();

  for (const league of allLeagues) {
    for (const match of league.matches) {
      if (bets.length >= 6) break;
      if (seen.has(match.id)) continue;
      seen.add(match.id);

      const isSoccer   = league.sportKey?.startsWith('soccer_') ?? false;
      const isTennis   = league.sportKey?.startsWith('tennis_') ?? false;
      const marketName = isSoccer ? 'Match Result' : isTennis ? 'To Win Match' : 'Match Winner';

      // Stable pseudo-random bet count per match
      let hash = 0;
      for (let i = 0; i < match.id.length; i++) hash = (hash * 31 + match.id.charCodeAt(i)) >>> 0;

      bets.push({
        id:         `pb_${match.id}`,
        matchId:    match.id,
        marketId:   `mkt_${match.id}_mr`,
        matchName:  match.team2 ? `${match.team1} vs ${match.team2}` : match.team1,
        leagueName: league.name,
        flag:       getFlag(league),
        marketName,
        sportKey:   match.sportKey ?? league.sportKey,
        homeTeam:   match.team1,
        homeOdds:   match.odds.home,
        awayTeam:   match.team2 ?? '',
        awayOdds:   match.odds.away,
        drawOdds:   match.odds.draw,
        betCount:   400 + (hash % 2600),
        isLive:     match.isLive,
      });
    }
    if (bets.length >= 6) break;
  }

  return bets;
}

// ── Card component ────────────────────────────────────────────────────────────
function PopularBetCard({ bet }: { bet: PopularBet }) {
  const shared = {
    matchId:    bet.matchId,
    marketId:   bet.marketId,
    matchName:  bet.matchName,
    leagueName: bet.leagueName,
    marketName: bet.marketName,
    sportKey:   bet.sportKey,
    isLive:     bet.isLive,
  };

  return (
    <div className="w-[220px] shrink-0 rounded-xl flex flex-col bg-[#121821] border border-[#253241] hover:border-[#2E3D50] hover:bg-[#18212B] transition-all duration-200">
      <div className="h-[2px] w-full rounded-tl-xl bg-gradient-to-r from-[#253241] via-[#2E3D50] to-transparent" />

      <div className="p-3.5 flex flex-col gap-2.5">
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

        {/* Market name */}
        <div>
          <p className="text-[11px] font-medium text-[#F8FAFC]/80 leading-none">{bet.marketName}</p>
        </div>

        {/* Home / Draw / Away odds */}
        <div className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5 flex-1">
            <span className="text-[9px] text-[#94A3B8]/40 truncate w-full text-center">{bet.homeTeam.split(' ').pop()}</span>
            <OddsButton
              {...shared}
              selectionType="1"
              selectionName={bet.homeTeam}
              odds={bet.homeOdds}
            />
          </div>
          {bet.drawOdds != null && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-[#94A3B8]/40">Draw</span>
              <OddsButton
                {...shared}
                selectionType="X"
                selectionName="Draw"
                odds={bet.drawOdds}
              />
            </div>
          )}
          {bet.awayTeam && (
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-[9px] text-[#94A3B8]/40 truncate w-full text-center">{bet.awayTeam.split(' ').pop()}</span>
              <OddsButton
                {...shared}
                selectionType="2"
                selectionName={bet.awayTeam}
                odds={bet.awayOdds}
              />
            </div>
          )}
        </div>

        {/* Bet count */}
        <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/35">
          <Flame className="h-2.5 w-2.5 text-[#EF4444]/50" />
          <span className="font-semibold text-[#94A3B8]/50">{formatCount(bet.betCount)}</span>
          <span>bets placed</span>
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
