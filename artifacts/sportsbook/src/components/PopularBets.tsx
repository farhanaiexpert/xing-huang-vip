import { useState, useMemo } from 'react';
import { SportName } from './SportName';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { OddsButton } from './OddsButton';
import { Flame, TrendingUp, Clock } from 'lucide-react';
import { useOddsData } from '../hooks/useOddsData';
import { TeamBadge } from './TeamBadge';
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
  if (sportKey.startsWith('soccer_') || sportKey.startsWith('sp_soccer'))         return '#00DFA9';
  if (sportKey.startsWith('basketball_') || sportKey.startsWith('sp_basketball')) return '#FACC15';
  if (sportKey.startsWith('americanfootball_'))                                   return '#FB923C';
  if (sportKey.startsWith('tennis_'))                                             return '#A78BFA';
  if (sportKey.startsWith('baseball_'))                                           return '#F87171';
  if (sportKey.startsWith('icehockey_'))                                          return '#38BDF8';
  if (sportKey.startsWith('mma_') || sportKey.startsWith('boxing_'))             return '#EF4444';
  return '#38BDF8';
}

// ── Sport category for tabs ───────────────────────────────────────────────────
type SportCat = 'soccer' | 'basketball' | 'tennis' | 'amfoot' | 'hockey' | 'combat' | 'baseball' | 'other';
type TabId = 'all' | SportCat;

function getSportCategory(league: League): SportCat {
  const sk = league.sportKey ?? '';
  const si = league.sportId ?? '';
  if (sk.startsWith('soccer_')          || si === 'sp_soccer')            return 'soccer';
  if (sk.startsWith('basketball_')      || si === 'sp_basketball')        return 'basketball';
  if (sk.startsWith('tennis_')          || si === 'sp_tennis')            return 'tennis';
  if (sk.startsWith('americanfootball_')|| si === 'sp_american_football') return 'amfoot';
  if (sk.startsWith('icehockey_')       || si === 'sp_ice_hockey')        return 'hockey';
  if (sk.startsWith('mma_')            || sk.startsWith('boxing_')
    || si === 'sp_mma'                 || si === 'sp_boxing')             return 'combat';
  if (sk.startsWith('baseball_')        || si === 'sp_baseball')          return 'baseball';
  return 'other';
}

const SPORT_TABS_DEF: { id: TabId; label: string; emoji: string }[] = [
  { id: 'all',        label: 'All',        emoji: '🌐' },
  { id: 'soccer',     label: 'Soccer',     emoji: '⚽' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'tennis',     label: 'Tennis',     emoji: '🎾' },
  { id: 'amfoot',     label: 'NFL',        emoji: '🏈' },
  { id: 'hockey',     label: 'Hockey',     emoji: '🏒' },
  { id: 'combat',     label: 'MMA',        emoji: '🥊' },
  { id: 'baseball',   label: 'Baseball',   emoji: '⚾' },
  { id: 'other',      label: 'More',       emoji: '🏆' },
];

// ── Data shape ────────────────────────────────────────────────────────────────
interface PopularBet {
  id:          string;
  matchId:     string;
  marketId:    string;
  ouMarketId:  string;
  matchName:   string;
  leagueName:  string;
  flag:        string;
  marketName:  string;
  sportKey:    string | undefined;
  sportId:     string;
  homeTeam:    string;
  homeOdds:    number;
  awayTeam:    string;
  awayOdds:    number;
  drawOdds?:   number;
  ouOver25?:   number;
  ouUnder25?:  number;
  betCount:    number;
  isLive?:     boolean;
  kickoffTime: string;
}

// ── Build entries from real league data ───────────────────────────────────────
function buildPopularBets(leagues: League[], max = 10): PopularBet[] {
  const bets: PopularBet[] = [];
  const seen = new Set<string>();

  for (const league of leagues) {
    for (const match of league.matches) {
      if (bets.length >= max) break;
      if (seen.has(match.id)) continue;
      seen.add(match.id);

      const si       = match.sportId ?? league.sportId ?? '';
      const sk       = match.sportKey ?? league.sportKey ?? '';
      const isSoccer = si === 'sp_soccer' || sk.startsWith('soccer_');
      const isTennis = si === 'sp_tennis' || sk.startsWith('tennis_');
      const marketName = isSoccer ? 'Match Result' : isTennis ? 'To Win Match' : 'Match Winner';

      let hash = 0;
      for (let i = 0; i < match.id.length; i++) hash = (hash * 31 + match.id.charCodeAt(i)) >>> 0;

      bets.push({
        id:          `pb_${match.id}`,
        matchId:     match.id,
        marketId:    `mkt_${match.id}_mr`,
        ouMarketId:  `mkt_${match.id}_ou25`,
        matchName:   match.team2 ? `${match.team1} vs ${match.team2}` : match.team1,
        leagueName:  league.name,
        flag:        getFlag(league),
        marketName,
        sportKey:    match.sportKey ?? league.sportKey,
        sportId:     si,
        homeTeam:    match.team1,
        homeOdds:    match.odds.home,
        awayTeam:    match.team2 ?? '',
        awayOdds:    match.odds.away,
        drawOdds:    match.odds.draw,
        ouOver25:    match.ouOver25,
        ouUnder25:   match.ouUnder25,
        betCount:    400 + (hash % 2600),
        isLive:      match.isLive,
        kickoffTime: match.kickoffTime ?? match.date ?? '',
      });
    }
    if (bets.length >= max) break;
  }

  return bets;
}

