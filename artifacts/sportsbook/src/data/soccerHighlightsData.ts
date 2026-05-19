/**
 * Soccer Highlights — static data for SoccerHighlights.tsx
 * Features Premier League, La Liga, and Champions League matches.
 * Featured BetBuilder+ match: Arsenal vs Chelsea (LIVE)
 */

// ── Jersey SVG URLs (bet365 CDN — falls back to colour badge) ─────────────────

export const ARS_JERSEY = 'https://content001.bet365.com/SoccerSilks/Arsenal_PL_Home_Front_25_26.svg';
export const CHE_JERSEY = 'https://content001.bet365.com/SoccerSilks/Chelsea_PL_Away_Front_25_26.svg';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SoccerBoostCard {
  id:            string;
  title:         string;
  selections:    { label: string; team: 'home' | 'away' }[];
  popularity?:   number;
  originalOdds:  number;
  boostedOdds:   number;
  returnExample: string;
}

export interface SoccerMatchRow {
  id:       string;
  home:     string;
  away:     string;
  homeClr:  string;
  awayClr:  string;
  homeAbbr: string;
  awayAbbr: string;
  time:     string;
  isLive?:  boolean;
  minute?:  number;
  score?:   { home: number; away: number };
  markets:  number;
  odds:     { h: number; d: number; a: number };
}

export type SoccerMarket = 'goals' | 'assists' | 'cards' | 'corners';

export interface SoccerPlayerRow {
  name:   string;
  number: string;
  team:   'home' | 'away';
  last5:  number[];
  markets: { label: string; odds: number }[];
}

// ── Boost cards ────────────────────────────────────────────────────────────────

export const SOCCER_BOOST_CARDS: SoccerBoostCard[] = [
  {
    id: 'soc_boost_1',
    title: 'ARSENAL v CHELSEA',
    selections: [
      { label: 'Arsenal to Win',        team: 'home' },
      { label: 'Bukayo Saka to Score',  team: 'home' },
      { label: 'Both Teams to Score',   team: 'home' },
    ],
    popularity:    312,
    originalOdds:  6.50,
    boostedOdds:   7.50,
    returnExample: '€10 returns €75',
  },
  {
    id: 'soc_boost_2',
    title: 'MAN CITY v LIVERPOOL',
    selections: [
      { label: 'Man City to Win',           team: 'home' },
      { label: 'Erling Haaland 2+ Goals',   team: 'home' },
      { label: 'Over 3.5 Goals',            team: 'home' },
    ],
    popularity:    198,
    originalOdds:  6.50,
    boostedOdds:   8.00,
    returnExample: '€10 returns €80',
  },
  {
    id: 'soc_boost_3',
    title: 'BARCELONA v REAL MADRID',
    selections: [
      { label: 'Barcelona to Win',              team: 'home' },
      { label: 'Lewandowski to Score',           team: 'home' },
      { label: 'Both Teams to Score',            team: 'home' },
    ],
    popularity:    477,
    originalOdds:  4.25,
    boostedOdds:   5.00,
    returnExample: '€10 returns €50',
  },
  {
    id: 'soc_boost_4',
    title: 'PSG v BAYERN MUNICH',
    selections: [
      { label: 'PSG to Win',                      team: 'home' },
      { label: 'Mbappé to Score',                 team: 'home' },
      { label: 'Over 2.5 Goals',                  team: 'home' },
    ],
    originalOdds:  5.50,
    boostedOdds:   6.50,
    returnExample: '€10 returns €65',
  },
];

// ── Featured matches (match table) ─────────────────────────────────────────────

