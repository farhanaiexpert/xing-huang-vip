/**
 * UpcomingMatchesCarousel — visually rich horizontal-scroll row of match cards.
 *
 * Design goals:
 *  - Eye-catching "match poster" cards that make users want to click
 *  - Sport-specific accent colors & glows
 *  - Real team logos via TeamBadge (ESPN CDN + initials fallback)
 *  - Inline odds chips wired directly to the bet slip
 *  - Click anywhere on card to navigate to match detail
 */
import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { Flame, ChevronRight, Clock, Zap } from 'lucide-react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { TeamBadge } from './TeamBadge';
import { JerseySilk } from './JerseySilk';
import { cn } from '../lib/utils';
import { useOddsData } from '../hooks/useOddsData';
import { useBetSlip } from '../hooks/useBetSlip';
import { useFavorites } from '../hooks/useFavorites';
import type { Match, League } from '../types';

// ─── Sport theming ────────────────────────────────────────────────────────────

interface SportTheme {
  accent: string;
  glow: string;
  icon: string;
  label: string;
}

const SPORT_THEME: Record<string, SportTheme> = {
  sp_soccer:        { accent: '#00DFA9', glow: 'rgba(0,223,169,0.18)',   icon: '⚽', label: 'Soccer'       },
  soccer:           { accent: '#00DFA9', glow: 'rgba(0,223,169,0.18)',   icon: '⚽', label: 'Soccer'       },
  sp_basketball:    { accent: '#FB923C', glow: 'rgba(251,146,60,0.2)',   icon: '🏀', label: 'Basketball'   },
  sp_nba:           { accent: '#FB923C', glow: 'rgba(251,146,60,0.2)',   icon: 'https://www.bet365.com/home/images/Home/imgs/V9FlagIcons/USA.svg', label: 'NBA' },
  basketball:       { accent: '#FB923C', glow: 'rgba(251,146,60,0.2)',   icon: '🏀', label: 'Basketball'   },
  sp_tennis:        { accent: '#FACC15', glow: 'rgba(250,204,21,0.18)',  icon: '🎾', label: 'Tennis'       },
  tennis:           { accent: '#FACC15', glow: 'rgba(250,204,21,0.18)',  icon: '🎾', label: 'Tennis'       },
  sp_cricket:       { accent: '#38BDF8', glow: 'rgba(56,189,248,0.18)', icon: '🏏', label: 'Cricket'      },
  cricket:          { accent: '#38BDF8', glow: 'rgba(56,189,248,0.18)', icon: '🏏', label: 'Cricket'      },
  sp_horse_racing:  { accent: '#A78BFA', glow: 'rgba(167,139,250,0.18)',icon: '🏇', label: 'Horse Racing' },
  horse_racing:     { accent: '#A78BFA', glow: 'rgba(167,139,250,0.18)',icon: '🏇', label: 'Horse Racing' },
  sp_esports:       { accent: '#F472B6', glow: 'rgba(244,114,182,0.18)',icon: '🎮', label: 'Esports'      },
  esports:          { accent: '#F472B6', glow: 'rgba(244,114,182,0.18)',icon: '🎮', label: 'Esports'      },
  sp_boxing:        { accent: '#EF4444', glow: 'rgba(239,68,68,0.18)',  icon: '🥊', label: 'Boxing'       },
  boxing:           { accent: '#EF4444', glow: 'rgba(239,68,68,0.18)',  icon: '🥊', label: 'Boxing'       },
  sp_mma:           { accent: '#EF4444', glow: 'rgba(239,68,68,0.18)',  icon: '🥋', label: 'MMA'          },
  mma:              { accent: '#EF4444', glow: 'rgba(239,68,68,0.18)',  icon: '🥋', label: 'MMA'          },
  sp_formula_1:     { accent: '#F87171', glow: 'rgba(248,113,113,0.18)',icon: '🏎️', label: 'Formula 1'   },
  formula_1:        { accent: '#F87171', glow: 'rgba(248,113,113,0.18)',icon: '🏎️', label: 'Formula 1'   },
  sp_american_football: { accent: '#60A5FA', glow: 'rgba(96,165,250,0.18)',icon: '🏈', label: 'NFL'       },
  american_football:    { accent: '#60A5FA', glow: 'rgba(96,165,250,0.18)',icon: '🏈', label: 'NFL'       },
};

