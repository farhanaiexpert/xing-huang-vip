import { useState } from 'react';
import { useLocation } from 'wouter';
import { ScrollArea } from './ui/scroll-area';
import { SPORTS } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import {
  TrendingUp, Star, AlignLeft, ChevronRight,
  Clock, Heart, HeartOff,
} from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

const TRENDING_ITEMS = [
  { title: 'Weekend Soccer',    icon: '⚽', count: 284, sportId: 'sp_soccer'       },
  { title: 'French Open — ATP', icon: '🎾', count: 449, sportId: 'sp_tennis'       },
  { title: 'French Open — WTA', icon: '🎾', count: 312, sportId: 'sp_tennis'       },
  { title: 'India Premier Lg.', icon: '🏏', count: 247, sportId: 'sp_cricket'      },
  { title: 'MMA / UFC',         icon: '🥋', count: 198, sportId: 'sp_mma'          },
  { title: 'Italy Serie A',     icon: '⚽', count: 228, sportId: 'sp_soccer'       },
  { title: 'Next Races',        icon: '🏇', count: 195, sportId: 'sp_horse_racing' },
  { title: 'Spain La Liga',     icon: '⚽', count: 183, sportId: 'sp_soccer'       },
  { title: 'NBA Play-Offs',     icon: '🏀', count: 156, sportId: 'sp_nba'         },
];
const MAX_COUNT = 449;

function TrendBar({ count }: { count: number }) {
  const pct = count / MAX_COUNT;
  return (
    <div className="flex items-end gap-[2px] h-3 shrink-0">
      {[5, 8, 12].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, opacity: 0.35 + pct * 0.65 }}
          className="w-[3px] rounded-sm bg-[#00DFA9]" />
      ))}
    </div>
  );
}

