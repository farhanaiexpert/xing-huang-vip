import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useOddsData } from '../hooks/useOddsData';
import { useLiveOdds, type NormalizedLiveMatch } from '../hooks/useLiveOdds';
import { OddsButton } from './OddsButton';
import type { Match, League } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const SPORT_COLORS: [string, string][] = [
  ['soccer',           '#22C55E'],
  ['tennis',           '#FACC15'],
  ['basketball',       '#F97316'],
  ['americanfootball', '#EF4444'],
  ['football',         '#EF4444'],
  ['mma',              '#8B5CF6'],
  ['boxing',           '#EC4899'],
  ['cricket',          '#06B6D4'],
  ['rugby',            '#F59E0B'],
];

const SPORT_EMOJIS: [string, string][] = [
  ['soccer',           '⚽'],
  ['tennis',           '🎾'],
  ['basketball',       '🏀'],
  ['americanfootball', '🏈'],
  ['football',         '🏈'],
  ['mma',              '🥊'],
  ['boxing',           '🥊'],
  ['cricket',          '🏏'],
  ['rugby',            '🏉'],
];

function getSportColor(s: string): string {
  return SPORT_COLORS.find(([k]) => s.toLowerCase().includes(k))?.[1] ?? '#38BDF8';
}
function getSportEmoji(s: string): string {
  return SPORT_EMOJIS.find(([k]) => s.toLowerCase().includes(k))?.[1] ?? '🏆';
}

// ── Pre-match pick ─────────────────────────────────────────────────────────────

function pickPreMatch(
  allLeagues: League[],
): { match: Match; league: League } | null {
  let top: { match: Match; league: League } | null = null;
  let topScore = -1;

  for (const league of allLeagues) {
    for (const match of league.matches) {
      if (!match.odds) continue;

      let score = 0;
      if (match.dateTag === 'today')    score = 1000 + (match.marketCount ?? 0) * 10;
      else if (match.dateTag === 'tomorrow') score = 500 + (match.marketCount ?? 0) * 10;
      else                              score = (match.marketCount ?? 0) * 10;

      if (score > topScore) { topScore = score; top = { match, league }; }
    }
  }
  return top;
}

// ── Card shell ─────────────────────────────────────────────────────────────────

interface CardProps {
  color: string;
  emoji: string;
  leagueName: string;
  team1: string;
  team2: string;
  init1: string;
  init2: string;
  scoreLine: React.ReactNode;
  scoreLabel: string;
  timeBadge: React.ReactNode;
  oddsRow: React.ReactNode;
}

function MotdCard({
  color, emoji, leagueName,
  team1, team2, init1, init2,
  scoreLine, scoreLabel, timeBadge, oddsRow,
}: CardProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5"
      style={{
        background: 'linear-gradient(135deg, #0D1520 0%, #0F1B2A 65%, #0A1018 100%)',
        border: `1px solid ${color}1A`,
        boxShadow: `0 4px 32px ${color}0A, inset 0 1px 0 ${color}12`,
      }}
    >
      {/* Accent stripe */}
      <div className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="px-3 sm:px-5 pt-4 pb-4 sm:pb-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>
              Match of the Day
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#94A3B8]/50 truncate max-w-[160px]">
              {emoji} {leagueName}
            </span>
            {timeBadge}
          </div>
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-between gap-3 mb-6">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-sm sm:text-base font-black shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color}1A, ${color}0A)`,
                border: `1.5px solid ${color}2A`,
                color,
              }}
            >
              {init1}
            </div>
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">{team1}</span>
          </div>

          {/* Score / VS */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {scoreLine}
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#2A3A52]">
              {scoreLabel}
            </span>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-sm sm:text-base font-black shadow-lg shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1E2A38, #141F2C)',
                border: '1.5px solid #253241',
                color: '#8899AA',
              }}
            >
              {init2}
            </div>
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">{team2}</span>
          </div>
        </div>

        {/* Odds */}
        {oddsRow}
      </div>
    </div>
  );
}

// ── Pre-match variant ──────────────────────────────────────────────────────────

