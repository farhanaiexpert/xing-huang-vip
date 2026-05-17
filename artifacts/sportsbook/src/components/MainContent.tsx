import { useState } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { SPORTS, LEAGUES } from '../data/mockData';
import { LeagueSection } from './LeagueSection';
import { FeaturedCards } from './FeaturedCards';
import { cn } from '../lib/utils';

interface MainContentProps {
  selectedSportId: string | null;
  onSelectSport: (id: string | null) => void;
}

export function MainContent({ selectedSportId, onSelectSport }: MainContentProps) {
  const popularSports = SPORTS.filter(s => s.isPopular);
  
  // Also include the selected sport in the tabs if it's not popular
  const activeTabSports = [...popularSports];
  if (selectedSportId && !popularSports.some(s => s.id === selectedSportId)) {
    const selectedSport = SPORTS.find(s => s.id === selectedSportId);
    if (selectedSport) {
      activeTabSports.push(selectedSport);
    }
  }

  // Filter leagues based on selected sport
  const filteredLeagues = selectedSportId && selectedSportId !== 'all'
    ? LEAGUES.filter(l => l.sportId === selectedSportId)
    : LEAGUES;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur border-b border-border">
        <ScrollArea className="w-full">
          <Tabs 
            value={selectedSportId || 'all'} 
            onValueChange={(val) => onSelectSport(val === 'all' ? null : val)}
            className="w-full px-4 py-2"
          >
            <TabsList className="h-10 bg-transparent p-0 justify-start w-max">
              <TabsTrigger 
                value="all" 
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 font-semibold",
                  !selectedSportId && "border-b-2 border-primary text-primary"
                )}
              >
                All Sports
              </TabsTrigger>
              {activeTabSports.map((sport) => (
                <TabsTrigger 
                  key={`tab-${sport.id}`} 
                  value={sport.id}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 font-semibold"
                >
                  <span className="mr-2" aria-hidden="true">{sport.icon}</span>
                  {sport.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-8.5rem)]">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto">
          {(!selectedSportId || selectedSportId === 'all') && (
            <FeaturedCards />
          )}

          <div className="space-y-6">
            {filteredLeagues.length > 0 ? (
              filteredLeagues.map(league => (
                <LeagueSection key={league.id} league={league} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-[#1B352D]/30 rounded-lg border border-border">
                <p>No matches available for this sport right now.</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
