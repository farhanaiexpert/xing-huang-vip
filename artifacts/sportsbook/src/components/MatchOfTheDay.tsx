import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useOddsData } from '../hooks/useOddsData';
import { OddsButton } from './OddsButton';
import type { Match, League } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const SPORT_COLORS: [string, string][] = [
  ['soccer',          '#22C55E'],
  ['tennis',          '#FACC15'],
  ['basketball',      '#F97316'],
  ['americanfootball','#EF4444'],
  ['mma',             '#8B5CF6'],
  ['boxing',          '#EC4899'],
  ['cricket',         '#06B6D4'],
  ['rugby',           '#F59E0B'],
];

const SPORT_EMOJIS: [string, string][] = [
  ['soccer',          '⚽'],
  ['tennis',          '🎾'],
  ['basketball',      '🏀'],
  ['americanfootball','🏈'],
  ['mma',             '🥊'],
  ['boxing',          '🥊'],
  ['cricket',         '🏏'],
  ['rugby',           '🏉'],
];

function getSportColor(sportId: string): string {
  return SPORT_COLORS.find(([k]) => sportId.includes(k))?.[1] ?? '#38BDF8';
}

function getSportEmoji(sportId: string): string {
  return SPORT_EMOJIS.find(([k]) => sportId.includes(k))?.[1] ?? '🏆';
}

function pickBestMatch(
  allLeagues: League[],
): { match: Match; league: League } | null {
  let top: { match: Match; league: League } | null = null;
  let topScore = -1;

  for (const league of allLeagues) {
    for (const match of league.matches) {
      if (!match.odds?.home || !match.odds?.away) continue;

      let score = 0;
      if (match.isLive && match.score)     score = 2000;
      else if (match.isLive)               score = 1800;
      else if (match.dateTag === 'today')  score = 1000 + (match.marketCount ?? 0) * 10;
      else if (match.dateTag === 'tomorrow') score = 500 + (match.marketCount ?? 0) * 10;
      else                                 score = (match.marketCount ?? 0) * 10;

      if (score > topScore) {
        topScore = score;
        top = { match, league };
      }
    }
  }
  return top;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MatchOfTheDay() {
  const { allLeagues } = useOddsData();

  const best = useMemo(() => pickBestMatch(allLeagues), [allLeagues]);

  if (!best) return null;

  const { match, league } = best;
  const color    = getSportColor(match.sportId ?? '');
  const emoji    = getSportEmoji(match.sportId ?? '');
  const init1    = teamInitials(match.team1);
  const init2    = teamInitials(match.team2);
  const name     = `${match.team1} vs ${match.team2}`;
  const marketId = `${match.id}-h2h`;

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5"
      style={{
        background:
          'linear-gradient(135deg, #0D1520 0%, #0F1B2A 65%, #0A1018 100%)',
        border: `1px solid ${color}1A`,
        boxShadow: `0 4px 32px ${color}0A, inset 0 1px 0 ${color}12`,
      }}
    >
      {/* Top accent stripe */}
      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${color} 60%, transparent 100%)`,
        }}
      />

      <div className="px-5 pt-4 pb-5">

        {/* ── Header row ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color }}
            >
              Match of the Day
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#94A3B8]/50 truncate max-w-[160px]">
              {emoji} {league.name}
            </span>

            {match.isLive ? (
              <span className="flex items-center gap-1 text-[10px] font-black text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                {match.liveMinute != null ? `${match.liveMinute}'` : 'LIVE'}
              </span>
            ) : match.kickoffTime ? (
              <span className="text-[10px] font-semibold text-[#94A3B8]/50 bg-[#1A2535] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                {match.kickoffTime}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Teams + score/VS ── */}
        <div className="flex items-center justify-between gap-3 mb-6">

          {/* Home team */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-black shadow-lg shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color}1A, ${color}0A)`,
                border: `1.5px solid ${color}2A`,
                color,
              }}
            >
              {init1}
            </div>
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">
              {match.team1}
            </span>
          </div>

          {/* Score / VS */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {match.score ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">
                  {match.score.home}
                </span>
                <span className="text-[18px] font-black text-[#2A3A52] leading-none">–</span>
                <span className="text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">
                  {match.score.away}
                </span>
              </div>
            ) : (
              <span
                className="text-[22px] font-black leading-none"
                style={{ color: `${color}50` }}
              >
                VS
              </span>
            )}
            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#2A3A52]">
              {match.isLive ? 'Score' : 'Kickoff'}
            </span>
          </div>

          {/* Away team */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-base font-black shadow-lg shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1E2A38, #141F2C)',
                border: '1.5px solid #253241',
                color: '#8899AA',
              }}
            >
              {init2}
            </div>
            <span className="text-[12px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">
              {match.team2}
            </span>
          </div>
        </div>

        {/* ── Odds row ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Home */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-semibold text-[#94A3B8]/40 uppercase tracking-wider">
              Home
            </span>
            <OddsButton
              matchId={match.id}
              marketId={marketId}
              matchName={name}
              leagueName={league.name}
              marketName="Match Result"
              selectionType="home"
              selectionName={match.team1}
              odds={match.odds.home}
              isLive={match.isLive}
              sportKey={league.sportKey}
              sportId={match.sportId}
              kickoffTime={match.kickoffTime}
              commenceTime={match.commenceIso}
              homeTeam={match.team1}
              awayTeam={match.team2}
              className="w-full"
            />
          </div>

          {/* Draw (only if odds exist) */}
          {match.odds.draw ? (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-semibold text-[#94A3B8]/40 uppercase tracking-wider">
                Draw
              </span>
              <OddsButton
                matchId={match.id}
                marketId={marketId}
                matchName={name}
                leagueName={league.name}
                marketName="Match Result"
                selectionType="draw"
                selectionName="Draw"
                odds={match.odds.draw}
                isLive={match.isLive}
                sportKey={league.sportKey}
                sportId={match.sportId}
                kickoffTime={match.kickoffTime}
                commenceTime={match.commenceIso}
                homeTeam={match.team1}
                awayTeam={match.team2}
                className="w-full"
              />
            </div>
          ) : (
            <div />
          )}

          {/* Away */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-semibold text-[#94A3B8]/40 uppercase tracking-wider">
              Away
            </span>
            <OddsButton
              matchId={match.id}
              marketId={marketId}
              matchName={name}
              leagueName={league.name}
              marketName="Match Result"
              selectionType="away"
              selectionName={match.team2}
              odds={match.odds.away}
              isLive={match.isLive}
              sportKey={league.sportKey}
              sportId={match.sportId}
              kickoffTime={match.kickoffTime}
              commenceTime={match.commenceIso}
              homeTeam={match.team1}
              awayTeam={match.team2}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