export function SportsSidebar({ selectedSportId, onSelectSport, className }: SportsSidebarProps) {
  const [showAllAZ, setShowAllAZ] = useState(false);
  const [, setLocation] = useLocation();
  const { favSports, recentMatches, toggleFavSport, isFavSport } = useFavorites();

  const popularSports  = SPORTS.filter(s => s.isPopular);
  const allSports      = [...SPORTS].sort((a, b) => a.name.localeCompare(b.name));
  const displayedAZ    = showAllAZ ? allSports : allSports.slice(0, 8);
  const pinnedSports   = SPORTS.filter(s => favSports.includes(s.id));
  const hasRecent      = recentMatches.length > 0;

  return (
    <aside className={cn(
      'w-[220px] shrink-0 flex-col h-[calc(100vh-3.5rem)] sticky top-0 hidden lg:flex',
      'bg-[#0A0E13] border-r border-[#253241]',
      className
    )}>
      <ScrollArea className="flex-1">
        <div className="py-3">

          {/* ── Pinned / Favourites ─────────────────────────────────────── */}
          {pinnedSports.length > 0 && (
            <>
              <SectionLabel icon={<Heart className="h-3 w-3 fill-[#EF4444] text-[#EF4444]" />} label="Favourites" />
              <div className="mt-1 mb-3">
                {pinnedSports.map(sport => (
                  <SidebarItem
                    key={`pin-${sport.id}`}
                    title={sport.name}
                    icon={sport.icon}
                    isActive={selectedSportId === sport.id}
                    isFavourite={true}
                    onFavToggle={() => toggleFavSport(sport.id)}
                    onClick={() => onSelectSport(sport.id)}
                  />
                ))}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── Recently Viewed ──────────────────────────────────────────── */}
          {hasRecent && (
            <>
              <SectionLabel icon={<Clock className="h-3 w-3" />} label="Recently Viewed" />
              <div className="mt-1 mb-3">
                {recentMatches.slice(0, 4).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setLocation(`/match/${m.id}`)}
                    className="group flex w-full items-center gap-2.5 px-4 py-[7px] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]/80 transition-all duration-150 text-left"
                  >
                    <span className="text-sm shrink-0">{m.sportIcon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate leading-none">{m.name}</p>
                      <p className="text-[10px] text-[#94A3B8]/40 truncate leading-none mt-0.5">{m.leagueName}</p>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── Trending ────────────────────────────────────────────────── */}
          <SectionLabel icon={<TrendingUp className="h-3 w-3" />} label="Trending" />
          <div className="mt-1 mb-4">
            {TRENDING_ITEMS.map(item => (
              <TrendingItem
                key={item.title}
                title={item.title}
                icon={item.icon}
                count={item.count}
                onClick={() => onSelectSport(item.sportId)}
              />
            ))}
          </div>

          <SectionDivider />

          {/* ── Most Used ──────────────────────────────────────────────── */}
          <SectionLabel icon={<Star className="h-3 w-3" />} label="Most Used" />
          <div className="mt-1 mb-4">
            {popularSports.map(sport => (
              <SidebarItem
                key={`popular-${sport.id}`}
                title={sport.name}
                icon={sport.icon}
                isActive={selectedSportId === sport.id}
                isFavourite={isFavSport(sport.id)}
                onFavToggle={() => toggleFavSport(sport.id)}
                onClick={() => onSelectSport(sport.id)}
              />
            ))}
          </div>

          <SectionDivider />

          {/* ── A-Z Sports ────────────────────────────────────────────── */}
          <SectionLabel icon={<AlignLeft className="h-3 w-3" />} label="A–Z Sports" />
          <div className="mt-1">
            {displayedAZ.map(sport => (
              <SidebarItem
                key={`az-${sport.id}`}
                title={sport.name}
                icon={sport.icon}
                isActive={selectedSportId === sport.id}
                isFavourite={isFavSport(sport.id)}
                onFavToggle={() => toggleFavSport(sport.id)}
                onClick={() => onSelectSport(sport.id)}
              />
            ))}
          </div>

          <div className="px-4 pt-2 pb-5">
            <button
              onClick={() => setShowAllAZ(!showAllAZ)}
              data-testid="toggle-az-sports"
              className="w-full text-center text-[11px] font-medium text-[#38BDF8] py-1.5 rounded-md hover:bg-[#38BDF8]/8 transition-colors duration-150"
            >
              {showAllAZ ? '↑ Show less' : '↓ Show all sports'}
            </button>
          </div>

        </div>
      </ScrollArea>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 mb-1">
      <span className="text-[#38BDF8]/60">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]/50">{label}</span>
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-[#253241] to-transparent mx-4 mb-4" />;
}

function TrendingItem({ title, icon, count, onClick }: {
  title: string; icon: string; count: number; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 px-4 py-[7px] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]/80 transition-all duration-150 text-left"
    >
      <span className="text-sm shrink-0">{icon}</span>
      <span className="text-[13px] font-medium truncate flex-1">{title}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-[#94A3B8]/40 group-hover:text-[#94A3B8]/80 transition-colors tabular-nums">{count}</span>
        <TrendBar count={count} />
      </div>
    </button>
  );
}

function SidebarItem({ title, icon, isActive, isFavourite, onFavToggle, onClick }: {
  title: string;
  icon: string;
  isActive?: boolean;
  isFavourite?: boolean;
  onFavToggle?: () => void;
  onClick?: () => void;
}) {
  return (
    <div className={cn(
      'group relative flex w-full items-center gap-0 transition-all duration-150',
      isActive ? 'bg-[#00DFA9]/8' : 'hover:bg-[#121821]/80'
    )}>
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.7)]" />
      )}

      <button
        onClick={onClick}
        className={cn(
          'flex flex-1 items-center gap-2.5 px-4 py-[7px] text-left',
          isActive ? 'text-[#00DFA9] font-semibold' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
        )}
      >
        <span className="text-sm shrink-0">{icon}</span>
        <span className="text-[13px] truncate flex-1">{title}</span>
        <ChevronRight className={cn(
          'h-3 w-3 shrink-0 transition-all duration-150',
          isActive ? 'text-[#00DFA9] opacity-100' : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'
        )} />
      </button>

      {/* Star / favourite button — visible on hover or if already favourited */}
      <button
        onClick={e => { e.stopPropagation(); onFavToggle?.(); }}
        className={cn(
          'shrink-0 pr-3 transition-all duration-150',
          isFavourite
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
        )}
        title={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
      >
        {isFavourite
          ? <Heart className="h-3 w-3 fill-[#EF4444] text-[#EF4444]" />
          : <HeartOff className="h-3 w-3 text-[#94A3B8]/40 hover:text-[#EF4444]" />}
      </button>
    </div>
  );
}
