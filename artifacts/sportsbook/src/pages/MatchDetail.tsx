import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ScrollArea } from '../components/ui/scroll-area';
import { BetSlip } from '../components/BetSlip';
import { Header } from '../components/Header';
import { MatchHeader } from '../components/match/MatchHeader';
import { MarketGroup } from '../components/match/MarketGroup';
import { MarketNav } from '../components/match/MarketNav';
import { generateDetailMarkets } from '../data/marketDetails';
import { useBetSlip } from '../hooks/useBetSlip';
import { useOddsData } from '../hooks/useOddsData';
import { findMatchInLeagues } from '../lib/matchUtils';
import { Receipt, TrendingUp, BarChart2, Users } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from '../components/ui/drawer';
import { cn } from '../lib/utils';
import type { MatchEntity, LeagueEntity } from '../data/types';
import type { Match, League } from '../types';

// ─── Bridge: UI types → Entity types ──────────────────────────────────────────

function matchToEntity(match: Match): MatchEntity {
  const hasDraw = match.odds.draw !== undefined;
  const primaryMarketId = `mkt_${match.id}_primary`;
  return {
    id:            match.id,
    leagueId:      match.leagueId,
    sportId:       match.sportId,
    homeTeamId:    null,
    awayTeamId:    null,
    homeTeamName:  match.team1,
    awayTeamName:  match.team2 ?? '',
    startTime:     match.commenceIso ?? new Date().toISOString(),
    dateTag:       match.dateTag,
    displayDate:   match.date,
    status:        match.isLive ? 'live' : 'upcoming',
    isLive:        match.isLive ?? false,
    liveMinute:    match.liveMinute,
    score:         match.score,
    isFeatured:    false,
    marketCount:   match.marketCount ?? 22,
    primaryMarket: {
      id:           primaryMarketId,
      matchId:      match.id,
      marketTypeId: hasDraw ? 'mt_match_result' : 'mt_match_winner',
      name:         hasDraw ? 'Match Result' : 'Match Winner',
      status:       'active',
      selections: [
        { id: `${match.id}_h`, marketId: primaryMarketId, name: match.team1,          shortName: '1', odds: match.odds.home,       oddsStatus: 'active', oddsMovement: 'stable' },
        ...(hasDraw ? [{ id: `${match.id}_d`, marketId: primaryMarketId, name: 'Draw', shortName: 'X', odds: match.odds.draw!,      oddsStatus: 'active' as const, oddsMovement: 'stable' as const }] : []),
        { id: `${match.id}_a`, marketId: primaryMarketId, name: match.team2 ?? 'Away', shortName: '2', odds: match.odds.away,       oddsStatus: 'active', oddsMovement: 'stable' },
      ],
    },
    // Pass real API totals/BTTS odds so soccerMarkets() can prefer them over generated values
    ouOver25:  match.ouOver25,
    ouUnder25: match.ouUnder25,
    bttsYes:   match.bttsYes,
    bttsNo:    match.bttsNo,
  };
}

function leagueToEntity(league: League): LeagueEntity {
  return {
    id:          league.id,
    sportId:     league.sportId,
    name:        league.name,
    slug:        league.id.replace(/^api_/, '').replace(/_/g, '-'),
    countryCode: league.countryCode ?? 'GL',
    region:      'International',
    priority:    1,
    isActive:    true,
    isFeatured:  false,
  };
}

// ─── Popularity seed (deterministic per match) ────────────────────────────────

function popularityPct(matchId: string): number {
  const n = matchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 55 + (n % 40); // 55–94 %
}

function bettersBadge(matchId: string): string {
  const n = matchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const k = 1200 + (n % 3800);
  return k >= 1000 ? `${(k / 1000).toFixed(1)}k` : `${k}`;
}

// ─── Odds overview quick-panel ────────────────────────────────────────────────

