import { Sport, League, FeaturedCard } from '../types';

export const SPORTS: Sport[] = [
  { id: 'soccer', name: 'Soccer', icon: '⚽', isPopular: true },
  { id: 'nba', name: 'NBA', icon: '🏀', isPopular: true },
  { id: 'basketball', name: 'Basketball', icon: '🏀', isPopular: true },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'cricket', name: 'Cricket', icon: '🏏' },
  { id: 'esports', name: 'Esports', icon: '🎮' },
  { id: 'horse_racing', name: 'Horse Racing', icon: '🏇' },
  { id: 'american_football', name: 'American Football', icon: '🏈' },
  { id: 'australian_rules', name: 'Australian Rules', icon: '🏉' },
  { id: 'baseball', name: 'Baseball', icon: '⚾' },
  { id: 'beach_volleyball', name: 'Beach Volleyball', icon: '🏐' },
  { id: 'boxing', name: 'Boxing', icon: '🥊' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' },
  { id: 'darts', name: 'Darts', icon: '🎯' },
  { id: 'fantasy_sports', name: 'Fantasy Sports', icon: '🏆' },
  { id: 'formula_1', name: 'Formula 1', icon: '🏎️' },
  { id: 'gaelic_sports', name: 'Gaelic Sports', icon: '🏑' },
  { id: 'golf', name: 'Golf', icon: '⛳' },
  { id: 'greyhounds', name: 'Greyhounds', icon: '🐕' },
  { id: 'handball', name: 'Handball', icon: '🤾' },
  { id: 'ice_hockey', name: 'Ice Hockey', icon: '🏒' },
  { id: 'lacrosse', name: 'Lacrosse', icon: '🥍' },
  { id: 'mma', name: 'MMA', icon: '🥋' },
  { id: 'motor_sports', name: 'Motor Sports', icon: '🏍️' },
  { id: 'politics', name: 'Politics', icon: '🗳️' },
  { id: 'rugby_league', name: 'Rugby League', icon: '🏉' },
  { id: 'rugby_union', name: 'Rugby Union', icon: '🏉' },
  { id: 'sailing', name: 'Sailing', icon: '⛵' },
  { id: 'snooker', name: 'Snooker', icon: '🎱' },
  { id: 'softball', name: 'Softball', icon: '🥎' },
  { id: 'specials', name: 'Specials', icon: '✨' },
  { id: 'speedway', name: 'Speedway', icon: '🏍️' },
  { id: 'sumo', name: 'Sumo', icon: '🤼' },
  { id: 'surfing', name: 'Surfing', icon: '🏄' },
];

