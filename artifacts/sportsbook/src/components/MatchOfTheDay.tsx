import { useMemo } from 'react';
import { SportName } from './SportName';
import { Trophy, Clock, ChevronRight, Activity, TrendingUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { useOddsData } from '../hooks/useOddsData';
import { useLiveOdds, type NormalizedLiveMatch } from '../hooks/useLiveOdds';
import { OddsButton } from './OddsButton';
import type { Match, League } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const SPORT_COLORS: [string, string][] = [
  ['soccer',           '#00DFA9'],
  ['tennis',           '#FACC15'],
  ['basketball',       '#38BDF8'],
  ['americanfootball', '#F97316'],
  ['football',         '#F97316'],
  ['mma',              '#8B5CF6'],
  ['boxing',           '#EC4899'],
  ['cricket',          '#A78BFA'],
  ['rugby',            '#F59E0B'],
  ['baseball',         '#22C55E'],
  ['icehockey',        '#60A5FA'],
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
  ['baseball',         '⚾'],
  ['icehockey',        '🏒'],
];

function getSportColor(s: string): string {
  return SPORT_COLORS.find(([k]) => s.toLowerCase().includes(k))?.[1] ?? '#38BDF8';
}
function getSportEmoji(s: string): string {
  return SPORT_EMOJIS.find(([k]) => s.toLowerCase().includes(k))?.[1] ?? '🏆';
}

function calcWinProbs(homeOdds: number, drawOdds: number | undefined, awayOdds: number) {
  const ih = 1 / homeOdds;
  const id = drawOdds ? 1 / drawOdds : 0;
  const ia = 1 / awayOdds;
  const t  = ih + id + ia;
  return { home: Math.round((ih / t) * 100), draw: drawOdds ? Math.round((id / t) * 100) : null, away: Math.round((ia / t) * 100) };
}

// ── Pre-match pick ─────────────────────────────────────────────────────────────

function pickPreMatch(allLeagues: League[]): { match: Match; league: League } | null {
  let top: { match: Match; league: League } | null = null;
  let topScore = -1;
  for (const league of allLeagues) {
    for (const match of league.matches) {
      if (!match.odds) continue;
      let score = 0;
      if (match.dateTag === 'today')     score = 1000 + (match.marketCount ?? 0) * 10;
      else if (match.dateTag === 'tomorrow') score = 500 + (match.marketCount ?? 0) * 10;
      else                               score = (match.marketCount ?? 0) * 10;
      if (score > topScore) { topScore = score; top = { match, league }; }
    }
  }
  return top;
}

// ── Team avatar ────────────────────────────────────────────────────────────────

function TeamAvatar({ initials, color, size = 'md' }: { initials: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 56 : size === 'md' ? 44 : 32;
  const fs  = size === 'lg' ? 16  : size === 'md' ? 13  : 10;
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-black shrink-0 relative"
      style={{ width: dim, height: dim, fontSize: fs }}
    >
      {/* Glow */}
      <div className="absolute inset-0 rounded-2xl blur-md opacity-30"
        style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
      <div className="relative rounded-2xl w-full h-full flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color}22, ${color}0A)`,
          border: `1.5px solid ${color}35`,
          color,
        }}>
        {initials}
      </div>
    </div>
  );
}

// ── Pre-match card ─────────────────────────────────────────────────────────────

