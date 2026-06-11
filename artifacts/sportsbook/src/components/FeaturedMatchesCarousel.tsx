/**
 * FeaturedMatchesCarousel — the homepage's lead section: a horizontal strip of
 * the top BetsAPI matches by rich-market depth (marketScore). Each card shows
 * 1X2 odds + market pills and, when selected, expands a full-width
 * <BetsApiMarketDrawer/> below the carousel.
 *
 * A thin sport-chip row above the strip lets visitors filter to a single sport
 * (only sports that actually have rich-market matches are shown). A "View all"
 * control hands off to the parent to enable the Featured filter on the full list.
 *
 * Uses only data already in `allLeagues` (no network calls); the drawer itself
 * fetches from the cache-only markets endpoint. Renders nothing when there are
 * no featured matches (e.g. BetsAPI cache empty).
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Sparkles, ChevronRight } from 'lucide-react';
import type { League, Match } from '../types';
import { OddsButton } from './OddsButton';
import { TeamBadge } from './TeamBadge';
import { SportName } from './SportName';
import { BetsApiMarketDrawer } from './BetsApiMarketDrawer';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { cn } from '../lib/utils';

interface Props {
  leagues: League[];
  /** Optional: enable the full-list Featured filter and scroll to it. */
  onViewAll?: () => void;
}

interface FeaturedEntry {
  match:      Match;
  leagueName: string;
}

const MARKET_PILLS: { key: keyof NonNullable<Match['richMarkets']>; label: string }[] = [
  { key: 'hasHcp',     label: 'Handicap' },
  { key: 'hasOU',      label: 'O/U 2.5' },
  { key: 'hasBTTS',    label: 'BTTS' },
  { key: 'hasHT',      label: 'Half-Time' },
  { key: 'hasCS',      label: 'Correct Score' },
  { key: 'hasCorners', label: 'Corners' },
  { key: 'hasCards',   label: 'Cards' },
];

const SPORT_ICONS: Record<string, string> = {
  sp_soccer: '⚽', sp_tennis: '🎾', sp_table_tennis: '🏓', sp_basketball: '🏀',
  sp_ice_hockey: '🏒', sp_cricket: '🏏', sp_baseball: '⚾', sp_american_football: '🏈',
  sp_volleyball: '🏐', sp_darts: '🎯', sp_boxing: '🥊', sp_mma: '🥋',
  sp_rugby_league: '🏉', sp_rugby_union: '🏉', sp_esports: '🎮', sp_handball: '🤾',
  sp_snooker: '🎱', sp_badminton: '🏸', sp_futsal: '⚽',
};

const SPORT_LABELS: Record<string, string> = {
  sp_soccer: 'Soccer', sp_tennis: 'Tennis', sp_table_tennis: 'Table Tennis',
  sp_basketball: 'Basketball', sp_ice_hockey: 'Ice Hockey', sp_cricket: 'Cricket',
  sp_baseball: 'Baseball', sp_american_football: 'NFL', sp_volleyball: 'Volleyball',
  sp_darts: 'Darts', sp_boxing: 'Boxing', sp_mma: 'MMA', sp_rugby_league: 'Rugby League',
  sp_rugby_union: 'Rugby Union', sp_esports: 'Esports', sp_handball: 'Handball',
  sp_snooker: 'Snooker', sp_badminton: 'Badminton', sp_futsal: 'Futsal',
};

function sportIconFor(id?: string): string {
  return (id && SPORT_ICONS[id]) || '🏅';
}

function sportLabelFor(id?: string): string {
  if (id && SPORT_LABELS[id]) return SPORT_LABELS[id];
  if (!id) return 'Other';
  return id.replace(/^sp_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function marketMeta(match: Match) {
  if (match.sportId === 'sp_soccer') return { marketId: `mkt_${match.id}_mr`, marketName: 'Match Result' };
  return { marketId: `mkt_${match.id}_mw`, marketName: 'Match Winner' };
}

const ALL = '__all__';

export function FeaturedMatchesCarousel({ leagues, onViewAll }: Props) {
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>(ALL);

  // All rich-market matches (no slice) — drives the count + sport chips.
  const allFeatured = useMemo<FeaturedEntry[]>(() => {
    const entries: FeaturedEntry[] = [];
    for (const league of leagues) {
      for (const match of league.matches) {
        if (!match.id.startsWith('betsapi_')) continue;
        if (!match.featuredMatch) continue;
        entries.push({ match, leagueName: league.name });
      }
    }
    entries.sort(
      (a, b) => (b.match.richMarkets?.marketScore ?? 0) - (a.match.richMarkets?.marketScore ?? 0),
    );
    return entries;
  }, [leagues]);

  // Sport chips derived from the matches actually present, sorted by count desc.
  const sportChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { match } of allFeatured) {
      const id = match.sportId ?? 'other';
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, label: sportLabelFor(id), icon: sportIconFor(id) }))
      .sort((a, b) => b.count - a.count);
  }, [allFeatured]);

  // Keep the active chip valid if the underlying data changes.
  const activeSport = sportFilter !== ALL && sportChips.some((c) => c.id === sportFilter)
    ? sportFilter
    : ALL;

  const display = useMemo(() => {
    const filtered = activeSport === ALL
      ? allFeatured
      : allFeatured.filter((e) => (e.match.sportId ?? 'other') === activeSport);
    return filtered.slice(0, 12);
  }, [allFeatured, activeSport]);

  if (allFeatured.length === 0) return null;

  const total = allFeatured.length;
  const selected = display.find((e) => e.match.id === selectedId);

  return (
    <div className="mb-5" data-testid="featured-carousel">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[15px] sm:text-base font-extrabold text-[#FACC15]">
            <Sparkles className="w-4 h-4" />
            Matches With More Markets
          </span>
          <span className="shrink-0 text-[10px] font-bold text-[#FACC15] bg-[#FACC15]/10 border border-[#FACC15]/20 px-1.5 py-0.5 rounded-md tabular-nums">
            {total}
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-[#FACC15]/30 to-transparent" />
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              data-testid="featured-view-all"
              className="shrink-0 flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
            >
              View all
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] font-medium text-[#94A3B8]/80">
          Tap any match to bet on handicaps, totals, BTTS, correct score, corners &amp; more
        </p>
      </div>

      {/* Sport-chip filter row — only shown when there is more than one sport */}
      {sportChips.length > 1 && (
        <ScrollArea className="w-full mb-2.5">
          <div className="flex items-center gap-1.5 w-max pb-1.5">
            <button
              type="button"
              onClick={() => { setSportFilter(ALL); setSelectedId(null); }}
              data-testid="featured-sport-all"
              className={cn(
                'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                activeSport === ALL
                  ? 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/30'
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
                  data-testid={`featured-sport-${chip.id}`}
                  className={cn(
                    'shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                    isActive
                      ? 'bg-[#FACC15]/10 text-[#FACC15] border-[#FACC15]/30'
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
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      )}

      {/* Horizontal scroller */}
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 snap-x snap-mandatory">
        {display.map(({ match, leagueName }) => {
          const { marketId, marketName } = marketMeta(match);
          const isSel = match.id === selectedId;
          const rm = match.richMarkets;
          const pills = MARKET_PILLS.filter(p => rm && rm[p.key]);
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
                  <TeamBadge name={match.team1} size="sm" />
                  <span className="text-[13px] font-semibold text-[#F8FAFC] truncate group-hover/teams:text-[#38BDF8] transition-colors">{match.team1}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <TeamBadge name={match.team2 ?? 'Away'} size="sm" />
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

      {/* Selected match drawer (full width below the carousel) */}
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
