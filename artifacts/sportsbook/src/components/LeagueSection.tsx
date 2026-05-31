import { useState } from 'react';
import { League } from '../types';
import { MatchRow } from './MatchRow';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function LeagueSection({ league }: { league: League }) {
  if (!league.matches || league.matches.length === 0) return null;

  const isFootball = league.sportId === 'sp_soccer' || league.sportId === 'soccer';
  const liveCount  = league.matches.filter(m => m.isLive).length;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl overflow-hidden border border-[#253241] bg-[#121821]">

      {/* League header — clickable to collapse/expand */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#0F1620] border-b border-[#253241] hover:bg-[#151E2B] transition-colors group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Collapse chevron */}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[#94A3B8]/50 group-hover:text-[#94A3B8] transition-all duration-200',
              !isOpen && '-rotate-90'
            )}
          />

          {league.countryCode && (
            <span className="text-sm leading-none shrink-0" aria-hidden="true">
              {getFlagEmoji(league.countryCode)}
            </span>
          )}
          <h3 className="font-semibold text-[#F8FAFC] text-[13px] truncate">{league.name}</h3>

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

        <div className="flex items-center gap-0.5 text-[11px] font-medium text-[#38BDF8]/60 group-hover:text-[#38BDF8] transition-colors shrink-0 ml-3">
          More <ChevronRight className="h-3 w-3" />
        </div>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <>
          {/* Column headers */}
          <div className="flex items-center px-3.5 py-1.5 bg-[#0A0E13] border-b border-[#253241]/60">
            <div className="flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/35">Match</span>
            </div>
            <div className={cn('flex items-center shrink-0', isFootball ? 'w-[160px] sm:w-[174px]' : 'w-[110px] sm:w-[116px]')}>
              {isFootball ? (
                <>
                  <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">1</div>
                  <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">X</div>
                  <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">2</div>
                  <div className="hidden sm:block w-[18px]" />
                </>
              ) : (
                <>
                  <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">1</div>
                  <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/35">2</div>
                  <div className="hidden sm:block w-[12px]" />
                </>
              )}
            </div>
          </div>

          {/* Match rows */}
          <div className="flex flex-col divide-y divide-[#253241]/50">
            {league.matches.map((match, idx) => (
              <MatchRow
                key={match.id}
                match={match}
                leagueName={league.name}
                isLast={idx === league.matches.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  const map: Record<string, string> = {
    EU: '🇪🇺', GB: '🇬🇧', US: '🇺🇸', ES: '🇪🇸',
    IT: '🇮🇹', GL: '🌐', DE: '🇩🇪', IN: '🇮🇳', FR: '🇫🇷',
  };
  if (map[countryCode]) return map[countryCode];
  const pts = countryCode.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}
