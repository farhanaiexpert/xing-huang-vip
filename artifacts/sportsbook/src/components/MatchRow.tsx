import { Match } from '../types';
import { OddsButton } from './OddsButton';

export function MatchRow({ match }: { match: Match }) {
  const matchName = `${match.team1} vs ${match.team2}`;
  const isFootball = match.sportId === 'soccer';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 hover:bg-white/5 border-b border-border/50 transition-colors gap-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">{match.date}</span>
        </div>
        <div className="font-medium text-sm space-y-1">
          <div>{match.team1}</div>
          {match.team2 && <div>{match.team2}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {isFootball ? (
          <>
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="1" 
              odds={match.odds.home} 
              className="w-14 sm:w-16"
            />
            {match.odds.draw && (
              <OddsButton 
                matchId={match.id} 
                matchName={matchName} 
                selectionType="X" 
                odds={match.odds.draw} 
                className="w-14 sm:w-16"
              />
            )}
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="2" 
              odds={match.odds.away} 
              className="w-14 sm:w-16"
            />
          </>
        ) : (
          <>
            <OddsButton 
              matchId={match.id} 
              matchName={matchName} 
              selectionType="1" 
              odds={match.odds.home} 
              className="w-16 sm:w-20"
            />
            {match.odds.away > 0 && (
              <OddsButton 
                matchId={match.id} 
                matchName={matchName} 
                selectionType="2" 
                odds={match.odds.away} 
                className="w-16 sm:w-20"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
