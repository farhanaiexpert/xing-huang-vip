import { Match } from '../types';
import { OddsButton } from './OddsButton';
import { cn } from '../lib/utils';

export function MatchRow({ match }: { match: Match; isLast?: boolean }) {
  const matchName = `${match.team1} vs ${match.team2}`;
  const isFootball    = match.sportId === 'soccer';
  const isHorseRacing = match.sportId === 'horse_racing';
  const isTennis      = match.sportId === 'tennis';
  const isCricket     = match.sportId === 'cricket';

  const isToday    = match.dateTag === 'today';
  const isTomorrow = match.dateTag === 'tomorrow';

  // Split "Today, 20:00" → day + time
  const [dayPart, timePart] = match.date.split(', ');

  return (
    <div className="
      group flex items-center justify-between
      px-3.5 py-3 gap-3
      bg-[#121821] hover:bg-[#18212B]
      transition-colors duration-100
      cursor-pointer
    ">
      {/* Left: time + teams */}
      <div className="flex items-center gap-3 flex-1 min-w-0">

        {/* Date/time column */}
        <div className="shrink-0 w-[52px] flex flex-col items-center gap-1">
          {match.isLive ? (
            <>
              {/* LIVE badge */}
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#EF4444] leading-none">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                Live
              </span>
              {/* Minute or set score */}
              <LiveIndicator match={match} />
            </>
          ) : (
            <>
              <span className={cn(
                'text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 leading-none',
                isToday
                  ? 'bg-[#00DFA9]/10 text-[#00DFA9]'
                  : isTomorrow
                  ? 'bg-[#38BDF8]/10 text-[#38BDF8]'
                  : 'bg-[#253241] text-[#94A3B8]'
              )}>
                {dayPart}
              </span>
              {timePart && (
                <span className="text-[11px] font-semibold text-[#94A3B8] tabular-nums leading-none">
                  {timePart}
                </span>
              )}
            </>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-9 w-px bg-[#253241]/60 shrink-0" />

        {/* Teams + live score */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {isHorseRacing ? (
            <span className="text-[13px] font-semibold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
          ) : (
            <>
              <div className="flex items-center justify-between gap-1">
                <span className={cn('text-[13px] font-medium leading-none truncate', match.isLive && match.score ? 'text-[#F8FAFC]' : 'text-[#F8FAFC]')}>
                  {match.team1}
                </span>
                {match.isLive && match.score !== undefined && (
                  <span className={cn(
                    'text-[13px] font-black tabular-nums leading-none shrink-0',
                    match.score.home > match.score.away ? 'text-[#00DFA9]' : 'text-[#94A3B8]'
                  )}>
                    {isCricket ? match.score.home : match.score.home}
                  </span>
                )}
              </div>
              {match.team2 && (
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">
                    {match.team2}
                  </span>
                  {match.isLive && match.score !== undefined && (
                    <span className={cn(
                      'text-[13px] font-black tabular-nums leading-none shrink-0',
                      match.score.away > match.score.home ? 'text-[#00DFA9]' : 'text-[#94A3B8]'
                    )}>
                      {isCricket ? '—' : match.score.away}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Market count */}
        {match.marketCount && match.marketCount > 1 && (
          <div className="shrink-0 hidden md:block">
            <span className="text-[10px] text-[#94A3B8]/50 group-hover:text-[#38BDF8]/70 transition-colors font-medium tabular-nums whitespace-nowrap">
              +{match.marketCount}
            </span>
          </div>
        )}
      </div>

      {/* Odds buttons */}
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

function LiveIndicator({ match }: { match: Match }) {
  const isCricket = match.sportId === 'cricket';
  const isTennis  = match.sportId === 'tennis';

  if (isTennis && match.score) {
    return (
      <span className="text-[11px] font-bold text-[#F8FAFC] tabular-nums leading-none">
        {match.score.home}–{match.score.away}
      </span>
    );
  }
  if (isCricket && match.score) {
    return (
      <span className="text-[10px] font-bold text-[#F8FAFC] tabular-nums leading-none">
        {match.score.home}/{match.score.away}
      </span>
    );
  }
  if (match.liveMinute !== undefined) {
    return (
      <span className="text-[11px] font-bold text-[#EF4444]/80 tabular-nums leading-none">
        {match.liveMinute}'
      </span>
    );
  }
  return null;
}
