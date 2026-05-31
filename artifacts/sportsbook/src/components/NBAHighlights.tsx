import { useMemo } from 'react';
import { ChevronRight, BarChart2 } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useOddsData } from '../hooks/useOddsData';
import type { Match, League } from '../types';

// ── Sport detection ───────────────────────────────────────────────────────────
function isBasketballLeague(l: League): boolean {
  return (
    l.sportKey?.startsWith('basketball_') === true ||
    l.sportId === 'sp_basketball' ||
    l.sportId === 'sp_nba'
  );
}

// ── Simple initials badge ─────────────────────────────────────────────────────
function TeamInitials({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className="rounded shrink-0 flex items-center justify-center font-black text-white bg-[#253241]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ── Single match row ──────────────────────────────────────────────────────────
function MatchRow({ match, league }: { match: Match; league: League }) {
  const matchName  = `${match.team1} vs ${match.team2}`;
  const timeLabel  = match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
  const shared = {
    matchId:    match.id,
    marketId:   `nba_mw_${match.id}`,
    matchName,
    leagueName: league.name,
    marketName: 'Match Winner',
    sportKey:   match.sportKey ?? match.sportId ?? '',
  };

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
      style={{ borderColor: 'rgba(37,50,65,0.5)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,204,21,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
    >
      {/* Time / live badge */}
      <div className="w-[42px] shrink-0 text-right">
        {match.isLive ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-0.5 text-[9px] font-black text-[#EF4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
            </span>
          </div>
        ) : (
          <span className="text-[10.5px] text-[#94A3B8]/50 font-semibold">{timeLabel}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TeamInitials name={match.team1} size={20} />
          <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        </div>
        <div className="flex items-center gap-2">
          <TeamInitials name={match.team2} size={20} />
          <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate">{match.team2}</span>
        </div>
      </div>

      {/* Market count badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <BarChart2 className="w-3 h-3 text-[#94A3B8]/20 hidden sm:block" />
        {(match.marketCount ?? 0) > 0 && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ background: 'rgba(250,204,21,0.1)', color: '#FACC15', border: '1px solid rgba(250,204,21,0.2)' }}
          >
            +{match.marketCount}
          </span>
        )}
      </div>

      {/* Home / Away odds */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
        <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function NBAHighlights() {
  const { allLeagues } = useOddsData();

  const { pairs, leagueLabel } = useMemo(() => {
    const result: { match: Match; league: League }[] = [];
    const names: string[] = [];
    for (const league of allLeagues) {
      if (!isBasketballLeague(league)) continue;
      names.push(league.name);
      for (const match of league.matches) result.push({ match, league });
    }
    return {
      pairs: result,
      leagueLabel: [...new Set(names)].slice(0, 3).join(' · ') || 'Basketball',
    };
  }, [allLeagues]);

  if (pairs.length === 0) return null;

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">🏀</span>
        <span className="text-[13px] font-bold text-[#F8FAFC]">Basketball</span>
        <span className="text-[10px] text-[#94A3B8]/40 hidden sm:block">{leagueLabel}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Match table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border:     '1px solid #253241',
          background: 'linear-gradient(180deg,#18212B 0%,#141C26 100%)',
          boxShadow:  '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        {/* Column header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: '#253241', background: 'rgba(13,21,32,0.5)' }}
        >
          <span className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-wider">
            Match Winner
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">Home</div>
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">Away</div>
          </div>
        </div>

        {pairs.slice(0, 8).map(({ match, league }) => (
          <MatchRow key={match.id} match={match} league={league} />
        ))}
      </div>
    </div>
  );
}
