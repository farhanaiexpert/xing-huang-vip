import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketNavProps {
  groups: MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  popular:  'Popular',
  goals:    'Goals',
  result:   'Match Result',
  handicap: 'Handicap',
  specials: 'Correct Score',
  players:  'Goal Scorer',
  maps:     'Map Winner',
  sets:     'Set Betting',
  quarters: 'Quarters',
  runners:  'Runners',
};

export function MarketNav({ groups, activeId, onSelect }: MarketNavProps) {
  return (
    <div className="sticky top-0 z-10 bg-[#0B0F14]/97 backdrop-blur-sm border-b border-[#253241]/60">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 px-4 py-2 w-max">
          {groups.map(group => {
            const isActive = activeId === group.id;
            const totalSels = group.markets.reduce((a, m) => a + m.selections.length, 0);
            return (
              <button
                key={group.id}
                onClick={() => onSelect(group.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 select-none',
                  isActive
                    ? 'bg-[#00DFA9]/10 text-[#00DFA9] border border-[#00DFA9]/30 shadow-[0_0_12px_rgba(0,223,169,0.1)]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821] border border-transparent'
                )}
              >
                <span className="text-sm leading-none">{group.icon}</span>
                {group.name}
                <span className={cn(
                  'text-[9px] font-bold px-1 py-0.5 rounded tabular-nums',
                  isActive ? 'bg-[#00DFA9]/20 text-[#00DFA9]' : 'bg-[#253241] text-[#94A3B8]/60'
                )}>
                  {totalSels}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