export const SOCCER_MATCHES: SoccerMatchRow[] = [
  {
    id: 'm1',     home: 'Arsenal',         away: 'Chelsea',
    homeClr: '#EF0107', awayClr: '#034694',
    homeAbbr: 'ARS', awayAbbr: 'CHE',
    time: 'LIVE', isLive: true, minute: 67,
    score: { home: 2, away: 1 },
    markets: 84, odds: { h: 1.85, d: 3.40, a: 4.20 },
  },
  {
    id: 'm4',     home: 'Barcelona',       away: 'Real Madrid',
    homeClr: '#A50044', awayClr: '#FEBE10',
    homeAbbr: 'BAR', awayAbbr: 'RMA',
    time: 'LIVE', isLive: true, minute: 34,
    score: { home: 1, away: 1 },
    markets: 104, odds: { h: 2.20, d: 3.30, a: 3.10 },
  },
  {
    id: 'm2',     home: 'Man City',        away: 'Liverpool',
    homeClr: '#6CABDD', awayClr: '#C8102E',
    homeAbbr: 'MCI', awayAbbr: 'LIV',
    time: 'Tomorrow 17:30', markets: 92, odds: { h: 2.10, d: 3.25, a: 3.50 },
  },
  {
    id: 'm6',     home: 'PSG',             away: 'Bayern Munich',
    homeClr: '#004170', awayClr: '#DC052D',
    homeAbbr: 'PSG', awayAbbr: 'BAY',
    time: 'Wed 20:00', markets: 112, odds: { h: 2.75, d: 3.20, a: 2.55 },
  },
  {
    id: 'sa1',    home: 'Juventus',        away: 'Napoli',
    homeClr: '#000000', awayClr: '#12A0D7',
    homeAbbr: 'JUV', awayAbbr: 'NAP',
    time: 'LIVE', isLive: true, minute: 78,
    score: { home: 1, away: 0 },
    markets: 88, odds: { h: 2.30, d: 3.25, a: 3.10 },
  },
];

// ── BetBuilder+ player rows ────────────────────────────────────────────────────

const rng = (seed: number) => { let x = seed; return () => { x = (x * 1664525 + 1013904223) & 0xffffffff; return (x >>> 0) / 0xffffffff; }; };

function seededOdds(base: number, spread: number, r: () => number) {
  return parseFloat((base + (r() - 0.5) * spread).toFixed(2));
}

export function getSoccerPlayerRows(market: SoccerMarket): SoccerPlayerRow[] {
  const seed = new Date().getDate() + new Date().getMonth() * 31;
  const r    = rng(seed + market.charCodeAt(0));

  const col3 = (base: number, s: number) =>
    [1, 2, 3].map((_, i) => seededOdds(base + i * s, s * 0.6, r));

  const arsPlayers: Omit<SoccerPlayerRow, 'markets'>[] = [
    { name: 'Bukayo Saka',        number: '7',  team: 'home', last5: [1,0,1,1,0] },
    { name: 'Martin Ødegaard',    number: '8',  team: 'home', last5: [0,1,0,1,1] },
    { name: 'Kai Havertz',        number: '29', team: 'home', last5: [1,1,0,0,1] },
    { name: 'Gabriel Martinelli', number: '11', team: 'home', last5: [0,1,1,0,0] },
  ];
  const chePlayers: Omit<SoccerPlayerRow, 'markets'>[] = [
    { name: 'Cole Palmer',       number: '20', team: 'away', last5: [1,1,0,1,1] },
    { name: 'Nicolas Jackson',   number: '15', team: 'away', last5: [1,0,1,0,0] },
    { name: 'Enzo Fernández',    number: '5',  team: 'away', last5: [0,0,0,1,0] },
    { name: 'Noni Madueke',      number: '11', team: 'away', last5: [0,1,0,0,1] },
  ];

  const all = [...arsPlayers, ...chePlayers];

  if (market === 'goals') {
    const labels = ['To Score', 'To Score or Assist', '2+ Goals'];
    const bases  = [2.10, 1.60, 6.50];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.5, r) })) }));
  }
  if (market === 'assists') {
    const labels = ['Assist', 'Key Pass', '2+ Key Passes'];
    const bases  = [3.50, 2.00, 4.25];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.6, r) })) }));
  }
  if (market === 'cards') {
    const labels = ['Yellow Card', '2nd Yellow', 'Red Card'];
    const bases  = [3.00, 9.00, 14.00];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 1.0, r) })) }));
  }
  // corners
  const labels = ['1+ Corners', '2+ Corners', '3+ Corners'];
  const bases  = [1.80, 3.20, 6.00];
  return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.5, r) })) }));
}
