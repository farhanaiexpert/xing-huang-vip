import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { SPORTS } from '../data/mockData';
import { useFavorites } from '../hooks/useFavorites';
import { useOddsData } from '../hooks/useOddsData';
import { cn } from '../lib/utils';
import { SportName } from './SportName';
import {
  TrendingUp, Star, AlignLeft, ChevronRight,
  Clock, Heart, HeartOff,
} from 'lucide-react';

interface SportsSidebarProps {
  selectedSportId: string;
  onSelectSport: (id: string) => void;
  className?: string;
}

// ── Full A-Z sports list with bet365 SVG icons ──────────────────────────────
const B365 = 'https://www.bet365.com/sports-assets/sports/ClassificationIconsLib/assets/classification/';
const B365E = 'https://www.bet365.com/sports-assets/sports/ClassificationIconsLib/assets/specialevent/';

// Only sports with confirmed real-data coverage from The Odds API and/or BetsAPI.
// Sports with no API coverage have been removed to keep the list clean.
const AZ_SPORTS: { name: string; id: string; iconUrl: string }[] = [
  { name: 'American Football',    id: 'sp_american_football', iconUrl: `${B365}12.svg`  },
  { name: 'Australian Rules',     id: 'sp_aussie_rules',      iconUrl: `${B365}36.svg`  },
  { name: 'Baseball',             id: 'sp_baseball',          iconUrl: `${B365}16.svg`  },
  { name: 'Basketball',           id: 'sp_basketball',        iconUrl: `${B365}18.svg`  },
  { name: 'Boxing',               id: 'sp_boxing',            iconUrl: `${B365}9.svg`   },
  { name: 'Cricket',              id: 'sp_cricket',           iconUrl: `${B365}3.svg`   },
  { name: 'Darts',                id: 'sp_darts',             iconUrl: `${B365}15.svg`  },
  { name: 'Golf',                 id: 'sp_golf',              iconUrl: `${B365}7.svg`   },
  { name: 'Greyhounds',           id: 'sp_greyhounds',        iconUrl: `${B365}4.svg`   },
  { name: 'Handball',             id: 'sp_handball',          iconUrl: `${B365}78.svg`  },
  { name: 'Horse Racing',         id: 'sp_horse_racing',      iconUrl: `${B365}2.svg`   },
  { name: 'Ice Hockey',           id: 'sp_ice_hockey',        iconUrl: `${B365}17.svg`  },
  { name: 'MMA',                  id: 'sp_mma',               iconUrl: `${B365}162.svg` },
  { name: 'Rugby League',         id: 'sp_rugby_league',      iconUrl: `${B365}19.svg`  },
  { name: 'Rugby Union',          id: 'sp_rugby_union',       iconUrl: `${B365}8.svg`   },
  { name: 'Snooker',              id: 'sp_snooker',           iconUrl: `${B365}14.svg`  },
  { name: 'Soccer',               id: 'sp_soccer',            iconUrl: `${B365}1.svg`   },
  { name: 'Table Tennis',         id: 'sp_table_tennis',      iconUrl: `${B365}92.svg`  },
  { name: 'Tennis',               id: 'sp_tennis',            iconUrl: `${B365}13.svg`  },
  { name: 'UEFA Champions League', id: 'sp_ucl',              iconUrl: `${B365E}18.svg` },
  { name: 'Volleyball',           id: 'sp_volleyball',        iconUrl: `${B365}91.svg`  },
];

const AZ_INITIAL = 10;

