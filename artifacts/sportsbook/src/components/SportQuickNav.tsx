import { useRef } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { cn } from '../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: 'live' | 'hot' | 'new';
  /** If true, rendered with a special "featured" highlight */
  featured?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'soccer',        label: 'Soccer',              icon: '⚽' },
  { id: 'tennis',        label: 'Tennis',              icon: '🎾' },
  { id: 'nba',           label: 'NBA',                 icon: '🏀' },
  { id: 'cricket',       label: 'Cricket',             icon: '🏏' },
  { id: 'esports',       label: 'Esoccer',             icon: '🎮' },
  { id: 'horse-racing',  label: 'Racing',              icon: '🏇' },
  { id: 'formula-1',     label: 'Formula 1',           icon: '🏎️' },
  { id: 'mma',           label: 'MMA / UFC',           icon: '🥋' },
  { id: 'boxing',        label: 'Boxing',              icon: '🥊' },
  { id: 'golf',          label: 'Golf',                icon: '⛳' },
  { id: 'darts',         label: 'Darts',               icon: '🎯' },
  { id: 'ice-hockey',    label: 'Ice Hockey',          icon: '🏒' },
  { id: 'american-football', label: 'NFL',             icon: '🏈' },
  { id: 'ucl-final',     label: 'UCL Final',           icon: '🏆', featured: true, badge: 'hot' },
  { id: 'live',          label: 'In-Play',             icon: '🔴', badge: 'live' },
];

interface Props {
  selectedId: string | null;
  liveCount?: number;
  onSelect: (id: string | null) => void;
}

export function SportQuickNav({ selectedId, liveCount = 0, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative border-b border-[#253241]/50"
      style={{ background: 'linear-gradient(180deg, #0E1520 0%, #0B0F14 100%)' }}
    >
      {/* Right-edge fade hint */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10"
        style={{ background: 'linear-gradient(to left, #0B0F14 0%, transparent 100%)' }}
      />

      <ScrollArea className="w-full">
        <div ref={scrollRef} className="flex items-stretch gap-0 px-3 w-max min-w-full">
          {NAV_ITEMS.map(item => {
            const isActive = selectedId === item.id;
            const isLive   = item.badge === 'live';
            const isHot    = item.badge === 'hot';
            const isFeat   = item.featured;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(isActive ? null : item.id)}
                className={cn(
                  'relative group flex items-center gap-1.5 px-3.5 py-3 text-[12px] font-semibold whitespace-nowrap transition-all duration-150 select-none outline-none',
                  isActive
                    ? isFeat
                      ? 'text-[#FACC15]'
                      : isLive
                        ? 'text-[#EF4444]'
                        : 'text-[#00DFA9]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                )}
              >
                {/* Active underline bar */}
                <span
                  className={cn(
                    'absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200',
                    isActive
                      ? isFeat
                        ? 'bg-[#FACC15] opacity-90'
                        : isLive
                          ? 'bg-[#EF4444] opacity-90'
                          : 'bg-[#00DFA9] opacity-90'
                      : 'opacity-0 bg-[#00DFA9]'
                  )}
                />

                {/* Hover underline (for non-active) */}
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#253241] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

                {/* Icon */}
                <span className="text-[13px] leading-none">
                  {isLive
                    ? <span className="relative flex items-center justify-center w-4 h-4">
                        <span className={cn(
                          'absolute w-2.5 h-2.5 rounded-full',
                          liveCount > 0 ? 'bg-[#EF4444] animate-ping opacity-50' : 'bg-[#EF4444]/30'
                        )} />
                        <span className={cn(
                          'relative w-2 h-2 rounded-full',
                          liveCount > 0 ? 'bg-[#EF4444]' : 'bg-[#EF4444]/50'
                        )} />
                      </span>
                    : item.icon
                  }
                </span>

                {/* Label */}
                <span className={cn(
                  isActive ? 'font-bold' : 'font-semibold'
                )}>
                  {item.label}
                </span>

                {/* Badge chips */}
                {isHot && !isActive && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-black tracking-wider bg-[#FACC15]/15 text-[#FACC15] leading-none uppercase">
                    HOT
                  </span>
                )}
                {isLive && liveCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#EF4444]/15 text-[#EF4444] leading-none tabular-nums">
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
