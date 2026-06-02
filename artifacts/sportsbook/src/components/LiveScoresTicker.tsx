import { useMemo } from 'react';
import { useOddsData } from '../hooks/useOddsData';

interface LiveEntry {
  id: string;
  team1: string;
  team2: string;
  score?: { home: number; away: number };
  liveMinute?: number;
  leagueName: string;
}

export function LiveScoresTicker() {
  const { allLeagues } = useOddsData();

  const liveMatches = useMemo<LiveEntry[]>(() => {
    const result: LiveEntry[] = [];
    for (const league of allLeagues) {
      for (const match of league.matches) {
        if (match.isLive) {
          result.push({
            id: match.id,
            team1: match.team1,
            team2: match.team2,
            score: match.score,
            liveMinute: match.liveMinute,
            leagueName: league.name,
          });
        }
      }
    }
    return result;
  }, [allLeagues]);

  if (liveMatches.length === 0) return null;

  const items = [...liveMatches, ...liveMatches];
  const durationSec = Math.max(28, liveMatches.length * 10);

  return (
    <div className="bg-[#090D12] border-b border-[#EF4444]/15 overflow-hidden flex items-stretch select-none">
      {/* Pinned LIVE label */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444]/8 border-r border-[#EF4444]/15 shrink-0 z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
        <span className="text-[9px] font-black text-[#EF4444] uppercase tracking-[0.18em]">Live</span>
      </div>

      {/* Scrolling strip */}
      <div className="flex-1 overflow-hidden relative">
        {/* Fade-out edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#090D12] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#090D12] to-transparent z-10 pointer-events-none" />

        <div
          className="flex w-max"
          style={{ animation: `tickerScroll ${durationSec}s linear infinite` }}
        >
          {items.map((m, i) => (
            <div
              key={`${m.id}-${i}`}
              className="flex items-center gap-2.5 px-5 py-1.5 border-r border-[#1E2A38]/40 shrink-0"
            >
              <span className="text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">{m.team1}</span>

              <span className="text-[11px] font-black text-[#F8FAFC] tabular-nums bg-[#131D2A] px-2 py-0.5 rounded min-w-[44px] text-center leading-tight whitespace-nowrap">
                {m.score ? `${m.score.home} – ${m.score.away}` : 'vs'}
              </span>

              <span className="text-[11px] font-medium text-[#94A3B8] whitespace-nowrap">{m.team2}</span>

              {m.liveMinute !== undefined && (
                <span className="text-[9px] font-black text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                  {m.liveMinute}'
                </span>
              )}

              <span className="text-[9px] text-[#2A3A52] font-medium whitespace-nowrap pl-1">{m.leagueName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
