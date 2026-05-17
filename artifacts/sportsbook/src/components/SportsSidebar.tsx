import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { SPORTS } from '../data/mockData';
import { cn } from '../lib/utils';
import { TrendingUp, Star, AlignLeft, ChevronRight } from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

const TRENDING_ITEMS = [
  { title: 'Weekend Soccer', icon: '⚽', count: 278 },
  { title: 'ATP/WTA Rome', icon: '🎾', count: 449 },
  { title: 'Italy Serie A', icon: '⚽', count: 228 },
  { title: 'Next Races', icon: '🏇', count: 195 },
  { title: 'Spain La Liga', icon: '⚽', count: 183 },
  { title: 'NBA Play-Offs', icon: '🏀', count: 156 },
];

const MAX_COUNT = 449;

function TrendBar({ count }: { count: number }) {
  const pct = count / MAX_COUNT;
  const heights = [5, 8, 12];
  return (
    <div className="flex items-end gap-[2px] h-3 shrink-0">
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}px`, opacity: 0.35 + pct * 0.65 }}
          className="w-[3px] rounded-sm bg-[#00DFA9]"
        />
      ))}
    </div>
  );
}

export function SportsSidebar({ selectedSportId, onSelectSport, className }: SportsSidebarProps) {
  const [showAllAZ, setShowAllAZ] = useState(false);
  const popularSports = SPORTS.filter(s => s.isPopular);
  const allSports = [...SPORTS].sort((a, b) => a.name.localeCompare(b.name));
  const displayedAZ = showAllAZ ? allSports : allSports.slice(0, 8);

  return (
    <aside className={cn(
      "w-[220px] shrink-0 flex-col h-[calc(100vh-3.5rem)] sticky top-14 hidden lg:flex",
      "bg-[#0A0E13] border-r border-[#253241]",
      className
    )}>
      <ScrollArea className="flex-1">
        <div className="py-3">

          {/* Trending */}
          <SectionLabel icon={<TrendingUp className="h-3 w-3" />} label="Trending" />
          <div className="mt-1 mb-4">
            {TRENDING_ITEMS.map((item) => (
              <TrendingItem key={item.title} title={item.title} icon={item.icon} count={item.count} />
            ))}
          </div>

          <SectionDivider />

          {/* Most Used */}
          <SectionLabel icon={<Star className="h-3 w-3" />} label="Most Used" />
          <div className="mt-1 mb-4">
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

          <SectionDivider />

          {/* A-Z */}
          <SectionLabel icon={<AlignLeft className="h-3 w-3" />} label="A–Z Sports" />
          <div className="mt-1">
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

          <div className="px-4 pt-2 pb-5">
            <button
              onClick={() => setShowAllAZ(!showAllAZ)}
              data-testid="toggle-az-sports"
              className="
                w-full text-center text-[11px] font-medium text-[#38BDF8]
                py-1.5 rounded-md
                hover:bg-[#38BDF8]/8 hover:text-[#38BDF8]
                transition-colors duration-150
              "
            >
              {showAllAZ ? '↑ Show less' : '↓ Show all sports'}
            </button>
          </div>

        </div>
      </ScrollArea>
    </aside>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 mb-1">
      <span className="text-[#38BDF8]/60">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]/50">
        {label}
      </span>
    </div>
  );
}

function SectionDivider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-[#253241] to-transparent mx-4 mb-4" />
  );
}

function TrendingItem({ title, icon, count }: { title: string; icon: string; count: number }) {
  return (
    <button className="
      group flex w-full items-center gap-2.5
      px-4 py-[7px]
      text-[#94A3B8] hover:text-[#F8FAFC]
      hover:bg-[#121821]/80
      transition-all duration-150 text-left
    ">
      <span className="text-sm shrink-0">{icon}</span>
      <span className="text-[13px] font-medium truncate flex-1">{title}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-[#94A3B8]/40 group-hover:text-[#94A3B8]/80 transition-colors tabular-nums">
          {count}
        </span>
        <TrendBar count={count} />
      </div>
    </button>
  );
}

function SidebarItem({
  title,
  icon,
  isActive,
  onClick,
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
        "group relative flex w-full items-center gap-2.5 px-4 py-[7px] text-left transition-all duration-150",
        isActive
          ? "text-[#00DFA9] bg-[#00DFA9]/8 font-semibold"
          : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]/80"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.7)]" />
      )}
      <span className="text-sm shrink-0">{icon}</span>
      <span className="text-[13px] truncate flex-1">{title}</span>
      <ChevronRight className={cn(
        "h-3 w-3 shrink-0 transition-all duration-150",
        isActive
          ? "text-[#00DFA9] opacity-100"
          : "opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0"
      )} />
    </button>
  );
}