export const LEAGUES: League[] = [
  {
    id: 'premier_league',
    name: 'Premier League',
    sportId: 'soccer',
    countryCode: 'GB',
    matches: [
      { id: 'm1', team1: 'Arsenal', team2: 'Chelsea', date: 'Today, 20:00', leagueId: 'premier_league', sportId: 'soccer', odds: { home: 1.85, draw: 3.40, away: 4.20 } },
      { id: 'm2', team1: 'Man City', team2: 'Liverpool', date: 'Tomorrow, 17:30', leagueId: 'premier_league', sportId: 'soccer', odds: { home: 2.10, draw: 3.25, away: 3.50 } },
      { id: 'm3', team1: 'Tottenham', team2: 'Aston Villa', date: 'Sun, 14:00', leagueId: 'premier_league', sportId: 'soccer', odds: { home: 2.45, draw: 3.15, away: 2.80 } },
    ]
  },
  {
    id: 'la_liga',
    name: 'La Liga',
    sportId: 'soccer',
    countryCode: 'ES',
    matches: [
      { id: 'm4', team1: 'Barcelona', team2: 'Real Madrid', date: 'Today, 21:00', leagueId: 'la_liga', sportId: 'soccer', odds: { home: 2.20, draw: 3.30, away: 3.10 } },
      { id: 'm5', team1: 'Atletico Madrid', team2: 'Sevilla', date: 'Tomorrow, 19:00', leagueId: 'la_liga', sportId: 'soccer', odds: { home: 1.70, draw: 3.50, away: 5.00 } },
    ]
  },
  {
    id: 'champions_league',
    name: 'Champions League',
    sportId: 'soccer',
    countryCode: 'EU',
    matches: [
      { id: 'm6', team1: 'PSG', team2: 'Bayern Munich', date: 'Wed, 20:00', leagueId: 'champions_league', sportId: 'soccer', odds: { home: 2.75, draw: 3.20, away: 2.55 } },
      { id: 'm7', team1: 'AC Milan', team2: 'Inter', date: 'Wed, 20:00', leagueId: 'champions_league', sportId: 'soccer', odds: { home: 2.05, draw: 3.40, away: 3.60 } },
    ]
  },
  {
    id: 'nba_playoffs',
    name: 'NBA',
    sportId: 'nba',
    countryCode: 'US',
    matches: [
      { id: 'm8', team1: 'Lakers', team2: 'Celtics', date: 'Today, 02:30', leagueId: 'nba_playoffs', sportId: 'nba', odds: { home: 1.85, away: 3.80 } },
      { id: 'm9', team1: 'Warriors', team2: 'Bucks', date: 'Tomorrow, 01:00', leagueId: 'nba_playoffs', sportId: 'nba', odds: { home: 2.10, away: 1.70 } },
    ]
  },
  {
    id: 'atp_rome',
    name: 'Tennis',
    sportId: 'tennis',
    countryCode: 'IT',
    matches: [
      { id: 'm10', team1: 'Djokovic', team2: 'Alcaraz', date: 'Today, 14:00', leagueId: 'atp_rome', sportId: 'tennis', odds: { home: 1.55, away: 2.45 } },
      { id: 'm11', team1: 'Swiatek', team2: 'Gauff', date: 'Today, 16:30', leagueId: 'atp_rome', sportId: 'tennis', odds: { home: 1.40, away: 2.90 } },
    ]
  },
  {
    id: 'cs2_pro_league',
    name: 'Esports (CS2)',
    sportId: 'esports',
    countryCode: 'GL',
    matches: [
      { id: 'm12', team1: 'Team Vitality', team2: 'Natus Vincere', date: 'Today, 18:00', leagueId: 'cs2_pro_league', sportId: 'esports', odds: { home: 1.65, away: 2.20 } },
      { id: 'm13', team1: 'G2', team2: 'FaZe', date: 'Tomorrow, 15:00', leagueId: 'cs2_pro_league', sportId: 'esports', odds: { home: 1.90, away: 1.85 } },
    ]
  },
  {
    id: 'epsom_derby',
    name: 'Horse Racing: Epsom Derby',
    sportId: 'horse_racing',
    countryCode: 'GB',
    matches: [
      { id: 'm14', team1: 'Auguste Rodin', team2: '', date: 'Sat, 13:30', leagueId: 'epsom_derby', sportId: 'horse_racing', odds: { home: 3.50, away: 0 } },
      { id: 'm15', team1: 'King of Steel', team2: '', date: 'Sat, 13:30', leagueId: 'epsom_derby', sportId: 'horse_racing', odds: { home: 4.00, away: 0 } },
      { id: 'm16', team1: 'Military Order', team2: '', date: 'Sat, 13:30', leagueId: 'epsom_derby', sportId: 'horse_racing', odds: { home: 5.50, away: 0 } },
      { id: 'm17', team1: 'Arrest', team2: '', date: 'Sat, 13:30', leagueId: 'epsom_derby', sportId: 'horse_racing', odds: { home: 8.00, away: 0 } },
      { id: 'm18', team1: 'Passenger', team2: '', date: 'Sat, 13:30', leagueId: 'epsom_derby', sportId: 'horse_racing', odds: { home: 12.00, away: 0 } },
    ]
  }
];

export const FEATURED_CARDS: FeaturedCard[] = [
  { 
    id: 'f1', 
    title: 'ACCUMULATOR BOOST', 
    subtitle: 'European Giants — Result/Both Teams to Score',
    selections: ['Real Madrid & Yes (v Sevilla)', 'PSG & Yes (v Paris FC)', 'Monaco & Yes (v Strasbourg)', 'Barcelona & Yes (v Real Betis)'],
    boostLabel: '+7.5% ACCA BOOST',
    odds: '76.54',
    returnExample: '€10 stake returns €822.09',
    bgGradient: ''
  },
  { 
    id: 'f2', 
    title: 'EARLY PAYOUT',
    subtitle: 'Full Time Result',
    selections: ['Athletic Club (v Celta Vigo)', 'Atletico Madrid (v Girona)', 'Real Madrid (v Sevilla)'],
    boostLabel: '+20% ACCA BOOST',
    odds: '142.40',
    returnExample: '€10 stake returns €1,706.87',
    bgGradient: ''
  },
  { 
    id: 'f3', 
    title: 'BOTH TEAMS TO SCORE',
    subtitle: 'Both Teams to Score',
    selections: ['Yes (Athletic Club v Celta Vigo)', 'Yes (Atletico Madrid v Girona)', 'Yes (Elche v Getafe)'],
    boostLabel: '+30% ACCA BOOST',
    odds: '145.32',
    returnExample: '€10 stake returns €1,886.24',
    bgGradient: ''
  },
];
