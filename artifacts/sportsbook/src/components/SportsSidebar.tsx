import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';
import { Trophy, TrendingUp, List, ChevronRight, Star } from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

export function SportsSidebar({ selectedSportId, onSelectSport, className }: SportsSidebarProps) {
  const [showAllAZ, setShowAllAZ] = useState(false);
  const popularSports = SPORTS.filter(s => s.isPopular);
  const allSports = [...SPORTS].sort((a, b) => a.name.localeCompare(b.name));
  
  const displayedAZ = showAllAZ ? allSports : allSports.slice(0, 6);

  return (
    <aside className={cn("w-60 flex-col bg-[#0B0F14] border-r border-[#253241] shadow-[1px_0_0_#253241] h-[calc(100vh-3.5rem)] sticky top-14 hidden lg:flex", className)}>
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          
          {/* Trending Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              <TrendingUp className="mr-2 h-3 w-3 text-[#38BDF8]" /> Trending
            </h3>
            <div className="space-y-0.5">
              <SidebarItem title="Weekend Soccer" icon="⚽" rightBadge="278" />
              <SidebarItem title="ATP/WTA Rome" icon="🎾" rightBadge="449" />
              <SidebarItem title="Italy Serie A" icon="⚽" rightBadge="228" />
              <SidebarItem title="Next Races" icon="🏇" rightBadge="195" />
              <SidebarItem title="Spain La Liga" icon="⚽" rightBadge="183" />
              <SidebarItem title="NBA Play-Offs" icon="🏀" rightBadge="156" />
            </div>
          </div>

          <div className="border-t border-[#253241] my-2 mx-3"></div>

          {/* Most Used Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              <Star className="mr-2 h-3 w-3 text-[#38BDF8]" /> Most Used
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

          <div className="border-t border-[#253241] my-2 mx-3"></div>

          {/* A-Z Section */}
          <div>
            <h3 className="flex items-center px-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8] mb-2">
              <List className="mr-2 h-3 w-3 text-[#38BDF8]" /> A-Z Sports
            </h3>
            <div className="space-y-0.5">
              {displayedAZ.map(sport => (
                <SidebarItem 
                  key={`az-${sport.id}`}
                  title={sport.name} 
                  icon={sport.icon} 
                  isActive={selectedSportId === sport.id}
                  onClick={() => onSelectSport(sport.id)}
                />
              ))}
            </div>
            
            <div className="px-3 mt-2">
              <button 
                onClick={() => setShowAllAZ(!showAllAZ)}
                className="text-xs text-[#38BDF8] hover:underline hover:text-[#38BDF8]/80 transition-colors"
                data-testid="toggle-az-sports"
              >
                {showAllAZ ? "Show less" : "Show all"}
              </button>
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
  onClick,
  rightBadge
}: { 
  title: string; 
  icon: string; 
  isActive?: boolean; 
  onClick?: () => void;
  rightBadge?: string | number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center px-3 py-1.5 text-sm transition-colors rounded-lg group",
        isActive 
          ? "bg-[#00DFA9]/10 text-[#00DFA9] font-medium" 
          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mr-2 transition-opacity", isActive ? "bg-[#00DFA9] opacity-100" : "opacity-0")}></div>
      <span className="text-sm mr-2" aria-hidden="true">{icon}</span>
      <span className="truncate">{title}</span>
      
      {rightBadge ? (
        <span className="ml-auto text-[10px] text-[#94A3B8] group-hover:text-[#F8FAFC] transition-colors">{rightBadge}</span>
      ) : (
        <ChevronRight className="ml-auto h-3 w-3 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
