import { Sport, League, FeaturedCard } from '../types';

export const SPORTS: Sport[] = [
  { id: 'soccer',           name: 'Soccer',           icon: '⚽', isPopular: true },
  { id: 'nba',              name: 'NBA',              icon: '🏀', isPopular: true },
  { id: 'basketball',       name: 'Basketball',       icon: '🏀', isPopular: true },
  { id: 'tennis',           name: 'Tennis',           icon: '🎾' },
  { id: 'cricket',          name: 'Cricket',          icon: '🏏' },
  { id: 'esports',          name: 'Esports',          icon: '🎮' },
  { id: 'horse_racing',     name: 'Horse Racing',     icon: '🏇' },
  { id: 'american_football',name: 'American Football',icon: '🏈' },
  { id: 'australian_rules', name: 'Australian Rules', icon: '🏉' },
  { id: 'baseball',         name: 'Baseball',         icon: '⚾' },
  { id: 'beach_volleyball', name: 'Beach Volleyball', icon: '🏐' },
  { id: 'boxing',           name: 'Boxing',           icon: '🥊' },
  { id: 'cycling',          name: 'Cycling',          icon: '🚴' },
  { id: 'darts',            name: 'Darts',            icon: '🎯' },
  { id: 'fantasy_sports',   name: 'Fantasy Sports',   icon: '🏆' },
  { id: 'formula_1',        name: 'Formula 1',        icon: '🏎️' },
  { id: 'gaelic_sports',    name: 'Gaelic Sports',    icon: '🏑' },
  { id: 'golf',             name: 'Golf',             icon: '⛳' },
  { id: 'greyhounds',       name: 'Greyhounds',       icon: '🐕' },
  { id: 'handball',         name: 'Handball',         icon: '🤾' },
  { id: 'ice_hockey',       name: 'Ice Hockey',       icon: '🏒' },
  { id: 'lacrosse',         name: 'Lacrosse',         icon: '🥍' },
  { id: 'mma',              name: 'MMA',              icon: '🥋' },
  { id: 'motor_sports',     name: 'Motor Sports',     icon: '🏍️' },
  { id: 'rugby_league',     name: 'Rugby League',     icon: '🏉' },
  { id: 'rugby_union',      name: 'Rugby Union',      icon: '🏉' },
  { id: 'snooker',          name: 'Snooker',          icon: '🎱' },
  { id: 'specials',         name: 'Specials',         icon: '✨' },
];

