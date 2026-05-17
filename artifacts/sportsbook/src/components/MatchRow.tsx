import { Match } from '../types';
import { OddsButton } from './OddsButton';
import { cn } from '../lib/utils';

export function MatchRow({ match }: { match: Match; isLast?: boolean }) {
  const matchName = `${match.team1} vs ${match.team2}`;
  const isFootball = match.sportId === 'soccer';
  const isHorseRacing = match.sportId === 'horse_racing';

  const isToday    = match.date.startsWith('Today');
  const isTomorrow = match.date.startsWith('Tomorrow');

  // Split "Today, 20:00" → ["Today", "20:00"]
  const [dayPart, timePart] = match.date.split(', ');

  return (
    <div className="
      group flex items-center justify-between
      px-3.5 py-3 gap-3
      bg-[#121821]
      hover:bg-[#18212B]
      transition-colors duration-100
      cursor-pointer
    ">
      {/* Left: time + teams */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Date/time column */}
        <div className="shrink-0 w-[52px] flex flex-col items-center gap-0.5">
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 leading-none",
            isToday
              ? "bg-[#00DFA9]/10 text-[#00DFA9]"
              : isTomorrow
              ? "bg-[#38BDF8]/10 text-[#38BDF8]"
              : "bg-[#253241] text-[#94A3B8]"
          )}>
            {dayPart}
          </span>
          {timePart && (
            <span className="text-[11px] font-semibold text-[#94A3B8] tabular-nums leading-none mt-0.5">
              {timePart}
            </span>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-8 w-px bg-[#253241]/60 shrink-0" />

        {/* Team names */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {isHorseRacing ? (
            <span className="text-[13px] font-semibold text-[#F8FAFC] leading-none truncate">
              {match.team1}
            </span>
          ) : (
            <>
              <span className="text-[13px] font-medium text-[#F8FAFC] leading-none truncate">
                {match.team1}
              </span>
              {match.team2 && (
                <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">
                  {match.team2}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: odds buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isFootball ? (
          <>
            <OddsButton matchId={match.id} matchName={matchName} selectionType="1" odds={match.odds.home} />
            <OddsButton matchId={match.id} matchName={matchName} selectionType="X" odds={match.odds.draw || 0} />
            <OddsButton matchId={match.id} matchName={matchName} selectionType="2" odds={match.odds.away} />
          </>
        ) : (
          <>
            <OddsButton matchId={match.id} matchName={matchName} selectionType="1" odds={match.odds.home} />
            {match.odds.away ? (
              <OddsButton matchId={match.id} matchName={matchName} selectionType="2" odds={match.odds.away} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
