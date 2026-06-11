/**
 * MoreMarkets — the dedicated "Matches With More Markets" page reached from the
 * homepage carousel's "View all" control. Lists every BetsAPI rich-market
 * (featured) match in a responsive grid with the same sport-chip filtering used
 * in the carousel, and an expandable full markets drawer per card.
 *
 * Uses only data already in the global odds context (no extra network calls);
 * each drawer fetches from the cache-only markets endpoint. Shows a realistic
 * empty state when no featured matches exist (e.g. BetsAPI cache empty).
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight, ChevronLeft, RefreshCw, Layers } from 'lucide-react';
import { Header } from '@/components/Header';
import { SportsSidebar } from '@/components/SportsSidebar';
import { BetSlip } from '@/components/BetSlip';
import { OddsButton } from '@/components/OddsButton';
import { TeamBadge } from '@/components/TeamBadge';
import { SportName } from '@/components/SportName';
import { BetsApiMarketDrawer } from '@/components/BetsApiMarketDrawer';
import { useBetSlipSidebar } from '@/contexts/BetSlipSidebarContext';
import { useOddsData } from '@/hooks/useOddsData';
import { cn } from '@/lib/utils';
import type { Match } from '@/types';
import {
  deriveFeatured,
  deriveSportChips,
  marketMeta,
  FEATURED_ALL,
} from '@/lib/featuredMatches';

const MARKET_PILLS: { key: keyof NonNullable<Match['richMarkets']>; label: string }[] = [
  { key: 'hasHcp',     label: 'Handicap' },
  { key: 'hasOU',      label: 'O/U 2.5' },
  { key: 'hasBTTS',    label: 'BTTS' },
  { key: 'hasHT',      label: 'Half-Time' },
  { key: 'hasCS',      label: 'Correct Score' },
  { key: 'hasCorners', label: 'Corners' },
  { key: 'hasCards',   label: 'Cards' },
];

export function MoreMarkets() {
  const [, navigate] = useLocation();
  const { allLeagues, refreshing, lastUpdatedLabel } = useOddsData();
  const { collapsed: betSlipCollapsed } = useBetSlipSidebar();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>(FEATURED_ALL);

  const allFeatured = useMemo(() => deriveFeatured(allLeagues), [allLeagues]);
  const sportChips = useMemo(() => deriveSportChips(allFeatured), [allFeatured]);

  const activeSport = sportFilter !== FEATURED_ALL && sportChips.some((c) => c.id === sportFilter)
    ? sportFilter
    : FEATURED_ALL;

  const display = useMemo(() => (
    activeSport === FEATURED_ALL
      ? allFeatured
      : allFeatured.filter((e) => (e.match.sportId ?? 'other') === activeSport)
  ), [allFeatured, activeSport]);

  const total = allFeatured.length;

  return (
    <div className="min-h-screen bg-[#0B0F14] flex flex-col">
      <Header />
      <div className="flex flex-1 pt-14 min-h-0">
        <SportsSidebar
          selectedSportId=""
          onSelectSport={() => navigate('/')}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-3 sm:px-4 py-4 pb-24 sm:pb-6">

            {/* Back */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 mb-3 text-[12px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to home
            </button>

            {/* Page header */}
            <div className="relative rounded-2xl overflow-hidden mb-5 border border-[#FACC15]/20">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1200] via-[#0B0F14] to-[#001C12]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,204,21,0.12),transparent)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FACC15]/40 to-transparent" />
              <div className="relative flex items-center gap-4 p-4 sm:p-5">
                <div className="shrink-0 grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#FACC15]/25 bg-white/[0.03] shadow-[0_0_30px_rgba(250,204,21,0.15)]">
                  <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-[#FACC15]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-[18px] sm:text-[22px] font-black text-white leading-none">
                      Matches With More Markets
                    </h1>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FACC15]/15 text-[#FACC15] border border-[#FACC15]/30 tabular-nums">
                      {total}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#94A3B8]">
                    Bet on handicaps, totals, BTTS, correct score, corners, cards &amp; more
                  </p>
                  {lastUpdatedLabel && (
                    <span className="mt-2 flex items-center gap-1 text-[10px] text-[#334155]">
                      <RefreshCw className={cn('h-2.5 w-2.5', refreshing && 'animate-spin')} />
                      {lastUpdatedLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sport-chip filter row */}
            {sportChips.length > 1 && (
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => { setSportFilter(FEATURED_ALL); setSelectedId(null); }}
                  data-testid="more-markets-sport-all"
                  className={cn(
                    'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150',
                    activeSport === FEATURED_ALL
                      ? 'bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/30'
                      : 'bg-[#121821] text-[#94A3B8]/70 border-[#253241] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
                  )}
                >
                  All
                  <span className="text-[9px] font-bold tabular-nums opacity-70">{total}</span>
                </button>
                {sportChips.map((chip) => {
                  const isActive = activeSport === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => { setSportFilter(chip.id); setSelectedId(null); }}
                      data-testid={`more-markets-sport-${chip.id}`}
                      className={cn(
                        'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150',
                        isActive
                          ? 'bg-[#FACC15]/15 text-[#FACC15] border-[#FACC15]/30'
                          : 'bg-[#121821] text-[#94A3B8]/70 border-[#253241] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
                      )}
                    >
                      <span className="text-[12px] leading-none">{chip.icon}</span>
                      <SportName name={chip.label} />
                      <span className="text-[9px] font-bold tabular-nums opacity-70">{chip.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="grid place-items-center w-16 h-16 rounded-2xl border border-[#1E2A38] bg-[#121821] mb-4">
                  <Layers className="w-8 h-8 text-[#334155]" />
                </div>
                <h2 className="text-[15px] font-bold text-[#F8FAFC] mb-1">No extra-market matches right now</h2>
                <p className="text-[12px] text-[#94A3B8] max-w-sm">
                  Matches with handicaps, totals and other rich markets will appear here as soon as
                  they&apos;re available. Check back shortly.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-5 px-4 py-2 rounded-lg text-[12px] font-bold text-[#0B0F14] bg-[#00DFA9] hover:bg-[#00C896] transition-colors"
                >
                  Browse all matches
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {display.map(({ match, leagueName }) => {
                  const { marketId, marketName } = marketMeta(match);
                  const isSel = match.id === selectedId;
                  const rm = match.richMarkets;
                  const pills = MARKET_PILLS.filter((p) => rm && rm[p.key]);
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
                        'rounded-xl border bg-[#121821] p-3 flex flex-col gap-2.5 transition-colors',
                        isSel ? 'border-[#FACC15]/50 shadow-[0_0_16px_rgba(250,204,21,0.12)]' : 'border-[#1E2A38] hover:border-[#2E3D50]',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/60 truncate">
                          <SportName name={leagueName} />
                        </span>
                        <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-[#FACC15] bg-[#FACC15]/10 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-2.5 h-2.5" />
                          {rm?.marketScore ?? 0}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/match/${match.id}`)}
                        className="flex flex-col gap-1.5 text-left group/teams"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamBadge name={match.team1} size="sm" />
                          <span className="text-[13px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team1}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamBadge name={match.team2 ?? 'Away'} size="sm" />
                          <span className="text-[13px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team2 ?? 'Away'}</span>
                        </div>
                      </button>

                      {pills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pills.slice(0, 5).map((p) => (
                            <span key={p.key} className="text-[8px] font-medium text-[#38BDF8]/80 bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">
                              {p.label}
                            </span>
                          ))}
                          {pills.length > 5 && (
                            <span className="text-[8px] font-medium text-[#94A3B8]/50 px-1 py-0.5">+{pills.length - 5}</span>
                          )}
                        </div>
                      )}

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

                      <button
                        type="button"
                        data-testid={`more-markets-more-${match.id}`}
                        onClick={() => setSelectedId(isSel ? null : match.id)}
                        className={cn(
                          'flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors',
                          isSel ? 'bg-[#FACC15]/15 text-[#FACC15]' : 'bg-[#0B1018] text-[#38BDF8] hover:bg-[#38BDF8]/10',
                        )}
                      >
                        {isSel ? 'Hide markets' : 'More markets'}
                        <ChevronRight className={cn('w-3 h-3 transition-transform', isSel && 'rotate-90')} />
                      </button>

                      {isSel && (
                        <div className="rounded-xl border border-[#FACC15]/30 overflow-hidden">
                          <BetsApiMarketDrawer match={match} leagueName={leagueName} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
        <div className={cn('shrink-0 hidden xl:block transition-[width] duration-300', betSlipCollapsed ? 'w-14' : 'w-[260px]')} />
        <BetSlip />
      </div>
    </div>
  );
}