export const LEAGUES: League[] = [
  // ─── PREMIER LEAGUE ───────────────────────────────────────────
  {
    id: 'premier_league',
    name: 'Premier League',
    sportId: 'soccer',
    countryCode: 'GB',
    matches: [
      {
        id: 'm1', team1: 'Arsenal', team2: 'Chelsea',
        date: 'Today, 20:00', dateTag: 'today',
        leagueId: 'premier_league', sportId: 'soccer',
        odds: { home: 1.85, draw: 3.40, away: 4.20 },
        isLive: true, liveMinute: 67, score: { home: 2, away: 1 },
        marketCount: 84,
      },
      {
        id: 'm2', team1: 'Man City', team2: 'Liverpool',
        date: 'Tomorrow, 17:30', dateTag: 'tomorrow',
        leagueId: 'premier_league', sportId: 'soccer',
        odds: { home: 2.10, draw: 3.25, away: 3.50 },
        marketCount: 92,
      },
      {
        id: 'm3', team1: 'Tottenham', team2: 'Aston Villa',
        date: 'Sun, 14:00', dateTag: 'upcoming',
        leagueId: 'premier_league', sportId: 'soccer',
        odds: { home: 2.45, draw: 3.15, away: 2.80 },
        marketCount: 76,
      },
      {
        id: 'm3b', team1: 'Newcastle', team2: 'West Ham',
        date: 'Sun, 16:30', dateTag: 'upcoming',
        leagueId: 'premier_league', sportId: 'soccer',
        odds: { home: 1.95, draw: 3.30, away: 3.90 },
        marketCount: 68,
      },
    ],
  },

  // ─── LA LIGA ──────────────────────────────────────────────────
  {
    id: 'la_liga',
    name: 'La Liga',
    sportId: 'soccer',
    countryCode: 'ES',
    matches: [
      {
        id: 'm4', team1: 'Barcelona', team2: 'Real Madrid',
        date: 'Today, 21:00', dateTag: 'today',
        leagueId: 'la_liga', sportId: 'soccer',
        odds: { home: 2.20, draw: 3.30, away: 3.10 },
        isLive: true, liveMinute: 34, score: { home: 1, away: 1 },
        marketCount: 104,
      },
      {
        id: 'm5', team1: 'Atletico Madrid', team2: 'Sevilla',
        date: 'Tomorrow, 19:00', dateTag: 'tomorrow',
        leagueId: 'la_liga', sportId: 'soccer',
        odds: { home: 1.70, draw: 3.50, away: 5.00 },
        marketCount: 71,
      },
      {
        id: 'm5b', team1: 'Villarreal', team2: 'Valencia',
        date: 'Sat, 17:00', dateTag: 'upcoming',
        leagueId: 'la_liga', sportId: 'soccer',
        odds: { home: 2.05, draw: 3.20, away: 3.60 },
        marketCount: 58,
      },
    ],
  },

  // ─── CHAMPIONS LEAGUE ─────────────────────────────────────────
  {
    id: 'champions_league',
    name: 'Champions League',
    sportId: 'soccer',
    countryCode: 'EU',
    matches: [
      {
        id: 'm6', team1: 'PSG', team2: 'Bayern Munich',
        date: 'Wed, 20:00', dateTag: 'upcoming',
        leagueId: 'champions_league', sportId: 'soccer',
        odds: { home: 2.75, draw: 3.20, away: 2.55 },
        marketCount: 112,
      },
      {
        id: 'm7', team1: 'AC Milan', team2: 'Inter',
        date: 'Wed, 20:00', dateTag: 'upcoming',
        leagueId: 'champions_league', sportId: 'soccer',
        odds: { home: 2.05, draw: 3.40, away: 3.60 },
        marketCount: 98,
      },
      {
        id: 'm7b', team1: 'Real Madrid', team2: 'Man City',
        date: 'Thu, 20:00', dateTag: 'upcoming',
        leagueId: 'champions_league', sportId: 'soccer',
        odds: { home: 2.40, draw: 3.10, away: 2.95 },
        marketCount: 128,
      },
    ],
  },

  // ─── SERIE A ──────────────────────────────────────────────────
  {
    id: 'serie_a',
    name: 'Serie A',
    sportId: 'soccer',
    countryCode: 'IT',
    matches: [
      {
        id: 'sa1', team1: 'Juventus', team2: 'Napoli',
        date: 'Today, 18:00', dateTag: 'today',
        leagueId: 'serie_a', sportId: 'soccer',
        odds: { home: 2.30, draw: 3.25, away: 3.10 },
        isLive: true, liveMinute: 78, score: { home: 1, away: 0 },
        marketCount: 88,
      },
      {
        id: 'sa2', team1: 'Roma', team2: 'Lazio',
        date: 'Tomorrow, 20:45', dateTag: 'tomorrow',
        leagueId: 'serie_a', sportId: 'soccer',
        odds: { home: 2.15, draw: 3.30, away: 3.40 },
        marketCount: 79,
      },
      {
        id: 'sa3', team1: 'Fiorentina', team2: 'Atalanta',
        date: 'Sun, 15:00', dateTag: 'upcoming',
        leagueId: 'serie_a', sportId: 'soccer',
        odds: { home: 2.60, draw: 3.20, away: 2.70 },
        marketCount: 64,
      },
    ],
  },

  // ─── BUNDESLIGA ───────────────────────────────────────────────
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    sportId: 'soccer',
    countryCode: 'DE',
    matches: [
      {
        id: 'bl1', team1: 'Bayern Munich', team2: 'Borussia Dortmund',
        date: 'Sat, 15:30', dateTag: 'upcoming',
        leagueId: 'bundesliga', sportId: 'soccer',
        odds: { home: 1.75, draw: 3.60, away: 4.50 },
        marketCount: 96,
      },
      {
        id: 'bl2', team1: 'RB Leipzig', team2: 'Bayer Leverkusen',
        date: 'Sat, 18:30', dateTag: 'upcoming',
        leagueId: 'bundesliga', sportId: 'soccer',
        odds: { home: 2.35, draw: 3.15, away: 2.90 },
        marketCount: 72,
      },
      {
        id: 'bl3', team1: 'Wolfsburg', team2: 'Eintracht Frankfurt',
        date: 'Sun, 15:30', dateTag: 'upcoming',
        leagueId: 'bundesliga', sportId: 'soccer',
        odds: { home: 2.80, draw: 3.10, away: 2.45 },
        marketCount: 58,
      },
    ],
  },

  // ─── NBA ──────────────────────────────────────────────────────
  {
    id: 'nba_playoffs',
    name: 'NBA Playoffs',
    sportId: 'nba',
    countryCode: 'US',
    matches: [
      {
        id: 'm8', team1: 'Lakers', team2: 'Celtics',
        date: 'Today, 02:30', dateTag: 'today',
        leagueId: 'nba_playoffs', sportId: 'nba',
        odds: { home: 1.85, away: 3.80 },
        isLive: true, liveMinute: 48, score: { home: 89, away: 94 },
        marketCount: 62,
      },
      {
        id: 'm9', team1: 'Warriors', team2: 'Bucks',
        date: 'Tomorrow, 01:00', dateTag: 'tomorrow',
        leagueId: 'nba_playoffs', sportId: 'nba',
        odds: { home: 2.10, away: 1.70 },
        marketCount: 54,
      },
      {
        id: 'm9b', team1: 'Nuggets', team2: 'Heat',
        date: 'Tomorrow, 03:30', dateTag: 'tomorrow',
        leagueId: 'nba_playoffs', sportId: 'nba',
        odds: { home: 1.55, away: 2.50 },
        marketCount: 48,
      },
      {
        id: 'm9c', team1: 'Suns', team2: 'Clippers',
        date: 'Wed, 02:00', dateTag: 'upcoming',
        leagueId: 'nba_playoffs', sportId: 'nba',
        odds: { home: 1.90, away: 1.88 },
        marketCount: 51,
      },
    ],
  },

  // ─── TENNIS ───────────────────────────────────────────────────
  {
    id: 'atp_rome',
    name: 'ATP Masters Rome',
    sportId: 'tennis',
    countryCode: 'IT',
    matches: [
      {
        id: 'm10', team1: 'Djokovic', team2: 'Alcaraz',
        date: 'Today, 14:00', dateTag: 'today',
        leagueId: 'atp_rome', sportId: 'tennis',
        odds: { home: 1.55, away: 2.45 },
        isLive: true, liveMinute: 0, score: { home: 1, away: 0 },
        marketCount: 38,
      },
      {
        id: 'm11', team1: 'Swiatek', team2: 'Gauff',
        date: 'Today, 16:30', dateTag: 'today',
        leagueId: 'atp_rome', sportId: 'tennis',
        odds: { home: 1.40, away: 2.90 },
        marketCount: 32,
      },
      {
        id: 'm11b', team1: 'Medvedev', team2: 'Zverev',
        date: 'Tomorrow, 12:00', dateTag: 'tomorrow',
        leagueId: 'atp_rome', sportId: 'tennis',
        odds: { home: 1.80, away: 2.00 },
        marketCount: 34,
      },
      {
        id: 'm11c', team1: 'Sinner', team2: 'Ruud',
        date: 'Tomorrow, 14:30', dateTag: 'tomorrow',
        leagueId: 'atp_rome', sportId: 'tennis',
        odds: { home: 1.45, away: 2.70 },
        marketCount: 36,
      },
    ],
  },

  // ─── ESPORTS ──────────────────────────────────────────────────
  {
    id: 'cs2_pro_league',
    name: 'CS2 Pro League',
    sportId: 'esports',
    countryCode: 'GL',
    matches: [
      {
        id: 'm12', team1: 'Team Vitality', team2: 'Natus Vincere',
        date: 'Today, 18:00', dateTag: 'today',
        leagueId: 'cs2_pro_league', sportId: 'esports',
        odds: { home: 1.65, away: 2.20 },
        marketCount: 28,
      },
      {
        id: 'm13', team1: 'G2 Esports', team2: 'FaZe Clan',
        date: 'Today, 20:00', dateTag: 'today',
        leagueId: 'cs2_pro_league', sportId: 'esports',
        odds: { home: 1.90, away: 1.85 },
        isLive: true, liveMinute: 0, score: { home: 1, away: 2 },
        marketCount: 24,
      },
      {
        id: 'm13b', team1: 'MOUZ', team2: 'Spirit',
        date: 'Tomorrow, 15:00', dateTag: 'tomorrow',
        leagueId: 'cs2_pro_league', sportId: 'esports',
        odds: { home: 2.10, away: 1.72 },
        marketCount: 22,
      },
    ],
  },

  // ─── HORSE RACING ─────────────────────────────────────────────
  {
    id: 'epsom_derby',
    name: 'Horse Racing — Epsom Derby',
    sportId: 'horse_racing',
    countryCode: 'GB',
    matches: [
      {
        id: 'm14', team1: 'Auguste Rodin', team2: '',
        date: 'Sat, 13:30', dateTag: 'upcoming',
        leagueId: 'epsom_derby', sportId: 'horse_racing',
        odds: { home: 3.50, away: 0 }, marketCount: 1,
      },
      {
        id: 'm15', team1: 'King of Steel', team2: '',
        date: 'Sat, 13:30', dateTag: 'upcoming',
        leagueId: 'epsom_derby', sportId: 'horse_racing',
        odds: { home: 4.00, away: 0 }, marketCount: 1,
      },
      {
        id: 'm16', team1: 'Military Order', team2: '',
        date: 'Sat, 13:30', dateTag: 'upcoming',
        leagueId: 'epsom_derby', sportId: 'horse_racing',
        odds: { home: 5.50, away: 0 }, marketCount: 1,
      },
      {
        id: 'm17', team1: 'Arrest', team2: '',
        date: 'Sat, 13:30', dateTag: 'upcoming',
        leagueId: 'epsom_derby', sportId: 'horse_racing',
        odds: { home: 8.00, away: 0 }, marketCount: 1,
      },
      {
        id: 'm18', team1: 'Passenger', team2: '',
        date: 'Sat, 13:30', dateTag: 'upcoming',
        leagueId: 'epsom_derby', sportId: 'horse_racing',
        odds: { home: 12.00, away: 0 }, marketCount: 1,
      },
    ],
  },

  // ─── CRICKET ──────────────────────────────────────────────────
  {
    id: 'ipl',
    name: 'IPL 2025',
    sportId: 'cricket',
    countryCode: 'IN',
    matches: [
      {
        id: 'cr1', team1: 'Mumbai Indians', team2: 'CSK',
        date: 'Today, 14:00', dateTag: 'today',
        leagueId: 'ipl', sportId: 'cricket',
        odds: { home: 1.80, away: 2.00 },
        isLive: true, liveMinute: 0, score: { home: 142, away: 0 },
        marketCount: 44,
      },
      {
        id: 'cr2', team1: 'RCB', team2: 'Delhi Capitals',
        date: 'Tomorrow, 14:00', dateTag: 'tomorrow',
        leagueId: 'ipl', sportId: 'cricket',
        odds: { home: 2.10, away: 1.72 },
        marketCount: 38,
      },
    ],
  },
];

