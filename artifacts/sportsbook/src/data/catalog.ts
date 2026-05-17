/**
 * CATALOG DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Static reference data: sports, leagues, teams, market type definitions.
 * These change infrequently and are good candidates for a CMS or config table.
 *
 * API_HOOK: Replace exports with API calls:
 *   GET /api/catalog/sports
 *   GET /api/catalog/leagues?sportId=...
 *   GET /api/catalog/teams?leagueId=...
 *   GET /api/catalog/market-types
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SportEntity, LeagueEntity, TeamEntity, MarketTypeEntity } from './types';

// ── Sports ────────────────────────────────────────────────────────────────────

export const SPORTS_CATALOG: SportEntity[] = [
  { id: 'sp_soccer',          name: 'Soccer',           slug: 'soccer',          icon: '⚽', isPopular: true,  sortOrder: 1,  status: 'active' },
  { id: 'sp_nba',             name: 'NBA',              slug: 'nba',             icon: '🏀', isPopular: true,  sortOrder: 2,  status: 'active' },
  { id: 'sp_basketball',      name: 'Basketball',       slug: 'basketball',      icon: '🏀', isPopular: true,  sortOrder: 3,  status: 'active' },
  { id: 'sp_tennis',          name: 'Tennis',           slug: 'tennis',          icon: '🎾', isPopular: false, sortOrder: 4,  status: 'active' },
  { id: 'sp_cricket',         name: 'Cricket',          slug: 'cricket',         icon: '🏏', isPopular: false, sortOrder: 5,  status: 'active' },
  { id: 'sp_esports',         name: 'Esports',          slug: 'esports',         icon: '🎮', isPopular: false, sortOrder: 6,  status: 'active' },
  { id: 'sp_horse_racing',    name: 'Horse Racing',     slug: 'horse-racing',    icon: '🏇', isPopular: false, sortOrder: 7,  status: 'active' },
  { id: 'sp_american_football',name:'American Football', slug:'american-football',icon: '🏈', isPopular: false, sortOrder: 8,  status: 'active' },
  { id: 'sp_boxing',          name: 'Boxing',           slug: 'boxing',          icon: '🥊', isPopular: false, sortOrder: 9,  status: 'active' },
  { id: 'sp_formula_1',       name: 'Formula 1',        slug: 'formula-1',       icon: '🏎️', isPopular: false, sortOrder: 10, status: 'active' },
  { id: 'sp_golf',            name: 'Golf',             slug: 'golf',            icon: '⛳', isPopular: false, sortOrder: 11, status: 'active' },
  { id: 'sp_darts',           name: 'Darts',            slug: 'darts',           icon: '🎯', isPopular: false, sortOrder: 12, status: 'active' },
  { id: 'sp_ice_hockey',      name: 'Ice Hockey',       slug: 'ice-hockey',      icon: '🏒', isPopular: false, sortOrder: 13, status: 'active' },
  { id: 'sp_mma',             name: 'MMA',              slug: 'mma',             icon: '🥋', isPopular: false, sortOrder: 14, status: 'active' },
  { id: 'sp_rugby_union',     name: 'Rugby Union',      slug: 'rugby-union',     icon: '🏉', isPopular: false, sortOrder: 15, status: 'active' },
  { id: 'sp_cycling',         name: 'Cycling',          slug: 'cycling',         icon: '🚴', isPopular: false, sortOrder: 16, status: 'active' },
  { id: 'sp_baseball',        name: 'Baseball',         slug: 'baseball',        icon: '⚾', isPopular: false, sortOrder: 17, status: 'active' },
  { id: 'sp_snooker',         name: 'Snooker',          slug: 'snooker',         icon: '🎱', isPopular: false, sortOrder: 18, status: 'active' },
  { id: 'sp_specials',        name: 'Specials',         slug: 'specials',        icon: '✨', isPopular: false, sortOrder: 19, status: 'active' },
];

// ── Leagues ───────────────────────────────────────────────────────────────────

export const LEAGUES_CATALOG: LeagueEntity[] = [
  // Soccer
  { id: 'lg_pl',          sportId: 'sp_soccer',       name: 'Premier League',             slug: 'premier-league',     countryCode: 'GB', region: 'Europe', priority: 1,  isActive: true,  isFeatured: true  },
  { id: 'lg_laliga',      sportId: 'sp_soccer',       name: 'La Liga',                    slug: 'la-liga',            countryCode: 'ES', region: 'Europe', priority: 2,  isActive: true,  isFeatured: true  },
  { id: 'lg_ucl',         sportId: 'sp_soccer',       name: 'Champions League',           slug: 'champions-league',   countryCode: 'EU', region: 'Europe', priority: 3,  isActive: true,  isFeatured: true  },
  { id: 'lg_seriea',      sportId: 'sp_soccer',       name: 'Serie A',                    slug: 'serie-a',            countryCode: 'IT', region: 'Europe', priority: 4,  isActive: true,  isFeatured: false },
  { id: 'lg_bundesliga',  sportId: 'sp_soccer',       name: 'Bundesliga',                 slug: 'bundesliga',         countryCode: 'DE', region: 'Europe', priority: 5,  isActive: true,  isFeatured: false },
  { id: 'lg_ligue1',      sportId: 'sp_soccer',       name: 'Ligue 1',                    slug: 'ligue-1',            countryCode: 'FR', region: 'Europe', priority: 6,  isActive: true,  isFeatured: false },
  // Basketball / NBA
  { id: 'lg_nba',         sportId: 'sp_nba',          name: 'NBA Playoffs',               slug: 'nba-playoffs',       countryCode: 'US', region: 'Americas', priority: 1, isActive: true,  isFeatured: true  },
  // Tennis
  { id: 'lg_atp_rome',    sportId: 'sp_tennis',       name: 'ATP Masters Rome',           slug: 'atp-masters-rome',   countryCode: 'IT', region: 'Europe', priority: 1,  isActive: true,  isFeatured: false },
  // Esports
  { id: 'lg_cs2',         sportId: 'sp_esports',      name: 'CS2 Pro League',             slug: 'cs2-pro-league',     countryCode: 'GL', region: 'Global', priority: 1,  isActive: true,  isFeatured: false },
  { id: 'lg_lol_worlds',  sportId: 'sp_esports',      name: 'LoL World Championship',     slug: 'lol-worlds',         countryCode: 'GL', region: 'Global', priority: 2,  isActive: true,  isFeatured: false },
  // Horse Racing
  { id: 'lg_epsom',       sportId: 'sp_horse_racing', name: 'Horse Racing — Epsom Derby', slug: 'epsom-derby',        countryCode: 'GB', region: 'Europe', priority: 1,  isActive: true,  isFeatured: false },
  // Cricket
  { id: 'lg_ipl',         sportId: 'sp_cricket',      name: 'IPL 2025',                   slug: 'ipl-2025',           countryCode: 'IN', region: 'Asia',   priority: 1,  isActive: true,  isFeatured: false },
];

// ── Teams ─────────────────────────────────────────────────────────────────────

export const TEAMS_CATALOG: TeamEntity[] = [
  // Premier League
  { id: 'tm_arsenal',     sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Arsenal',          shortName: 'ARS', countryCode: 'GB' },
  { id: 'tm_chelsea',     sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Chelsea',           shortName: 'CHE', countryCode: 'GB' },
  { id: 'tm_mancity',     sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Man City',          shortName: 'MCI', countryCode: 'GB' },
  { id: 'tm_liverpool',   sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Liverpool',         shortName: 'LIV', countryCode: 'GB' },
  { id: 'tm_spurs',       sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Tottenham',         shortName: 'TOT', countryCode: 'GB' },
  { id: 'tm_avilla',      sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Aston Villa',       shortName: 'AVL', countryCode: 'GB' },
  { id: 'tm_newcastle',   sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'Newcastle',         shortName: 'NEW', countryCode: 'GB' },
  { id: 'tm_westham',     sportId: 'sp_soccer', leagueId: 'lg_pl',        name: 'West Ham',          shortName: 'WHU', countryCode: 'GB' },
  // La Liga
  { id: 'tm_barcelona',   sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Barcelona',         shortName: 'BAR', countryCode: 'ES' },
  { id: 'tm_realmadrid',  sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Real Madrid',       shortName: 'RMA', countryCode: 'ES' },
  { id: 'tm_atletico',    sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Atletico Madrid',   shortName: 'ATM', countryCode: 'ES' },
  { id: 'tm_sevilla',     sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Sevilla',           shortName: 'SEV', countryCode: 'ES' },
  { id: 'tm_villarreal',  sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Villarreal',        shortName: 'VIL', countryCode: 'ES' },
  { id: 'tm_valencia',    sportId: 'sp_soccer', leagueId: 'lg_laliga',    name: 'Valencia',          shortName: 'VAL', countryCode: 'ES' },
  // UCL / multi-league
  { id: 'tm_psg',         sportId: 'sp_soccer', leagueId: 'lg_ucl',       name: 'PSG',               shortName: 'PSG', countryCode: 'FR' },
  { id: 'tm_bayernm',     sportId: 'sp_soccer', leagueId: 'lg_ucl',       name: 'Bayern Munich',     shortName: 'BAY', countryCode: 'DE' },
  { id: 'tm_acmilan',     sportId: 'sp_soccer', leagueId: 'lg_ucl',       name: 'AC Milan',          shortName: 'MIL', countryCode: 'IT' },
  { id: 'tm_inter',       sportId: 'sp_soccer', leagueId: 'lg_ucl',       name: 'Inter',             shortName: 'INT', countryCode: 'IT' },
  // Serie A
  { id: 'tm_juventus',    sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Juventus',          shortName: 'JUV', countryCode: 'IT' },
  { id: 'tm_napoli',      sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Napoli',            shortName: 'NAP', countryCode: 'IT' },
  { id: 'tm_roma',        sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Roma',              shortName: 'ROM', countryCode: 'IT' },
  { id: 'tm_lazio',       sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Lazio',             shortName: 'LAZ', countryCode: 'IT' },
  { id: 'tm_fiorentina',  sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Fiorentina',        shortName: 'FIO', countryCode: 'IT' },
  { id: 'tm_atalanta',    sportId: 'sp_soccer', leagueId: 'lg_seriea',    name: 'Atalanta',          shortName: 'ATA', countryCode: 'IT' },
  // Bundesliga
  { id: 'tm_bayernm2',    sportId: 'sp_soccer', leagueId: 'lg_bundesliga', name: 'Bayern Munich',    shortName: 'BAY', countryCode: 'DE' },
  { id: 'tm_bvb',         sportId: 'sp_soccer', leagueId: 'lg_bundesliga', name: 'Borussia Dortmund',shortName: 'BVB', countryCode: 'DE' },
  { id: 'tm_rbleipzig',   sportId: 'sp_soccer', leagueId: 'lg_bundesliga', name: 'RB Leipzig',       shortName: 'RBL', countryCode: 'DE' },
  { id: 'tm_leverkusen',  sportId: 'sp_soccer', leagueId: 'lg_bundesliga', name: 'Bayer Leverkusen', shortName: 'LEV', countryCode: 'DE' },
  // NBA
  { id: 'tm_lakers',      sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Lakers',            shortName: 'LAL', countryCode: 'US' },
  { id: 'tm_celtics',     sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Celtics',           shortName: 'BOS', countryCode: 'US' },
  { id: 'tm_warriors',    sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Warriors',          shortName: 'GSW', countryCode: 'US' },
  { id: 'tm_bucks',       sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Bucks',             shortName: 'MIL', countryCode: 'US' },
  { id: 'tm_nuggets',     sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Nuggets',           shortName: 'DEN', countryCode: 'US' },
  { id: 'tm_heat',        sportId: 'sp_nba',    leagueId: 'lg_nba',       name: 'Heat',              shortName: 'MIA', countryCode: 'US' },
  // Esports
  { id: 'tm_vitality',    sportId: 'sp_esports', leagueId: 'lg_cs2',      name: 'Team Vitality',     shortName: 'VIT', countryCode: 'FR' },
  { id: 'tm_navi',        sportId: 'sp_esports', leagueId: 'lg_cs2',      name: 'Natus Vincere',     shortName: 'NAV', countryCode: 'UA' },
  { id: 'tm_g2',          sportId: 'sp_esports', leagueId: 'lg_cs2',      name: 'G2 Esports',        shortName: 'G2',  countryCode: 'DE' },
  { id: 'tm_faze',        sportId: 'sp_esports', leagueId: 'lg_cs2',      name: 'FaZe Clan',         shortName: 'FAZ', countryCode: 'US' },
];

// ── Market Types ───────────────────────────────────────────────────────────────
// API_HOOK: GET /api/catalog/market-types

export const MARKET_TYPES: MarketTypeEntity[] = [
  { id: 'mt_match_result',   name: 'Match Result (1X2)',         sportIds: ['sp_soccer'],                                                    selectionCount: 3, isPrimary: true  },
  { id: 'mt_match_winner',   name: 'Match Winner',               sportIds: ['sp_tennis','sp_nba','sp_basketball','sp_esports','sp_cricket'], selectionCount: 2, isPrimary: true  },
  { id: 'mt_win_only',       name: 'Win Only',                   sportIds: ['sp_horse_racing'],                                              selectionCount: 1, isPrimary: true  },
  { id: 'mt_double_chance',  name: 'Double Chance',              sportIds: ['sp_soccer'],                                                    selectionCount: 3, isPrimary: false },
  { id: 'mt_btts',           name: 'Both Teams to Score',        sportIds: ['sp_soccer'],                                                    selectionCount: 2, isPrimary: false },
  { id: 'mt_ou_25',          name: 'Over/Under 2.5 Goals',       sportIds: ['sp_soccer'],                                                    selectionCount: 2, isPrimary: false },
  { id: 'mt_ou_35',          name: 'Over/Under 3.5 Goals',       sportIds: ['sp_soccer'],                                                    selectionCount: 2, isPrimary: false },
  { id: 'mt_asian_hcp',      name: 'Asian Handicap',             sportIds: ['sp_soccer','sp_nba','sp_basketball'],                           selectionCount: 2, isPrimary: false },
  { id: 'mt_correct_score',  name: 'Correct Score',              sportIds: ['sp_soccer','sp_tennis'],                                        selectionCount: 9, isPrimary: false },
  { id: 'mt_first_goal',     name: 'First Goal Scorer',          sportIds: ['sp_soccer'],                                                    selectionCount: 20,isPrimary: false },
  { id: 'mt_handicap',       name: 'Handicap',                   sportIds: ['sp_soccer','sp_nba','sp_basketball','sp_tennis'],               selectionCount: 2, isPrimary: false },
  { id: 'mt_total_sets',     name: 'Total Sets',                 sportIds: ['sp_tennis'],                                                    selectionCount: 2, isPrimary: false },
  { id: 'mt_total_pts',      name: 'Total Points',               sportIds: ['sp_nba','sp_basketball'],                                       selectionCount: 2, isPrimary: false },
  { id: 'mt_map_winner',     name: 'Map Winner',                 sportIds: ['sp_esports'],                                                   selectionCount: 2, isPrimary: false },
  { id: 'mt_total_maps',     name: 'Total Maps',                 sportIds: ['sp_esports'],                                                   selectionCount: 2, isPrimary: false },
  { id: 'mt_top_batsman',    name: 'Top Batsman',                sportIds: ['sp_cricket'],                                                   selectionCount: 4, isPrimary: false },
];
