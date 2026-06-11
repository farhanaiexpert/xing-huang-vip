import { useRef, useEffect, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { getGroupColor } from '../../data/groupColors';
import type { MarketDetailGroup } from '../../data/marketDetails';

interface MarketNavProps {
  groups:   MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function MarketNav({ groups, activeId, onSelect }: MarketNavProps) {
  const navScrollRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs   = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const btn = activeId ? buttonRefs.current[activeId] : null;
    const nav = navScrollRef.current;
    if (!btn || !nav) return;
    const targetLeft = btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeId]);

  return (
    <div
      className="sticky top-0 z-20"
      style={{
        background: 'linear-gradient(180deg, #0D1520 0%, rgba(11,15,20,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(37,50,65,0.6)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Thin rainbow-ish accent line at top */}
      <div
        className="h-[1.5px] w-full"
        style={{ background: 'linear-gradient(90deg, #FACC15 0%, #00DFA9 25%, #38BDF8 50%, #A78BFA 75%, #FB7185 100%)' }}
      />

      {/* Scrollable pill strip */}
      <div
        ref={navScrollRef}
        className="market-nav-scroll flex items-center gap-2 px-3 sm:px-4 h-[58px] overflow-x-auto"
      >
        {groups.map(group => {
          const count    = group.markets.reduce((a, m) => a + m.selections.length, 0);
          if (count === 0) return null;
          const isActive = activeId === group.id;
          const color    = getGroupColor(group.id);
          return (
            <NavPill
              key={group.id}
              ref={el => { buttonRefs.current[group.id] = el; }}
              label={group.name}
              icon={group.icon}
              count={count}
              isActive={isActive}
              color={color}
              onClick={() => onSelect(group.id)}
            />
          );
        })}
        {/* Right padding spacer so last pill isn't clipped by the fade */}
        <div className="w-8 shrink-0" />
      </div>

      {/* Left + right fade gradients */}
      <div className="absolute left-0 top-0 h-full w-8 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #0D1520 0%, transparent 100%)' }} />
      <div className="absolute right-0 top-0 h-full w-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(11,15,20,0.95) 0%, transparent 100%)' }} />
    </div>
  );
}

// ─── Individual pill tab ───────────────────────────────────────────────────────

const NavPill = forwardRef<
  HTMLButtonElement,
  { label: string; icon: string; count: number; isActive: boolean; color: string; onClick: () => void }
>(({ label, icon, count, isActive, color, onClick }, ref) => {
  const hex6 = color.replace('#', '');
  const r    = parseInt(hex6.slice(0, 2), 16);
  const g    = parseInt(hex6.slice(2, 4), 16);
  const b    = parseInt(hex6.slice(4, 6), 16);

  const activeBg     = `rgba(${r},${g},${b},0.14)`;
  const activeBorder = `rgba(${r},${g},${b},0.55)`;
  const activeGlow   = `0 0 18px rgba(${r},${g},${b},0.28), 0 2px 8px rgba(0,0,0,0.4)`;
  const badgeBg      = `rgba(${r},${g},${b},0.22)`;

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3.5 py-2 rounded-full',
        'whitespace-nowrap transition-all duration-200 select-none shrink-0',
        'focus-visible:outline-none',
        'text-[12px] font-bold',
      )}
      style={isActive ? {
        background:  activeBg,
        border:      `1.5px solid ${activeBorder}`,
        color,
        boxShadow:   activeGlow,
        transform:   'translateY(-0.5px)',
      } : {
        background:  'rgba(17,26,40,0.7)',
        border:      '1.5px solid rgba(37,50,65,0.5)',
        color:       'rgba(148,163,184,0.6)',
      }}
      onMouseEnter={e => {
        if (isActive) return;
        const el = e.currentTarget as HTMLElement;
        el.style.color       = `rgba(${r},${g},${b},0.85)`;
        el.style.border      = `1.5px solid rgba(${r},${g},${b},0.25)`;
        el.style.background  = `rgba(${r},${g},${b},0.06)`;
      }}
      onMouseLeave={e => {
        if (isActive) return;
        const el = e.currentTarget as HTMLElement;
        el.style.color      = 'rgba(148,163,184,0.6)';
        el.style.border     = '1.5px solid rgba(37,50,65,0.5)';
        el.style.background = 'rgba(17,26,40,0.7)';
      }}
    >
      <span className="text-[14px] leading-none">{icon}</span>
      <span className="leading-none tracking-tight">{label}</span>
      <span
        className="text-[10px] font-black px-1.5 py-[3px] rounded-full tabular-nums leading-none transition-colors duration-150"
        style={isActive
          ? { background: badgeBg, color }
          : { background: 'rgba(37,50,65,0.7)', color: 'rgba(148,163,184,0.4)' }
        }
      >
        {count}
      </span>
    </button>
  );
});
NavPill.displayName = 'NavPill';
