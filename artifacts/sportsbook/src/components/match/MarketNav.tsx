import { useRef, useEffect } from 'react';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketNavProps {
  groups:   MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function MarketNav({ groups, activeId, onSelect }: MarketNavProps) {
  const activeRef  = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeId]);

  const totalMarkets = groups.reduce((a, g) => a + g.markets.reduce((b, m) => b + m.selections.length, 0), 0);
  const allActive    = !activeId || activeId === groups[0]?.id;

  return (
    <div className="sticky top-0 z-10 border-b border-[#1E2D3D]"
      style={{ background: 'rgba(11,15,20,0.97)', backdropFilter: 'blur(12px)' }}>
      <ScrollArea className="w-full" ref={containerRef as React.Ref<HTMLDivElement>}>
        <div className="flex items-center gap-0.5 px-3 sm:px-4 h-11">

          {/* All Markets tab */}
          <NavTab
            label="All"
            icon="🎯"
            count={totalMarkets}
            isActive={allActive}
            ref={allActive ? activeRef : undefined}
            onClick={() => { if (groups[0]) onSelect(groups[0].id); }}
          />

          {/* Divider */}
          <div className="w-px h-4 bg-[#253241] mx-1.5 shrink-0" />

          {/* Per-group tabs */}
          {groups.map(group => {
            const isActive  = activeId === group.id;
            const totalSels = group.markets.reduce((a, m) => a + m.selections.length, 0);
            return (
              <NavTab
                key={group.id}
                label={group.name}
                icon={group.icon}
                count={totalSels}
                isActive={isActive}
                ref={isActive ? activeRef : undefined}
                onClick={() => onSelect(group.id)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible h-0" />
      </ScrollArea>
    </div>
  );
}

// ─── Individual nav tab ────────────────────────────────────────────────────────

import { forwardRef } from 'react';

const NavTab = forwardRef<HTMLButtonElement, {
  label:    string;
  icon:     string;
  count:    number;
  isActive: boolean;
  onClick:  () => void;
}>(({ label, icon, count, isActive, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={cn(
      'relative flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold whitespace-nowrap transition-colors duration-150 select-none shrink-0',
      isActive ? 'text-[#00DFA9]' : 'text-[#94A3B8]/70 hover:text-[#F8FAFC]'
    )}
  >
    <span className="text-[13px] leading-none">{icon}</span>
    <span>{label}</span>
    <span className={cn(
      'text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums transition-colors duration-150',
      isActive
        ? 'bg-[#00DFA9]/15 text-[#00DFA9]'
        : 'bg-[#1E2D3D] text-[#94A3B8]/50'
    )}>
      {count}
    </span>

    {/* Active underline */}
    {isActive && (
      <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
        style={{ background: 'linear-gradient(90deg, #00DFA9, #38BDF8)' }} />
    )}
  </button>
));
NavTab.displayName = 'NavTab';
