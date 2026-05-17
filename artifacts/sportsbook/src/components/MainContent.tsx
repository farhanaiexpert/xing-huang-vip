import { useState, useMemo } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { cn } from '../lib/utils';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { League } from '../types';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'upcoming';

const CAROUSEL_SPORTS = [
  { id: 'soccer',            name: 'Soccer',           icon: '⚽', count: 284 },
  { id: 'tennis',            name: 'Tennis',           icon: '🎾', count: 96  },
  { id: 'basketball',        name: 'Basketball',       icon: '🏀', count: 42  },
  { id: 'cricket',           name: 'Cricket',          icon: '🏏', count: 18  },
  { id: 'esports',           name: 'Esports',          icon: '🎮', count: 63  },
  { id: 'horse-racing',      name: 'Horse Racing',     icon: '🏇', count: 195 },
  { id: 'formula-1',         name: 'Formula 1',        icon: '🏎️', count: 12  },
  { id: 'boxing',            name: 'Boxing',           icon: '🥊', count: 8   },
  { id: 'golf',              name: 'Golf',             icon: '⛳', count: 24  },
  { id: 'darts',             name: 'Darts',            icon: '🎯', count: 31  },
  { id: 'ice-hockey',        name: 'Ice Hockey',       icon: '🏒', count: 54  },
  { id: 'mma',               name: 'MMA',              icon: '🥋', count: 14  },
  { id: 'nba',               name: 'NBA',              icon: '🏀', count: 22  },
  { id: 'american-football', name: 'NFL',              icon: '🏈', count: 16  },
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

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [search, setSearch] = useState('');

  // Count live matches for the Today badge
  const liveCount = useMemo(
    () => LEAGUES.flatMap(l => l.matches).filter(m => m.isLive).length,
    []
  );

  // Build filtered league list
  const filteredLeagues = useMemo<League[]>(() => {
    let leagues = LEAGUES;

    // Sport filter
    if (selectedSportId && !['all','early-payout','acca-boost'].includes(selectedSportId)) {
      leagues = leagues.filter(l => l.sportId === selectedSportId);
    }

    // Date filter — filter matches inside each league, then drop empty leagues
    if (dateFilter !== 'all') {
      leagues = leagues
        .map(league => ({
          ...league,
          matches: league.matches.filter(m => m.dateTag === dateFilter),
        }))
        .filter(league => league.matches.length > 0);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      leagues = leagues
        .map(league => ({
          ...league,
          matches: league.matches.filter(
            m =>
              m.team1.toLowerCase().includes(q) ||
              m.team2.toLowerCase().includes(q) ||
              league.name.toLowerCase().includes(q)
          ),
        }))
        .filter(league => league.matches.length > 0);
    }

    return leagues;
  }, [selectedSportId, dateFilter, search]);

  const showFeatured = !selectedSportId || selectedSportId === 'all' || selectedSportId === 'early-payout' || selectedSportId === 'acca-boost';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">

        {/* ── Sticky controls ─────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-[#0B0F14]/95 backdrop-blur-sm border-b border-[#253241]/60">

          {/* Search */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/60 group-focus-within:text-[#00DFA9] transition-colors duration-200" />
              <Input
                className="w-full pl-9 pr-14 h-10 rounded-xl text-sm bg-[#121821] border border-[#253241] text-[#F8FAFC] placeholder:text-[#94A3B8]/50 focus-visible:ring-2 focus-visible:ring-[#00DFA9]/30 focus-visible:border-[#00DFA9]/50 transition-all duration-200"
                placeholder="Search events, teams or leagues…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="text-[9px] text-[#94A3B8]/50 bg-[#253241] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Sport carousel */}
          <div className="px-4 pb-2">
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 w-max pb-1">
                {CAROUSEL_SPORTS.map(sport => {
                  const isActive = selectedSportId === sport.id;
                  return (
                    <button
                      key={`icon-${sport.id}`}
                      onClick={() => onSelectSport(sport.id)}
                      className={cn(
                        'group flex flex-col items-center justify-center gap-1 py-2 px-2.5 rounded-xl min-w-[72px] transition-all duration-200',
                        isActive
                          ? 'bg-[#121821] ring-1 ring-[#00DFA9]/50 shadow-[0_0_12px_rgba(0,223,169,0.12)]'
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
                        isActive ? 'text-[#00DFA9]/70' : 'text-[#94A3B8]/40 group-hover:text-[#94A3B8]/70'
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

          {/* Filter bar: date tabs + promo pills */}
          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            {/* Date filter tabs */}
            <div className="flex items-center bg-[#121821] rounded-lg p-0.5 border border-[#253241] gap-0.5">
              {DATE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
                    dateFilter === f.id
                      ? 'bg-[#253241] text-[#F8FAFC]'
                      : 'text-[#94A3B8]/70 hover:text-[#F8FAFC]'
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

            <div className="h-4 w-px bg-[#253241]" />

            {/* Promo pills */}
            {PROMO_PILLS.map(pill => {
              const isActive = selectedSportId === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => onSelectSport(pill.id)}
                  style={isActive ? { borderColor: `${pill.color}40`, color: pill.color, backgroundColor: `${pill.color}10` } : {}}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                    isActive
                      ? 'shadow-sm'
                      : 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC] hover:border-[#2E3D50]'
                  )}
                >
                  {pill.label}
                </button>
              );
            })}

            {/* All sports pill */}
            <button
              onClick={() => onSelectSport(null)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                (!selectedSportId || selectedSportId === 'all')
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30'
                  : 'bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC]'
              )}
            >
              All Sports
            </button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-10">
          {showFeatured && dateFilter === 'all' && <FeaturedCards />}

          {/* Live section heading when on Today filter */}
          {dateFilter === 'today' && liveCount > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#EF4444]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                {liveCount} Live Now
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-[#EF4444]/20 to-transparent" />
            </div>
          )}

          <div className="space-y-2.5">
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map(league => (
                <LeagueSection key={league.id} league={league} />
              ))
            ) : (
              <div className="text-center py-16 bg-[#121821] rounded-xl border border-[#253241]">
                <p className="text-sm text-[#94A3B8]">
                  {search ? `No matches found for "${search}"` : 'No matches for this selection.'}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-2 text-xs text-[#38BDF8] hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </ScrollArea>
    </div>
  );
}
