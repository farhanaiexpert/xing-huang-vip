/**
 * eSoccer Highlights — static data for ESoccerHighlights.tsx
 * Covers virtual/electronic soccer (FIFA/eFootball) esports matchups.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ESoccerBoostCard {
  id:            string;
  title:         string;
  tag:           string;
  selections:    string[];
  popularity?:   number;
  originalOdds:  number;
  boostedOdds:   number;
  returnExample: string;
}

export interface ESoccerMatchRow {
  id:       string;
  home:     string;
  away:     string;
  homeClr:  string;
  awayClr:  string;
  homeAbbr: string;
  awayAbbr: string;
  flag:     string;
  time:     string;
  isLive?:  boolean;
  minute?:  number;
  score?:   { home: number; away: number };
  markets:  number;
  odds:     { h: number; d: number; a: number };
}

export type ESoccerMarket = 'goals' | 'assists' | 'fouls' | 'corners';

export interface ESoccerPlayerRow {
  name:    string;
  handle:  string;
  number:  string;
  team:    'home' | 'away';
  last5:   number[];
  markets: { label: string; odds: number }[];
}

// ── Boost cards ────────────────────────────────────────────────────────────────

export const ESOCCER_BOOST_CARDS: ESoccerBoostCard[] = [
  {
    id: 'esc_boost_1',
    title: 'G2 ESPORTS v TEAM VITALITY',
    tag: 'eFootball Cup',
    selections: [
      'G2 Esports to Win',
      'Over 3.5 Virtual Goals',
      '1st Half Winner — G2',
    ],
    popularity:    143,
    originalOdds:  4.75,
    boostedOdds:   5.50,
    returnExample: '€10 returns €55',
  },
  {
    id: 'esc_boost_2',
    title: 'FAZE CLAN v FNATIC',
    tag: 'eFootball Cup',
    selections: [
      'FaZe Clan to Win',
      'Both Teams to Score',
      'FaZe Clean Sheet in 1st Half',
    ],
    popularity:    89,
    originalOdds:  5.25,
    boostedOdds:   6.00,
    returnExample: '€10 returns €60',
  },
  {
    id: 'esc_boost_3',
    title: 'NAVI v TEAM LIQUID',
    tag: 'Virtual Championship',
    selections: [
      'NaVi to Win',
      'Over 2.5 Goals',
      'Both Teams to Score',
    ],
    popularity:    211,
    originalOdds:  3.80,
    boostedOdds:   4.50,
    returnExample: '€10 returns €45',
  },
  {
    id: 'esc_boost_4',
    title: 'VIRTUAL EL CLÁSICO',
    tag: 'eSoccer Special',
    selections: [
      'Real Madrid eSports to Win',
      'Over 3.5 Goals',
      'Winning Margin — 2+ Goals',
    ],
    originalOdds:  7.00,
    boostedOdds:   8.00,
    returnExample: '€10 returns €80',
  },
];

// ── Matches ────────────────────────────────────────────────────────────────────

export const ESOCCER_MATCHES: ESoccerMatchRow[] = [
  {
    id: 'esc1', home: 'G2 Esports', away: 'Team Vitality',
    homeClr: '#FF5500', awayClr: '#FFCC00',
    homeAbbr: 'G2', awayAbbr: 'VIT',
    flag: '🟠',
    time: '14:00', markets: 38, odds: { h: 2.10, d: 3.20, a: 3.40 },
  },
  {
    id: 'esc2', home: 'FaZe Clan', away: 'Fnatic',
    homeClr: '#FF0000', awayClr: '#FF6B00',
    homeAbbr: 'FAZ', awayAbbr: 'FNC',
    flag: '🔴',
    time: '15:30', markets: 32, odds: { h: 1.75, d: 3.50, a: 4.50 },
  },
  {
    id: 'esc3', home: 'NaVi', away: 'Team Liquid',
    homeClr: '#F5A623', awayClr: '#009CA6',
    homeAbbr: 'NAV', awayAbbr: 'LIQ',
    flag: '🟡',
    time: 'LIVE', isLive: true, minute: 38,
    score: { home: 2, away: 1 },
    markets: 44, odds: { h: 2.45, d: 2.95, a: 2.85 },
  },
  {
    id: 'esc4', home: 'PSG eSports', away: 'Man City eSports',
    homeClr: '#004170', awayClr: '#6CABDD',
    homeAbbr: 'PSG', awayAbbr: 'MCI',
    flag: '🔵',
    time: '18:30', markets: 41, odds: { h: 2.20, d: 3.10, a: 3.20 },
  },
  {
    id: 'esc5', home: 'Real Madrid eS', away: 'Barça eSports',
    homeClr: '#FEBE10', awayClr: '#A50044',
    homeAbbr: 'RME', awayAbbr: 'BAE',
    flag: '🏆',
    time: '20:00', markets: 55, odds: { h: 2.00, d: 3.25, a: 3.60 },
  },
];

// ── BetBuilder+ player rows ────────────────────────────────────────────────────

const rng = (seed: number) => {
  let x = seed;
  return () => { x = (x * 1664525 + 1013904223) & 0xffffffff; return (x >>> 0) / 0xffffffff; };
};

function seededOdds(base: number, spread: number, r: () => number) {
  return parseFloat((base + (r() - 0.5) * spread).toFixed(2));
}

export function getESoccerPlayerRows(market: ESoccerMarket): ESoccerPlayerRow[] {
  const seed = new Date().getDate() + new Date().getMonth() * 31 + 7;
  const r    = rng(seed + market.charCodeAt(0));

  const g2Players: Omit<ESoccerPlayerRow, 'markets'>[] = [
    { name: 'BenijasM23',   handle: 'BenijasM23',  number: '10', team: 'home', last5: [1,1,0,1,1] },
    { name: 'KgxX',         handle: 'KgxX',         number: '7',  team: 'home', last5: [0,1,0,1,0] },
    { name: 'Pr9',          handle: 'Pr9',           number: '9',  team: 'home', last5: [1,0,1,1,0] },
    { name: 'Dani_Llaguno', handle: 'Dani_Llaguno', number: '11', team: 'home', last5: [0,0,1,0,1] },
  ];
  const vitPlayers: Omit<ESoccerPlayerRow, 'markets'>[] = [
    { name: 'Tekkz',        handle: 'Tekkz',        number: '1',  team: 'away', last5: [1,1,1,0,1] },
    { name: 'MoAuba',       handle: 'MoAuba',       number: '8',  team: 'away', last5: [1,0,1,0,0] },
    { name: 'Nicolas99FC',  handle: 'Nicolas99FC',  number: '14', team: 'away', last5: [0,1,0,1,0] },
    { name: 'Gorilla',      handle: 'Gorilla',      number: '6',  team: 'away', last5: [1,1,0,0,1] },
  ];

  const all = [...g2Players, ...vitPlayers];

  if (market === 'goals') {
    const labels = ['To Score', 'To Score or Assist', '2+ Goals'];
    const bases  = [2.20, 1.65, 7.00];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.5, r) })) }));
  }
  if (market === 'assists') {
    const labels = ['Assist', 'Key Pass', '2+ Key Passes'];
    const bases  = [3.75, 2.10, 4.50];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.7, r) })) }));
  }
  if (market === 'fouls') {
    const labels = ['1+ Foul', '2+ Fouls', 'Yellow Card'];
    const bases  = [1.60, 2.80, 3.50];
    return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.5, r) })) }));
  }
  // corners
  const labels = ['1+ Corners', '2+ Corners', '3+ Corners'];
  const bases  = [1.85, 3.30, 6.50];
  return all.map(p => ({ ...p, markets: labels.map((label, i) => ({ label, odds: seededOdds(bases[i], 0.5, r) })) }));
}
