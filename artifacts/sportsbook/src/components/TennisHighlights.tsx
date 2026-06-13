import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useOddsData } from '../hooks/useOddsData';
import { SportName } from './SportName';
import { TeamBadge } from './TeamBadge';
import type { Match, League } from '../types';

// ── Sport detection ───────────────────────────────────────────────────────────
function isTennisLeague(l: League): boolean {
  return (
    l.sportKey?.startsWith('tennis_') === true ||
    l.sportId === 'sp_tennis'
  );
}

// ── Single match row ──────────────────────────────────────────────────────────
function TennisMatchRow({ match, league }: { match: Match; league: League }) {
  const [, setLocation] = useLocation();
  const goToMatch = () => setLocation(`/match/${match.id}`);
  const matchName = `${match.team1} v ${match.team2}`;
  const timeLabel = match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
  const shared = {
    matchId:    match.id,
    marketId:   `ten_mw_${match.id}`,
    matchName,
    leagueName: league.name,
    marketName: 'To Win Match',
    sportKey:   match.sportKey ?? match.sportId ?? '',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToMatch}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToMatch(); } }}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-[#253241]/50 hover:bg-[#121821]/60 transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00DFA9]/40"
    >
      {/* Players + time */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TeamBadge name={match.team1} sportId="sp_tennis" size={18} />
          <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        </div>
        <div className="flex items-center gap-2">
          <TeamBadge name={match.team2} sportId="sp_tennis" size={18} />
          <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">{match.team2}</span>
        </div>
        <span className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5">{timeLabel}</span>
      </div>

      {/* Market count placeholder */}
      {(match.marketCount ?? 0) > 0 && (
        <span className="text-[10px] text-[#94A3B8]/30 font-medium tabular-nums hidden md:block shrink-0">
          +{match.marketCount}
        </span>
      )}

      {/* Odds buttons */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
        <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
        <div className="w-3" />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function TennisHighlights({ onViewAll }: { onViewAll?: () => void } = {}) {
  const { allLeagues } = useOddsData();

  const { pairs, leagueLabel } = useMemo(() => {
    const result: { match: Match; league: League }[] = [];
    const names: string[] = [];
    for (const league of allLeagues) {
      if (!isTennisLeague(league)) continue;
      names.push(league.name);
      for (const match of league.matches) result.push({ match, league });
    }
    return {
      pairs: result,
      leagueLabel: [...new Set(names)].slice(0, 3).join(' · ') || 'Tennis',
    };
  }, [allLeagues]);

  if (pairs.length === 0) return null;

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg,rgba(250,204,21,0.2),rgba(250,204,21,0.05))',
            border:     '1px solid rgba(250,204,21,0.3)',
            boxShadow:  '0 2px 8px rgba(250,204,21,0.12)',
          }}
        >
          <span className="text-[15px] leading-none">🎾</span>
        </div>
        <div>
          <h2 className="text-[14px] font-black text-[#F8FAFC] uppercase tracking-wide leading-none"><SportName name="Tennis" /></h2>
          <p className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5 hidden sm:block">{leagueLabel}</p>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[#253241] to-transparent" />
        <button onClick={onViewAll} className="flex items-center gap-0.5 text-[11px] font-semibold text-[#38BDF8] hover:text-[#38BDF8]/80 transition-colors shrink-0">
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
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ borderColor: '#1E2D3D', background: 'rgba(11,15,20,0.6)' }}
        >
          <span className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-wider">{today}</span>
          <div className="flex items-center gap-1 shrink-0 mr-8">
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">P1</div>
            <div className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">P2</div>
          </div>
        </div>

        {pairs.slice(0, 8).map(({ match, league }) => (
          <TennisMatchRow key={match.id} match={match} league={league} />
        ))}
      </div>
    </div>
  );
}
