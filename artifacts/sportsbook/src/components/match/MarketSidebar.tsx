import { useRef, useEffect } from 'react';
import { Clock, CalendarDays, Trophy, LayoutGrid } from 'lucide-react';
import { getGroupColor } from '../../data/groupColors';
import { SportName } from '../SportName';
import { formatKickoffTime, estimatedEndTime } from '../../lib/matchTime';
import type { MarketDetailGroup } from '../../data/marketDetails';
import type { MatchEntity, LeagueEntity } from '../../data/types';

interface MarketSidebarProps {
  groups:   MarketDetailGroup[];
  activeId: string | null;
  onSelect: (id: string) => void;
  match:    MatchEntity;
  league:   LeagueEntity;
}

const FLAG_MAP: Record<string, string> = {
  EU: '🇪🇺', GB: '🇬🇧', US: '🇺🇸', ES: '🇪🇸',
  IT: '🇮🇹', GL: '🌐', DE: '🇩🇪', IN: '🇮🇳', FR: '🇫🇷',
};
function flag(cc: string) { return FLAG_MAP[cc] ?? '🌐'; }

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

export function MarketSidebar({ groups, activeId, onSelect, match, league }: MarketSidebarProps) {
  const listRef    = useRef<HTMLDivElement | null>(null);
  const itemRefs   = useRef<Record<string, HTMLButtonElement | null>>({});

  const visibleGroups = groups.filter(g =>
    g.markets.reduce((a, m) => a + m.selections.length, 0) > 0
  );

  const totalCount = visibleGroups.reduce(
    (sum, g) => sum + g.markets.reduce((a, m) => a + m.selections.length, 0), 0
  );

  // Keep the active item scrolled into view within the sidebar list
  useEffect(() => {
    const id   = activeId ?? '__all__';
    const item = itemRefs.current[id];
    const list = listRef.current;
    if (!item || !list) return;
    const itemTop    = item.offsetTop;
    const itemBottom = itemTop + item.offsetHeight;
    if (itemTop < list.scrollTop || itemBottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, itemTop - list.clientHeight / 2 + item.offsetHeight / 2), behavior: 'smooth' });
    }
  }, [activeId]);

  const kickoff = formatKickoffTime(match.startTime) ?? match.displayDate;
  const endTime = estimatedEndTime(match.startTime, match.sportId);

  return (
    <aside
      className="w-[228px] shrink-0 hidden xl:flex flex-col fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] border-r border-t border-[#1E2D3D]"
      style={{ background: 'linear-gradient(180deg, #0A0E13 0%, #0B0F14 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-[52px] shrink-0 border-b border-[#1E2D3D]/70">
        <div className="w-6 h-6 rounded-lg bg-[#00DFA9]/10 border border-[#00DFA9]/20 flex items-center justify-center">
          <LayoutGrid className="h-3.5 w-3.5 text-[#00DFA9]" />
        </div>
        <span className="text-[13px] font-bold text-[#F8FAFC] tracking-tight">All Markets</span>
      </div>

      {/* Market list */}
      <div ref={listRef} className="sidebar-scroll flex-1 overflow-y-auto py-2 px-2">
        <SidebarItem
          itemRef={el => { itemRefs.current['__all__'] = el; }}
          icon="◎"
          label="All"
          count={totalCount}
          isActive={activeId === null}
          color="#94A3B8"
          onClick={() => onSelect('__all__')}
        />

        <div className="my-1.5 mx-2 h-px bg-[#1E2D3D]/50" />

        {visibleGroups.map(group => {
          const count = group.markets.reduce((a, m) => a + m.selections.length, 0);
          return (
            <SidebarItem
              key={group.id}
              itemRef={el => { itemRefs.current[group.id] = el; }}
              icon={group.icon}
              label={group.name}
              count={count}
              isActive={activeId === group.id}
              color={getGroupColor(group.id)}
              onClick={() => onSelect(group.id)}
            />
          );
        })}
      </div>

      {/* Match info footer */}
      <div className="shrink-0 border-t border-[#1E2D3D]/70 px-4 py-3.5 space-y-2.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]/35">Match Info</p>

        <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label={match.displayDate} />
        <InfoRow icon={<Clock className="h-3.5 w-3.5" />}
          label={<>{match.isLive ? 'Started ' : ''}{kickoff}{endTime ? <span className="text-[#94A3B8]/35"> · ~{endTime}</span> : null}</>} />
        <InfoRow icon={<span className="text-[12px] leading-none">{flag(league.countryCode)}</span>}
          label={<SportName name={league.name} />} />
        <InfoRow icon={<Trophy className="h-3.5 w-3.5" />}
          label={<><span className="text-[#F8FAFC]/75 font-semibold">{match.marketCount}</span> markets</>} />
      </div>
    </aside>
  );
}

// ─── Sidebar item ───────────────────────────────────────────────────────────────

interface SidebarItemProps {
  itemRef:  (el: HTMLButtonElement | null) => void;
  icon:     string;
  label:    string;
  count:    number;
  isActive: boolean;
  color:    string;
  onClick:  () => void;
}

function SidebarItem({ itemRef, icon, label, count, isActive, color, onClick }: SidebarItemProps) {
  const { r, g, b } = hexToRgb(color);

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className="group relative w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-all duration-150"
      style={{
        background: isActive ? `rgba(${r},${g},${b},0.1)` : 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(37,50,65,0.35)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Active left accent bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
          style={{ height: '56%', background: color, boxShadow: `0 0 10px ${color}` }}
        />
      )}

      {/* Icon chip */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[14px] shrink-0 transition-all duration-150"
        style={{
          background: isActive ? `rgba(${r},${g},${b},0.16)` : 'rgba(22,33,48,0.7)',
          border:     `1px solid ${isActive ? `rgba(${r},${g},${b},0.32)` : 'rgba(37,50,65,0.6)'}`,
        }}
      >
        {icon}
      </span>

      {/* Label */}
      <span
        className="flex-1 text-left text-[12.5px] font-semibold tracking-tight truncate transition-colors duration-150"
        style={{ color: isActive ? color : 'rgba(148,163,184,0.78)' }}
      >
        {label}
      </span>

      {/* Count */}
      <span
        className="text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded-md shrink-0 transition-all duration-150"
        style={isActive ? {
          background: `rgba(${r},${g},${b},0.18)`, color, border: `1px solid rgba(${r},${g},${b},0.28)`,
        } : {
          background: 'rgba(22,33,48,0.8)', color: 'rgba(148,163,184,0.4)', border: '1px solid rgba(37,50,65,0.5)',
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Info row ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label }: { icon: React.ReactNode; label: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]/60">
      <span className="text-[#94A3B8]/35 shrink-0 w-4 flex items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