const TRENDING_ITEMS = [
  { title: 'FIFA World Cup',   icon: '⚽', count: 510, sportId: 'sp_soccer'        },
  { title: 'ATP/WTA Paris',    icon: '🎾', count: 449, sportId: 'sp_tennis'        },
  { title: 'Italy Serie A',    icon: '⚽', count: 228, sportId: 'sp_soccer'        },
  { title: 'NBA Finals',       icon: '🏀', count: 195, sportId: 'sp_nba'          },
  { title: 'Spain La Liga',    icon: '⚽', count: 183, sportId: 'sp_soccer'        },
  { title: 'MLB Season',       icon: '⚾', count: 156, sportId: 'sp_baseball'      },
  { title: 'MMA Events',       icon: '🥋', count: 128, sportId: 'sp_mma'          },
];
const MAX_COUNT = 510;

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
  const [location, setLocation] = useLocation();
  const { favSports, recentMatches, toggleFavSport, isFavSport } = useFavorites();

  const { matchCountBySportId } = useOddsData();

  const popularSports  = SPORTS.filter(s => s.isPopular);
  const pinnedSports   = SPORTS.filter(s => favSports.includes(s.id));
  const hasRecent      = recentMatches.length > 0;

  // Show the full A–Z sports list at all times. Match-count badges still appear
  // only for sports that currently have confirmed upcoming events.
  const coveredAZ  = AZ_SPORTS;
  const displayedAZ = showAllAZ ? coveredAZ : coveredAZ.slice(0, AZ_INITIAL);

  return (
    <aside className={cn(
      'group/sidebar relative w-[220px] xl:w-[240px] 2xl:w-[260px] shrink-0 flex-col h-[calc(100vh-3.5rem)] sticky top-0 hidden xl:flex',
      'bg-[#0A0E13] border-r border-[#253241]',
      className
    )}>
      {/* Top fade — hints there is more content above */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-5 z-10 bg-gradient-to-b from-[#0A0E13] to-transparent" />
      {/* Bottom fade — hints there is more content below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 z-10 bg-gradient-to-t from-[#0A0E13] to-transparent" />
      <div className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden">
        <div className="py-3">

          {/* ── Live Now ─────────────────────────────────────────────────── */}
          <Link
            href="/live"
            className={cn(
              'flex items-center gap-2.5 px-4 xl:px-5 py-2.5 mx-2 mb-1 rounded-xl transition-all duration-150',
              location === '/live'
                ? 'bg-[#EF4444]/10 border border-[#EF4444]/25'
                : 'hover:bg-[#121821]/80 border border-transparent'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)] shrink-0" />
            <span className={cn(
              'text-[12px] font-bold flex-1',
              location === '/live' ? 'text-[#EF4444]' : 'text-[#94A3B8]'
            )}>
              Live Now
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider bg-[#EF4444] text-white px-1.5 py-0.5 rounded-md leading-none">
              LIVE
            </span>
          </Link>
          <SectionDivider />

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
                    className="group flex w-full items-center gap-2.5 px-4 xl:px-5 py-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]/80 transition-all duration-150 text-left"
                  >
                    <span className="text-sm shrink-0">{m.sportIcon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate leading-none">{m.name}</p>
                      <p className="text-[10px] text-[#94A3B8]/40 truncate leading-none mt-0.5"><SportName name={m.leagueName} /></p>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
              <SectionDivider />
            </>
          )}

          {/* ── World Cup 2026 ───────────────────────────────────────── */}
          <WCPinnedEntry />
          <SectionDivider />

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
              <AZSidebarItem
                key={`az-${sport.id}`}
                title={sport.name}
                iconUrl={sport.iconUrl}
                isActive={selectedSportId === sport.id}
                isFavourite={isFavSport(sport.id)}
                matchCount={matchCountBySportId[sport.id]}
                onFavToggle={() => toggleFavSport(sport.id)}
                onClick={() => onSelectSport(sport.id)}
              />
            ))}
          </div>

          <div className="px-4 xl:px-5 pt-2 pb-5">
            <button
              onClick={() => setShowAllAZ(!showAllAZ)}
              data-testid="toggle-az-sports"
              className="w-full text-center text-[11px] font-semibold text-[#38BDF8] py-2 rounded-md bg-[#38BDF8]/8 border border-[#38BDF8]/20 hover:bg-[#38BDF8]/15 hover:border-[#38BDF8]/35 transition-colors duration-150"
            >
              {showAllAZ
                ? `↑ Show less`
                : `↓ Show all ${coveredAZ.length} sports`}
            </button>
          </div>

        </div>
      </div>

    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

const LOGO_URL = 'https://media.ourwebprojects.pro/wp-content/uploads/2026/06/World-Cup-logo.png';

