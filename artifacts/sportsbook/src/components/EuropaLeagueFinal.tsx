/**
 * EuropaLeagueFinal — Featured Soccer Match
 * Shows the top upcoming soccer match from the real Odds API.
 * Returns null when no soccer data is available.
 */
import { useMemo } from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { SportName } from './SportName';
import { useOddsData } from '../hooks/useOddsData';
import type { Match, League } from '../types';

function isSoccerLeague(l: League): boolean {
  return (
    l.sportKey?.startsWith('soccer_') === true ||
    l.sportId === 'sp_soccer' ||
    l.sportId === 'sp_ucl'
  );
}

function TeamInitials({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className="rounded-xl shrink-0 flex items-center justify-center font-black text-white bg-[#253241]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function EuropaLeagueFinal() {
  const { allLeagues } = useOddsData();

  // Pick the first upcoming (non-live) soccer match with the most markets
  const { match, league } = useMemo<{ match: Match | null; league: League | null }>(() => {
    let best: { match: Match; league: League } | null = null;
    for (const l of allLeagues) {
      if (!isSoccerLeague(l)) continue;
      for (const m of l.matches) {
        if (m.isLive) continue;
        if (!best || (m.marketCount ?? 0) > (best.match.marketCount ?? 0)) {
          best = { match: m, league: l };
        }
      }
    }
    return best ?? { match: null, league: null };
  }, [allLeagues]);

  if (!match || !league) return null;

  const matchName = `${match.team1} vs ${match.team2}`;
  const timeLabel = match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
  const shared = {
    matchId:    match.id,
    marketId:   `feat_1x2_${match.id}`,
    matchName,
    leagueName: league.name,
    marketName: 'Match Result',
    sportKey:   match.sportKey ?? match.sportId ?? '',
  };

  return (
    <div
      className="mb-5 rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0D1F35 0%, #0A1520 60%, #0B0F14 100%)',
        border:     '1px solid rgba(56,189,248,0.18)',
        boxShadow:  '0 4px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(56,189,248,0.08)',
      }}
    >
      {/* Top stripe */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#38BDF8] via-[#00DFA9] to-transparent" />

      <div className="px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)' }}
            >
              <Trophy className="w-3.5 h-3.5 text-[#38BDF8]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#38BDF8]/70 uppercase tracking-widest leading-none mb-0.5">
                Featured Match
              </p>
              <h3 className="text-[12px] font-bold text-[#F8FAFC]/80 leading-none truncate max-w-[220px]">
                <SportName name={league.name} />
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#94A3B8]/40 font-medium">{timeLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#38BDF8]/40" />
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamInitials name={match.team1} size={48} />
            <span className="text-[12px] font-semibold text-[#F8FAFC] text-center leading-tight line-clamp-2">
              {match.team1}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-[10px] font-bold text-[#94A3B8]/30 uppercase tracking-widest">VS</span>
            {(match.marketCount ?? 0) > 0 && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(56,189,248,0.08)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
              >
                +{match.marketCount} markets
              </span>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <TeamInitials name={match.team2} size={48} />
            <span className="text-[12px] font-semibold text-[#94A3B8] text-center leading-tight line-clamp-2">
              {match.team2}
            </span>
          </div>
        </div>

        {/* 1X2 odds */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] text-[#94A3B8]/35 font-medium uppercase tracking-wider">Home</span>
            <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
          </div>
          {match.odds.draw != null && (
            <div className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[9px] text-[#94A3B8]/35 font-medium uppercase tracking-wider">Draw</span>
              <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
            </div>
          )}
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] text-[#94A3B8]/35 font-medium uppercase tracking-wider">Away</span>
            <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
          </div>
        </div>
      </div>
    </div>
  );
}