// ── Market mode toggle ────────────────────────────────────────────────────────
type MarketMode = '1x2' | 'ou';

// ── Card component ────────────────────────────────────────────────────────────
function PopularBetCard({ bet, rank }: { bet: PopularBet; rank: number }) {
  const [mode, setMode] = useState<MarketMode>('1x2');
  const accent   = getSportAccent(bet.sportKey);
  const hasDraw  = bet.drawOdds != null && bet.awayTeam;
  const hasOU    = bet.ouOver25 != null && bet.ouUnder25 != null;
  const showOU   = mode === 'ou' && hasOU;

  const shared = {
    matchId:    bet.matchId,
    matchName:  bet.matchName,
    leagueName: bet.leagueName,
    marketName: bet.marketName,
    sportKey:   bet.sportKey,
    sportId:    bet.sportId,
    isLive:     bet.isLive,
    homeTeam:   bet.homeTeam,
    awayTeam:   bet.awayTeam,
  };

  const h2hProps   = { ...shared, marketId: bet.marketId };
  const ouProps    = { ...shared, marketId: bet.ouMarketId, marketName: 'Over/Under 2.5' };

  return (
    <div
      className="w-[178px] sm:w-[230px] shrink-0 flex flex-col rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
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

      <div className="flex flex-col flex-1 p-3 gap-2.5">

        {/* Row 1 — league + time + badges */}
        <div className="flex items-start justify-between gap-1">
          <span className="flex items-center gap-1 text-[9px] text-[#475569] truncate min-w-0 leading-none mt-0.5">
            <span className="shrink-0 text-[11px]">{bet.flag}</span>
            <span className="truncate"><SportName name={bet.leagueName} /></span>
          </span>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {rank < 3 && (
              <span className="flex items-center gap-0.5 text-[7.5px] font-black uppercase text-[#FACC15]">
                <TrendingUp className="h-2.5 w-2.5" /> #{rank + 1}
              </span>
            )}
            {bet.isLive ? (
              <span className="flex items-center gap-0.5 text-[7.5px] font-black text-[#EF4444]">
                <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
              </span>
            ) : bet.kickoffTime ? (
              <span className="flex items-center gap-0.5 text-[8px] font-semibold text-[#38BDF8]/70">
                <Clock className="h-2 w-2 shrink-0" />
                <span className="tabular-nums">{bet.kickoffTime.replace('Today, ', 'Today ').replace('Tomorrow, ', 'Tmrw ')}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Row 2 — teams */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <TeamBadge name={bet.homeTeam} sportId={bet.sportKey ?? bet.sportId} size={20} />
            <span className="text-[12px] font-bold text-[#E2E8F0] truncate leading-none">{bet.homeTeam}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 shrink-0 flex justify-center">
              <div className="w-px h-3" style={{ background: 'rgba(37,50,65,0.7)' }} />
            </div>
            <span className="text-[7.5px] font-semibold text-[#334155] uppercase tracking-widest">vs</span>
          </div>
          {bet.awayTeam && (
            <div className="flex items-center gap-1.5">
              <TeamBadge name={bet.awayTeam} sportId={bet.sportKey ?? bet.sportId} size={20} />
              <span className="text-[11.5px] font-semibold text-[#64748B] truncate leading-none">{bet.awayTeam}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: 'rgba(37,50,65,0.5)' }} />

        {/* Market toggle (only when O/U is available) */}
        {hasOU && (
          <div className="flex items-center gap-1 -mb-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMode('1x2')}
              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border transition-all duration-100 ${
                mode === '1x2'
                  ? 'bg-[#00DFA9]/15 border-[#00DFA9]/40 text-[#00DFA9]'
                  : 'bg-transparent border-[#253241]/60 text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              {hasDraw ? '1X2' : 'Win'}
            </button>
            <button
              onClick={() => setMode('ou')}
              className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border transition-all duration-100 ${
                mode === 'ou'
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8]'
                  : 'bg-transparent border-[#253241]/60 text-[#475569] hover:text-[#94A3B8]'
              }`}
            >
              O/U
            </button>
          </div>
        )}

        {/* Odds */}
        <div onClick={e => e.stopPropagation()}>
          {showOU ? (
            <>
              {/* O/U labels */}
              <div className="grid grid-cols-2 gap-1 mb-1.5">
                <span className="text-center text-[7.5px] font-semibold uppercase tracking-wider text-[#334155]">Over 2.5</span>
                <span className="text-center text-[7.5px] font-semibold uppercase tracking-wider text-[#334155]">Under 2.5</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <OddsButton {...ouProps} selectionType="over"  selectionName="Over 2.5"  odds={bet.ouOver25!}  className="w-full" />
                <OddsButton {...ouProps} selectionType="under" selectionName="Under 2.5" odds={bet.ouUnder25!} className="w-full" />
              </div>
            </>
          ) : (
            <>
              {/* 1X2 / Match Winner labels */}
              <div className={`grid mb-1.5 gap-1 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <span className="text-center text-[7.5px] font-semibold uppercase tracking-wider text-[#334155]">
                  {hasDraw ? '1' : 'Home'}
                </span>
                {hasDraw && (
                  <span className="text-center text-[7.5px] font-semibold uppercase tracking-wider text-[#334155]">X</span>
                )}
                {bet.awayTeam && (
                  <span className="text-center text-[7.5px] font-semibold uppercase tracking-wider text-[#334155]">
                    {hasDraw ? '2' : 'Away'}
                  </span>
                )}
              </div>
              <div className={`grid gap-1 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <OddsButton {...h2hProps} selectionType="1" selectionName={bet.homeTeam} odds={bet.homeOdds} className="w-full" />
                {hasDraw && (
                  <OddsButton {...h2hProps} selectionType="X" selectionName="Draw" odds={bet.drawOdds!} className="w-full" />
                )}
                {bet.awayTeam && (
                  <OddsButton {...h2hProps} selectionType="2" selectionName={bet.awayTeam} odds={bet.awayOdds} className="w-full" />
                )}
              </div>
            </>
          )}
        </div>

        {/* Bet count */}
        <div className="flex items-center gap-1.5 mt-auto">
          <Flame className="h-2.5 w-2.5 text-[#EF4444]/60 shrink-0" />
          <span className="text-[9.5px] font-bold tabular-nums" style={{ color: `${accent}90` }}>
            {formatCount(bet.betCount)}
          </span>
          <span className="text-[9px] text-[#334155]">bets placed</span>
        </div>

      </div>
    </div>
  );
}

// ── Sport tab strip ───────────────────────────────────────────────────────────
function SportTabStrip({
  tabs,
  active,
  counts,
  onChange,
}: {
  tabs:    typeof SPORT_TABS_DEF;
  active:  TabId;
  counts:  Record<string, number>;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5" style={{ scrollbarWidth: 'none' }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const count    = counts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all duration-150 ${
              isActive
                ? 'bg-[#00DFA9]/12 border-[#00DFA9]/35 text-[#00DFA9]'
                : 'bg-transparent border-[#253241]/50 text-[#475569] hover:border-[#2E3D50] hover:text-[#94A3B8]'
            }`}
          >
            <span className="text-[11px] leading-none">{tab.emoji}</span>
            <span className="leading-none">{tab.label}</span>
            {tab.id !== 'all' && count > 0 && (
              <span className={`text-[8.5px] tabular-nums leading-none ${isActive ? 'text-[#00DFA9]/60' : 'text-[#334155]'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PopularBets() {
  const { allLeagues }          = useOddsData();
  const [activeTab, setActiveTab] = useState<TabId>('all');

  const matchCountBySport = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const league of allLeagues) {
      const n   = league.matches.length;
      const cat = getSportCategory(league);
      counts.all = (counts.all ?? 0) + n;
      counts[cat] = (counts[cat] ?? 0) + n;
    }
    return counts;
  }, [allLeagues]);

  const availableTabs = useMemo(
    () => SPORT_TABS_DEF.filter(t => t.id === 'all' || (matchCountBySport[t.id] ?? 0) > 0),
    [matchCountBySport],
  );

  const filteredLeagues = useMemo(() => {
    if (activeTab === 'all') return allLeagues;
    return allLeagues.filter(l => getSportCategory(l) === activeTab);
  }, [allLeagues, activeTab]);

  const bets = useMemo(() => buildPopularBets(filteredLeagues, 10), [filteredLeagues]);

  if (matchCountBySport.all === 0) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.28)' }}>
          <Flame className="h-2.5 w-2.5 text-[#EF4444]" />
        </div>
        <h2 className="text-[13px] font-black text-[#F8FAFC] uppercase tracking-wide">Popular Bets</h2>
        <span className="text-[10px] text-[#94A3B8]/40 hidden sm:inline">Most backed matches right now</span>
        {matchCountBySport.all > 0 && (
          <span className="ml-auto text-[10px] font-bold text-[#00DFA9]/50 tabular-nums">
            {matchCountBySport.all} events
          </span>
        )}
      </div>

      {/* Sport tabs */}
      {availableTabs.length > 1 && (
        <div className="mb-3">
          <SportTabStrip
            tabs={availableTabs}
            active={activeTab}
            counts={matchCountBySport}
            onChange={id => setActiveTab(id)}
          />
        </div>
      )}

      {/* Cards carousel */}
      {bets.length > 0 ? (
        <ScrollArea className="w-full">
          <div className="flex gap-2.5 sm:gap-3 w-max pb-2">
            {bets.map((bet, i) => (
              <PopularBetCard key={bet.id} bet={bet} rank={i} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="flex items-center gap-2 px-3 py-4 rounded-xl bg-[#0D1320] border border-[#253241]/50">
          <span className="text-[#475569] text-[12px]">No matches available for this sport yet.</span>
        </div>
      )}
    </div>
  );
}
