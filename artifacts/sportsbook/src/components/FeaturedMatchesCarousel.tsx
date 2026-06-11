/**
 * FeaturedMatchesCarousel — the homepage lead block. A horizontal strip of the
 * BetsAPI matches with the richest market depth (marketScore). Each card shows
 * 1X2 odds + market pills and, when selected, expands a full-width
 * <BetsApiMarketDrawer/> below the strip.
 *
 * Header shows a live count of how many rich-market matches are available plus a
 * prominent "View all" button that navigates to the dedicated /more-markets
 * page, and a thin sport-chip row lets visitors filter the strip to a single
 * sport. Uses only data already in `allLeagues` (no network calls); the drawer
 * itself fetches from the cache-only markets endpoint. Renders nothing when
 * there are no featured matches (e.g. BetsAPI cache empty).
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight, ArrowRight } from 'lucide-react';
import type { League } from '../types';
import { OddsButton } from './OddsButton';
import { TeamBadge } from './TeamBadge';
import { SportName } from './SportName';
import { BetsApiMarketDrawer } from './BetsApiMarketDrawer';
import { cn } from '../lib/utils';
import {
  MARKET_PILLS,
  marketMeta,
  sportMetaFor,
  selectFeaturedEntries,
  groupFeaturedBySport,
  type FeaturedEntry,
} from '../lib/featuredMarkets';

interface Props {
  leagues: League[];
}

export function FeaturedMatchesCarousel({ leagues }: Props) {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  // All rich-market matches, sorted by depth (no cap — drives the count + chips).
  const allFeatured = useMemo<FeaturedEntry[]>(() => selectFeaturedEntries(leagues), [leagues]);

  // Sports present among the featured matches, with counts (most matches first).
  const sportGroups = useMemo(() => groupFeaturedBySport(allFeatured), [allFeatured]);

  // Guard the selected sport against data rotation (selected sport may disappear).
  const effectiveSport =
    selectedSport && sportGroups.some((g) => g.id === selectedSport) ? selectedSport : null;

  // Show every featured match — no cap.
  const visible = useMemo<FeaturedEntry[]>(() => {
    if (effectiveSport) {
      return allFeatured.filter((e) => (e.match.sportId || 'other') === effectiveSport);
    }
    return allFeatured;
  }, [allFeatured, effectiveSport]);

  if (allFeatured.length === 0) return null;

  const selected = visible.find((e) => e.match.id === selectedId);
  const totalCount = allFeatured.length;

  return (
    <div className="mb-5" data-testid="featured-carousel">
      {/* Header */}
      <div className="mb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[15px] sm:text-base font-extrabold text-[#FACC15]">
            <Sparkles className="w-4 h-4" />
            Matches With More Markets
          </span>
          <span
            className="shrink-0 text-[10px] font-bold tabular-nums text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-1.5 py-0.5 rounded-full"
            data-testid="featured-count"
          >
            {totalCount} match{totalCount !== 1 ? 'es' : ''}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#FACC15]/30 to-transparent" />
          <button
            type="button"
            onClick={() => setLocation('/more-markets')}
            data-testid="featured-view-all"
            className="group/va shrink-0 flex items-center gap-1 rounded-full bg-[#38BDF8]/12 hover:bg-[#38BDF8]/20 border border-[#38BDF8]/40 hover:border-[#38BDF8]/60 px-3 py-1.5 text-[11px] sm:text-[12px] font-bold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors shadow-[0_0_14px_rgba(56,189,248,0.12)]"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/va:translate-x-0.5" />
          </button>
        </div>
        <p className="mt-1 text-[11px] font-medium text-[#94A3B8]/80">
          Tap any match to bet on handicaps, totals, BTTS, correct score, corners &amp; more
        </p>
      </div>

      {/* Sport-chip filter row (only when more than one sport is present) */}
      {sportGroups.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x" data-testid="featured-sport-chips">
          <button
            type="button"
            onClick={() => setSelectedSport(null)}
            data-testid="featured-chip-all"
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors snap-start',
              effectiveSport === null
                ? 'bg-[#FACC15]/12 text-[#FACC15] border-[#FACC15]/35'
                : 'bg-[#121821] text-[#94A3B8]/80 border-[#1E2A38] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
            )}
          >
            All
            <span className="text-[9px] tabular-nums opacity-70">{totalCount}</span>
          </button>
          {sportGroups.map((g) => {
            const active = effectiveSport === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedSport(active ? null : g.id)}
                data-testid={`featured-chip-${g.id}`}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors snap-start',
                  active
                    ? 'bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/35'
                    : 'bg-[#121821] text-[#94A3B8]/80 border-[#1E2A38] hover:text-[#F8FAFC] hover:border-[#2E3D50]',
                )}
              >
                <span className="text-[13px] leading-none">{g.icon}</span>
                <SportName name={g.label} />
                <span className="text-[9px] tabular-nums opacity-70">{g.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Horizontal scroller */}
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x snap-mandatory">
        {visible.map(({ match, leagueName }) => {
          const { marketId, marketName } = marketMeta(match);
          const isSel = match.id === selectedId;
          const rm = match.richMarkets;
          const pills = MARKET_PILLS.filter(p => rm && rm[p.key]);
          const sportIcon = sportMetaFor(match.sportId).icon;
          const base = {
            matchId: match.id, marketId, matchName: match.team2 ? `${match.team1} vs ${match.team2}` : match.team1,
            leagueName, marketName, sportKey: match.sportKey, sportId: match.sportId,
            commenceTime: match.commenceIso, homeTeam: match.team1 ?? '', awayTeam: match.team2 ?? '',
            kickoffTime: match.isLive ? undefined : match.kickoffTime,
          };
          return (
            <div
              key={match.id}
              data-testid={`featured-card-${match.id}`}
              className={cn(
                'shrink-0 w-[268px] sm:w-[300px] snap-start rounded-xl border bg-[#121821] p-3 flex flex-col gap-2.5 transition-colors',
                isSel ? 'border-[#FACC15]/50 shadow-[0_0_16px_rgba(250,204,21,0.12)]' : 'border-[#1E2A38] hover:border-[#2E3D50]',
              )}
            >
              {/* League + score badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#94A3B8]/60 truncate">
                  <SportName name={leagueName} />
                </span>
                <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-[#FACC15] bg-[#FACC15]/10 px-1.5 py-0.5 rounded">
                  <Sparkles className="w-2.5 h-2.5" />
                  {rm?.marketScore ?? 0}
                </span>
              </div>

              {/* Teams */}
              <button
                type="button"
                onClick={() => setLocation(`/match/${match.id}`)}
                className="flex flex-col gap-1.5 text-left group/teams"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge name={match.team1} sportIcon={sportIcon} size="sm" />
                  <span className="text-[13px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team1}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge name={match.team2 ?? 'Away'} sportIcon={sportIcon} size="sm" />
                  <span className="text-[13px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team2 ?? 'Away'}</span>
                </div>
              </button>

              {/* Pills */}
              {pills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pills.slice(0, 4).map(p => (
                    <span key={p.key} className="text-[8px] font-medium text-[#38BDF8]/80 bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">
                      {p.label}
                    </span>
                  ))}
                  {pills.length > 4 && (
                    <span className="text-[8px] font-medium text-[#94A3B8]/50 px-1 py-0.5">+{pills.length - 4}</span>
                  )}
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
                data-testid={`featured-more-${match.id}`}
                onClick={() => setSelectedId(isSel ? null : match.id)}
                className={cn(
                  'flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors',
                  isSel ? 'bg-[#FACC15]/15 text-[#FACC15]' : 'bg-[#0B1018] text-[#38BDF8] hover:bg-[#38BDF8]/10',
                )}
              >
                {isSel ? 'Hide markets' : 'More markets'}
                <ChevronRight className={cn('w-3 h-3 transition-transform', isSel && 'rotate-90')} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected match drawer (full width below the strip) */}
      {selected && (
        <div className="mt-2 rounded-xl border border-[#FACC15]/30 overflow-hidden">
          <div className="px-3.5 py-2 bg-[#101722] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[#F8FAFC] truncate">
              {selected.match.team1} <span className="text-[#94A3B8]/50">vs</span> {selected.match.team2 ?? 'Away'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-[10px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              Close
            </button>
          </div>
          <BetsApiMarketDrawer match={selected.match} leagueName={selected.leagueName} />
        </div>
      )}
    </div>
  );
}
