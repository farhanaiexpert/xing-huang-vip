import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { PopularBets } from './PopularBets';
import { SkeletonLeague } from './SkeletonLeague';
import { cn } from '../lib/utils';
import { Search, X, TrendingUp, ChevronRight } from 'lucide-react';
import { Input } from './ui/input';
import { League } from '../types';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'upcoming';

const CAROUSEL_SPORTS = [
  { id: 'soccer',            name: 'Soccer',       icon: '⚽', count: 284 },
  { id: 'tennis',            name: 'Tennis',       icon: '🎾', count: 96  },
  { id: 'basketball',        name: 'Basketball',   icon: '🏀', count: 42  },
  { id: 'cricket',           name: 'Cricket',      icon: '🏏', count: 18  },
  { id: 'esports',           name: 'Esports',      icon: '🎮', count: 63  },
  { id: 'horse-racing',      name: 'Horse Racing', icon: '🏇', count: 195 },
  { id: 'formula-1',         name: 'Formula 1',    icon: '🏎️', count: 12  },
  { id: 'boxing',            name: 'Boxing',       icon: '🥊', count: 8   },
  { id: 'golf',              name: 'Golf',         icon: '⛳', count: 24  },
  { id: 'darts',             name: 'Darts',        icon: '🎯', count: 31  },
  { id: 'ice-hockey',        name: 'Ice Hockey',   icon: '🏒', count: 54  },
  { id: 'mma',               name: 'MMA',          icon: '🥋', count: 14  },
  { id: 'nba',               name: 'NBA',          icon: '🏀', count: 22  },
  { id: 'american-football', name: 'NFL',          icon: '🏈', count: 16  },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'today',    label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'upcoming', label: 'Upcoming' },
];

const PROMO_PILLS = [
  { id: 'early-payout', label: 'Early Payout', color: '#38BDF8' },
  { id: 'acca-boost',   label: 'Acca Boost',   color: '#00DFA9' },
];

