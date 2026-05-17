import { ScrollArea } from './ui/scroll-area';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';
import { Trophy, TrendingUp } from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

export function SportsSidebar({ selectedSportId, onSelectSport, className }: SportsSidebarProps) {
  const popularSports = SPORTS.filter(s => s.isPopular);
  const allSports = [...SPORTS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <aside className={cn("w-56 lg:w-64 flex-col bg-[#1B352D] border-r border-border h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex", className)}>
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          
          {/* Trending Section */}
          <div>
            <h3 className="flex items-center px-2 text-xs font-bold uppercase tracking-wider text-[#13644B] mb-2">
              <TrendingUp className="mr-2 h-4 w-4" /> Trending
            </h3>
            <div className="space-y-1">
              <SidebarItem title="Weekend Soccer" icon="⚽" />
              <SidebarItem title="ATP/WTA Rome" icon="🎾" />
              <SidebarItem title="Italy Serie A" icon="⚽" />
              <SidebarItem title="Next Races" icon="🏇" />
              <SidebarItem title="Spain La Liga" icon="⚽" />
              <SidebarItem title="NBA Play-Offs" icon="🏀" />
            </div>
          </div>

          {/* Most Used Section */}
          <div>
            <h3 className="flex items-center px-2 text-xs font-bold uppercase tracking-wider text-[#13644B] mb-2">
              <Trophy className="mr-2 h-4 w-4" /> Most Used
            </h3>
            <div className="space-y-1">
              {popularSports.map(sport => (
                <SidebarItem 
                  key={`popular-${sport.id}`}
                  title={sport.name} 
                  icon={sport.icon} 
                  isActive={selectedSportId === sport.id}
                  onClick={() => onSelectSport(sport.id)}
                />
              ))}
            </div>
          </div>

          {/* A-Z Section */}
          <div>
            <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              A-Z Sports
            </h3>
            <div className="space-y-1">
              {allSports.map(sport => (
                <SidebarItem 
                  key={`az-${sport.id}`}
                  title={sport.name} 
                  icon={sport.icon} 
                  isActive={selectedSportId === sport.id}
                  onClick={() => onSelectSport(sport.id)}
                />
              ))}
            </div>
          </div>
          
        </div>
      </ScrollArea>
    </aside>
  );
}

function SidebarItem({ 
  title, 
  icon, 
  isActive, 
  onClick 
}: { 
  title: string; 
  icon: string; 
  isActive?: boolean; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        isActive 
          ? "bg-primary/10 text-primary" 
          : "text-foreground/80 hover:bg-white/5 hover:text-foreground"
      )}
    >
      <span className="mr-3 text-base" aria-hidden="true">{icon}</span>
      {title}
    </button>
  );
}