export const FEATURED_CARDS: FeaturedCard[] = [
  {
    id: 'f1',
    title: 'ACCUMULATOR BOOST',
    subtitle: 'European Giants — Result/Both Teams to Score',
    selections: [
      'Real Madrid & Yes (v Sevilla)',
      'PSG & Yes (v Paris FC)',
      'Monaco & Yes (v Strasbourg)',
      'Barcelona & Yes (v Real Betis)',
    ],
    boostLabel: '+7.5% ACCA BOOST',
    odds: '76.54',
    returnExample: '€10 stake returns €822.09',
    bgGradient: '',
  },
  {
    id: 'f2',
    title: 'EARLY PAYOUT',
    subtitle: 'Full Time Result',
    selections: [
      'Athletic Club (v Celta Vigo)',
      'Atletico Madrid (v Girona)',
      'Real Madrid (v Sevilla)',
    ],
    boostLabel: '+20% ACCA BOOST',
    odds: '142.40',
    returnExample: '€10 stake returns €1,706.87',
    bgGradient: '',
  },
  {
    id: 'f3',
    title: 'BOTH TEAMS TO SCORE',
    subtitle: 'Both Teams to Score',
    selections: [
      'Yes (Athletic Club v Celta Vigo)',
      'Yes (Atletico Madrid v Girona)',
      'Yes (Elche v Getafe)',
    ],
    boostLabel: '+30% ACCA BOOST',
    odds: '145.32',
    returnExample: '€10 stake returns €1,886.24',
    bgGradient: '',
  },
];