function PreMatchCard({ match, league }: { match: Match; league: League }) {
  const color    = getSportColor(match.sportId ?? league.sportKey ?? '');
  const emoji    = getSportEmoji(match.sportId ?? league.sportKey ?? '');
  const init1    = teamInitials(match.team1);
  const init2    = teamInitials(match.team2);
  const name     = `${match.team1} vs ${match.team2}`;
  const marketId = `${match.id}-h2h`;

  const timeBadge = match.kickoffTime ? (
    <span className="text-[10px] font-semibold text-[#94A3B8]/50 bg-[#1A2535] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
      {match.kickoffTime}
    </span>
  ) : null;

  const scoreLine = (
    <span className="text-[22px] font-black leading-none" style={{ color: `${color}50` }}>VS</span>
  );

  const sharedProps = {
    matchId: match.id, marketId, matchName: name, leagueName: league.name,
    marketName: 'Match Result', isLive: false, sportKey: league.sportKey,
    sportId: match.sportId, kickoffTime: match.kickoffTime,
    commenceTime: match.commenceIso, homeTeam: match.team1, awayTeam: match.team2,
  };

  const oddsRow = (
    <div className="grid grid-cols-3 gap-2">
      {[
        { type: 'home', label: 'Home', name: match.team1, odds: match.odds?.home },
        { type: 'draw', label: 'Draw', name: 'Draw',       odds: match.odds?.draw },
        { type: 'away', label: 'Away', name: match.team2, odds: match.odds?.away },
      ].map(({ type, label, name: selName, odds }) =>
        odds ? (
          <div key={type} className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-semibold text-[#94A3B8]/40 uppercase tracking-wider">{label}</span>
            <OddsButton {...sharedProps} selectionType={type} selectionName={selName} odds={odds} className="w-full" />
          </div>
        ) : <div key={type} />
      )}
    </div>
  );

  return (
    <MotdCard
      color={color} emoji={emoji} leagueName={league.name}
      team1={match.team1} team2={match.team2} init1={init1} init2={init2}
      scoreLine={scoreLine} scoreLabel="Kickoff" timeBadge={timeBadge}
      oddsRow={oddsRow}
    />
  );
}

// ── Live variant ───────────────────────────────────────────────────────────────

function LiveCard({ m }: { m: NormalizedLiveMatch }) {
  const color  = getSportColor(m.sport);
  const emoji  = getSportEmoji(m.sport);
  const init1  = teamInitials(m.homeTeam);
  const init2  = teamInitials(m.awayTeam);
  const name   = `${m.homeTeam} vs ${m.awayTeam}`;

  const timeBadge = (
    <span className="flex items-center gap-1 text-[10px] font-black text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-full shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
      {m.timerMin != null ? `${m.timerMin}'` : 'LIVE'}
    </span>
  );

  const hasScore = m.homeScore !== '-' && m.awayScore !== '-';
  const scoreLine = hasScore ? (
    <div className="flex items-center gap-1.5">
      <span className="text-[26px] sm:text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">{m.homeScore}</span>
      <span className="text-[16px] sm:text-[18px] font-black text-[#2A3A52] leading-none">–</span>
      <span className="text-[26px] sm:text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">{m.awayScore}</span>
    </div>
  ) : (
    <span className="text-[22px] font-black leading-none" style={{ color: `${color}50` }}>VS</span>
  );

  const oddsRow = (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {m.outcomes.map((o) => (
        <div key={o.key} className="flex flex-col items-center gap-1.5">
          <span className="text-[9px] font-semibold text-[#94A3B8]/40 uppercase tracking-wider">
            {o.key === 'home' ? 'Home' : o.key === 'draw' ? 'Draw' : 'Away'}
          </span>
          <OddsButton
            matchId={m.id} marketId={`${m.id}-h2h`} matchName={name}
            leagueName={m.league} marketName="Match Result"
            selectionType={o.key} selectionName={o.name} odds={o.baseOdds}
            isLive commenceTime={m.commenceIso} homeTeam={m.homeTeam}
            awayTeam={m.awayTeam} sportKey={m.sportKey}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );

  return (
    <MotdCard
      color={color} emoji={emoji} leagueName={m.league}
      team1={m.homeTeam} team2={m.awayTeam} init1={init1} init2={init2}
      scoreLine={scoreLine} scoreLabel={hasScore ? 'Score' : 'Live'} timeBadge={timeBadge}
      oddsRow={oddsRow}
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MatchOfTheDay() {
  const { allLeagues } = useOddsData();
  const { matches: liveMatches, loading: liveLoading } = useLiveOdds();

  const preMatch = useMemo(() => pickPreMatch(allLeagues), [allLeagues]);

  // Prefer pre-match (richer odds), fall back to best live event
  if (preMatch) return <PreMatchCard match={preMatch.match} league={preMatch.league} />;

  if (!liveLoading && liveMatches.length > 0) {
    // Pick live match with most outcomes (most markets)
    const best = [...liveMatches].sort((a, b) => b.outcomes.length - a.outcomes.length)[0];
    return <LiveCard m={best} />;
  }

  return null;
}
