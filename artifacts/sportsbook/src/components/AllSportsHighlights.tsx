/**
 * AllSportsHighlights — shows real match data for every sport currently active.
 * Covers American Football, Baseball, MMA, Rugby League, Cricket, Aussie Rules
 * and anything else returned by the Odds API that isn't already handled by the
 * sport-specific Soccer / Tennis / Basketball components.
 */
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useOddsData } from '../hooks/useOddsData';
import { SportName } from './SportName';
import type { Match, League } from '../types';

// ── Sport config ──────────────────────────────────────────────────────────────

interface SportConfig {
  prefix:      string;
  label:       string;
  emoji:       string;
  color:       string;
  marketName:  string;
  hasDraw?:    boolean;
}

const SPORT_CONFIGS: SportConfig[] = [
  // ── Odds API sports ───────────────────────────────────────────────────────────
  { prefix: 'americanfootball_',             label: 'American Football', emoji: '🏈', color: '#38BDF8', marketName: 'Match Winner' },
  { prefix: 'baseball_',                     label: 'Baseball',          emoji: '⚾', color: '#00DFA9', marketName: 'Match Winner' },
  { prefix: 'mma_',                          label: 'MMA / UFC',         emoji: '🥊', color: '#EF4444', marketName: 'Fight Winner' },
  { prefix: 'rugbyleague_',                  label: 'Rugby League',      emoji: '🏉', color: '#A78BFA', marketName: 'Match Winner' },
  { prefix: 'rugbyunion_',                   label: 'Rugby Union',       emoji: '🏉', color: '#7C3AED', marketName: 'Match Winner' },
  { prefix: 'aussierules_',                  label: 'Aussie Rules',      emoji: '🦘', color: '#FACC15', marketName: 'Match Winner' },
  { prefix: 'cricket_',                      label: 'Cricket',           emoji: '🏏', color: '#00DFA9', marketName: 'Match Winner' },
  { prefix: 'icehockey_',                    label: 'Ice Hockey',        emoji: '🏒', color: '#38BDF8', marketName: 'Match Winner' },
  { prefix: 'golf_',                         label: 'Golf',              emoji: '⛳', color: '#22C55E', marketName: 'Tournament Winner' },
  { prefix: 'handball_',                     label: 'Handball',          emoji: '🤾', color: '#F97316', marketName: 'Match Winner' },
  { prefix: 'volleyball_',                   label: 'Volleyball',        emoji: '🏐', color: '#EC4899', marketName: 'Match Winner' },
  { prefix: 'darts_',                        label: 'Darts',             emoji: '🎯', color: '#38BDF8', marketName: 'Match Winner' },
  { prefix: 'boxing_',                       label: 'Boxing',            emoji: '🥊', color: '#EF4444', marketName: 'Fight Winner' },
  { prefix: 'snooker_',                      label: 'Snooker',           emoji: '🎱', color: '#22C55E', marketName: 'Match Winner' },
  // ── BetsAPI-only sports (no Odds API equivalent) ──────────────────────────────
  { prefix: 'betsapi_table_tennis',          label: 'Table Tennis',      emoji: '🏓', color: '#00DFA9', marketName: 'Match Winner' },
  { prefix: 'betsapi_golf',                  label: 'Golf',              emoji: '⛳', color: '#22C55E', marketName: 'Match Winner' },
  { prefix: 'betsapi_rugby',                 label: 'Rugby',             emoji: '🏉', color: '#7C3AED', marketName: 'Match Winner' },
  { prefix: 'betsapi_handball',              label: 'Handball',          emoji: '🤾', color: '#F97316', marketName: 'Match Winner' },
  { prefix: 'betsapi_snooker',               label: 'Snooker',           emoji: '🎱', color: '#22C55E', marketName: 'Match Winner' },
  { prefix: 'betsapi_darts',                 label: 'Darts',             emoji: '🎯', color: '#38BDF8', marketName: 'Match Winner' },
];

const SKIP_PREFIXES = ['soccer_', 'basketball_', 'tennis_'];

function getConfig(sportKey: string): SportConfig | null {
  if (SKIP_PREFIXES.some(p => sportKey.startsWith(p))) return null;
  return SPORT_CONFIGS.find(c => sportKey.startsWith(c.prefix)) ?? null;
}

// ── TeamInitials badge ────────────────────────────────────────────────────────

function TeamInitials({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const initials = name
    .split(/[\s/-]/)
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className="rounded shrink-0 flex items-center justify-center font-black text-white"
      style={{
        width:      size,
        height:     size,
        fontSize:   size * 0.38,
        background: `${color}18`,
        border:     `1px solid ${color}30`,
        color,
      }}
    >
      {initials}
    </div>
  );
}

// ── Single match row ──────────────────────────────────────────────────────────

