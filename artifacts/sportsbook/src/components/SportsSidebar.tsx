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
    <aside className={cn("w-64 flex-col bg-[#1B352D] border-r border-[#111111] h-[calc(100vh-3rem)] sticky top-12 hidden lg:flex", className)}>
      <ScrollArea className="flex-1 px-2 py-3">
        <div className="space-y-4">
          
          {/* Trending Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-bold uppercase tracking-wider text-[#00DFA9] mb-1">
              <TrendingUp className="mr-2 h-3 w-3" /> Trending
            </h3>
            <div className="space-y-0.5">
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
            <h3 className="flex items-center px-3 text-[10px] font-bold uppercase tracking-wider text-[#00DFA9] mb-1">
              <Trophy className="mr-2 h-3 w-3" /> Most Used
            </h3>
            <div className="space-y-0.5">
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
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#13644B] mb-1">
              A-Z Sports
            </h3>
            <div className="space-y-0.5">
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
        "flex w-full items-center px-3 py-1 text-sm font-medium transition-colors border-l-2",
        isActive 
          ? "border-[#00DFA9] text-[#00DFA9]" 
          : "border-transparent text-white/80 hover:text-white hover:bg-white/5"
      )}
    >
      <span className="mr-2 text-sm" aria-hidden="true">{icon}</span>
      {title}
    </button>
  );
}