function PreMatchCard({ match, league }: { match: Match; league: League }) {
  const [, setLocation] = useLocation();
  const color    = getSportColor(match.sportId ?? league.sportKey ?? '');
  const emoji    = getSportEmoji(match.sportId ?? league.sportKey ?? '');
  const init1    = teamInitials(match.team1);
  const init2    = teamInitials(match.team2);
  const matchId  = match.id;
  const name     = `${match.team1} vs ${match.team2}`;
  const marketId = `${matchId}-h2h`;
  const probs    = match.odds?.home && match.odds?.away
    ? calcWinProbs(match.odds.home, match.odds.draw, match.odds.away)
    : null;

  const sharedProps = {
    matchId, marketId, matchName: name, leagueName: league.name,
    marketName: 'Match Result', isLive: false, sportKey: league.sportKey,
    sportId: match.sportId, kickoffTime: match.kickoffTime,
    commenceTime: match.commenceIso, homeTeam: match.team1, awayTeam: match.team2,
  };

  const hasDraw = match.odds?.draw != null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background:  'linear-gradient(160deg, #0E1824 0%, #0B1320 55%, #080D14 100%)',
        border:      `1px solid ${color}25`,
        boxShadow:   `0 4px 32px ${color}0C, 0 1px 0 ${color}10 inset`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${color}18, 0 1px 0 ${color}15 inset`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 32px ${color}0C, 0 1px 0 ${color}10 inset`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}25`;
      }}
    >
      {/* Top accent */}
      <div className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${color} 30%, ${color}80 70%, transparent 100%)` }} />

      <div className="px-4 sm:px-5 pt-4 pb-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Trophy className="h-3 w-3" style={{ color }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>
              Match of the Day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#94A3B8]/45 hidden sm:inline truncate max-w-[140px]">
              {emoji} <SportName name={league.name} />
            </span>
            {match.kickoffTime && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-[#94A3B8]/60 bg-[#1A2535] border border-[#253241] px-2 py-0.5 rounded-full whitespace-nowrap">
                <Clock className="h-2.5 w-2.5" />
                {match.kickoffTime}
              </span>
            )}
          </div>
        </div>

        {/* ── Teams + VS ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 sm:gap-5 mb-5">

          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <TeamAvatar initials={init1} color={color} size="lg" />
            <div>
              <span className="text-[12px] sm:text-[13px] font-bold text-[#F8FAFC] leading-tight line-clamp-2 block">{match.team1}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 block" style={{ color: `${color}70` }}>Home</span>
            </div>
          </div>

          {/* VS centre */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full opacity-15 animate-pulse"
                style={{ background: `conic-gradient(${color}, #38BDF8, ${color})` }} />
              <div className="absolute inset-[3px] rounded-full" style={{ background: '#0B0F14' }} />
              <span className="relative text-[10px] font-black text-[#94A3B8]/60 tracking-wider">VS</span>
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-[#2A3A52]">Kickoff</span>
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <TeamAvatar initials={init2} color="#475569" size="lg" />
            <div>
              <span className="text-[12px] sm:text-[13px] font-bold text-[#F8FAFC] leading-tight line-clamp-2 block">{match.team2}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 block text-[#475569]/70">Away</span>
            </div>
          </div>
        </div>

        {/* ── Win probability ────────────────────────────────────────── */}
        {probs && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-2.5 w-2.5 text-[#94A3B8]/30" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#94A3B8]/30">Win Probability</span>
            </div>
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
              <div className="rounded-l-full" style={{ width: `${probs.home}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
              {probs.draw !== null && (
                <div style={{ width: `${probs.draw}%`, background: '#253241' }} />
              )}
              <div className="rounded-r-full" style={{ width: `${probs.away}%`, background: 'linear-gradient(90deg, #2A4060, #38BDF8)' }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-bold" style={{ color }}>{probs.home}%</span>
              {probs.draw !== null && <span className="text-[9px] text-[#94A3B8]/40">Draw {probs.draw}%</span>}
              <span className="text-[9px] font-bold text-[#38BDF8]">{probs.away}%</span>
            </div>
          </div>
        )}

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#1E2D3D]">Markets</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}20)` }} />
        </div>

        {/* ── Odds row ───────────────────────────────────────────────── */}
        <div
          className={`grid gap-2 ${hasDraw ? 'grid-cols-3' : 'grid-cols-2'}`}
          onClick={e => e.stopPropagation()}
        >
          {[
            { type: 'home', label: 'Home', short: '1', name: match.team1, odds: match.odds?.home },
            hasDraw ? { type: 'draw', label: 'Draw', short: 'X', name: 'Draw', odds: match.odds?.draw } : null,
            { type: 'away', label: 'Away', short: '2', name: match.team2, odds: match.odds?.away },
          ].filter(Boolean).map(s => s && s.odds ? (
            <div key={s.type} className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#475569]">{hasDraw ? s.short : s.label}</span>
              <OddsButton {...sharedProps} selectionType={s.type} selectionName={s.name} odds={s.odds} className="w-full" />
            </div>
          ) : <div key={s?.type} />)}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <button
          onClick={() => setLocation(`/match/${matchId}`)}
          className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-150"
          style={{
            color:       `${color}90`,
            background:  `${color}08`,
            border:      `1px solid ${color}18`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = `${color}15`;
            (e.currentTarget as HTMLElement).style.color = color;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = `${color}08`;
            (e.currentTarget as HTMLElement).style.color = `${color}90`;
          }}
        >
          {(match.marketCount ?? 0) > 0 && (
            <Activity className="h-3 w-3" />
          )}
          View all {match.marketCount ?? ''} markets
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Live card ─────────────────────────────────────────────────────────────────

function LiveCard({ m }: { m: NormalizedLiveMatch }) {
  const [, setLocation] = useLocation();
  const color  = getSportColor(m.sport);
  const emoji  = getSportEmoji(m.sport);
  const init1  = teamInitials(m.homeTeam);
  const init2  = teamInitials(m.awayTeam);
  const name   = `${m.homeTeam} vs ${m.awayTeam}`;
  const hasScore = m.homeScore !== '-' && m.awayScore !== '-';

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background:  'linear-gradient(160deg, #0E1824 0%, #0B1320 55%, #080D14 100%)',
        border:      `1px solid ${color}25`,
        boxShadow:   `0 4px 32px ${color}0C, 0 1px 0 ${color}10 inset`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${color}18, 0 1px 0 ${color}15 inset`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 32px ${color}0C, 0 1px 0 ${color}10 inset`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}25`;
      }}
    >
      <div className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent 0%, #EF4444 30%, ${color}80 70%, transparent 100%)` }} />

      <div className="px-4 sm:px-5 pt-4 pb-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Trophy className="h-3 w-3" style={{ color }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color }}>
              Match of the Day
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#94A3B8]/45 hidden sm:inline truncate max-w-[120px]">
              {emoji} <SportName name={m.league} />
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-black text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              LIVE {m.timerMin != null ? `${m.timerMin}'` : ''}
            </span>
          </div>
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-3 sm:gap-5 mb-5">
          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <TeamAvatar initials={init1} color={color} size="lg" />
            <span className="text-[12px] sm:text-[13px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">{m.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            {hasScore ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5">
                <span className="text-[28px] sm:text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">{m.homeScore}</span>
                <span className="text-[16px] font-black text-[#2A3A52] leading-none">–</span>
                <span className="text-[28px] sm:text-[34px] font-black text-[#F8FAFC] tabular-nums leading-none">{m.awayScore}</span>
              </div>
            ) : (
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full opacity-15 animate-pulse"
                  style={{ background: `conic-gradient(${color}, #38BDF8, ${color})` }} />
                <div className="absolute inset-[3px] rounded-full" style={{ background: '#0B0F14' }} />
                <span className="relative text-[10px] font-black text-[#94A3B8]/60">VS</span>
              </div>
            )}
            <span className="text-[8px] font-semibold uppercase tracking-widest text-[#2A3A52]">
              {hasScore ? 'Score' : 'Live'}
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2.5 text-center min-w-0">
            <TeamAvatar initials={init2} color="#475569" size="lg" />
            <span className="text-[12px] sm:text-[13px] font-bold text-[#F8FAFC] leading-tight line-clamp-2">{m.awayTeam}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${color}20, transparent)` }} />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#1E2D3D]">Markets</span>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}20)` }} />
        </div>

        {/* Odds */}
        <div className={`grid gap-2 ${m.outcomes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
          onClick={e => e.stopPropagation()}>
          {m.outcomes.map((o) => (
            <div key={o.key} className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#475569]">
                {o.key === 'home' ? '1' : o.key === 'draw' ? 'X' : '2'}
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

        {/* Footer */}
        <button
          onClick={() => setLocation(`/match/${m.id}`)}
          className="mt-3.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-150"
          style={{ color: `${color}90`, background: `${color}08`, border: `1px solid ${color}18` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}15`; (e.currentTarget as HTMLElement).style.color = color; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}08`; (e.currentTarget as HTMLElement).style.color = `${color}90`; }}
        >
          View all markets <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function MatchOfTheDay() {
  const { allLeagues }  = useOddsData();
  const { matches: liveMatches, loading: liveLoading } = useLiveOdds();
  const preMatch = useMemo(() => pickPreMatch(allLeagues), [allLeagues]);

  if (preMatch) return <PreMatchCard match={preMatch.match} league={preMatch.league} />;

  if (!liveLoading && liveMatches.length > 0) {
    const best = [...liveMatches].sort((a, b) => b.outcomes.length - a.outcomes.length)[0];
    return <LiveCard m={best} />;
  }

  return null;
}
