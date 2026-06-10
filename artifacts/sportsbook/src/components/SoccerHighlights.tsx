import { useState, useMemo } from 'react';
import { ChevronRight, BarChart2, Zap, ShieldCheck, TrendingUp } from 'lucide-react';
import { OddsButton } from './OddsButton';
import { useOddsData } from '../hooks/useOddsData';
import { cn } from '../lib/utils';
import { SportName } from './SportName';
import type { Match, League } from '../types';

// ── Sport detection ───────────────────────────────────────────────────────────
function isSoccerLeague(l: League): boolean {
  return (
    l.sportKey?.startsWith('soccer_') === true ||
    l.sportId === 'sp_soccer' ||
    l.sportId === 'sp_ucl'
  );
}

// ── Simple initials badge (replaces bet365-CDN kit images) ───────────────────
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
  const matchName = `${match.team1} v ${match.team2}`;
  const timeLabel = match.kickoffTime ?? (match.date.includes(', ') ? match.date.split(', ')[1] : match.date);
  const shared = {
    matchId:    match.id,
    marketId:   `sh_1x2_${match.id}`,
    matchName,
    leagueName: league.name,
    marketName: 'Match Result',
    sportKey:   match.sportKey ?? match.sportId ?? '',
  };

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 border-b transition-colors"
      style={{ borderColor: 'rgba(37,50,65,0.5)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(18,24,33,0.6)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
    >
      {/* Time / live badge */}
      <div className="w-[42px] shrink-0 text-right">
        {match.isLive ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="flex items-center gap-0.5 text-[9px] font-black text-[#EF4444]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" /> LIVE
            </span>
            {match.liveMinute != null && (
              <span className="text-[9px] text-[#EF4444]/70 font-semibold">{match.liveMinute}'</span>
            )}
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

      {/* Market count */}
      <div className="flex items-center gap-1.5 shrink-0">
        <BarChart2 className="w-3 h-3 text-[#94A3B8]/20 hidden sm:block" />
        {(match.marketCount ?? 0) > 0 && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            +{match.marketCount}
          </span>
        )}
      </div>

      {/* 1X2 odds */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <OddsButton {...shared} selectionType="1" selectionName={match.team1} odds={match.odds.home} />
        {match.odds.draw != null && (
          <OddsButton {...shared} selectionType="X" selectionName="Draw" odds={match.odds.draw} />
        )}
        <OddsButton {...shared} selectionType="2" selectionName={match.team2} odds={match.odds.away} />
      </div>
    </div>
  );
}

// ── Filter pills (decorative — no functional filtering needed) ────────────────
type FilterTab = 'EARLY PAYOUT' | 'ACCA BOOST';

const FILTER_CONFIG: { id: FilterTab; icon: React.ReactNode; color: string; glow: string; bg: string }[] = [
  {
    id: 'EARLY PAYOUT',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    color: '#00DFA9', glow: 'rgba(0,223,169,0.25)', bg: 'rgba(0,223,169,0.12)',
  },
  {
    id: 'ACCA BOOST',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: '#FACC15', glow: 'rgba(250,204,21,0.25)', bg: 'rgba(250,204,21,0.10)',
  },
];

// ── Main export ───────────────────────────────────────────────────────────────
export function SoccerHighlights({ onViewAll }: { onViewAll?: () => void } = {}) {
  const { allLeagues } = useOddsData();
  const [filter, setFilter]   = useState<FilterTab>('EARLY PAYOUT');
  const [showAll, setShowAll] = useState(false);

  const { soccerLeagues, soccerMatches } = useMemo(() => {
    const leagues: League[]                            = [];
    const pairs:   { match: Match; league: League }[] = [];
    for (const league of allLeagues) {
      if (!isSoccerLeague(league)) continue;
      leagues.push(league);
      for (const match of league.matches) pairs.push({ match, league });
    }
    return { soccerLeagues: leagues, soccerMatches: pairs };
  }, [allLeagues]);

  if (soccerMatches.length === 0) return null;

  const visible    = showAll ? soccerMatches : soccerMatches.slice(0, 6);
  const dateLabel  = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const leagueHint = soccerLeagues.map(l => l.name).slice(0, 4).join(' · ');

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background:  'linear-gradient(135deg,rgba(0,223,169,0.2),rgba(0,223,169,0.05))',
              border:      '1px solid rgba(0,223,169,0.3)',
              boxShadow:   '0 2px 8px rgba(0,223,169,0.15)',
            }}
          >
            <span className="text-[15px] leading-none">⚽</span>
          </div>
          <div>
            <h2 className="text-[14px] font-black text-[#F8FAFC] uppercase tracking-wide leading-none"><SportName name="Soccer" /></h2>
            <p className="text-[10px] text-[#94A3B8]/40 font-medium mt-0.5 hidden sm:block">{leagueHint}</p>
          </div>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-1 text-[11px] font-semibold text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2.5 mb-4">
        {FILTER_CONFIG.map(f => {
          const isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all select-none"
              style={isActive
                ? { background: f.bg, color: f.color, border: `1px solid ${f.color}55`, boxShadow: `0 0 12px ${f.glow}, inset 0 0 8px ${f.bg}` }
                : { background: 'rgba(255,255,255,0.03)', color: '#94A3B8', border: '1px solid rgba(37,50,65,0.8)' }
              }
            >
              <span style={{ color: isActive ? f.color : '#94A3B8' }}>{f.icon}</span>
              {f.id}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00DFA9]" />
          <span className="text-[10px] font-semibold text-[#00DFA9]/80">{soccerMatches.length} Matches</span>
        </div>
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
          <span className="text-[10px] font-bold text-[#94A3B8]/40 uppercase tracking-wider">{dateLabel}</span>
          <div className="flex items-center gap-1 shrink-0 mr-1">
            {['1', 'X', '2'].map(h => (
              <div key={h} className="w-[52px] text-center text-[10px] font-bold text-[#94A3B8]/35 uppercase tracking-wider">{h}</div>
            ))}
          </div>
        </div>

        {visible.map(({ match, league }) => (
          <MatchRow key={match.id} match={match} league={league} />
        ))}

        {!showAll && soccerMatches.length > 6 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full py-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors"
            style={{ background: 'rgba(13,21,32,0.3)' }}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Show {soccerMatches.length - 6} more matches
          </button>
        )}
      </div>
    </div>
  );
}