function MatchRow({ match, league, config }: { match: Match; league: League; config: SportConfig }) {
  const matchName = match.team2 ? `${match.team1} vs ${match.team2}` : match.team1;
  const timeLabel = match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
  const shared = {
    matchId:    match.id,
    marketId:   `hl_${match.id}`,
    matchName,
    leagueName: league.name,
    marketName: config.marketName,
    sportKey:   match.sportKey ?? league.sportKey ?? '',
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b transition-colors cursor-pointer"
      style={{ borderColor: 'rgba(37,50,65,0.5)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${config.color}08`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {/* Time / LIVE */}
      <div className="w-[42px] shrink-0 text-right">
        {match.isLive ? (
          <span className="flex items-center justify-end gap-0.5 text-[9px] font-black text-[#EF4444]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
          </span>
        ) : (
          <span className="text-[10.5px] text-[#94A3B8]/50 font-semibold leading-tight text-right block">{timeLabel}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TeamInitials name={match.team1} size={18} color={config.color} />
          <span className="text-[12.5px] font-semibold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        </div>
        {match.team2 && (
          <div className="flex items-center gap-2">
            <TeamInitials name={match.team2} size={18} color="#94A3B8" />
            <span className="text-[12.5px] font-semibold text-[#94A3B8] leading-none truncate">{match.team2}</span>
          </div>
        )}
      </div>

      {/* Market count */}
      {(match.marketCount ?? 0) > 0 && (
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 hidden sm:block"
          style={{ background: `${config.color}15`, color: config.color, border: `1px solid ${config.color}25` }}
        >
          +{match.marketCount}
        </span>
      )}

      {/* Odds */}
      <div className="flex items-center gap-1 shrink-0">
        <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
        {match.odds.draw != null && (
          <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
        )}
        {match.team2 && (
          <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
        )}
      </div>
    </div>
  );
}

// ── One sport section ─────────────────────────────────────────────────────────

interface SportSection {
  config:  SportConfig;
  leagues: { match: Match; league: League }[];
  label:   string;
}

function SportBlock({ section, onSelectSport }: { section: SportSection; onSelectSport?: (id: string) => void }) {
  const { config, leagues, label } = section;
  const handleViewAll = () => {
    const sportId = config.prefix.endsWith('_') ? config.prefix.slice(0, -1) : config.prefix;
    onSelectSport?.(sportId);
    document.getElementById('main-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const hex = config.color;

  return (
    <div className="mb-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[15px]"
          style={{ background: `${hex}18`, border: `1px solid ${hex}30`, boxShadow: `0 2px 8px ${hex}15` }}
        >
          {config.emoji}
        </div>
        <div>
          <h2 className="text-[14px] font-black text-[#F8FAFC] uppercase tracking-wide leading-none">
            <SportName name={config.label} />
          </h2>
          <p className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5 hidden sm:block truncate max-w-[240px]">{label}</p>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button onClick={handleViewAll} className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border:     '1px solid #253241',
          background: '#0E1520',
          boxShadow:  '0 2px 8px rgba(0,0,0,0.18)',
        }}
      >
        {/* Column header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: '#1E2D3D', background: 'rgba(11,15,20,0.6)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: `${hex}60` }}>
            {config.marketName}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">Home</div>
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">Away</div>
          </div>
        </div>

        {leagues.slice(0, 8).map(({ match, league }) => (
          <MatchRow key={match.id} match={match} league={league} config={config} />
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AllSportsHighlights({ onSelectSport }: { onSelectSport?: (id: string) => void } = {}) {
  const { allLeagues } = useOddsData();

  const sections = useMemo<SportSection[]>(() => {
    // Bucket matches by sport config
    const buckets = new Map<string, { config: SportConfig; pairs: { match: Match; league: League }[]; leagueNames: Set<string> }>();

    for (const league of allLeagues) {
      const sk = league.sportKey ?? '';
      const cfg = getConfig(sk);
      if (!cfg) continue;

      if (!buckets.has(cfg.prefix)) {
        buckets.set(cfg.prefix, { config: cfg, pairs: [], leagueNames: new Set() });
      }
      const bucket = buckets.get(cfg.prefix)!;
      bucket.leagueNames.add(league.name);
      for (const match of league.matches) {
        bucket.pairs.push({ match, league });
      }
    }

    return [...buckets.values()]
      .filter(b => b.pairs.length > 0)
      .sort((a, b) => b.pairs.length - a.pairs.length)
      .map(b => ({
        config:  b.config,
        leagues: b.pairs,
        label:   [...b.leagueNames].slice(0, 3).join(' · '),
      }));
  }, [allLeagues]);

  if (sections.length === 0) return null;

  return (
    <>
      {sections.map(section => (
        <SportBlock key={section.config.prefix} section={section} onSelectSport={onSelectSport} />
      ))}
    </>
  );
}
