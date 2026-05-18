/**
 * MATCH & MARKET DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Full match entities with inline primary markets and secondary market stubs.
 * Each MatchEntity embeds its primaryMarket for zero-cost rendering.
 * Secondary markets are stored in ALL_MARKETS and looked up via getMarketsByMatch().
 *
 * API_HOOK (primary): GET /api/matches?sportId=...&date=...&status=...
 * API_HOOK (markets): GET /api/matches/:matchId/markets
 * API_HOOK (odds):    WebSocket /ws/odds — subscribe to matchId for live odds updates
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { MatchEntity, MarketEntity } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build a match_result market (soccer 1X2)
// ─────────────────────────────────────────────────────────────────────────────
function mr(matchId: string, home: number, draw: number, away: number): MarketEntity {
  const id = `mkt_${matchId}_mr`;
  return {
    id,
    matchId,
    marketTypeId: 'mt_match_result',
    name: 'Match Result',
    status: 'active',
    selections: [
      { id: `${id}_h`, marketId: id, name: 'Home Win', shortName: '1', odds: home, oddsStatus: 'active', oddsMovement: 'stable' },
      { id: `${id}_d`, marketId: id, name: 'Draw',     shortName: 'X', odds: draw, oddsStatus: 'active', oddsMovement: 'stable' },
      { id: `${id}_a`, marketId: id, name: 'Away Win', shortName: '2', odds: away, oddsStatus: 'active', oddsMovement: 'stable' },
    ],
  };
}

// HELPER: build a match_winner market (2-way: tennis, NBA, esports, cricket)
function mw(matchId: string, home: number, away: number): MarketEntity {
  const id = `mkt_${matchId}_mw`;
  return {
    id,
    matchId,
    marketTypeId: 'mt_match_winner',
    name: 'Match Winner',
    status: 'active',
    selections: [
      { id: `${id}_h`, marketId: id, name: 'Home Win', shortName: '1', odds: home, oddsStatus: 'active', oddsMovement: 'stable' },
      { id: `${id}_a`, marketId: id, name: 'Away Win', shortName: '2', odds: away, oddsStatus: 'active', oddsMovement: 'stable' },
    ],
  };
}

// HELPER: build a win-only market (horse racing — single selection)
function wo(matchId: string, runnerName: string, odds: number): MarketEntity {
  const id = `mkt_${matchId}_wo`;
  return {
    id,
    matchId,
    marketTypeId: 'mt_win_only',
    name: 'Win',
    status: 'active',
    selections: [
      { id: `${id}_h`, marketId: id, name: runnerName, shortName: '1', odds, oddsStatus: 'active', oddsMovement: 'stable' },
    ],
  };
}

// HELPER: build a BTTS market stub
function btts(matchId: string, yesOdds: number, noOdds: number): MarketEntity {
  const id = `mkt_${matchId}_btts`;
  return {
    id,
    matchId,
    marketTypeId: 'mt_btts',
    name: 'Both Teams to Score',
    status: 'active',
    selections: [
      { id: `${id}_y`, marketId: id, name: 'Yes', shortName: 'Yes', odds: yesOdds, oddsStatus: 'active', oddsMovement: 'stable' },
      { id: `${id}_n`, marketId: id, name: 'No',  shortName: 'No',  odds: noOdds,  oddsStatus: 'active', oddsMovement: 'stable' },
    ],
  };
}

// HELPER: build an over/under market
function ou(matchId: string, mtId: 'mt_ou_25' | 'mt_ou_35', overOdds: number, underOdds: number): MarketEntity {
  const tag  = mtId === 'mt_ou_25' ? 'ou25' : 'ou35';
  const name = mtId === 'mt_ou_25' ? 'Over/Under 2.5' : 'Over/Under 3.5';
  const id   = `mkt_${matchId}_${tag}`;
  return {
    id,
    matchId,
    marketTypeId: mtId,
    name,
    status: 'active',
    selections: [
      { id: `${id}_o`, marketId: id, name: 'Over',  shortName: 'O', odds: overOdds,  oddsStatus: 'active', oddsMovement: 'stable' },
      { id: `${id}_u`, marketId: id, name: 'Under', shortName: 'U', odds: underOdds, oddsStatus: 'active', oddsMovement: 'stable' },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PREMIER LEAGUE
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M1: MatchEntity = {
  id: 'm1', leagueId: 'lg_pl', sportId: 'sp_soccer',
  homeTeamId: 'tm_arsenal', awayTeamId: 'tm_chelsea',
  homeTeamName: 'Arsenal', awayTeamName: 'Chelsea',
  startTime: '2026-05-17T20:00:00Z', dateTag: 'today', displayDate: 'Today, 20:00',
  status: 'live', isLive: true, liveMinute: 67, score: { home: 2, away: 1 },
  isFeatured: true, marketCount: 84,
  primaryMarket: mr('m1', 1.85, 3.40, 4.20),
};

export const MATCH_M2: MatchEntity = {
  id: 'm2', leagueId: 'lg_pl', sportId: 'sp_soccer',
  homeTeamId: 'tm_mancity', awayTeamId: 'tm_liverpool',
  homeTeamName: 'Man City', awayTeamName: 'Liverpool',
  startTime: '2026-05-18T17:30:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 17:30',
  status: 'upcoming', isLive: false,
  isFeatured: true, marketCount: 92,
  primaryMarket: mr('m2', 2.10, 3.25, 3.50),
};

export const MATCH_M3: MatchEntity = {
  id: 'm3', leagueId: 'lg_pl', sportId: 'sp_soccer',
  homeTeamId: 'tm_spurs', awayTeamId: 'tm_avilla',
  homeTeamName: 'Tottenham', awayTeamName: 'Aston Villa',
  startTime: '2026-05-19T14:00:00Z', dateTag: 'upcoming', displayDate: 'Sun, 14:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 76,
  primaryMarket: mr('m3', 2.45, 3.15, 2.80),
};

export const MATCH_M3B: MatchEntity = {
  id: 'm3b', leagueId: 'lg_pl', sportId: 'sp_soccer',
  homeTeamId: 'tm_newcastle', awayTeamId: 'tm_westham',
  homeTeamName: 'Newcastle', awayTeamName: 'West Ham',
  startTime: '2026-05-19T16:30:00Z', dateTag: 'upcoming', displayDate: 'Sun, 16:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 68,
  primaryMarket: mr('m3b', 1.95, 3.30, 3.90),
};

// ═════════════════════════════════════════════════════════════════════════════
// LA LIGA
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M4: MatchEntity = {
  id: 'm4', leagueId: 'lg_laliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_barcelona', awayTeamId: 'tm_realmadrid',
  homeTeamName: 'Barcelona', awayTeamName: 'Real Madrid',
  startTime: '2026-05-17T21:00:00Z', dateTag: 'today', displayDate: 'Today, 21:00',
  status: 'live', isLive: true, liveMinute: 34, score: { home: 1, away: 1 },
  isFeatured: true, marketCount: 104,
  primaryMarket: mr('m4', 2.20, 3.30, 3.10),
};

export const MATCH_M5: MatchEntity = {
  id: 'm5', leagueId: 'lg_laliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_atletico', awayTeamId: 'tm_sevilla',
  homeTeamName: 'Atletico Madrid', awayTeamName: 'Sevilla',
  startTime: '2026-05-18T19:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 19:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 71,
  primaryMarket: mr('m5', 1.70, 3.50, 5.00),
};

export const MATCH_M5B: MatchEntity = {
  id: 'm5b', leagueId: 'lg_laliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_villarreal', awayTeamId: 'tm_valencia',
  homeTeamName: 'Villarreal', awayTeamName: 'Valencia',
  startTime: '2026-05-22T17:00:00Z', dateTag: 'upcoming', displayDate: 'Sat, 17:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 58,
  primaryMarket: mr('m5b', 2.05, 3.20, 3.60),
};

// ═════════════════════════════════════════════════════════════════════════════
// CHAMPIONS LEAGUE
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M6: MatchEntity = {
  id: 'm6', leagueId: 'lg_ucl', sportId: 'sp_soccer',
  homeTeamId: 'tm_psg', awayTeamId: 'tm_bayernm',
  homeTeamName: 'PSG', awayTeamName: 'Bayern Munich',
  startTime: '2026-05-21T20:00:00Z', dateTag: 'upcoming', displayDate: 'Wed, 20:00',
  status: 'upcoming', isLive: false,
  isFeatured: true, marketCount: 112,
  primaryMarket: mr('m6', 2.75, 3.20, 2.55),
};

export const MATCH_M7: MatchEntity = {
  id: 'm7', leagueId: 'lg_ucl', sportId: 'sp_soccer',
  homeTeamId: 'tm_acmilan', awayTeamId: 'tm_inter',
  homeTeamName: 'AC Milan', awayTeamName: 'Inter',
  startTime: '2026-05-21T20:00:00Z', dateTag: 'upcoming', displayDate: 'Wed, 20:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 98,
  primaryMarket: mr('m7', 2.05, 3.40, 3.60),
};

export const MATCH_M7B: MatchEntity = {
  id: 'm7b', leagueId: 'lg_ucl', sportId: 'sp_soccer',
  homeTeamId: 'tm_realmadrid', awayTeamId: 'tm_mancity',
  homeTeamName: 'Real Madrid', awayTeamName: 'Man City',
  startTime: '2026-05-22T20:00:00Z', dateTag: 'upcoming', displayDate: 'Thu, 20:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 128,
  primaryMarket: mr('m7b', 2.40, 3.10, 2.95),
};

// ═════════════════════════════════════════════════════════════════════════════
// SERIE A
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_SA1: MatchEntity = {
  id: 'sa1', leagueId: 'lg_seriea', sportId: 'sp_soccer',
  homeTeamId: 'tm_juventus', awayTeamId: 'tm_napoli',
  homeTeamName: 'Juventus', awayTeamName: 'Napoli',
  startTime: '2026-05-17T18:00:00Z', dateTag: 'today', displayDate: 'Today, 18:00',
  status: 'live', isLive: true, liveMinute: 78, score: { home: 1, away: 0 },
  isFeatured: false, marketCount: 88,
  primaryMarket: mr('sa1', 2.30, 3.25, 3.10),
};

export const MATCH_SA2: MatchEntity = {
  id: 'sa2', leagueId: 'lg_seriea', sportId: 'sp_soccer',
  homeTeamId: 'tm_roma', awayTeamId: 'tm_lazio',
  homeTeamName: 'Roma', awayTeamName: 'Lazio',
  startTime: '2026-05-18T20:45:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 20:45',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 79,
  primaryMarket: mr('sa2', 2.15, 3.30, 3.40),
};

export const MATCH_SA3: MatchEntity = {
  id: 'sa3', leagueId: 'lg_seriea', sportId: 'sp_soccer',
  homeTeamId: 'tm_fiorentina', awayTeamId: 'tm_atalanta',
  homeTeamName: 'Fiorentina', awayTeamName: 'Atalanta',
  startTime: '2026-05-19T15:00:00Z', dateTag: 'upcoming', displayDate: 'Sun, 15:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 64,
  primaryMarket: mr('sa3', 2.60, 3.20, 2.70),
};

// ═════════════════════════════════════════════════════════════════════════════
// BUNDESLIGA
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_BL1: MatchEntity = {
  id: 'bl1', leagueId: 'lg_bundesliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_bayernm2', awayTeamId: 'tm_bvb',
  homeTeamName: 'Bayern Munich', awayTeamName: 'Borussia Dortmund',
  startTime: '2026-05-22T15:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 15:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 96,
  primaryMarket: mr('bl1', 1.75, 3.60, 4.50),
};

export const MATCH_BL2: MatchEntity = {
  id: 'bl2', leagueId: 'lg_bundesliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_rbleipzig', awayTeamId: 'tm_leverkusen',
  homeTeamName: 'RB Leipzig', awayTeamName: 'Bayer Leverkusen',
  startTime: '2026-05-22T18:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 18:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 72,
  primaryMarket: mr('bl2', 2.35, 3.15, 2.90),
};

// ═════════════════════════════════════════════════════════════════════════════
// LIGUE 1
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_LF1: MatchEntity = {
  id: 'lf1', leagueId: 'lg_ligue1', sportId: 'sp_soccer',
  homeTeamId: 'tm_psg_l1', awayTeamId: 'tm_lyon',
  homeTeamName: 'PSG', awayTeamName: 'Lyon',
  startTime: '2026-05-17T19:00:00Z', dateTag: 'today', displayDate: 'Today, 19:00',
  status: 'live', isLive: true, liveMinute: 52, score: { home: 2, away: 0 },
  isFeatured: true, marketCount: 96,
  primaryMarket: mr('lf1', 1.40, 4.50, 7.50),
};

export const MATCH_LF2: MatchEntity = {
  id: 'lf2', leagueId: 'lg_ligue1', sportId: 'sp_soccer',
  homeTeamId: 'tm_monaco', awayTeamId: 'tm_marseille',
  homeTeamName: 'Monaco', awayTeamName: 'Marseille',
  startTime: '2026-05-17T21:00:00Z', dateTag: 'today', displayDate: 'Today, 21:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 74,
  primaryMarket: mr('lf2', 2.10, 3.25, 3.40),
};

export const MATCH_LF3: MatchEntity = {
  id: 'lf3', leagueId: 'lg_ligue1', sportId: 'sp_soccer',
  homeTeamId: 'tm_lille', awayTeamId: 'tm_nice',
  homeTeamName: 'Lille', awayTeamName: 'Nice',
  startTime: '2026-05-18T20:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 20:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 61,
  primaryMarket: mr('lf3', 2.30, 3.10, 3.00),
};

export const MATCH_LF4: MatchEntity = {
  id: 'lf4', leagueId: 'lg_ligue1', sportId: 'sp_soccer',
  homeTeamId: 'tm_lens', awayTeamId: 'tm_rennes',
  homeTeamName: 'Lens', awayTeamName: 'Rennes',
  startTime: '2026-05-22T20:00:00Z', dateTag: 'upcoming', displayDate: 'Sat, 20:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 56,
  primaryMarket: mr('lf4', 1.95, 3.30, 3.75),
};

// ═════════════════════════════════════════════════════════════════════════════
// LOL WORLD CHAMPIONSHIP
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_LOL1: MatchEntity = {
  id: 'lol1', leagueId: 'lg_lol_worlds', sportId: 'sp_esports',
  homeTeamId: 'tm_t1', awayTeamId: 'tm_jdg',
  homeTeamName: 'T1', awayTeamName: 'JDG Gaming',
  startTime: '2026-05-17T13:00:00Z', dateTag: 'today', displayDate: 'Today, 13:00',
  status: 'live', isLive: true, liveMinute: 0, score: { home: 1, away: 0 },
  isFeatured: true, marketCount: 32,
  primaryMarket: mw('lol1', 1.75, 2.05),
};

export const MATCH_LOL2: MatchEntity = {
  id: 'lol2', leagueId: 'lg_lol_worlds', sportId: 'sp_esports',
  homeTeamId: 'tm_cloud9', awayTeamId: 'tm_fnatic',
  homeTeamName: 'Cloud9', awayTeamName: 'Fnatic',
  startTime: '2026-05-17T16:00:00Z', dateTag: 'today', displayDate: 'Today, 16:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 26,
  primaryMarket: mw('lol2', 1.60, 2.30),
};

export const MATCH_LOL3: MatchEntity = {
  id: 'lol3', leagueId: 'lg_lol_worlds', sportId: 'sp_esports',
  homeTeamId: 'tm_geng', awayTeamId: 'tm_t1',
  homeTeamName: 'Gen.G', awayTeamName: 'T1',
  startTime: '2026-05-18T13:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 13:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 28,
  primaryMarket: mw('lol3', 2.10, 1.72),
};

// ═════════════════════════════════════════════════════════════════════════════
// BUNDESLIGA (additional)
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_BL3: MatchEntity = {
  id: 'bl3', leagueId: 'lg_bundesliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_frankfurt', awayTeamId: 'tm_stuttgart',
  homeTeamName: 'Eintracht Frankfurt', awayTeamName: 'VfB Stuttgart',
  startTime: '2026-05-17T17:30:00Z', dateTag: 'today', displayDate: 'Today, 17:30',
  status: 'live', isLive: true, liveMinute: 23, score: { home: 0, away: 1 },
  isFeatured: false, marketCount: 82,
  primaryMarket: mr('bl3', 2.55, 3.20, 2.65),
};

export const MATCH_BL4: MatchEntity = {
  id: 'bl4', leagueId: 'lg_bundesliga', sportId: 'sp_soccer',
  homeTeamId: 'tm_wolfsburg', awayTeamId: 'tm_dortmund',
  homeTeamName: 'Wolfsburg', awayTeamName: 'Borussia Dortmund',
  startTime: '2026-05-18T15:30:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 15:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 70,
  primaryMarket: mr('bl4', 3.10, 3.30, 2.20),
};

// ═════════════════════════════════════════════════════════════════════════════
// NBA PLAYOFFS
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M8: MatchEntity = {
  id: 'm8', leagueId: 'lg_nba', sportId: 'sp_nba',
  homeTeamId: 'tm_lakers', awayTeamId: 'tm_celtics',
  homeTeamName: 'Lakers', awayTeamName: 'Celtics',
  startTime: '2026-05-17T02:30:00Z', dateTag: 'today', displayDate: 'Today, 02:30',
  status: 'live', isLive: true, liveMinute: 48, score: { home: 89, away: 94 },
  isFeatured: false, marketCount: 62,
  primaryMarket: mw('m8', 1.85, 3.80),
};

export const MATCH_M9: MatchEntity = {
  id: 'm9', leagueId: 'lg_nba', sportId: 'sp_nba',
  homeTeamId: 'tm_warriors', awayTeamId: 'tm_bucks',
  homeTeamName: 'Warriors', awayTeamName: 'Bucks',
  startTime: '2026-05-18T01:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 01:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 54,
  primaryMarket: mw('m9', 2.10, 1.70),
};

export const MATCH_M9B: MatchEntity = {
  id: 'm9b', leagueId: 'lg_nba', sportId: 'sp_nba',
  homeTeamId: 'tm_nuggets', awayTeamId: 'tm_heat',
  homeTeamName: 'Nuggets', awayTeamName: 'Heat',
  startTime: '2026-05-18T03:30:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 03:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 48,
  primaryMarket: mw('m9b', 1.55, 2.50),
};

// ═════════════════════════════════════════════════════════════════════════════
// TENNIS — ATP Masters Rome
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M10: MatchEntity = {
  id: 'm10', leagueId: 'lg_atp_rome', sportId: 'sp_tennis',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Djokovic', awayTeamName: 'Alcaraz',
  startTime: '2026-05-17T14:00:00Z', dateTag: 'today', displayDate: 'Today, 14:00',
  status: 'live', isLive: true, liveMinute: 0, score: { home: 1, away: 0 },
  isFeatured: false, marketCount: 38,
  primaryMarket: mw('m10', 1.55, 2.45),
};

export const MATCH_M11: MatchEntity = {
  id: 'm11', leagueId: 'lg_atp_rome', sportId: 'sp_tennis',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Swiatek', awayTeamName: 'Gauff',
  startTime: '2026-05-17T16:30:00Z', dateTag: 'today', displayDate: 'Today, 16:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 32,
  primaryMarket: mw('m11', 1.40, 2.90),
};

export const MATCH_M11B: MatchEntity = {
  id: 'm11b', leagueId: 'lg_atp_rome', sportId: 'sp_tennis',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Medvedev', awayTeamName: 'Zverev',
  startTime: '2026-05-18T12:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 12:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 34,
  primaryMarket: mw('m11b', 1.80, 2.00),
};

export const MATCH_M11C: MatchEntity = {
  id: 'm11c', leagueId: 'lg_atp_rome', sportId: 'sp_tennis',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Sinner', awayTeamName: 'Ruud',
  startTime: '2026-05-18T14:30:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 14:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 36,
  primaryMarket: mw('m11c', 1.45, 2.70),
};

// ═════════════════════════════════════════════════════════════════════════════
// ESPORTS — CS2 Pro League
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M12: MatchEntity = {
  id: 'm12', leagueId: 'lg_cs2', sportId: 'sp_esports',
  homeTeamId: 'tm_vitality', awayTeamId: 'tm_navi',
  homeTeamName: 'Team Vitality', awayTeamName: 'Natus Vincere',
  startTime: '2026-05-17T18:00:00Z', dateTag: 'today', displayDate: 'Today, 18:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 28,
  primaryMarket: mw('m12', 1.65, 2.20),
};

export const MATCH_M13: MatchEntity = {
  id: 'm13', leagueId: 'lg_cs2', sportId: 'sp_esports',
  homeTeamId: 'tm_g2', awayTeamId: 'tm_faze',
  homeTeamName: 'G2 Esports', awayTeamName: 'FaZe Clan',
  startTime: '2026-05-17T20:00:00Z', dateTag: 'today', displayDate: 'Today, 20:00',
  status: 'live', isLive: true, liveMinute: 0, score: { home: 1, away: 2 },
  isFeatured: false, marketCount: 24,
  primaryMarket: mw('m13', 1.90, 1.85),
};

export const MATCH_M13B: MatchEntity = {
  id: 'm13b', leagueId: 'lg_cs2', sportId: 'sp_esports',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'MOUZ', awayTeamName: 'Spirit',
  startTime: '2026-05-18T15:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 15:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 22,
  primaryMarket: mw('m13b', 2.10, 1.72),
};

// ═════════════════════════════════════════════════════════════════════════════
// HORSE RACING — Epsom Derby
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_M14: MatchEntity = {
  id: 'm14', leagueId: 'lg_epsom', sportId: 'sp_horse_racing',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Auguste Rodin', awayTeamName: '',
  startTime: '2026-05-22T13:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 13:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 1,
  primaryMarket: wo('m14', 'Auguste Rodin', 3.50),
};

export const MATCH_M15: MatchEntity = {
  id: 'm15', leagueId: 'lg_epsom', sportId: 'sp_horse_racing',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'King of Steel', awayTeamName: '',
  startTime: '2026-05-22T13:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 13:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 1,
  primaryMarket: wo('m15', 'King of Steel', 4.00),
};

export const MATCH_M16: MatchEntity = {
  id: 'm16', leagueId: 'lg_epsom', sportId: 'sp_horse_racing',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Military Order', awayTeamName: '',
  startTime: '2026-05-22T13:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 13:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 1,
  primaryMarket: wo('m16', 'Military Order', 5.50),
};

export const MATCH_M17: MatchEntity = {
  id: 'm17', leagueId: 'lg_epsom', sportId: 'sp_horse_racing',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Arrest', awayTeamName: '',
  startTime: '2026-05-22T13:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 13:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 1,
  primaryMarket: wo('m17', 'Arrest', 8.00),
};

export const MATCH_M18: MatchEntity = {
  id: 'm18', leagueId: 'lg_epsom', sportId: 'sp_horse_racing',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Passenger', awayTeamName: '',
  startTime: '2026-05-22T13:30:00Z', dateTag: 'upcoming', displayDate: 'Sat, 13:30',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 1,
  primaryMarket: wo('m18', 'Passenger', 12.00),
};

// ═════════════════════════════════════════════════════════════════════════════
// CRICKET — IPL 2025
// ═════════════════════════════════════════════════════════════════════════════

export const MATCH_CR1: MatchEntity = {
  id: 'cr1', leagueId: 'lg_ipl', sportId: 'sp_cricket',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'Mumbai Indians', awayTeamName: 'CSK',
  startTime: '2026-05-17T14:00:00Z', dateTag: 'today', displayDate: 'Today, 14:00',
  status: 'live', isLive: true, liveMinute: 0, score: { home: 142, away: 2 },
  isFeatured: false, marketCount: 44,
  primaryMarket: mw('cr1', 1.80, 2.00),
};

export const MATCH_CR2: MatchEntity = {
  id: 'cr2', leagueId: 'lg_ipl', sportId: 'sp_cricket',
  homeTeamId: null, awayTeamId: null,
  homeTeamName: 'RCB', awayTeamName: 'Delhi Capitals',
  startTime: '2026-05-18T14:00:00Z', dateTag: 'tomorrow', displayDate: 'Tomorrow, 14:00',
  status: 'upcoming', isLive: false,
  isFeatured: false, marketCount: 38,
  primaryMarket: mw('cr2', 2.10, 1.72),
};

// ═════════════════════════════════════════════════════════════════════════════
// MASTER COLLECTION
// ═════════════════════════════════════════════════════════════════════════════

export const ALL_MATCHES: MatchEntity[] = [
  // Premier League
  MATCH_M1, MATCH_M2, MATCH_M3, MATCH_M3B,
  // La Liga
  MATCH_M4, MATCH_M5, MATCH_M5B,
  // Champions League
  MATCH_M6, MATCH_M7, MATCH_M7B,
  // Serie A
  MATCH_SA1, MATCH_SA2, MATCH_SA3,
  // Bundesliga
  MATCH_BL1, MATCH_BL2, MATCH_BL3, MATCH_BL4,
  // Ligue 1
  MATCH_LF1, MATCH_LF2, MATCH_LF3, MATCH_LF4,
  // NBA
  MATCH_M8, MATCH_M9, MATCH_M9B,
  // Tennis
  MATCH_M10, MATCH_M11, MATCH_M11B, MATCH_M11C,
  // CS2
  MATCH_M12, MATCH_M13, MATCH_M13B,
  // LoL Worlds
  MATCH_LOL1, MATCH_LOL2, MATCH_LOL3,
  // Horse Racing
  MATCH_M14, MATCH_M15, MATCH_M16, MATCH_M17, MATCH_M18,
  // Cricket
  MATCH_CR1, MATCH_CR2,
];

// ─────────────────────────────────────────────────────────────────────────────
// SECONDARY MARKETS
// Sample additional markets per match — demonstrates the full hierarchy.
// API_HOOK: GET /api/matches/:matchId/markets returns these at runtime.
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_MARKETS: MarketEntity[] = [
  // Primary markets (already embedded in matches above, also listed here for lookup)
  ...ALL_MATCHES.map(m => m.primaryMarket),

  // Arsenal vs Chelsea — secondary markets
  btts('m1', 1.72, 2.05),
  ou('m1', 'mt_ou_25', 1.80, 1.95),
  ou('m1', 'mt_ou_35', 2.30, 1.55),

  // Man City vs Liverpool
  btts('m2', 1.68, 2.10),
  ou('m2', 'mt_ou_25', 1.75, 2.00),

  // Barcelona vs Real Madrid
  btts('m4', 1.60, 2.20),
  ou('m4', 'mt_ou_25', 1.85, 1.88),
  ou('m4', 'mt_ou_35', 2.10, 1.68),

  // PSG vs Bayern (UCL)
  btts('m6', 1.65, 2.15),
  ou('m6', 'mt_ou_25', 1.88, 1.85),
];
