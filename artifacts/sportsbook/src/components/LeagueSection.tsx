import { League } from '../types';
import { MatchRow } from './MatchRow';
import { ChevronRight } from 'lucide-react';

export function LeagueSection({ league }: { league: League }) {
  if (!league.matches || league.matches.length === 0) return null;

  const isFootball = league.sportId === 'soccer';

  return (
    <div className="rounded-xl overflow-hidden border border-[#253241] bg-[#121821]">

      {/* League header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0F1620] border-b border-[#253241]">
        <div className="flex items-center gap-2 min-w-0">
          {league.countryCode && (
            <span className="text-sm leading-none shrink-0" aria-hidden="true">
              {getFlagEmoji(league.countryCode)}
            </span>
          )}
          <h3 className="font-semibold text-[#F8FAFC] text-[13px] truncate">{league.name}</h3>
          <span className="shrink-0 text-[10px] text-[#94A3B8]/60 bg-[#253241]/60 px-1.5 py-0.5 rounded font-medium tabular-nums">
            {league.matches.length}
          </span>
        </div>

        <button
          className="flex items-center gap-0.5 text-[11px] font-medium text-[#38BDF8]/70 hover:text-[#38BDF8] transition-colors shrink-0 ml-3"
          data-testid="link-view-all"
        >
          More <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-3.5 py-1.5 bg-[#0A0E13] border-b border-[#253241]/60">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]/40">
            Match
          </span>
        </div>
        <div className="flex items-center shrink-0" style={{ width: isFootball ? '174px' : '116px' }}>
          {isFootball ? (
            <>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40">1</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40">X</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40">2</div>
              <div className="w-[18px]" />
            </>
          ) : (
            <>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40">1</div>
              <div className="w-[52px] text-center text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40">2</div>
              <div className="w-[12px]" />
            </>
          )}
        </div>
      </div>

      {/* Match rows */}
      <div className="flex flex-col divide-y divide-[#253241]/50">
        {league.matches.map((match, idx) => (
          <MatchRow key={match.id} match={match} isLast={idx === league.matches.length - 1} />
        ))}
      </div>
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  if (countryCode === 'EU') return '🇪🇺';
  if (countryCode === 'GB') return '🇬🇧';
  if (countryCode === 'US') return '🇺🇸';
  if (countryCode === 'ES') return '🇪🇸';
  if (countryCode === 'IT') return '🇮🇹';
  if (countryCode === 'GL') return '🌐';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
