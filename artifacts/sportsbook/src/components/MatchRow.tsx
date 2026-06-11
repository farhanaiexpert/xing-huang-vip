import { useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronDown } from 'lucide-react';
import { Match } from '../types';
import { OddsButton } from './OddsButton';
import { TeamBadge } from './TeamBadge';
import { BetsApiMarketDrawer } from './BetsApiMarketDrawer';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { formatKickoffTime, estimatedEndTime } from '../lib/matchTime';

interface MatchRowProps {
  match: Match;
  leagueName: string;
  isLast?: boolean;
}

const SPORT_ICONS: Record<string, string> = {
  sp_soccer: '⚽', sp_tennis: '🎾', sp_nba: 'https://www.bet365.com/home/images/Home/imgs/V9FlagIcons/USA.svg', sp_basketball: '🏀',
  sp_esports: '🎮', sp_horse_racing: '🏇', sp_cricket: '🏏',
  sp_boxing: '🥊', sp_mma: '🥋', sp_formula_1: '🏎️',
};

function getMarketMeta(sportId: string, matchId: string) {
  if (sportId === 'sp_soccer')                     return { marketId: `mkt_${matchId}_mr`, marketName: 'Match Result' };
  if (sportId === 'sp_horse_racing')               return { marketId: `mkt_${matchId}_wo`, marketName: 'Win' };
  return                                                  { marketId: `mkt_${matchId}_mw`, marketName: 'Match Winner' };
}

function getSelectionName(selectionType: '1' | 'X' | '2', match: Match): string {
  if (selectionType === 'X') return 'Draw';
  if (selectionType === '1') return match.team1;
  if (selectionType === '2') return match.team2 || 'Away';
  return selectionType;
}

