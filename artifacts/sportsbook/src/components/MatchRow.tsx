import { Match } from '../types';
import { OddsButton } from './OddsButton';

export function MatchRow({ match }: { match: Match }) {
  const matchName = `${match.team1} vs ${match.team2}`;
  const isFootball = match.sportId === 'soccer';

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-[#1B352D]/50 border-b border-[#1B352D] transition-colors gap-3 bg-[#111111]">
      <div className="flex flex-col flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground mb-0.5">{match.date}</div>
        <div className="font-medium text-xs text-white leading-snug truncate">{match.team1}</div>
        {match.team2 && <div className="font-medium text-xs text-white leading-snug truncate">{match.team2}</div>}
      </div>

      <div className="flex items-center gap-1 shrink-0 justify-end w-[164px]">
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