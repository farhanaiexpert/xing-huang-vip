import { ScrollArea } from './ui/scroll-area';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';
import { Trophy, TrendingUp, List } from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

export function SportsSidebar({ selectedSportId, onSelectSport, className }: SportsSidebarProps) {
  const popularSports = SPORTS.filter(s => s.isPopular);
  const allSports = [...SPORTS].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <aside className={cn("w-60 flex-col bg-[#0B0F14] border-r border-[#253241] h-[calc(100vh-3.5rem)] sticky top-14 hidden lg:flex", className)}>
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          
          {/* Trending Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
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

          <div className="h-[1px] bg-[#253241] mx-3"></div>

          {/* Most Used Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
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

          <div className="h-[1px] bg-[#253241] mx-3"></div>

          {/* A-Z Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              <List className="mr-2 h-3 w-3" /> A-Z Sports
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
        "flex w-full items-center px-3 py-1.5 text-sm transition-colors rounded-md group",
        isActive 
          ? "bg-[#121821] text-[#00DFA9] font-medium" 
          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]"
      )}
    >
      <div className="flex items-center w-4 h-full shrink-0 mr-1.5 relative">
        {isActive && (
          <div className="absolute -left-1 w-1.5 h-1.5 bg-[#00DFA9] rounded-full"></div>
        )}
        <span className="text-sm" aria-hidden="true">{icon}</span>
      </div>
      {title}
    </button>
  );
}