function getTheme(sportId: string): SportTheme {
  return SPORT_THEME[sportId] ?? { accent: '#94A3B8', glow: 'rgba(148,163,184,0.12)', icon: '🏆', label: 'Sport' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatOdds(val: number): string {
  if (!val || val <= 1) return '—';
  return val.toFixed(2);
}

function timeLabel(match: Match): { text: string; isToday: boolean; isTomorrow: boolean } {
  const [day, time] = match.date.split(', ');
  const isToday    = match.dateTag === 'today';
  const isTomorrow = match.dateTag === 'tomorrow';
  return { text: time ?? day, isToday, isTomorrow };
}

// ─── Match card ───────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match;
  league: League;
}

function MatchCard({ match, league }: MatchCardProps) {
  const [, setLocation] = useLocation();
  const { addSelection, removeSelection, hasSelection } = useBetSlip();
  const { addRecentMatch } = useFavorites();

  const theme = getTheme(match.sportId);
  const { text: timeText, isToday, isTomorrow } = timeLabel(match);
  const isSoccer = match.sportId === 'sp_soccer' || match.sportId === 'soccer';
  const matchName = match.team2 ? `${match.team1} vs ${match.team2}` : match.team1;
  const marketId = `mkt_${match.id}_${isSoccer ? 'mr' : 'mw'}`;
  const marketName = isSoccer ? 'Match Result' : 'Match Winner';

  function goToMatch(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button[data-odds-chip]')) return;
    addRecentMatch({ id: match.id, name: matchName, leagueName: league.name, sportIcon: theme.icon });
    setLocation(`/match/${match.id}`);
  }

  function toggleOdds(e: React.MouseEvent, type: '1' | 'X' | '2', odds: number, name: string) {
    e.stopPropagation();
    const id = `${match.id}__${type}`;
    if (hasSelection(id)) {
      removeSelection(id);
    } else {
      addSelection({
        id,
        marketId,
        matchId: match.id,
        matchName,
        leagueName: league.name,
        marketName,
        selectionType: type,
        selectionName: name,
        odds,
        sportKey:     match.sportKey ?? match.sportId ?? '',
        homeTeam:     match.team1 || 'Home',
        awayTeam:     match.team2 || 'Field',
        commenceTime: match.commenceIso,
      });
    }
  }

  const chips: { type: '1' | 'X' | '2'; label: string; odds: number }[] = [
    { type: '1', label: match.team1.split(' ')[0], odds: match.odds.home },
    ...(isSoccer && match.odds.draw ? [{ type: 'X' as const, label: 'Draw', odds: match.odds.draw }] : []),
    { type: '2', label: (match.team2 ?? 'Away').split(' ')[0], odds: match.odds.away },
  ];

  return (
    <div
      onClick={goToMatch}
      className="relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none shrink-0 w-[268px]"
      style={{
        background: 'linear-gradient(160deg, #161E2B 0%, #0F1620 100%)',
        border: `1px solid rgba(255,255,255,0.06)`,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)`,
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-4px) scale(1.012)';
        el.style.boxShadow = `0 0 0 1px ${theme.accent}30, 0 16px 48px rgba(0,0,0,0.55), 0 0 40px ${theme.glow}`;
        el.style.borderColor = `${theme.accent}30`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = '';
        el.style.boxShadow = `0 0 0 1px rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.4)`;
        el.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {/* Sport-colored radial glow behind teams */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${theme.glow} 0%, transparent 75%)`,
        }}
      />

      {/* Header: league + time */}
      <div className="relative flex items-center justify-between px-3.5 pt-3 pb-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {theme.icon.startsWith('http')
            ? <img src={theme.icon} alt={theme.label} className="h-3.5 w-3.5 object-contain shrink-0" loading="lazy" />
            : <span className="text-[13px] leading-none shrink-0">{theme.icon}</span>}
          <span className="text-[10px] font-semibold text-[#94A3B8]/70 truncate leading-none">{league.name}</span>
        </div>

        <div className={cn(
          'shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
          isToday
            ? 'bg-[#00DFA9]/15 text-[#00DFA9]'
            : isTomorrow
              ? 'bg-[#38BDF8]/12 text-[#38BDF8]'
              : 'bg-[#253241] text-[#94A3B8]'
        )}>
          {isToday && <span className="w-1 h-1 rounded-full bg-[#00DFA9] animate-pulse" />}
          <Clock className="h-2.5 w-2.5" />
          {timeText}
        </div>
      </div>

      {/* Teams section */}
      <div className="relative flex items-center justify-between px-4 py-4 gap-2">
        {/* Home */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          {isSoccer
            ? <JerseySilk team={match.team1} size="md" sportIcon={theme.icon} />
            : <TeamBadge name={match.team1} sportIcon={theme.icon} size="md" />
          }
          <span className="text-[11px] font-semibold text-[#F8FAFC] text-center leading-tight line-clamp-2 w-full">
            {match.team1}
          </span>
        </div>

        {/* VS divider */}
        <div className="shrink-0 flex flex-col items-center gap-1 px-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
            style={{
              background: `radial-gradient(circle, ${theme.accent}20 0%, transparent 70%)`,
              border: `1px solid ${theme.accent}25`,
              color: theme.accent,
            }}
          >
            VS
          </div>
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          {isSoccer
            ? <JerseySilk team={match.team2 ?? match.team1} size="md" sportIcon={theme.icon} flip />
            : <TeamBadge name={match.team2 ?? match.team1} sportIcon={theme.icon} size="md" />
          }
          <span className="text-[11px] font-semibold text-[#94A3B8] text-center leading-tight line-clamp-2 w-full">
            {match.team2 ?? 'TBD'}
          </span>
        </div>
      </div>

      {/* Odds chips */}
      <div className="relative flex items-center gap-1.5 px-3.5 pb-3.5">
        {chips.map(({ type, label, odds }) => {
          const selId = `${match.id}__${type}`;
          const active = hasSelection(selId);
          return (
            <button
              key={type}
              data-odds-chip="1"
              onClick={e => toggleOdds(e, type, odds, label)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 rounded-xl border transition-all duration-150',
                'active:scale-95',
              )}
              style={active ? {
                background: `${theme.accent}20`,
                borderColor: `${theme.accent}60`,
                boxShadow: `0 0 12px ${theme.glow}`,
              } : {
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.07)',
              }}
            >
              <span className="text-[8px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: active ? theme.accent : 'rgba(148,163,184,0.6)' }}>
                {label}
              </span>
              <span className="text-[13px] font-black tabular-nums"
                style={{ color: active ? theme.accent : '#FACC15' }}>
                {formatOdds(odds)}
              </span>
            </button>
          );
        })}

        {/* Market count badge */}
        {match.marketCount && match.marketCount > 1 && (
          <div className="shrink-0 flex items-center gap-0.5 text-[9px] font-semibold text-[#94A3B8]/40 pl-1">
            <Zap className="h-2.5 w-2.5" />
            +{match.marketCount}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function UpcomingMatchesCarousel() {
  const { allLeagues } = useOddsData();

  // Build a flat list of (match, league) pairs from upcoming non-live matches,
  // prioritised by league prestige (PL → La Liga → Serie A → Bundesliga → UCL → Ligue 1 → NBA → …)
  const items = useMemo(() => {
    // Lower tier = shown first; max = cards shown per league
    const LEAGUE_TIERS: { test: RegExp; tier: number; max: number }[] = [
      { test: /premier league/i,     tier: 1,  max: 3 },
      { test: /la liga/i,            tier: 2,  max: 3 },
      { test: /serie a/i,            tier: 3,  max: 3 },
      { test: /bundesliga/i,         tier: 4,  max: 3 },
      { test: /champions league/i,   tier: 5,  max: 3 },
      { test: /ligue 1/i,            tier: 6,  max: 3 },
      { test: /\bnba\b/i,            tier: 7,  max: 2 },
      { test: /french open/i,        tier: 8,  max: 2 },
      { test: /ipl|indian premier/i, tier: 9,  max: 2 },
      { test: /mma|ufc/i,            tier: 10, max: 2 },
      { test: /cricket/i,            tier: 11, max: 2 },
    ];

    const getTier = (name: string) => {
      for (const p of LEAGUE_TIERS) {
        if (p.test.test(name)) return { tier: p.tier, max: p.max };
      }
      return { tier: 99, max: 1 };
    };

    type Pair = { match: Match; league: League; tier: number; max: number };
    const pairs: Pair[] = [];

    for (const league of allLeagues) {
      const { tier, max } = getTier(league.name);
      for (const match of league.matches) {
        if (!match.isLive && match.team2) {
          pairs.push({ match, league, tier, max });
        }
      }
    }

    // Sort: league tier first, then today → tomorrow → upcoming
    const DATE_ORDER: Record<string, number> = { today: 0, tomorrow: 1, upcoming: 2 };
    pairs.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (DATE_ORDER[a.match.dateTag] ?? 3) - (DATE_ORDER[b.match.dateTag] ?? 3);
    });

    // Respect per-league caps and total cap
    const leagueCount: Record<string, number> = {};
    const result: { match: Match; league: League }[] = [];
    for (const { match, league, max } of pairs) {
      const seen = leagueCount[league.id] ?? 0;
      if (seen >= max) continue;
      leagueCount[league.id] = seen + 1;
      result.push({ match, league });
      if (result.length >= 18) break;
    }
    return result;
  }, [allLeagues]);

  if (items.length === 0) return null;

  const todayCount    = items.filter(i => i.match.dateTag === 'today').length;
  const tomorrowCount = items.filter(i => i.match.dateTag === 'tomorrow').length;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-[#FB923C]" />
            <h2 className="text-[13px] font-bold text-[#F8FAFC] tracking-tight">Upcoming Matches</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {todayCount > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-[#00DFA9]/12 text-[#00DFA9] px-2 py-0.5 rounded-full border border-[#00DFA9]/20">
                <span className="w-1 h-1 rounded-full bg-[#00DFA9] animate-pulse" />
                {todayCount} today
              </span>
            )}
            {tomorrowCount > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-[#38BDF8]/10 text-[#38BDF8] px-2 py-0.5 rounded-full border border-[#38BDF8]/20">
                {tomorrowCount} tmw
              </span>
            )}
          </div>
        </div>

        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards row */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 w-max pb-3">
          {items.map(({ match, league }) => (
            <MatchCard key={`${league.id}__${match.id}`} match={match} league={league} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
}
