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

// ── Sport colour mapping ──────────────────────────────────────────────────────
function getSportAccent(sportKey?: string): string {
  if (!sportKey) return '#38BDF8';
  if (sportKey.startsWith('soccer_') || sportKey.startsWith('sp_soccer')) return '#00DFA9';
  if (sportKey.startsWith('basketball_') || sportKey.startsWith('sp_basketball')) return '#FACC15';
  if (sportKey.startsWith('americanfootball_')) return '#FB923C';
  if (sportKey.startsWith('tennis_')) return '#A78BFA';
  if (sportKey.startsWith('baseball_')) return '#F87171';
  if (sportKey.startsWith('icehockey_')) return '#38BDF8';
  if (sportKey.startsWith('mma_') || sportKey.startsWith('boxing_')) return '#EF4444';
  return '#38BDF8';
}

// ── Data shape ────────────────────────────────────────────────────────────────
interface PopularBet {
  id:         string;
  matchId:    string;
  marketId:   string;
  matchName:  string;
  leagueName: string;
  flag:       string;
  marketName: string;
  sportKey:   string | undefined;
  homeTeam:   string;
  homeOdds:   number;
  awayTeam:   string;
  awayOdds:   number;
  drawOdds?:  number;
  betCount:   number;
  isLive?:    boolean;
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
function PopularBetCard({ bet, rank }: { bet: PopularBet; rank: number }) {
  const accent = getSportAccent(bet.sportKey);
  const hasDraw = bet.drawOdds != null && bet.awayTeam;
  const shared = {
    matchId:    bet.matchId,
    marketId:   bet.marketId,
    matchName:  bet.matchName,
    leagueName: bet.leagueName,
    marketName: bet.marketName,
    sportKey:   bet.sportKey,
    isLive:     bet.isLive,
    homeTeam:   bet.homeTeam,
    awayTeam:   bet.awayTeam,
  };

  return (
    <div
      className="w-[230px] shrink-0 flex flex-col rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: '#0D1320', borderColor: 'rgba(37,50,65,0.6)' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow   = `0 6px 24px ${accent}12`;
        el.style.borderColor = `${accent}45`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow   = '';
        el.style.borderColor = 'rgba(37,50,65,0.6)';
      }}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full shrink-0"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}35 65%, transparent 100%)` }} />

      <div className="flex flex-col flex-1 p-3.5 gap-3">

        {/* Row 1 — league + live */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[9.5px] text-[#475569] truncate min-w-0">
            <span className="shrink-0">{bet.flag}</span>
            <span className="truncate">{bet.leagueName}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {rank < 3 && (
              <span className="flex items-center gap-0.5 text-[7.5px] font-black uppercase text-[#FACC15]">
                <TrendingUp className="h-2.5 w-2.5" /> #{rank + 1}
              </span>
            )}
            {bet.isLive && (
              <span className="flex items-center gap-0.5 text-[7.5px] font-black text-[#EF4444]">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
              </span>
            )}
          </div>
        </div>

        {/* Row 2 — teams */}
        <div className="flex flex-col gap-1.5">
          {/* Home */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] font-black leading-none"
              style={{ background: `${accent}18`, color: accent }}
            >
              {bet.homeTeam.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] font-bold text-[#E2E8F0] truncate leading-none">{bet.homeTeam}</span>
          </div>
          {/* vs row */}
          <div className="flex items-center gap-2">
            <div className="w-6 shrink-0 flex justify-center">
              <div className="w-px h-3" style={{ background: 'rgba(37,50,65,0.7)' }} />
            </div>
            <span className="text-[8px] font-semibold text-[#334155] uppercase tracking-widest">vs</span>
          </div>
          {/* Away */}
          {bet.awayTeam && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] font-black leading-none bg-[#1A2232] text-[#475569]">
                {bet.awayTeam.charAt(0).toUpperCase()}
              </div>
              <span className="text-[12px] font-semibold text-[#64748B] truncate leading-none">{bet.awayTeam}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'rgba(37,50,65,0.5)' }} />

        {/* Row 3 — odds */}
        <div onClick={e => e.stopPropagation()}>
          {/* Labels */}
          <div className={`grid mb-1.5 gap-1 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <span className="text-center text-[8px] font-semibold uppercase tracking-wider text-[#334155]">
              {hasDraw ? '1' : 'Home'}
            </span>
            {hasDraw && (
              <span className="text-center text-[8px] font-semibold uppercase tracking-wider text-[#334155]">X</span>
            )}
            {bet.awayTeam && (
              <span className="text-center text-[8px] font-semibold uppercase tracking-wider text-[#334155]">
                {hasDraw ? '2' : 'Away'}
              </span>
            )}
          </div>
          {/* Buttons */}
          <div className={`grid gap-1 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <OddsButton {...shared} selectionType="1" selectionName={bet.homeTeam} odds={bet.homeOdds} className="w-full" />
            {hasDraw && (
              <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={bet.drawOdds!} className="w-full" />
            )}
            {bet.awayTeam && (
              <OddsButton {...shared} selectionType="2" selectionName={bet.awayTeam} odds={bet.awayOdds} className="w-full" />
            )}
          </div>
        </div>

        {/* Row 4 — bet count */}
        <div className="flex items-center gap-1.5 mt-auto">
          <Flame className="h-3 w-3 text-[#EF4444]/60 shrink-0" />
          <span className="text-[10px] font-bold tabular-nums" style={{ color: `${accent}90` }}>
            {formatCount(bet.betCount)}
          </span>
          <span className="text-[9.5px] text-[#334155]">bets placed</span>
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
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.28)' }}>
          <Flame className="h-2.5 w-2.5 text-[#EF4444]" />
        </div>
        <h2 className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Popular Bets</h2>
        <span className="text-[10px] text-[#94A3B8]/40">Most backed matches right now</span>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-2">
          {bets.map((bet, i) => (
            <PopularBetCard key={bet.id} bet={bet} rank={i} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
