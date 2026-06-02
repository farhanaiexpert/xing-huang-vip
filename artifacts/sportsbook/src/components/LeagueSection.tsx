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
    <div className="rounded-lg overflow-hidden border border-[#1E2A38] bg-[#0D1218]">

      {/* League header */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#0B0F16] hover:bg-[#111720] transition-colors group"
        aria-expanded={isOpen}
      >
        {/* Chevron */}
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0 text-[#475569] group-hover:text-[#64748B] transition-all duration-200',
            !isOpen && '-rotate-90'
          )}
        />

        {/* Flag */}
        {league.countryCode && (
          <span className="text-[13px] leading-none shrink-0">{getFlagEmoji(league.countryCode)}</span>
        )}

        {/* Name */}
        <span className="font-semibold text-[#CBD5E1] text-[12px] truncate flex-1 text-left">{league.name}</span>

        {/* Live badge */}
        {liveCount > 0 && (
          <span className="shrink-0 flex items-center gap-1 text-[8px] font-bold uppercase text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded">
            <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse" />
            {liveCount}
          </span>
        )}

        {/* Match count */}
        <span className="shrink-0 text-[10px] text-[#475569] tabular-nums">{league.matches.length}</span>

        {/* More arrow */}
        <ChevronRight className="h-3 w-3 text-[#334155] group-hover:text-[#475569] transition-colors shrink-0" />
      </button>

      {/* Odds column labels — compact single row */}
      {isOpen && (
        <div className="flex items-center px-3 py-1 bg-[#080C11] border-b border-[#1E2A38]/60">
          <div className="flex-1" />
          <div className="flex items-center shrink-0 gap-0" style={{ width: isFootball ? '156px' : '104px' }}>
            {isFootball ? (
              <>
                <div className="w-[46px] text-center text-[9px] font-semibold uppercase tracking-wider text-[#334155]">1</div>
                <div className="w-[46px] text-center text-[9px] font-semibold uppercase tracking-wider text-[#334155]">X</div>
                <div className="w-[46px] text-center text-[9px] font-semibold uppercase tracking-wider text-[#334155]">2</div>
                <div className="w-[18px]" />
              </>
            ) : (
              <>
                <div className="w-[46px] text-center text-[9px] font-semibold uppercase tracking-wider text-[#334155]">1</div>
                <div className="w-[46px] text-center text-[9px] font-semibold uppercase tracking-wider text-[#334155]">2</div>
                <div className="w-[12px]" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Match rows */}
      {isOpen && (
        <div className="flex flex-col divide-y divide-[#1E2A38]/60">
          {league.matches.map((match, idx) => (
            <MatchRow
              key={match.id}
              match={match}
              leagueName={league.name}
              isLast={idx === league.matches.length - 1}
            />
          ))}
        </div>
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
