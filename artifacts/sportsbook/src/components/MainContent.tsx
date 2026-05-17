import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { SPORTS, LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { cn } from '../lib/utils';
import { Search } from 'lucide-react';
import { Input } from './ui/input';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const popularSports = SPORTS.filter(s => s.isPopular);
  
  const filteredLeagues = selectedSportId && selectedSportId !== 'all'
    ? LEAGUES.filter(l => l.sportId === selectedSportId)
    : LEAGUES;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#111111] overflow-hidden">
      <ScrollArea className="flex-1 h-[calc(100vh-3rem)]">
        <div className="relative">
          {/* Search Bar */}
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="w-full bg-[#1B352D] border-transparent rounded-full pl-9 h-10 focus-visible:ring-1 focus-visible:ring-[#00DFA9] text-white" 
                placeholder="Search events, teams or leagues..." 
              />
            </div>
          </div>

          {/* Icon Carousel */}
          <div className="px-4 mb-2">
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex space-x-4 w-max">
                {popularSports.map(sport => (
                  <button 
                    key={`icon-${sport.id}`}
                    onClick={() => onSelectSport(sport.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg min-w-[72px] transition-colors",
                      selectedSportId === sport.id ? "text-[#00DFA9]" : "text-white hover:bg-white/5"
                    )}
                  >
                    <span className="text-xl mb-1">{sport.icon}</span>
                    <span className="text-xs font-medium">{sport.name}</span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>
          </div>

          {/* Pill Tabs */}
          <div className="px-4 mb-4">
            <ScrollArea className="w-full whitespace-nowrap pb-2">
              <div className="flex space-x-2 w-max">
                <button
                  onClick={() => onSelectSport(null)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                    !selectedSportId || selectedSportId === 'all' 
                      ? "bg-[#1B352D] text-white" 
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  All Sports
                </button>
                {popularSports.map(sport => (
                  <button
                    key={`pill-${sport.id}`}
                    onClick={() => onSelectSport(sport.id)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-semibold transition-colors",
                      selectedSportId === sport.id
                        ? "bg-[#1B352D] text-white" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
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

        <div className="px-3 pb-8 max-w-[1200px] mx-auto">
          {(!selectedSportId || selectedSportId === 'all') && (
            <FeaturedCards />
          )}

          <div className="space-y-4">
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map(league => (
                <LeagueSection key={league.id} league={league} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-[#1B352D] rounded border border-white/5">
                <p>No matches available for this sport right now.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}