import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { BetSlip } from '../components/BetSlip';
import { Header } from '../components/Header';
import { MatchHeader } from '../components/match/MatchHeader';
import { MarketGroup } from '../components/match/MarketGroup';
import { MarketNav } from '../components/match/MarketNav';
import { MarketSidebar } from '../components/match/MarketSidebar';
import { generateDetailMarkets } from '../data/marketDetails';
import { useBetSlip } from '../hooks/useBetSlip';
import { useOddsData } from '../hooks/useOddsData';
import { useLiveMatchScore } from '../hooks/useLiveMatchScore';
import { useBetSlipSidebar } from '../contexts/BetSlipSidebarContext';
import { findMatchInLeagues } from '../lib/matchUtils';
import { refreshBetsApiMatch, type BetsApiMarketsResponse } from '../lib/betsApi';
import { getGroupColor } from '../data/groupColors';
import { Receipt, TrendingUp, Users, RefreshCw, Flame, CheckCircle2, Shield } from 'lucide-react';
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
  return 55 + (n % 40);
}

function bettersBadge(matchId: string): string {
  const n = matchId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const k = 1200 + (n % 3800);
  return k >= 1000 ? `${(k / 1000).toFixed(1)}k` : `${k}`;
}

// ─── Odds overview quick-panel ────────────────────────────────────────────────

