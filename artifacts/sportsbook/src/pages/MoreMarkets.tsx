/**
 * MoreMarkets — dedicated page listing ALL "Matches With More Markets" (BetsAPI
 * fixtures with rich market depth) in a professional responsive grid.
 *
 * Reached from the homepage carousel's prominent "View all" button. Shares its
 * selectors/metadata with the carousel via lib/featuredMarkets.ts so the two
 * always agree on what counts as a featured match. Each card shows team badges,
 * available market pills, 1X2 odds, and expands a full <BetsApiMarketDrawer/>
 * inline. Includes a sport-chip filter and a team/league search box.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight, ChevronLeft, Search, Layers } from 'lucide-react';
import { Header } from '@/components/Header';
import { BetSlip } from '@/components/BetSlip';
import { OddsButton } from '@/components/OddsButton';
import { TeamBadge } from '@/components/TeamBadge';
import { SportName } from '@/components/SportName';
import { BetsApiMarketDrawer } from '@/components/BetsApiMarketDrawer';
import { GenericMarketDrawer } from '@/components/GenericMarketDrawer';
import { useOddsData } from '@/hooks/useOddsData';
import { useBetSlipSidebar } from '@/contexts/BetSlipSidebarContext';
import { cn } from '@/lib/utils';
import {
  marketMeta,
  sportMetaFor,
  selectFeaturedEntries,
  groupFeaturedBySport,
  marketPillsFor,
  marketScoreFor,
  isBetsApiMatch,
  type FeaturedEntry,
} from '@/lib/featuredMarkets';

export function MoreMarkets() {
  const [, setLocation] = useLocation();
  const { allLeagues, loading } = useOddsData();
  const { collapsed } = useBetSlipSidebar();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const allFeatured = useMemo<FeaturedEntry[]>(() => selectFeaturedEntries(allLeagues), [allLeagues]);
  const sportGroups = useMemo(() => groupFeaturedBySport(allFeatured), [allFeatured]);

  const effectiveSport =
    selectedSport && sportGroups.some((g) => g.id === selectedSport) ? selectedSport : null;

  const visible = useMemo<FeaturedEntry[]>(() => {
    const q = query.trim().toLowerCase();
    return allFeatured.filter((e) => {
      if (effectiveSport && (e.match.sportId || 'other') !== effectiveSport) return false;
      if (q) {
        const hay = `${e.match.team1} ${e.match.team2 ?? ''} ${e.leagueName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allFeatured, effectiveSport, query]);

  const totalCount = allFeatured.length;

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-14 xl:pb-0">
      <Header />

      <div className="flex">
        <main className="flex-1 min-w-0 max-w-6xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8">
        {/* Back + title */}
        <button
          type="button"
          onClick={() => setLocation('/')}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors mb-4"
          data-testid="more-markets-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FACC15]/12 border border-[#FACC15]/25 text-[#FACC15]">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F8FAFC]">
            Matches With More Markets
          </h1>
          <span className="text-[11px] font-bold tabular-nums text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-2 py-0.5 rounded-full">
            {totalCount} match{totalCount !== 1 ? 'es' : ''}
          </span>
        </div>
        <p className="text-[12px] sm:text-[13px] font-medium text-[#94A3B8]/80 mb-4 max-w-2xl">
          Every fixture with the deepest market coverage — handicaps, totals, BTTS, correct score,
          corners, cards &amp; more. Tap a match to expand all available markets.
        </p>

        {/* Search */}
        <div className="relative mb-3 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search team or league…"
            data-testid="more-markets-search"
            className="w-full rounded-lg bg-[#121821] border border-[#1E2A38] focus:border-[#38BDF8]/50 focus:outline-none pl-9 pr-3 py-2 text-[13px] text-[#F8FAFC] placeholder:text-[#94A3B8]/45 transition-colors"
          />
        </div>

        {/* Sport-chip filter row */}
        {sportGroups.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x mb-3" data-testid="more-markets-chips">
            <button
              type="button"
              onClick={() => setSelectedSport(null)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors snap-start',
                effectiveSport === null
                  ? 'bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/35'
                  : 'bg-[#121821] text-[#94A3B8]/80 border-[#1E2A38] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
              )}
            >
              All
              <span className="text-[10px] tabular-nums opacity-70">{totalCount}</span>
            </button>
            {sportGroups.map((g) => {
              const active = effectiveSport === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedSport(active ? null : g.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors snap-start',
                    active
                      ? 'bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/35'
                      : 'bg-[#121821] text-[#94A3B8]/80 border-[#1E2A38] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
                  )}
                >
                  <span className="text-[14px] leading-none">{g.icon}</span>
                  <SportName name={g.label} />
                  <span className="text-[10px] tabular-nums opacity-70">{g.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && allFeatured.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#1E2A38] bg-[#121821] p-4 h-[210px] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && allFeatured.length === 0 && (
          <EmptyState
            title="No rich-market matches right now"
            body="Featured fixtures appear here as soon as detailed markets are available. Check back shortly."
          />
        )}
        {allFeatured.length > 0 && visible.length === 0 && (
          <EmptyState
            title="No matches found"
            body="Try a different sport filter or clear your search."
          />
        )}

        {/* Grid */}
        {visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="more-markets-grid">
            {visible.map(({ match, leagueName }) => {
              const { marketId, marketName } = marketMeta(match);
              const isSel = match.id === selectedId;
              const pills = marketPillsFor(match);
              const sportIcon = sportMetaFor(match.sportId).icon;
              const base = {
                matchId: match.id, marketId,
                matchName: match.team2 ? `${match.team1} vs ${match.team2}` : match.team1,
                leagueName, marketName, sportKey: match.sportKey, sportId: match.sportId,
                commenceTime: match.commenceIso, homeTeam: match.team1 ?? '', awayTeam: match.team2 ?? '',
                kickoffTime: match.isLive ? undefined : match.kickoffTime,
              };
              return (
                <div
                  key={match.id}
                  data-testid={`more-markets-card-${match.id}`}
                  className={cn(
                    'rounded-xl border bg-[#121821] p-3.5 flex flex-col gap-3 transition-colors',
                    isSel ? 'border-[#FACC15]/50 shadow-[0_0_16px_rgba(250,204,21,0.12)]' : 'border-[#1E2A38] hover:border-[#2E3D50]',
                  )}
                >
                  {/* League + score badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/60 truncate">
                      <SportName name={leagueName} />
                    </span>
                    <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-[#FACC15] bg-[#FACC15]/10 px-1.5 py-0.5 rounded">
                      <Sparkles className="w-2.5 h-2.5" />
                      {marketScoreFor(match)}
                    </span>
                  </div>

                  {/* Teams */}
                  <button
                    type="button"
                    onClick={() => setLocation(`/match/${match.id}`)}
                    className="flex flex-col gap-2 text-left group/teams"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamBadge name={match.team1} sportIcon={sportIcon} size="md" />
                      <span className="text-[14px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team1}</span>
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamBadge name={match.team2 ?? 'Away'} sportIcon={sportIcon} size="md" />
                      <span className="text-[14px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team2 ?? 'Away'}</span>
                    </div>
                  </button>

                  {/* Pills */}
                  {pills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pills.map((p) => (
                        <span key={p.key} className="text-[9px] font-medium text-[#38BDF8]/80 bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 1X2 odds */}
                  <div className="flex items-end gap-1.5">
                    <div className="flex flex-col items-center gap-0.5 flex-1">
                      <span className="text-[8px] font-semibold text-[#94A3B8]/60">1</span>
                      <OddsButton {...base} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
                    </div>
                    {match.odds.draw != null && (
                      <div className="flex flex-col items-center gap-0.5 flex-1">
                        <span className="text-[8px] font-semibold text-[#94A3B8]/60">X</span>
                        <OddsButton {...base} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-0.5 flex-1">
                      <span className="text-[8px] font-semibold text-[#94A3B8]/60">2</span>
                      <OddsButton {...base} selectionType="2" selectionName={match.team2 ?? 'Away'} odds={match.odds.away} />
                    </div>
                  </div>

                  {/* More markets toggle */}
                  <button
                    type="button"
                    data-testid={`more-markets-toggle-${match.id}`}
                    onClick={() => setSelectedId(isSel ? null : match.id)}
                    className={cn(
                      'flex items-center justify-center gap-1 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors',
                      isSel ? 'bg-[#FACC15]/15 text-[#FACC15]' : 'bg-[#0B1018] text-[#38BDF8] hover:bg-[#38BDF8]/10',
                    )}
                  >
                    {isSel ? 'Hide markets' : 'More markets'}
                    <ChevronRight className={cn('w-3 h-3 transition-transform', isSel && 'rotate-90')} />
                  </button>

                  {/* Inline drawer */}
                  {isSel && (
                    <div className="rounded-lg border border-[#FACC15]/30 overflow-hidden -mx-0.5">
                      {isBetsApiMatch(match)
                        ? <BetsApiMarketDrawer match={match} leagueName={leagueName} />
                        : <GenericMarketDrawer match={match} leagueName={leagueName} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </main>

        {/* Desktop BetSlip spacer — reserves room so cards are never hidden */}
        <div className={cn('shrink-0 hidden xl:block transition-[width] duration-300', collapsed ? 'w-16' : 'w-[268px]')} />
      </div>

      <BetSlip />
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4" data-testid="more-markets-empty">
      <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#121821] border border-[#1E2A38] text-[#94A3B8]/60 mb-3">
        <Layers className="w-7 h-7" />
      </span>
      <h2 className="text-[15px] font-bold text-[#F8FAFC] mb-1">{title}</h2>
      <p className="text-[12px] text-[#94A3B8]/70 max-w-sm">{body}</p>
    </div>
  );
}

export default MoreMarkets;