function OddsOverview({ match, sportKey }: { match: MatchEntity; sportKey?: string }) {
  const pm = match.primaryMarket;
  if (pm.selections.length === 0) return null;

  const home = pm.selections[0];
  const draw = pm.selections.find(s => s.shortName === 'X');
  const away = pm.selections[pm.selections.length - 1];

  const pct = popularityPct(match.id);
  const bettors = bettersBadge(match.id);

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl bg-[#121821] border border-[#253241] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-[#253241]/60 bg-[#0F1620] gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <TrendingUp className="h-3.5 w-3.5 text-[#00DFA9] shrink-0" />
          <span className="text-[11px] font-bold text-[#F8FAFC] uppercase tracking-wider truncate">
            {pm.name}
          </span>
          <span className="hidden sm:inline text-[10px] text-[#94A3B8]/40 bg-[#253241]/60 px-1.5 py-0.5 rounded shrink-0">
            Most popular
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/50">
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">{bettors} </span>bettors
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8]/50">
            <BarChart2 className="h-3 w-3" />
            {pct}%
          </div>
        </div>
      </div>

      {/* Popularity bar */}
      <div className="h-[2px] bg-[#0A0E13]">
        <div
          className="h-full bg-gradient-to-r from-[#00DFA9]/60 to-[#38BDF8]/40 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Odds row */}
      <div className={cn('grid px-4 py-3 gap-3', draw ? 'grid-cols-3' : 'grid-cols-2')}>
        {[home, draw, away].filter(Boolean).map(sel => sel && (
          <QuickOddsCell
            key={sel.id}
            matchId={match.id}
            marketId={pm.id}
            matchName={`${match.homeTeamName} vs ${match.awayTeamName}`}
            leagueName=""
            marketName={pm.name}
            sel={sel}
            sportKey={sportKey}
          />
        ))}
      </div>
    </div>
  );
}

function QuickOddsCell({
  matchId, marketId, matchName, leagueName, marketName, sel, sportKey,
}: {
  matchId: string; marketId: string; matchName: string; leagueName: string;
  marketName: string; sel: { id: string; shortName: string; name: string; odds: number };
  sportKey?: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selectionId = `${marketId}-${sel.shortName}`;
  const isSelected  = hasSelection(selectionId);

  return (
    <button
      onClick={() => {
        if (isSelected) removeSelection(selectionId);
        else addSelection({ id: selectionId, marketId, matchId, matchName, leagueName, marketName, selectionType: sel.shortName, selectionName: sel.name, odds: sel.odds, sportKey: sportKey ?? '' });
      }}
      className={cn(
        'flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all duration-200',
        isSelected
          ? 'bg-[#00DFA9]/10 border-[#00DFA9]/40 shadow-[0_0_16px_rgba(0,223,169,0.15)]'
          : 'bg-[#0B1220] border-[#2A3A52] hover:bg-[#18212B] hover:border-[#38BDF8]/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.08)]'
      )}
    >
      <span className={cn('text-[11px] font-semibold', isSelected ? 'text-[#00DFA9]' : 'text-[#94A3B8]/70')}>
        {sel.shortName.length > 2 ? sel.name : sel.shortName}
      </span>
      <span className={cn(
        'text-[20px] font-black tabular-nums leading-none',
        isSelected ? 'text-[#00DFA9]' : 'text-[#FACC15]'
      )}>
        {sel.odds.toFixed(2)}
      </span>
      {isSelected && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#00DFA9]/70">Selected</span>
      )}
    </button>
  );
}

// ─── Match not found ──────────────────────────────────────────────────────────

function MatchNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col pb-14 xl:pb-0">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#18212B] border border-[#253241] flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-7 w-7 text-[#94A3B8]/30" />
          </div>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1">Match not found</p>
          <p className="text-sm text-[#94A3B8]/60 mb-5">This event may no longer be available.</p>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121821] border border-[#253241] text-sm text-[#F8FAFC] hover:bg-[#18212B] transition-colors mx-auto"
          >
            ← Back to all sports
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MatchDetail() {
  const [, params]     = useRoute<{ id: string }>('/match/:id');
  const [, setLocation] = useLocation();
  const matchId        = params?.id;

  // Access real API matches through the global context
  const { allLeagues } = useOddsData();

  // Resolve match + league from real API data only
  const resolved = useMemo(() => {
    if (!matchId) return null;

    const found = findMatchInLeagues(matchId, allLeagues);
    if (found) {
      return {
        match:    matchToEntity(found.match),
        league:   leagueToEntity(found.league),
        sportKey: found.match.sportKey ?? found.match.sportId ?? '',
        isApi:    true,
      };
    }

    return null;
  }, [matchId, allLeagues]);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { selections } = useBetSlip();
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groups = useMemo(
    () => resolved ? generateDetailMarkets(resolved.match) : [],
    [resolved]
  );

  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].id);
    }
  }, [groups.length, activeGroupId]);

  // Scroll to group when nav tab clicked
  const handleNavSelect = useCallback((id: string) => {
    setActiveGroupId(id);
    const el = groupRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Mobile FAB pulse when new selection added
  const prevCount = useRef(selections.length);
  const [fabPulse, setFabPulse] = useState(false);
  useEffect(() => {
    if (selections.length > prevCount.current) {
      setFabPulse(true);
      setTimeout(() => setFabPulse(false), 600);
    }
    prevCount.current = selections.length;
  }, [selections.length]);

  if (!resolved) {
    return <MatchNotFound onBack={() => setLocation('/')} />;
  }

  const { match, league, sportKey } = resolved as { match: typeof resolved.match; league: typeof resolved.league; sportKey?: string; isApi: boolean };
  const matchName = match.awayTeamName
    ? `${match.homeTeamName} vs ${match.awayTeamName}`
    : match.homeTeamName;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)] pb-14 xl:pb-0">

            {/* Match hero */}
            <MatchHeader match={match} league={league} />

            {/* Quick odds overview — primary market prominent at top */}
            <OddsOverview match={match} sportKey={sportKey} />

            {/* Sticky market navigation */}
            <MarketNav
              groups={groups}
              activeId={activeGroupId}
              onSelect={handleNavSelect}
            />

            {/* Market groups */}
            <div className="px-4 py-3 space-y-2.5 pb-16">
              {/* Live banner */}
              {match.isLive && (
                <div className="flex items-center gap-3 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-xl px-4 py-3">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#EF4444]">Match is Live</p>
                    <p className="text-xs text-[#94A3B8]">
                      Odds may be suspended during key moments
                      {match.liveMinute ? ` · ${match.liveMinute}' played` : ''}
                    </p>
                  </div>
                  {match.score && (
                    <span className="text-xs font-mono font-bold text-[#EF4444] shrink-0">
                      {match.score.home} – {match.score.away}
                    </span>
                  )}
                </div>
              )}

              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  ref={el => { groupRefs.current[group.id] = el; }}
                  style={{ scrollMarginTop: '44px' }}
                >
                  <MarketGroup
                    group={group}
                    matchId={match.id}
                    matchName={matchName}
                    leagueName={league.name}
                    defaultOpen={idx < 2}
                    isFeatured={idx === 0}
                    groupIndex={idx}
                    sportKey={sportKey}
                    homeTeam={match.homeTeamName}
                    awayTeam={match.awayTeamName}
                    commenceTime={match.startTime}
                  />
                </div>
              ))}

              <div className="text-center pt-4 pb-2">
                <p className="text-[10px] text-[#94A3B8]/25">
                  All odds subject to change · Pre-match markets only · Please gamble responsibly · 18+
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Bet Slip ──────────────────────────────────────────── */}
        <BetSlip />
      </div>

      {/* ── Mobile Bet Slip FAB — sits above the mobile nav bar (h-14 = 56px) ── */}
      <div className="xl:hidden fixed bottom-20 right-5 z-50">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              aria-label="Open Bet Slip"
              className={cn(
                'relative h-14 w-14 rounded-full flex items-center justify-center',
                'bg-[#00DFA9] text-[#0B0F14]',
                'shadow-[0_0_24px_rgba(0,223,169,0.45),0_4px_20px_rgba(0,0,0,0.5)]',
                'transition-all duration-300 hover:shadow-[0_0_36px_rgba(0,223,169,0.65)] hover:scale-[1.08] active:scale-[0.94]',
                fabPulse && 'scale-[1.18] shadow-[0_0_40px_rgba(0,223,169,0.8)]'
              )}
            >
              <Receipt className="h-6 w-6" />
              {selections.length > 0 && (
                <span className={cn(
                  'absolute -top-2 -right-2 bg-[#EF4444] text-[#F8FAFC] border-2 border-[#0B0F14]',
                  'text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center',
                  'shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-transform duration-200',
                  fabPulse ? 'scale-125' : 'scale-100'
                )}>
                  {selections.length}
                </span>
              )}
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-[#0D1117] border-t border-[#253241] h-[82vh] p-0 overflow-hidden">
            <div className="sr-only">
              <DrawerTitle>Bet Slip</DrawerTitle>
              <DrawerDescription>View and manage your current bet selections</DrawerDescription>
            </div>
            <div className="flex items-center justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#253241]" />
            </div>
            <BetSlip className="w-full xl:flex h-full border-l-0" />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

export default MatchDetail;
