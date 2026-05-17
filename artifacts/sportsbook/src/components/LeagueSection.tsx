import { League } from '../types';
import { MatchRow } from './MatchRow';
import { ChevronRight } from 'lucide-react';

export function LeagueSection({ league }: { league: League }) {
  if (!league.matches || league.matches.length === 0) return null;

  const isFootball = league.sportId === 'soccer';
  const liveCount  = league.matches.filter(m => m.isLive).length;

  return (
    <div className="rounded-xl overflow-hidden border border-[#253241] bg-[#121821]">

      {/* League header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F1620] border-b border-[#253241]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {league.countryCode && (
            <span className="text-sm leading-none shrink-0" aria-hidden="true">
              {getFlagEmoji(league.countryCode)}
            </span>
          )}
          <h3 className="font-semibold text-[#F8FAFC] text-[13px] truncate">{league.name}</h3>

          {/* Live badge */}
          {liveCount > 0 && (
            <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 rounded">
              <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
              {liveCount} Live
            </span>
          )}

          <span className="shrink-0 text-[10px] text-[#94A3B8]/50 bg-[#253241]/50 px-1.5 py-0.5 rounded font-medium tabular-nums">
            {league.matches.length}
          </span>
        </div>

        <button
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#38BDF8]/60 hover:text-[#38BDF8] transition-colors shrink-0 ml-3"
          data-testid="link-view-all"
        >
          More <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3.5 py-1.5 bg-[#0A0E13] border-b border-[#253241]/60">
        <div className="flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/35">Match</span>
        </div>
        <div className="flex items-center shrink-0" style={{ width: isFootball ? '174px' : '116px' }}>
          {isFootball ? (
            <>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">1</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">X</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">2</div>
              <div className="w-[18px]" />
            </>
          ) : (
            <>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">1</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">2</div>
              <div className="w-[12px]" />
            </>
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-[#253241]/50">
        {league.matches.map((match, idx) => (
          <MatchRow key={match.id} match={match} isLast={idx === league.matches.length - 1} />
        ))}
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  const map: Record<string, string> = {
    EU: '🇪🇺', GB: '🇬🇧', US: '🇺🇸', ES: '🇪🇸',
    IT: '🇮🇹', GL: '🌐', DE: '🇩🇪', IN: '🇮🇳',
  };
  if (map[countryCode]) return map[countryCode];
  const codePoints = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
