/**
 * GenericMarketDrawer — expandable rich-market panel for any non-BetsAPI match
 * (The Odds API events: worldwide soccer, tennis, American football, World Cup …).
 *
 * BetsApiMarketDrawer fetches cached BetsAPI markets and only works for
 * `betsapi_*` fixtures. For Odds API matches we instead derive the full market
 * set locally from the primary odds via generateDetailMarkets — the exact same
 * source the full match-detail page uses — so the inline "More markets" toggle
 * shows real handicaps, totals, double chance, odd/even, etc. for every match.
 */
import { useMemo } from 'react';
import type { Match } from '../types';
import { matchToEntity } from '../data/matchEntity';
import { generateDetailMarkets } from '../data/marketDetails';
import { getGroupColor } from '../data/groupColors';
import { MarketGroup } from './match/MarketGroup';

interface Props {
  match:      Match;
  leagueName: string;
}

export function GenericMarketDrawer({ match, leagueName }: Props) {
  const groups = useMemo(() => generateDetailMarkets(matchToEntity(match)), [match]);
  const matchName = match.team2 ? `${match.team1} vs ${match.team2}` : match.team1;

  if (groups.length === 0) {
    return (
      <div className="px-3.5 py-4 bg-[#0B1018] border-t border-[#1E2A38] text-center">
        <p className="text-[11px] text-[#94A3B8]/60">Additional markets are not available right now.</p>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-3.5 bg-[#0B1018] border-t border-[#1E2A38] flex flex-col gap-3">
      {groups.map((group, i) => (
        <MarketGroup
          key={group.id}
          group={group}
          matchId={match.id}
          matchName={matchName}
          leagueName={leagueName}
          defaultOpen={i === 0}
          groupIndex={i}
          sportKey={match.sportKey}
          homeTeam={match.team1}
          awayTeam={match.team2 ?? ''}
          commenceTime={match.commenceIso}
          accentColor={getGroupColor(group.id)}
        />
      ))}
      <p className="text-[9px] text-[#475569] pt-1">Markets derived from live odds</p>
    </div>
  );
}
