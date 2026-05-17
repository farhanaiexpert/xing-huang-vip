import { Match } from '../types';
import { OddsButton } from './OddsButton';

export function MatchRow({ match, isLast }: { match: Match; isLast?: boolean }) {
  const matchName = `${match.team1} vs ${match.team2}`;
  const isFootball = match.sportId === 'soccer';

  const isToday = match.date.includes('Today');
  const isTomorrow = match.date.includes('Tomorrow');

  return (
    <div className={`flex items-center justify-between py-3 px-4 hover:bg-[#1E2A38] transition-colors duration-150 gap-3 bg-[#18212B] ${isLast ? '' : 'border-b border-[#253241]'}`}>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="mb-1">
          {isToday ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00DFA9]/10 text-[#00DFA9] font-medium">{match.date}</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#253241] text-[#94A3B8] font-medium">{match.date}</span>
          )}
        </div>
        <div className="font-medium text-sm text-[#F8FAFC] leading-snug truncate">{match.team1}</div>
        {match.team2 && <div className="font-medium text-sm text-[#F8FAFC] leading-snug truncate">{match.team2}</div>}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 justify-end w-[168px]">
        {isFootball ? (
          <>
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="1" 
              odds={match.odds.home} 
              className="w-[52px]"
            />
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="X" 
              odds={match.odds.draw || 0} 
              className="w-[52px]"
            />
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="2" 
              odds={match.odds.away} 
              className="w-[52px]"
            />
          </>
        ) : (
          <>
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="1" 
              odds={match.odds.home} 
              className="w-[52px]"
            />
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="2" 
              odds={match.odds.away} 
              className="w-[52px]"
            />
          </>
        )}
      </div>
    </div>
  );
}
