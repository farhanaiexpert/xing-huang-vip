import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { cn } from '../lib/utils';
import { Search } from 'lucide-react';
import { Input } from './ui/input';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

const CAROUSEL_SPORTS = [
  { id: 'soccer',           name: 'Soccer',           icon: '⚽', count: 284 },
  { id: 'tennis',           name: 'Tennis',           icon: '🎾', count: 96  },
  { id: 'basketball',       name: 'Basketball',       icon: '🏀', count: 42  },
  { id: 'cricket',          name: 'Cricket',          icon: '🏏', count: 18  },
  { id: 'esports',          name: 'Esports',          icon: '🎮', count: 63  },
  { id: 'horse-racing',     name: 'Horse Racing',     icon: '🏇', count: 195 },
  { id: 'formula-1',        name: 'Formula 1',        icon: '🏎️', count: 12  },
  { id: 'boxing',           name: 'Boxing',           icon: '🥊', count: 8   },
  { id: 'golf',             name: 'Golf',             icon: '⛳', count: 24  },
  { id: 'darts',            name: 'Darts',            icon: '🎯', count: 31  },
  { id: 'ice-hockey',       name: 'Ice Hockey',       icon: '🏒', count: 54  },
  { id: 'mma',              name: 'MMA',              icon: '🥋', count: 14  },
  { id: 'nba',              name: 'NBA',              icon: '🏀', count: 22  },
  { id: 'american-football',name: 'NFL',              icon: '🏈', count: 16  },
];

const PILL_TABS = [
  { id: null,           label: 'All Sports'   },
  { id: 'early-payout', label: 'Early Payout' },
  { id: 'acca-boost',   label: 'Acca Boost'   },
];

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const filteredLeagues =
    selectedSportId &&
    selectedSportId !== 'all' &&
    selectedSportId !== 'early-payout' &&
    selectedSportId !== 'acca-boost'
      ? LEAGUES.filter(l => l.sportId === selectedSportId)
      : LEAGUES;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">

        {/* ── Sticky top controls ── */}
        <div className="sticky top-0 z-10 bg-[#0B0F14]/95 backdrop-blur-sm border-b border-[#253241]/60">

          {/* Search */}
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/60 group-focus-within:text-[#00DFA9] transition-colors duration-200" />
              <Input
                className="
                  w-full pl-9 pr-14 h-10 rounded-xl text-sm
                  bg-[#121821] border border-[#253241]
                  text-[#F8FAFC] placeholder:text-[#94A3B8]/50
                  focus-visible:ring-2 focus-visible:ring-[#00DFA9]/30
                  focus-visible:border-[#00DFA9]/50
                  transition-all duration-200
                "
                placeholder="Search events, teams or leagues…"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                <kbd className="text-[9px] text-[#94A3B8]/60 bg-[#253241] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </div>
            </div>
          </div>

          {/* Sport icon carousel */}
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
                        "group flex flex-col items-center justify-center gap-1 py-2 px-2.5 rounded-xl min-w-[72px] transition-all duration-200",
                        isActive
                          ? "bg-[#121821] ring-1 ring-[#00DFA9]/50 shadow-[0_0_12px_rgba(0,223,169,0.15)]"
                          : "hover:bg-[#121821]/80"
                      )}
                    >
                      <span className="text-xl leading-none">{sport.icon}</span>
                      <span className={cn(
                        "text-[11px] font-medium leading-none transition-colors",
                        isActive ? "text-[#00DFA9]" : "text-[#94A3B8] group-hover:text-[#F8FAFC]"
                      )}>
                        {sport.name}
                      </span>
                      {/* Market count */}
                      <span className={cn(
                        "text-[9px] font-semibold leading-none tabular-nums transition-colors",
                        isActive ? "text-[#00DFA9]/70" : "text-[#94A3B8]/40 group-hover:text-[#94A3B8]/70"
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

          {/* Pill filter tabs */}
          <div className="px-4 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {PILL_TABS.map(tab => {
              const isActive = tab.id === null
                ? !selectedSportId || selectedSportId === 'all'
                : selectedSportId === tab.id;
              return (
                <button
                  key={String(tab.id)}
                  onClick={() => onSelectSport(tab.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
                    isActive
                      ? tab.id === 'acca-boost'
                        ? "bg-[#00DFA9]/10 text-[#00DFA9] border-[#00DFA9]/30"
                        : "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30"
                      : "bg-transparent text-[#94A3B8] border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC] hover:border-[#2E3D50]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}

            <div className="h-4 w-px bg-[#253241] mx-0.5 shrink-0" />

            {CAROUSEL_SPORTS.slice(0, 5).map(sport => {
              const isActive = selectedSportId === sport.id;
              return (
                <button
                  key={`pill-${sport.id}`}
                  onClick={() => onSelectSport(sport.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 border",
                    isActive
                      ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30"
                      : "bg-transparent text-[#94A3B8] border-transparent hover:border-[#253241] hover:bg-[#121821] hover:text-[#F8FAFC]"
                  )}
                >
                  {sport.icon} {sport.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="px-4 pt-4 pb-10">
          {(!selectedSportId || selectedSportId === 'all') && <FeaturedCards />}

          <div className="space-y-2.5">
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map(league => (
                <LeagueSection key={league.id} league={league} />
              ))
            ) : (
              <div className="text-center py-16 text-[#94A3B8] bg-[#121821] rounded-xl border border-[#253241]">
                <p className="text-sm">No matches available for this selection right now.</p>
              </div>
            )}
          </div>
        </div>

      </ScrollArea>
    </div>
  );
}