function OddsOverview({ match, sportKey, commenceTime }: { match: MatchEntity; sportKey?: string; commenceTime?: string }) {
  const pm = match.primaryMarket;
  if (pm.selections.length === 0) return null;

  const home    = pm.selections[0];
  const draw    = pm.selections.find(s => s.shortName === 'X');
  const away    = pm.selections[pm.selections.length - 1];
  const pct     = popularityPct(match.id);
  const bettors = bettersBadge(match.id);

  const ih    = 1 / home.odds;
  const id    = draw ? 1 / draw.odds : 0;
  const ia    = 1 / away.odds;
  const total = ih + id + ia;
  const homeProb = Math.round((ih / total) * 100);
  const drawProb = draw ? Math.round((id / total) * 100) : null;
  const awayProb = Math.round((ia / total) * 100);

  const matchName = `${match.homeTeamName} vs ${match.awayTeamName}`;

  return (
    <div className="mx-3 sm:mx-4 xl:mx-5 mt-3 mb-0 rounded-2xl overflow-hidden border border-[#1E2D3D] shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      style={{ background: 'linear-gradient(180deg, #111827 0%, #0d1520 100%)' }}>

      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #00DFA9, #38BDF8 50%, transparent)' }} />

      <div className="flex items-center justify-between px-4 sm:px-5 py-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-[#00DFA9]" />
          </div>
          <div className="min-w-0">
            <span className="text-[12px] font-bold text-[#F8FAFC] truncate">{pm.name}</span>
            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-[#00DFA9] bg-[#00DFA9]/10 border border-[#00DFA9]/20 px-1.5 py-0.5 rounded-full">
              Top Market
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#94A3B8]/50">
            <Users className="h-3 w-3 text-[#94A3B8]/40" />
            <span className="font-semibold text-[#94A3B8]/70">{bettors}</span>
            <span>bettors</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/50">
            <Flame className="h-3 w-3 text-[#FACC15]/60" />
            <span className="font-bold text-[#FACC15]/80">{pct}%</span>
            <span className="hidden sm:inline">popularity</span>
          </div>
        </div>
      </div>

      <div className="mx-4 sm:mx-5 mb-3 h-1.5 bg-[#0A0E13] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #00DFA9 0%, #38BDF8 100%)' }}
        />
      </div>

      <div className={cn('grid px-4 sm:px-5 pb-4 gap-2.5 sm:gap-3', draw ? 'grid-cols-3' : 'grid-cols-2')}>
        {([home, draw, away] as typeof home[]).filter(Boolean).map((sel, idx) => {
          const prob = idx === 0 ? homeProb : idx === 1 && draw ? drawProb : awayProb;
          return (
            <QuickOddsCell
              key={sel.id}
              matchId={match.id}
              marketId={pm.id}
              matchName={matchName}
              leagueName=""
              marketName={pm.name}
              sel={sel}
              impliedProb={prob ?? undefined}
              sportKey={sportKey}
              homeTeam={match.homeTeamName}
              awayTeam={match.awayTeamName}
              commenceTime={commenceTime}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-3">
        <Shield className="h-3 w-3 text-[#94A3B8]/20" />
        <p className="text-[9px] text-[#94A3B8]/25 font-medium">
          Odds subject to change · Pre-match only · 18+ · Gamble responsibly
        </p>
      </div>
    </div>
  );
}

function QuickOddsCell({
  matchId, marketId, matchName, leagueName, marketName, sel, impliedProb,
  sportKey, homeTeam, awayTeam, commenceTime,
}: {
  matchId: string; marketId: string; matchName: string; leagueName: string;
  marketName: string; sel: { id: string; shortName: string; name: string; odds: number };
  impliedProb?: number;
  sportKey?: string; homeTeam?: string; awayTeam?: string; commenceTime?: string;
}) {
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const selectionId = `${marketId}-${sel.shortName}`;
  const isSelected  = hasSelection(selectionId);
  const label       = sel.shortName.length > 2 ? sel.name : sel.shortName;

  return (
    <button
      onClick={() => {
        if (isSelected) removeSelection(selectionId);
        else addSelection({ id: selectionId, marketId, matchId, matchName, leagueName, marketName, selectionType: sel.shortName, selectionName: sel.name, odds: sel.odds, sportKey: sportKey ?? '', homeTeam, awayTeam, commenceTime });
      }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-4 px-2 rounded-2xl border-2 transition-all duration-200 w-full overflow-hidden',
        isSelected
          ? 'border-[#00DFA9]/50 shadow-[0_0_20px_rgba(0,223,169,0.2),inset_0_0_20px_rgba(0,223,169,0.04)]'
          : 'border-[#1E2D3D] hover:border-[#38BDF8]/30 hover:shadow-[0_0_16px_rgba(56,189,248,0.08)]'
      )}
      style={{
        background: isSelected
          ? 'linear-gradient(160deg, rgba(0,223,169,0.08) 0%, rgba(0,15,25,0.9) 100%)'
          : 'linear-gradient(160deg, #0F1825 0%, #0B1018 100%)',
      }}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#00DFA9]" />
        </div>
      )}
      <span className={cn(
        'text-[10px] font-bold uppercase tracking-wider leading-none',
        isSelected ? 'text-[#00DFA9]/90' : 'text-[#94A3B8]/60'
      )}>
        {label}
      </span>
      <span className={cn(
        'text-[28px] sm:text-[26px] font-black tabular-nums leading-none',
        isSelected ? 'text-[#00DFA9]' : 'text-[#FACC15]'
      )}>
        {sel.odds.toFixed(2)}
      </span>
      {impliedProb !== undefined && (
        <span className={cn(
          'text-[10px] font-semibold leading-none',
          isSelected ? 'text-[#00DFA9]/60' : 'text-[#94A3B8]/40'
        )}>
          {impliedProb}% chance
        </span>
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function MatchDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col pb-14 xl:pb-0">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-gradient-to-b from-[#0F1825] to-[#0B0F14] border-b border-[#253241] px-4 pt-3 pb-4">
            <div className="h-3 w-48 bg-[#1A2433] rounded mb-4 animate-pulse" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#1A2433] animate-pulse" />
                <div className="h-3 w-24 bg-[#1A2433] rounded animate-pulse" />
              </div>
              <div className="w-12 h-12 rounded-full bg-[#1A2433] animate-pulse" />
              <div className="flex-1 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#1A2433] animate-pulse" />
                <div className="h-3 w-24 bg-[#1A2433] rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="mx-3 sm:mx-4 mt-3 mb-1 rounded-xl bg-[#121821] border border-[#253241] p-4">
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2].map(i => (
                <div key={i} className="h-16 rounded-xl bg-[#1A2433] animate-pulse" />
              ))}
            </div>
          </div>
          {/* Nav skeleton */}
          <div className="h-[54px] border-b border-[#1A2433] flex items-center gap-2 px-4">
            {[80,60,72,64,80,56].map((w, i) => (
              <div key={i} className="h-8 rounded-full bg-[#1A2433] animate-pulse shrink-0" style={{ width: w }} />
            ))}
          </div>
          <div className="px-4 py-3 space-y-2.5">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-[#253241] bg-[#121821] overflow-hidden">
                <div className="h-12 bg-[#0F1620] px-4 flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#1A2433] animate-pulse" />
                  <div className="h-3 w-32 bg-[#1A2433] rounded animate-pulse" />
                </div>
                {i < 2 && (
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {[0,1,2].map(j => (
                      <div key={j} className="h-14 rounded-xl bg-[#1A2433] animate-pulse" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <BetSlip />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Overlay an on-demand single-match refresh (Task #243) onto the cached Match:
 * fresh prematch odds and rich-market flags fetched for THIS fixture only.
 */
function applyMatchRefresh(match: Match, refreshed: BetsApiMarketsResponse): Match {
  const rm = refreshed.richMarkets;
  const odds = refreshed.prematchOdds;
  return {
    ...match,
    odds: odds
      ? {
          home: odds.home,
          ...(match.odds.draw !== undefined && odds.draw != null ? { draw: odds.draw } : {}),
          away: odds.away,
        }
      : match.odds,
    richMarkets: rm
      ? {
          hasHcp: rm.hasHcp, hasOU: rm.hasOU, hasHT: rm.hasHT, hasBTTS: rm.hasBTTS,
          hasCS: rm.hasCS, hasCorners: rm.hasCorners, hasCards: rm.hasCards, hasNextGoal: rm.hasNextGoal,
          marketScore: rm.marketScore,
          hcpHome: rm.hcpHome, hcpAway: rm.hcpAway, hcpLine: rm.hcpLine,
          ou25Over: rm.ou25Over, ou25Under: rm.ou25Under,
          htHome: rm.htHome, htDraw: rm.htDraw, htAway: rm.htAway,
          bttsY: rm.bttsY, bttsN: rm.bttsN,
        }
      : match.richMarkets,
    featuredMatch: rm ? rm.marketScore >= 1 : match.featuredMatch,
    ...(rm?.ou25Over  != null ? { ouOver25:  rm.ou25Over  } : {}),
    ...(rm?.ou25Under != null ? { ouUnder25: rm.ou25Under } : {}),
    ...(rm?.bttsY     != null ? { bttsYes:   rm.bttsY     } : {}),
    ...(rm?.bttsN     != null ? { bttsNo:    rm.bttsN     } : {}),
  };
}

export function MatchDetail() {
  const [, params]      = useRoute<{ id: string }>('/match/:id');
  const [, setLocation] = useLocation();
  const matchId         = params?.id;

  const { allLeagues, loading } = useOddsData();

  // On-demand single-match refresh: when a BetsAPI match lacks rich markets,
  // fetch fresh data for THIS fixture only (server respects the credit limiter
  // and never does a global refresh).
  const [refreshed, setRefreshed] = useState<BetsApiMarketsResponse | null>(null);
  const refreshAttempted = useRef<string | null>(null);

  const resolved = useMemo(() => {
    if (!matchId) return null;
    const found = findMatchInLeagues(matchId, allLeagues);
    if (found) {
      const overlaid =
        refreshed && `betsapi_${refreshed.fixtureId}` === matchId
          ? applyMatchRefresh(found.match, refreshed)
          : found.match;
      return {
        match:    matchToEntity(overlaid),
        league:   leagueToEntity(found.league),
        sportKey: found.match.sportKey ?? found.match.sportId ?? '',
      };
    }
    return null;
  }, [matchId, allLeagues, refreshed]);

  useEffect(() => {
    if (!matchId || !matchId.startsWith('betsapi_')) return;
    if (refreshAttempted.current === matchId) return;
    const found = findMatchInLeagues(matchId, allLeagues);
    if (!found) return; // wait until cache is loaded
    // Only refresh if the cached match has no rich markets yet ("if needed").
    if (found.match.richMarkets && found.match.richMarkets.marketScore > 0) return;
    refreshAttempted.current = matchId;
    let cancelled = false;
    void refreshBetsApiMatch(matchId).then((data) => {
      if (!cancelled && data) setRefreshed(data);
    });
    return () => { cancelled = true; };
  }, [matchId, allLeagues]);

  const groups = useMemo(
    () => resolved ? generateDetailMarkets(resolved.match) : [],
    [resolved]
  );

  if (!resolved && loading) return <MatchDetailSkeleton />;
  if (!resolved) return <MatchNotFound onBack={() => setLocation('/')} />;

  const { match, league, sportKey } = resolved;
  const matchName = match.awayTeamName
    ? `${match.homeTeamName} vs ${match.awayTeamName}`
    : match.homeTeamName;

  return (
    <MatchDetailBody
      match={match}
      league={league}
      sportKey={sportKey}
      matchName={matchName}
      groups={groups}
    />
  );
}

// ─── Inner body ───────────────────────────────────────────────────────────────

// Height of the sticky MarketNav bar (h-[54px]). Used for scroll offset calculation
// and for the scroll-spy threshold.
const NAV_HEIGHT = 63; // matches h-[60px] nav + 3px border-bottom active indicator
const DESKTOP_TOP_GAP = 16; // small breathing gap on xl+ where the horizontal nav is hidden

// On xl+ the horizontal MarketNav is replaced by the fixed left sidebar, so there's
// no sticky top bar to offset for — only a small breathing gap. Below xl the sticky
// horizontal nav is visible, so reserve its full height.
function topOffset(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches) {
    return DESKTOP_TOP_GAP;
  }
  return NAV_HEIGHT;
}

function MatchDetailBody({
  match, league, sportKey, matchName, groups,
}: {
  match:     MatchEntity;
  league:    LeagueEntity;
  sportKey:  string | undefined;
  matchName: string;
  groups:    ReturnType<typeof generateDetailMarkets>;
}) {
  const isSoccer               = match.sportId === 'sp_soccer';
  const { collapsed: betSlipCollapsed } = useBetSlipSidebar();
  const { selections }         = useBetSlip();

  // ── Nav / scroll state ──────────────────────────────────────────────────────
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  // Force-open signal: bumping `nonce` re-opens the targeted group even if the
  // user had previously collapsed it. Consumed by MarketGroup via effect.
  const [openSignal, setOpenSignal] = useState<{ id: string; nonce: number }>({ id: '', nonce: 0 });
  const groupRefs         = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // True while a programmatic scroll is running — prevents scroll-spy interference
  const isScrollingRef    = useRef(false);
  const rafIdRef          = useRef<number | null>(null);

  // Scroll-spy: listen to scroll events and update the active tab.
  // null = user is above all groups (≙ "All" tab active).
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || groups.length === 0) return;

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const threshold     = containerRect.top + topOffset() + 24;

        // Start null (= All tab); update to the last group whose top <= threshold.
        let found: string | null = null;
        for (const group of groups) {
          const el = groupRefs.current[group.id];
          if (!el) continue;
          if (el.getBoundingClientRect().top <= threshold) found = group.id;
        }
        setActiveGroupId(found);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [groups]);

  // Navigate to a group or scroll to top ("__all__").
  const handleNavSelect = useCallback((id: string) => {
    const container = scrollContainerRef.current;

    if (id === '__all__') {
      // "All" tab: scroll to top, clear active group
      setActiveGroupId(null);
      if (container) {
        isScrollingRef.current = true;
        container.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => { isScrollingRef.current = false; }, 800);
      }
      return;
    }

    setActiveGroupId(id);
    // Always expand the targeted group, even if it was previously collapsed.
    setOpenSignal(s => ({ id, nonce: s.nonce + 1 }));

    if (!container) return;

    isScrollingRef.current = true;

    // Scroll the group's header to the top of the viewport. We compute the
    // target from bounding rects (robust regardless of the container's
    // positioning) and run it on the next frame so any force-open expansion
    // above the fold has settled before we measure.
    const performScroll = () => {
      const el = groupRefs.current[id];
      if (!el || !container) return;
      const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
      const target = container.scrollTop + delta - topOffset() - 6;
      container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    };

    requestAnimationFrame(() => requestAnimationFrame(performScroll));
    setTimeout(() => { isScrollingRef.current = false; }, 900);
  }, []);

  // ── FAB pulse when selection added ─────────────────────────────────────────
  const prevCount  = useRef(selections.length);
  const [fabPulse, setFabPulse] = useState(false);
  useEffect(() => {
    if (selections.length > prevCount.current) {
      setFabPulse(true);
      setTimeout(() => setFabPulse(false), 600);
    }
    prevCount.current = selections.length;
  }, [selections.length]);

  // ── Live score ──────────────────────────────────────────────────────────────
  const liveData = useLiveMatchScore({
    matchId:  match.id,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    isLive:   match.isLive,
    isSoccer,
  });
  const displayScore = liveData.score ?? match.score;

  // ── Layout ──────────────────────────────────────────────────────────────────
  // Right padding reserves space for the fixed BetSlip panel on desktop;
  // left padding reserves space for the fixed market sidebar.
  const contentPr = betSlipCollapsed ? 'xl:pr-16' : 'xl:pr-[264px]';

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F14] text-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Left: vertical market navigation (desktop only) ───────────────── */}
        <MarketSidebar
          groups={groups}
          activeId={activeGroupId}
          onSelect={handleNavSelect}
          match={match}
          league={league}
        />

        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0 overflow-hidden transition-[padding] duration-300',
          'xl:pl-[228px]',
          contentPr,
        )}>
          {/*
           * Plain overflow-y-auto div replaces Radix ScrollArea.
           * This gives us a direct ref to the scroll container so we can
           * compute exact scroll offsets for the nav tabs — scrollIntoView()
           * is unreliable inside Radix ScrollArea's custom viewport.
           */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto h-[calc(100vh-3.5rem)] pb-14 xl:pb-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#253241 transparent' }}
          >
            {/* Match hero */}
            <MatchHeader
              match={match}
              league={league}
              liveData={match.isLive ? liveData : undefined}
            />

            {/* Primary market quick-bet panel */}
            <OddsOverview match={match} sportKey={sportKey} commenceTime={match.startTime} />

            {/* Sticky market navigator — horizontal scroll bar (mobile/tablet only;
                replaced by the fixed left sidebar on desktop) */}
            <div className="xl:hidden">
              <MarketNav
                groups={groups}
                activeId={activeGroupId}
                onSelect={handleNavSelect}
              />
            </div>

            {/* Market group cards */}
            <div className="px-3 sm:px-4 xl:px-5 pt-3 pb-16 space-y-2.5 w-full">

              {/* Live match banner */}
              {match.isLive && (
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 border-2 border-[#EF4444]/25"
                  style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,22,32,0.9) 100%)' }}>
                  <div className="relative shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[#EF4444] opacity-30 animate-ping" />
                    <span className="relative w-3 h-3 rounded-full bg-[#EF4444] block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#EF4444]">Match in Progress</p>
                    <p className="text-[11px] text-[#94A3B8]/70 mt-0.5">
                      Odds may be suspended during key moments
                      {liveData.clockMin !== null
                        ? ` · ${liveData.clockMin}' played`
                        : match.liveMinute
                          ? ` · ${match.liveMinute}' played`
                          : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {displayScore && (
                      <div className="px-3 py-1.5 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5">
                        <span
                          className="text-[13px] font-black tabular-nums transition-colors duration-300"
                          style={{ color: (liveData.homeFlash || liveData.awayFlash) ? '#00DFA9' : '#EF4444' }}
                        >
                          {displayScore.home} – {displayScore.away}
                        </span>
                      </div>
                    )}
                    <span
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: liveData.isPolling ? '#00DFA9' : '#475569' }}
                    >
                      <RefreshCw className={cn('h-3 w-3', liveData.isPolling && 'animate-spin')} />
                      {liveData.isPolling ? '' : liveData.lastUpdated ? `${liveData.nextRefreshIn}s` : ''}
                    </span>
                  </div>
                </div>
              )}

              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  ref={el => { groupRefs.current[group.id] = el; }}
                  data-group-id={group.id}
                >
                  <MarketGroup
                    group={group}
                    matchId={match.id}
                    matchName={matchName}
                    leagueName={league.name}
                    defaultOpen={false}
                    isFeatured={idx === 0}
                    groupIndex={idx}
                    sportKey={sportKey}
                    homeTeam={match.homeTeamName}
                    awayTeam={match.awayTeamName}
                    commenceTime={match.startTime}
                    accentColor={getGroupColor(group.id)}
                    openSignalNonce={openSignal.id === group.id ? openSignal.nonce : 0}
                  />
                </div>
              ))}

              <div className="text-center pt-4 pb-2">
                <p className="text-[10px] text-[#94A3B8]/25">
                  All odds subject to change · Pre-match markets only · Please gamble responsibly · 18+
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Bet Slip ──────────────────────────────────────────────── */}
        <BetSlip />
      </div>

      {/* ── Mobile Bet Slip FAB ──────────────────────────────────────────────── */}
      <div className="xl:hidden fixed right-4 z-50" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
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