// ── Stable "last updated" timestamp ─────────────────────────────────────────
const UPDATED_AT = new Date();

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const [dateFilter,  setDateFilter] = useState<DateFilter>('all');
  const [search,      setSearch]     = useState('');
  const [isLoading,   setIsLoading]  = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Simulate initial data load
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const clearSearch = useCallback(() => {
    setSearch('');
    searchRef.current?.focus();
  }, []);

  // Count live matches
  const liveCount = useMemo(
    () => LEAGUES.flatMap(l => l.matches).filter(m => m.isLive).length,
    []
  );

  // Filtered leagues
  const filteredLeagues = useMemo<League[]>(() => {
    let leagues = LEAGUES;

    if (selectedSportId && !['all', 'early-payout', 'acca-boost'].includes(selectedSportId)) {
      leagues = leagues.filter(l =>
        l.sportId === selectedSportId ||
        l.sportId === `sp_${selectedSportId.replace('-', '_')}`
      );
    }

    if (dateFilter !== 'all') {
      leagues = leagues
        .map(l => ({ ...l, matches: l.matches.filter(m => m.dateTag === dateFilter) }))
        .filter(l => l.matches.length > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      leagues = leagues
        .map(l => ({
          ...l,
          matches: l.matches.filter(
            m =>
              m.team1.toLowerCase().includes(q) ||
              (m.team2 && m.team2.toLowerCase().includes(q)) ||
              l.name.toLowerCase().includes(q) ||
              (m.team1 + ' vs ' + m.team2).toLowerCase().includes(q)
          ),
        }))
        .filter(l => l.matches.length > 0);
    }

    return leagues;
  }, [selectedSportId, dateFilter, search]);

  const totalMatchCount = useMemo(
    () => filteredLeagues.reduce((acc, l) => acc + l.matches.length, 0),
    [filteredLeagues]
  );

  const showFeatured =
    !isLoading &&
    !search.trim() &&
    (!selectedSportId || selectedSportId === 'all' || selectedSportId === 'early-payout' || selectedSportId === 'acca-boost') &&
    dateFilter === 'all';

  const hasActiveFilter = !!search.trim() || (!!selectedSportId && selectedSportId !== 'all') || dateFilter !== 'all';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-3.5rem)]" style={{ scrollbarWidth: 'none' }}>

        {/* ── Sticky controls ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 bg-[#0B0F14]/97 backdrop-blur-md border-b border-[#253241]/60">

          {/* Search */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/50 group-focus-within:text-[#00DFA9] transition-colors duration-200 pointer-events-none" />
              <Input
                ref={searchRef}
                className="w-full pl-9 pr-20 h-10 rounded-xl text-sm bg-[#121821] border border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 focus-visible:ring-2 focus-visible:ring-[#00DFA9]/25 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
                placeholder="Search events, teams or leagues…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {search ? (
                  <button
                    onClick={clearSearch}
                    data-testid="button-clear-search"
                    className="p-1 rounded-md text-[#94A3B8]/60 hover:text-[#F8FAFC] hover:bg-[#253241]/60 transition-all duration-150"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="text-[9px] text-[#94A3B8]/40 bg-[#1E2A38] border border-[#253241] px-1.5 py-0.5 rounded font-mono pointer-events-none select-none">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>
          </div>

          {/* Sport carousel */}
          <div className="px-4 pb-2">
            <ScrollArea className="w-full">
              <div className="flex gap-1 w-max pb-1">
                {CAROUSEL_SPORTS.map(sport => {
                  const isActive = selectedSportId === sport.id;
                  return (
                    <button
                      key={sport.id}
                      onClick={() => onSelectSport(sport.id === selectedSportId ? null : sport.id)}
                      data-testid={`sport-tab-${sport.id}`}
                      className={cn(
                        'group flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl min-w-[68px] transition-all duration-200 select-none',
                        isActive
                          ? 'bg-[#18212B] ring-1 ring-[#00DFA9]/40 shadow-[0_0_16px_rgba(0,223,169,0.1)]'
                          : 'hover:bg-[#121821]/80'
                      )}
                    >
                      <span className="text-xl leading-none">{sport.icon}</span>
                      <span className={cn(
                        'text-[11px] font-medium leading-none transition-colors',
                        isActive ? 'text-[#00DFA9]' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                      )}>
                        {sport.name}
                      </span>
                      <span className={cn(
                        'text-[9px] font-semibold leading-none tabular-nums transition-colors',
                        isActive ? 'text-[#00DFA9]/60' : 'text-[#94A3B8]/35 group-hover:text-[#94A3B8]/60'
                      )}>
                        {sport.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>

          {/* Filter bar */}
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#121821] rounded-lg p-0.5 border border-[#253241] gap-0.5">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  data-testid={`filter-${f.id}`}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
                    dateFilter === f.id
                      ? 'bg-[#253241] text-[#F8FAFC] shadow-sm'
                      : 'text-[#94A3B8]/60 hover:text-[#F8FAFC]'
                  )}
                >
                  {f.label}
                  {f.id === 'today' && liveCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-[#EF4444]">
                      <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
                      {liveCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#253241] hidden sm:block" />

            {PROMO_PILLS.map(pill => {
              const isActive = selectedSportId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => onSelectSport(isActive ? null : pill.id)}
                  style={isActive ? { borderColor: `${pill.color}40`, color: pill.color, backgroundColor: `${pill.color}10` } : {}}
                  className={cn(
                    'hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                    !isActive && 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC] hover:border-[#2E3D50]'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}

            <button
              onClick={() => { onSelectSport(null); setDateFilter('all'); setSearch(''); }}
              className={cn(
                'hidden sm:flex px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                (!selectedSportId || selectedSportId === 'all')
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25'
                  : 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC]'
              )}
            >
              All Sports
            </button>

            {/* Results count — shows on the right when filtered */}
            {!isLoading && hasActiveFilter && (
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-[#94A3B8]/60 font-medium select-none">
                <span className="text-[#F8FAFC]/80 font-bold">{totalMatchCount}</span>
                <span>event{totalMatchCount !== 1 ? 's' : ''}</span>
                {filteredLeagues.length > 0 && (
                  <>
                    <span className="text-[#253241]">·</span>
                    <span>{filteredLeagues.length} league{filteredLeagues.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">

          {isLoading ? (
            /* ── Skeleton state ─────────────────────────────────── */
            <div className="space-y-3">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-16 rounded-full bg-[#1E2A38] animate-pulse" />
                    <div className="h-px w-8 bg-[#253241]" />
                  </div>
                </div>
                <div className="flex gap-3">
                  {[290, 290, 290].map((w, i) => (
                    <div key={i} className="rounded-xl bg-[#18212B] border border-[#253241]/60 animate-pulse" style={{ width: w, height: 160, flexShrink: 0 }} />
                  ))}
                </div>
              </div>
              <SkeletonLeague rows={4} cols={3} />
              <SkeletonLeague rows={3} cols={2} />
              <SkeletonLeague rows={2} cols={3} />
            </div>
          ) : (
            <>
              {showFeatured && <FeaturedCards />}
              {showFeatured && <PopularBets />}

              {/* Live heading */}
              {dateFilter === 'today' && liveCount > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#EF4444]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                    {liveCount} Live Now
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#EF4444]/20 to-transparent" />
                </div>
              )}

              {/* Search results heading */}
              {search.trim() && filteredLeagues.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-semibold text-[#94A3B8]/60 uppercase tracking-widest">
                    Results for
                  </span>
                  <span className="text-[11px] font-bold text-[#F8FAFC] bg-[#253241] px-2 py-0.5 rounded">&ldquo;{search}&rdquo;</span>
                  <div className="flex-1 h-px bg-[#253241]/50" />
                  <button
                    onClick={clearSearch}
                    className="text-[10px] font-medium text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors flex items-center gap-0.5"
                  >
                    Clear <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {filteredLeagues.length > 0 ? (
                  filteredLeagues.map(league => (
                    <LeagueSection key={league.id} league={league} />
                  ))
                ) : (
                  <NoResultsState search={search} onClear={clearSearch} onReset={() => { onSelectSport(null); setDateFilter('all'); setSearch(''); }} />
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Status bar ──────────────────────────────────────────────── */}
        {!isLoading && (
          <StatusBar
            matchCount={totalMatchCount}
            leagueCount={filteredLeagues.length}
            updatedAt={UPDATED_AT}
          />
        )}

      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// NO RESULTS STATE
// ────────────────────────────────────────────────────────────────────────────
function NoResultsState({
  search, onClear, onReset,
}: { search: string; onClear: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-[#121821] rounded-xl border border-[#253241]">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-3xl bg-[#38BDF8]/5 blur-2xl scale-[2]" />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-[#18212B] border border-[#253241] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <TrendingUp className="h-7 w-7 text-[#94A3B8]/30" />
        </div>
      </div>

      {search ? (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No matches found</p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            No events matching <span className="text-[#F8FAFC] font-medium">&ldquo;{search}&rdquo;</span>. Try a different team, league, or sport name.
          </p>
          <button
            onClick={onClear}
            data-testid="button-clear-search-empty"
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#00DFA9] text-[#0B0F14] text-sm font-bold hover:shadow-[0_0_20px_rgba(0,223,169,0.35)] transition-all duration-150"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-[#F8FAFC] mb-1.5">No events available</p>
          <p className="text-sm text-[#94A3B8]/70 mb-5 max-w-xs leading-relaxed">
            There are no events matching your current filters. Try a different date or sport.
          </p>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#121821] border border-[#253241] text-[#F8FAFC] text-sm font-semibold hover:bg-[#18212B] transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            Reset filters
          </button>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// STATUS BAR
// ────────────────────────────────────────────────────────────────────────────
function StatusBar({
  matchCount, leagueCount, updatedAt,
}: { matchCount: number; leagueCount: number; updatedAt: Date }) {
  const timeStr = updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mx-4 mb-6 mt-4 flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl bg-[#0A0E13] border border-[#253241]/40">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]/50 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_4px_rgba(0,223,169,0.7)]" />
          Live
        </span>
        <span className="text-[10px] text-[#253241]">|</span>
        <span className="text-[10px] text-[#94A3B8]/40 tabular-nums">
          <span className="text-[#94A3B8]/70 font-semibold">{matchCount}</span> event{matchCount !== 1 ? 's' : ''}
          {leagueCount > 0 && <> · <span className="text-[#94A3B8]/70 font-semibold">{leagueCount}</span> league{leagueCount !== 1 ? 's' : ''}</>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#94A3B8]/30">Odds updated {timeStr}</span>
        <span className="text-[10px] text-[#253241]">·</span>
        <span className="text-[10px] text-[#94A3B8]/30">All times local</span>
      </div>
    </div>
  );
}