function WCPinnedEntry() {
  const [location] = useLocation();
  const { allLeagues } = useOddsData();

  const stats = useMemo(() => {
    let total = 0, live = 0;
    for (const l of allLeagues) {
      if (l.sportKey !== 'soccer_fifa_world_cup') continue;
      for (const m of l.matches) {
        total++;
        if (m.isLive) live++;
      }
    }
    return { total, live };
  }, [allLeagues]);

  const isActive = location === '/worldcup';

  return (
    <div className="px-2 mb-3">
      <Link
        href="/worldcup"
        className={cn(
          'group relative block rounded-2xl overflow-hidden transition-all duration-200',
          isActive
            ? 'shadow-[0_0_0_1.5px_rgba(250,204,21,0.55),0_0_20px_rgba(250,204,21,0.18)]'
            : 'shadow-[0_0_0_1px_rgba(250,204,21,0.22)] hover:shadow-[0_0_0_1.5px_rgba(250,204,21,0.45),0_0_16px_rgba(250,204,21,0.14)]'
        )}
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1200] via-[#0B0F14] to-[#001810]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_0%_0%,rgba(250,204,21,0.13),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_100%_100%,rgba(0,223,169,0.07),transparent)]" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[rgba(250,204,21,0.03)]" />

        {/* Gold shimmer top border */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-[#FACC15]/0 via-[#FACC15]/90 to-[#FACC15]/0" />

        {/* Active accent bar on left */}
        {isActive && (
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#FACC15] shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
        )}

        <div className="relative flex items-center gap-3 px-3 py-3">
          {/* Logo with glow */}
          <div className="shrink-0 relative">
            <div className="absolute inset-0 rounded-xl bg-[#FACC15]/25 blur-md scale-110 group-hover:bg-[#FACC15]/35 transition-all duration-300" />
            <div className="relative grid place-items-center w-9 h-9 rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/8 shadow-[0_0_12px_rgba(250,204,21,0.15)]">
              <img
                src={LOGO_URL}
                alt="World Cup 2026"
                className="w-6 h-6 object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                draggable={false}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={cn(
                'text-[12px] font-black leading-none truncate',
                isActive ? 'text-[#FACC15]' : 'text-white group-hover:text-[#FACC15] transition-colors duration-150'
              )}>
                World Cup 2026
              </span>
            </div>
            <div className="flex items-center gap-2">
              {stats.live > 0 ? (
                <span className="flex items-center gap-1 text-[9px] font-black text-[#EF4444]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                  {stats.live} Live
                </span>
              ) : (
                <span className="text-[9px] text-[#475569]">Group Stage</span>
              )}
              {stats.total > 0 && (
                <span className="text-[9px] text-[#334155]">· {stats.total} matches</span>
              )}
            </div>
          </div>

          {/* Hot badge */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FACC15]/20 text-[#FACC15] border border-[#FACC15]/30 leading-none">
              🔥 HOT
            </span>
          </div>
        </div>

        {/* Bet now footer strip */}
        <div className="relative flex items-center justify-between px-3 py-1.5 border-t border-[#FACC15]/10 bg-[#FACC15]/[0.04]">
          <span className="text-[9px] font-bold text-[#FACC15]/60 uppercase tracking-widest">Bet on matches →</span>
          <span className="text-[9px] text-[#334155]">USA · CAN · MEX</span>
        </div>
      </Link>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 xl:px-5 mb-1">
      <span className="text-[#38BDF8]/60">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]/50">{label}</span>
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-[#253241] to-transparent mx-4 xl:mx-5 mb-4" />;
}

function TrendingItem({ title, icon, count, onClick }: {
  title: string; icon: string; count: number; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 px-4 xl:px-5 py-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121821]/80 transition-all duration-150 text-left"
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

// Existing SidebarItem — unchanged, used by Favourites / Most Used (emoji icons)
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
          'flex flex-1 items-center gap-2.5 px-4 xl:px-5 py-2 text-left',
          isActive ? 'text-[#00DFA9] font-semibold' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
        )}
      >
        <span className="text-sm shrink-0">{icon}</span>
        <span className="text-[13px] truncate flex-1"><SportName name={title} /></span>
        <ChevronRight className={cn(
          'h-3 w-3 shrink-0 transition-all duration-150',
          isActive ? 'text-[#00DFA9] opacity-100' : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0'
        )} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onFavToggle?.(); }}
        className={cn(
          'shrink-0 pr-3 xl:pr-4 transition-all duration-150',
          isFavourite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
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

// New AZ item — uses SVG image icons with graceful fallback
function SportIconImg({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="text-sm shrink-0">🏆</span>;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="w-4 h-4 object-contain shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

function AZSidebarItem({ title, iconUrl, isActive, isFavourite, matchCount, onFavToggle, onClick }: {
  title: string;
  iconUrl: string;
  isActive?: boolean;
  isFavourite?: boolean;
  matchCount?: number;
  onFavToggle?: () => void;
  onClick?: () => void;
}) {
  const count = matchCount && matchCount > 0 ? matchCount : 0;

  return (
    <div className={cn(
      'group relative flex w-full items-center transition-all duration-150',
      isActive ? 'bg-[#00DFA9]/8' : 'hover:bg-[#121821]/80',
    )}>
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-[#00DFA9] shadow-[0_0_8px_rgba(0,223,169,0.7)]" />
      )}
      <button
        onClick={onClick}
        className={cn(
          'flex flex-1 items-center gap-2.5 px-4 xl:px-5 py-2 text-left min-w-0',
          isActive ? 'text-[#00DFA9] font-semibold' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
        )}
      >
        <span className={cn(
          'w-5 h-5 flex items-center justify-center shrink-0 rounded',
          isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
        )}>
          <SportIconImg src={iconUrl} />
        </span>

        <span className="text-[13px] truncate flex-1 leading-none"><SportName name={title} /></span>

        <span className={cn(
          'shrink-0 text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none',
          isActive
            ? 'bg-[#00DFA9]/20 text-[#00DFA9]'
            : 'bg-[#253241] text-[#94A3B8]/70 group-hover:bg-[#2E3D50] group-hover:text-[#94A3B8]'
        )}>
          {count}
        </span>
      </button>

      <button
        onClick={e => { e.stopPropagation(); onFavToggle?.(); }}
        className={cn(
          'shrink-0 pr-3 xl:pr-4 transition-all duration-150',
          isFavourite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
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
