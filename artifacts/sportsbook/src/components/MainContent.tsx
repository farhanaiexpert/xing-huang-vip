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
  { id: 'soccer', name: 'Soccer', icon: '⚽' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'esports', name: 'Esports', icon: '🎮' },
  { id: 'horse-racing', name: 'Horse Racing', icon: '🏇' },
  { id: 'formula-1', name: 'Formula 1', icon: '🏎️' },
  { id: 'boxing', name: 'Boxing', icon: '🥊' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'darts', name: 'Darts', icon: '🎯' },
  { id: 'ice-hockey', name: 'Ice Hockey', icon: '🏒' },
  { id: 'mma', name: 'MMA', icon: '🥋' },
  { id: 'nba', name: 'NBA', icon: '🏀' },
  { id: 'american-football', name: 'American Football', icon: '🏈' }
];

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const filteredLeagues = selectedSportId && selectedSportId !== 'all' && selectedSportId !== 'early-payout' && selectedSportId !== 'acca-boost'
    ? LEAGUES.filter(l => l.sportId === selectedSportId)
    : LEAGUES;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0F14] overflow-hidden">
      <ScrollArea className="flex-1 h-[calc(100vh-3.5rem)]">
        <div className="relative">
          {/* Search Bar */}
          <div className="px-4 pt-4 pb-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] transition-colors group-focus-within:text-[#00DFA9]" />
              <Input 
                className="w-full bg-[#121821] border border-[#253241] rounded-xl pl-9 pr-12 h-10 transition-all focus-visible:ring-2 focus-visible:ring-[#00DFA9]/40 focus-visible:border-[#00DFA9]/60 text-[#F8FAFC] placeholder:text-[#94A3B8]" 
                placeholder="Search events, teams or leagues..." 
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8] bg-[#253241] px-1.5 py-0.5 rounded pointer-events-none">
                ⌘K
              </div>
            </div>
          </div>

          {/* Icon Carousel */}
          <div className="px-4 py-2">
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex space-x-2 w-max">
                {CAROUSEL_SPORTS.map(sport => (
                  <button 
                    key={`icon-${sport.id}`}
                    onClick={() => onSelectSport(sport.id)}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-2 rounded-xl min-w-[72px] transition-colors group",
                      selectedSportId === sport.id 
                        ? "bg-[#121821] text-[#00DFA9] ring-1 ring-[#00DFA9]/50" 
                        : "bg-transparent hover:bg-[#121821] text-[#F8FAFC]"
                    )}
                  >
                    <span className="text-xl mb-1">{sport.icon}</span>
                    <span className={cn(
                      "text-[11px] font-medium transition-colors", 
                      selectedSportId === sport.id ? "text-[#00DFA9]" : "text-[#94A3B8] group-hover:text-[#F8FAFC]"
                    )}>
                      {sport.name}
                    </span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>

          {/* Pill Tabs */}
          <div className="px-4 pb-3">
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex items-center space-x-2 w-max">
                <button
                  onClick={() => onSelectSport(null)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    !selectedSportId || selectedSportId === 'all' 
                      ? "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold" 
                      : "bg-transparent text-[#94A3B8] hover:bg-[#121821] hover:text-[#F8FAFC] font-medium"
                  )}
                >
                  All Sports
                </button>

                <button
                  onClick={() => onSelectSport('early-payout')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors uppercase tracking-wide",
                    selectedSportId === 'early-payout'
                      ? "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-bold" 
                      : "bg-[#121821]/50 text-[#38BDF8]/80 hover:bg-[#121821] hover:text-[#38BDF8] font-semibold border border-[#38BDF8]/20"
                  )}
                >
                  Early Payout
                </button>

                <button
                  onClick={() => onSelectSport('acca-boost')}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors uppercase tracking-wide",
                    selectedSportId === 'acca-boost'
                      ? "bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/30 font-bold" 
                      : "bg-[#121821]/50 text-[#00DFA9]/80 hover:bg-[#121821] hover:text-[#00DFA9] font-semibold border border-[#00DFA9]/20"
                  )}
                >
                  Acca Boost
                </button>

                <div className="w-[1px] h-4 bg-[#253241] mx-1"></div>

                {CAROUSEL_SPORTS.slice(0, 5).map(sport => (
                  <button
                    key={`pill-${sport.id}`}
                    onClick={() => onSelectSport(sport.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs transition-colors",
                      selectedSportId === sport.id
                        ? "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 font-semibold" 
                        : "bg-transparent text-[#94A3B8] hover:bg-[#121821] hover:text-[#F8FAFC] font-medium"
                    )}
                  >
                    {sport.name}
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>
        </div>

        <div className="px-4 pb-8 max-w-[1200px] mx-auto">
          {(!selectedSportId || selectedSportId === 'all') && (
            <FeaturedCards />
          )}

          <div className="space-y-3">
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map(league => (
                <LeagueSection key={league.id} league={league} />
              ))
            ) : (
              <div className="text-center py-12 text-[#94A3B8] bg-[#121821] rounded-xl border border-[#253241]">
                <p>No matches available for this selection right now.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
