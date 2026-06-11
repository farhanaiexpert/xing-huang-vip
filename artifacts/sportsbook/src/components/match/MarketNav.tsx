import { useRef, useEffect, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketNavProps {
  groups:   MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function MarketNav({ groups, activeId, onSelect }: MarketNavProps) {
  const navScrollRef  = useRef<HTMLDivElement | null>(null);
  const buttonRefs    = useRef<Record<string, HTMLButtonElement | null>>({});

  // Keep active tab centred in the nav strip
  useEffect(() => {
    const btn = activeId ? buttonRefs.current[activeId] : null;
    const nav = navScrollRef.current;
    if (!btn || !nav) return;
    const targetLeft = btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeId]);

  return (
    <div
      className="sticky top-0 z-20 border-b border-[#1A2433]/80"
      style={{ background: 'rgba(11,15,20,0.97)', backdropFilter: 'blur(16px)' }}
    >
      {/* Scrollable pill strip */}
      <div
        ref={navScrollRef}
        className="flex items-center gap-1.5 px-3 sm:px-4 h-[54px] overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {groups.map(group => {
          const isActive  = activeId === group.id;
          const count     = group.markets.reduce((a, m) => a + m.selections.length, 0);
          if (count === 0) return null; // hide empty groups
          return (
            <NavPill
              key={group.id}
              ref={el => { buttonRefs.current[group.id] = el; }}
              label={group.name}
              icon={group.icon}
              count={count}
              isActive={isActive}
              onClick={() => onSelect(group.id)}
            />
          );
        })}
      </div>

      {/* Bottom fade – signals more content is scrollable */}
      <div
        className="absolute right-0 top-0 h-full w-12 pointer-events-none"
        style={{
          background: 'linear-gradient(to left, rgba(11,15,20,0.9) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ─── Individual pill tab ───────────────────────────────────────────────────────

const NavPill = forwardRef<
  HTMLButtonElement,
  { label: string; icon: string; count: number; isActive: boolean; onClick: () => void }
>(({ label, icon, count, isActive, onClick }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    className={cn(
      'relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold',
      'whitespace-nowrap transition-all duration-200 select-none shrink-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DFA9]/40',
      isActive
        ? 'bg-[#00DFA9]/12 text-[#00DFA9] border border-[#00DFA9]/30 shadow-[0_0_12px_rgba(0,223,169,0.18)]'
        : 'text-[#94A3B8]/65 border border-transparent hover:text-[#F0F6FF] hover:bg-[#1A2433]/80 hover:border-[#253241]'
    )}
  >
    {/* Icon */}
    <span className="text-[15px] leading-none">{icon}</span>

    {/* Label */}
    <span className="leading-none">{label}</span>

    {/* Count badge */}
    <span
      className={cn(
        'text-[10px] font-bold px-1.5 py-[3px] rounded-full tabular-nums leading-none transition-colors duration-150',
        isActive
          ? 'bg-[#00DFA9]/20 text-[#00DFA9]'
          : 'bg-[#1A2433] text-[#94A3B8]/45'
      )}
    >
      {count}
    </span>
  </button>
));
NavPill.displayName = 'NavPill';
