import { useLocation } from 'wouter';
import { Match } from '../types';
import { OddsButton } from './OddsButton';
import { cn } from '../lib/utils';

interface MatchRowProps {
  match: Match;
  leagueName: string;
  isLast?: boolean;
}

function getMarketMeta(sportId: string, matchId: string) {
  const isSoccer = sportId === 'sp_soccer' || sportId === 'soccer';
  const isHorse  = sportId === 'sp_horse_racing' || sportId === 'horse_racing';
  if (isSoccer) return { marketId: `mkt_${matchId}_mr`,  marketName: 'Match Result' };
  if (isHorse)  return { marketId: `mkt_${matchId}_wo`,  marketName: 'Win' };
  return             { marketId: `mkt_${matchId}_mw`,  marketName: 'Match Winner' };
}

function getSelectionName(selectionType: '1' | 'X' | '2', match: Match): string {
  if (selectionType === 'X') return 'Draw';
  if (selectionType === '1') return match.team1;
  if (selectionType === '2') return match.team2 || 'Away';
  return selectionType;
}

export function MatchRow({ match, leagueName, isLast: _isLast }: MatchRowProps) {
  const [, setLocation] = useLocation();

  const matchName = match.team2
    ? `${match.team1} vs ${match.team2}`
    : match.team1;

  const isSoccer  = match.sportId === 'sp_soccer' || match.sportId === 'soccer';
  const isCricket = match.sportId === 'sp_cricket' || match.sportId === 'cricket';
  const isHorse   = match.sportId === 'sp_horse_racing' || match.sportId === 'horse_racing';

  const isToday    = match.dateTag === 'today';
  const isTomorrow = match.dateTag === 'tomorrow';
  const [dayPart, timePart] = match.date.split(', ');

  const { marketId, marketName } = getMarketMeta(match.sportId, match.id);
  const sharedOddsProps = { matchId: match.id, marketId, matchName, leagueName, marketName };

  function handleRowClick(e: React.MouseEvent) {
    // Don't navigate if the user clicked an odds button
    const target = e.target as HTMLElement;
    if (target.closest('button[data-testid^="odds-btn"]')) return;
    setLocation(`/match/${match.id}`);
  }

  return (
    <div
      onClick={handleRowClick}
      className="group flex items-center justify-between px-3.5 py-3 gap-3 bg-[#121821] hover:bg-[#18212B] transition-colors duration-100 cursor-pointer"
    >
      {/* Date / time */}
      <div className="shrink-0 w-[52px] flex flex-col items-center gap-1">
        {match.isLive ? (
          <>
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#EF4444] leading-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              Live
            </span>
            <LiveIndicator match={match} />
          </>
        ) : (
          <>
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 leading-none',
              isToday    ? 'bg-[#00DFA9]/10 text-[#00DFA9]' :
              isTomorrow ? 'bg-[#38BDF8]/10 text-[#38BDF8]' :
                           'bg-[#253241] text-[#94A3B8]'
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

      {/* Teams */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        {isHorse ? (
          <span className="text-[13px] font-semibold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
        ) : (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[13px] font-medium leading-none truncate text-[#F8FAFC]">{match.team1}</span>
              {match.isLive && match.score !== undefined && (
                <span className={cn('text-[13px] font-black tabular-nums leading-none shrink-0', match.score.home >= match.score.away ? 'text-[#00DFA9]' : 'text-[#94A3B8]')}>
                  {match.score.home}
                </span>
              )}
            </div>
            {match.team2 && (
              <div className="flex items-center justify-between gap-1">
                <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">{match.team2}</span>
                {match.isLive && match.score !== undefined && (
                  <span className={cn('text-[13px] font-black tabular-nums leading-none shrink-0', match.score.away > match.score.home ? 'text-[#00DFA9]' : 'text-[#94A3B8]')}>
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
        <div className="shrink-0 hidden md:flex items-center gap-0.5">
          <span className="text-[10px] text-[#94A3B8]/40 group-hover:text-[#38BDF8]/60 transition-colors font-medium tabular-nums">
            +{match.marketCount}
          </span>
        </div>
      )}

      {/* Odds buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isSoccer ? (
          <>
            <OddsButton {...sharedOddsProps} selectionType="1" selectionName={getSelectionName('1', match)} odds={match.odds.home} />
            <OddsButton {...sharedOddsProps} selectionType="X" selectionName="Draw"                         odds={match.odds.draw ?? 0} />
            <OddsButton {...sharedOddsProps} selectionType="2" selectionName={getSelectionName('2', match)} odds={match.odds.away} />
          </>
        ) : (
          <>
            <OddsButton {...sharedOddsProps} selectionType="1" selectionName={getSelectionName('1', match)} odds={match.odds.home} />
            {match.odds.away > 0 && (
              <OddsButton {...sharedOddsProps} selectionType="2" selectionName={getSelectionName('2', match)} odds={match.odds.away} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LiveIndicator({ match }: { match: Match }) {
  const isTennis  = match.sportId === 'sp_tennis'  || match.sportId === 'tennis';
  const isCricket = match.sportId === 'sp_cricket' || match.sportId === 'cricket';
  if (isTennis && match.score)  return <span className="text-[11px] font-bold text-[#F8FAFC] tabular-nums">{match.score.home}–{match.score.away}</span>;
  if (isCricket && match.score) return <span className="text-[10px] font-bold text-[#F8FAFC] tabular-nums">{match.score.home}/{match.score.away}</span>;
  if (match.liveMinute)         return <span className="text-[11px] font-bold text-[#EF4444]/80 tabular-nums">{match.liveMinute}'</span>;
  return <span className="text-[10px] font-bold text-[#EF4444]/60">Live</span>;
}