export function MatchRow({ match, leagueName }: MatchRowProps) {
  const [, setLocation]  = useLocation();
  const { addRecentMatch } = useFavorites();
  const [expanded, setExpanded] = useState(false);

  const canExpand = match.id.startsWith('betsapi_') && (match.richMarkets?.marketScore ?? 0) >= 1;

  const matchName = match.team2
    ? `${match.team1} vs ${match.team2}`
    : match.team1;

  const isSoccer  = match.sportId === 'sp_soccer';
  const isCricket = match.sportId === 'sp_cricket';
  const isHorse   = match.sportId === 'sp_horse_racing';
  const isToday    = match.dateTag === 'today';
  const isTomorrow = match.dateTag === 'tomorrow';

  const isHot = !!(match.marketCount && (
    match.marketCount >= 90 ||
    (match.isLive && match.marketCount >= 70)
  ));
  const [dayPart, timePart] = match.date.split(', ');

  const { marketId, marketName } = getMarketMeta(match.sportId, match.id);
  const sharedOddsProps = { matchId: match.id, marketId, matchName, leagueName, marketName, isLive: match.isLive, sportKey: match.sportKey, sportId: match.sportId, kickoffTime: match.isLive ? undefined : match.kickoffTime, commenceTime: match.commenceIso, homeTeam: match.team1 ?? '', awayTeam: match.team2 ?? '' };

  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button[data-testid^="odds-btn"]')) return;
    addRecentMatch({
      id: match.id,
      name: matchName,
      leagueName,
      sportIcon: SPORT_ICONS[match.sportId] ?? '🏆',
    });
    setLocation(`/match/${match.id}`);
  }

  return (
    <div className="flex flex-col">
    <div
      onClick={handleRowClick}
      data-testid={`match-row-${match.id}`}
      className="group flex items-center justify-between px-3.5 py-3 gap-3 bg-[#121821] hover:bg-[#18212B] transition-colors duration-100 cursor-pointer"
    >
      {/* Date / time */}
      <div className="shrink-0 w-[40px] sm:w-[52px] flex flex-col items-center gap-0.5">
        {match.isLive ? (
          <>
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#EF4444] leading-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
              Live
            </span>
            <LiveIndicator match={match} />
            {(() => {
              const started = formatKickoffTime(match.commenceIso);
              return started ? (
                <span className="text-[10px] font-medium text-[#94A3B8] tabular-nums leading-none">{started}</span>
              ) : null;
            })()}
            {(() => {
              const end = estimatedEndTime(match.commenceIso, match.sportId);
              return end ? (
                <span className="text-[10px] font-medium text-[#00DFA9]/60 tabular-nums leading-none">~{end}</span>
              ) : null;
            })()}
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
              <span className="text-[11px] font-semibold text-[#F8FAFC] tabular-nums leading-none">
                {timePart}
              </span>
            )}
            {(() => {
              const end = estimatedEndTime(match.commenceIso, match.sportId);
              return end ? (
                <span className="text-[10px] font-medium text-[#00DFA9]/60 tabular-nums leading-none">~{end}</span>
              ) : null;
            })()}
          </>
        )}
      </div>

      {/* Vertical divider */}
      <div className="h-9 w-px bg-[#253241]/60 shrink-0" />

      {/* Teams */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {isHorse ? (
          <div className="flex items-center gap-2 min-w-0">
            <TeamBadge name={match.team1} sportIcon={SPORT_ICONS[match.sportId]} size="xs" className="shrink-0" />
            <span className="text-[13px] font-semibold text-[#F8FAFC] leading-none truncate">{match.team1}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <TeamBadge name={match.team1} sportIcon={SPORT_ICONS[match.sportId]} size="xs" className="shrink-0" />
                <span className="text-[13px] font-medium leading-none truncate text-[#F8FAFC]">{match.team1}</span>
              </div>
              {match.isLive && match.score !== undefined && (
                <span className={cn('text-[13px] font-black tabular-nums leading-none shrink-0', match.score.home >= match.score.away ? 'text-[#00DFA9]' : 'text-[#94A3B8]')}>
                  {match.score.home}
                </span>
              )}
            </div>
            {match.team2 && (
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <TeamBadge name={match.team2} sportIcon={SPORT_ICONS[match.sportId]} size="xs" className="shrink-0" />
                  <span className="text-[13px] font-medium text-[#94A3B8] leading-none truncate group-hover:text-[#F8FAFC] transition-colors">{match.team2}</span>
                </div>
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

      {/* Hot badge / market count */}
      <div className="hidden sm:flex shrink-0 flex-col items-center gap-1">
        {isHot && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.15)]">
            <span className="text-[10px] leading-none">🔥</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 leading-none">Hot</span>
          </div>
        )}
        {match.marketCount && match.marketCount > 1 && (
          <span className={cn(
            'text-[10px] font-medium tabular-nums transition-colors hidden md:block',
            isHot ? 'text-orange-400/50' : 'text-[#94A3B8]/40 group-hover:text-[#38BDF8]/60'
          )}>
            +{match.marketCount}
          </span>
        )}
      </div>

      {/* Odds buttons */}
      <div className={cn(
        "flex items-center shrink-0",
        isSoccer
          ? "gap-0.5 sm:gap-1.5 w-[142px] sm:w-[192px]"
          : "gap-0.5 sm:gap-1.5 w-[96px] sm:w-[126px]"
      )}>
        {isSoccer ? (
          <>
            <OddsButton {...sharedOddsProps} selectionType="1" selectionName={getSelectionName('1', match)} odds={match.odds.home} />
            <OddsButton {...sharedOddsProps} selectionType="X" selectionName="Draw"                         odds={match.odds.draw ?? 0} />
            <OddsButton {...sharedOddsProps} selectionType="2" selectionName={getSelectionName('2', match)} odds={match.odds.away} />
            <ExpandToggle canExpand={canExpand} expanded={expanded} onToggle={() => setExpanded(v => !v)} className="w-[10px] sm:w-[18px]" />
          </>
        ) : (
          <>
            <OddsButton {...sharedOddsProps} selectionType="1" selectionName={getSelectionName('1', match)} odds={match.odds.home} />
            <OddsButton {...sharedOddsProps} selectionType="2" selectionName={getSelectionName('2', match)} odds={match.odds.away} />
            <ExpandToggle canExpand={canExpand} expanded={expanded} onToggle={() => setExpanded(v => !v)} className="w-[8px] sm:w-[12px]" />
          </>
        )}
      </div>
    </div>

      {canExpand && expanded && (
        <BetsApiMarketDrawer match={match} leagueName={leagueName} />
      )}
    </div>
  );
}

function ExpandToggle({ canExpand, expanded, onToggle, className }: {
  canExpand: boolean;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  if (!canExpand) return <div className={cn('shrink-0', className)} />;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      data-testid="markets-toggle"
      aria-label={expanded ? 'Hide markets' : 'Show more markets'}
      aria-expanded={expanded}
      className={cn(
        'shrink-0 flex items-center justify-center h-9 rounded-md text-[#94A3B8] hover:text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors',
        className,
      )}
    >
      <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', expanded && 'rotate-180')} />
    </button>
  );
}

function LiveIndicator({ match }: { match: Match }) {
  const isTennis  = match.sportId === 'sp_tennis';
  const isCricket = match.sportId === 'sp_cricket';
  if (isTennis && match.score)  return <span className="text-[11px] font-bold text-[#F8FAFC] tabular-nums">{match.score.home}–{match.score.away}</span>;
  if (isCricket && match.score) return <span className="text-[10px] font-bold text-[#F8FAFC] tabular-nums">{match.score.home}/{match.score.away}</span>;
  if (match.liveMinute)         return <span className="text-[11px] font-bold text-[#EF4444]/80 tabular-nums">{match.liveMinute}'</span>;
  return <span className="text-[10px] font-bold text-[#EF4444]/60">Live</span>;
}
