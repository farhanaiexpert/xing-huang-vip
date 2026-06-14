/**
 * Bridge: UI `Match` → `MatchEntity` used by the market generators
 * (generateDetailMarkets). Shared so the full match-detail page and the inline
 * "More markets" drawer build markets from exactly the same primary-odds source.
 */
import type { Match } from '../types';
import type { MatchEntity } from './types';

export function matchToEntity(match: Match): MatchEntity {
  const hasDraw = match.odds.draw !== undefined;
  // Must match marketMeta() in lib/featuredMarkets.ts so the card 1X2 odds and
  // the derived "Match Result/Winner" market resolve to the SAME bet-slip
  // selection id (selection identity is `${marketId}-${selectionType}`).
  // Soccer → _mr, everything else → _mw.
  const primaryMarketId =
    match.sportId === 'sp_soccer' ? `mkt_${match.id}_mr` : `mkt_${match.id}_mw`;
  return {
    id:            match.id,
    leagueId:      match.leagueId,
    sportId:       match.sportId,
    homeTeamId:    null,
    awayTeamId:    null,
    homeTeamName:  match.team1,
    awayTeamName:  match.team2 ?? '',
    startTime:     match.commenceIso ?? new Date().toISOString(),
    dateTag:       match.dateTag,
    displayDate:   match.date,
    status:        match.isLive ? 'live' : 'upcoming',
    isLive:        match.isLive ?? false,
    liveMinute:    match.liveMinute,
    score:         match.score,
    isFeatured:    false,
    marketCount:   match.marketCount ?? 22,
    primaryMarket: {
      id:           primaryMarketId,
      matchId:      match.id,
      marketTypeId: hasDraw ? 'mt_match_result' : 'mt_match_winner',
      name:         hasDraw ? 'Match Result' : 'Match Winner',
      status:       'active',
      selections: [
        { id: `${match.id}_h`, marketId: primaryMarketId, name: match.team1,          shortName: '1', odds: match.odds.home,       oddsStatus: 'active', oddsMovement: 'stable' },
        ...(hasDraw ? [{ id: `${match.id}_d`, marketId: primaryMarketId, name: 'Draw', shortName: 'X', odds: match.odds.draw!,      oddsStatus: 'active' as const, oddsMovement: 'stable' as const }] : []),
        { id: `${match.id}_a`, marketId: primaryMarketId, name: match.team2 ?? 'Away', shortName: '2', odds: match.odds.away,       oddsStatus: 'active', oddsMovement: 'stable' },
      ],
    },
    ouOver25:  match.ouOver25,
    ouUnder25: match.ouUnder25,
    bttsYes:   match.bttsYes,
    bttsNo:    match.bttsNo,
  };
}
