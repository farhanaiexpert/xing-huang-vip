/**
 * UEFA Europa League Final — SC Freiburg v Aston Villa.
 * Static match + boost card data from bet365.
 * Non-Main BetBuilder tabs are seeded from today's date.
 */

export const SCF_JERSEY = 'https://content001.bet365.com/SoccerSilks/SC_Freiburg_UEL_Front_25_26.svg';
export const AVL_JERSEY = 'https://content001.bet365.com/SoccerSilks/Aston_Villa_Atl_Front_25_26.svg';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EuropaBoostCard {
  id:           string;
  title:        string;
  matchup:      string;
  selections:   { label: string; team: 'home' | 'away' }[];
  popularity?:  number;
  originalOdds: number;
  boostedOdds:  number;
  returnExample: string;
}

export interface EuropaMatchup {
  home: { name: string; jerseyUrl: string; color: string };
  away: { name: string; jerseyUrl: string; color: string };
  time: string;
  day:  string;
  odds: { home: number; draw: number; away: number };
}

export type EuropaMarket = 'main' | 'shots_on_target' | 'shots' | 'fouls' | 'tackles';

export interface EuropaPlayerRow {
  name:    string;
  number:  string;
  team:    'home' | 'away';
  last5:   number[];
  markets: { label: string; odds: number }[];  // 3 columns for Main, 4 thresholds for others
}

// ── Static match ───────────────────────────────────────────────────────────────

export const EUROPA_MATCHUP: EuropaMatchup = {
  away: { name: 'SC Freiburg', jerseyUrl: SCF_JERSEY, color: '#CC0000' },
  home: { name: 'Aston Villa', jerseyUrl: AVL_JERSEY, color: '#95BFE5' },
  time: '22:00',
  day:  'Wed 20 May',
  odds: { home: 5.25, draw: 3.75, away: 1.66 },
};

// ── Static boost cards ─────────────────────────────────────────────────────────

export const EUROPA_BOOST_CARDS: EuropaBoostCard[] = [
  {
    id:           'uel_boost_1',
    title:        'SC FREIBURG v ASTON VILLA',
    matchup:      'SC Freiburg v Aston Villa',
    selections: [
      { label: 'SC Freiburg to Lift the Trophy', team: 'away' },
      { label: 'Igor Matanovic to Score',         team: 'away' },
      { label: 'Over 2 Goals',                    team: 'away' },
    ],
    originalOdds:  13.00,
    boostedOdds:   15.00,
    returnExample: '€10 returns €150',
  },
  {
    id:           'uel_boost_2',
    title:        'SC FREIBURG v ASTON VILLA',
    matchup:      'SC Freiburg v Aston Villa',
    selections: [
      { label: 'Aston Villa to Lift the Trophy', team: 'home' },
      { label: 'Both Teams to Score',             team: 'home' },
      { label: 'Ollie Watkins to Score',          team: 'home' },
    ],
    popularity:    151,
    originalOdds:  4.50,
    boostedOdds:   5.00,
    returnExample: '€10 returns €50',
  },
  {
    id:           'uel_boost_3',
    title:        'SC FREIBURG v ASTON VILLA',
    matchup:      'SC Freiburg v Aston Villa',
    selections: [
      { label: 'Morgan Rogers to Score',         team: 'home' },
      { label: 'Aston Villa to Lift the Trophy', team: 'home' },
      { label: 'Over 3 Goals',                   team: 'home' },
    ],
    originalOdds:  7.00,
    boostedOdds:   8.00,
    returnExample: '€10 returns €80',
  },
  {
    id:           'uel_boost_4',
    title:        'SC FREIBURG v ASTON VILLA',
    matchup:      'SC Freiburg v Aston Villa',
    selections: [
      { label: 'Johan Manzambi: 2+ Fouls Committed',    team: 'away' },
      { label: 'Jordy Makengo: 2+ Fouls Committed',     team: 'away' },
      { label: 'Emiliano Buendia: 2+ Fouls Committed',  team: 'home' },
      { label: 'John McGinn: 2+ Fouls Committed',       team: 'home' },
    ],
    originalOdds:  10.00,
    boostedOdds:   11.00,
    returnExample: '€10 returns €110',
  },
];

// ── Static Main tab (exact from screenshot) ────────────────────────────────────
// Columns: To Score | Score or Assist | To be Booked

export const MAIN_ROWS: EuropaPlayerRow[] = [
  {
    name: 'Ollie Watkins',  number: '11', team: 'home',
    last5: [0, 2, 1, 0, 1],
    markets: [
      { label: 'To Score',        odds: 2.30 },
      { label: 'Score or Assist', odds: 1.80 },
      { label: 'To be Booked',    odds: 7.00 },
    ],
  },
  {
    name: 'Morgan Rogers',  number: '27', team: 'home',
    last5: [0, 0, 1, 0, 0],
    markets: [
      { label: 'To Score',        odds: 2.50 },
      { label: 'Score or Assist', odds: 1.80 },
      { label: 'To be Booked',    odds: 4.33 },
    ],
  },
  {
    name: 'Igor Matanovic', number: '31', team: 'away',
    last5: [1, 0, 1, 0, 0],
    markets: [
      { label: 'To Score',        odds: 3.75 },
      { label: 'Score or Assist', odds: 3.00 },
      { label: 'To be Booked',    odds: 3.60 },
    ],
  },
  {
    name: 'John McGinn',    number: '7',  team: 'home',
    last5: [1, 0, 0, 0, 2],
    markets: [
      { label: 'To Score',        odds: 3.75 },
      { label: 'Score or Assist', odds: 2.60 },
      { label: 'To be Booked',    odds: 3.50 },
    ],
  },
  {
    name: 'Youri Tielemans', number: '8', team: 'home',
    last5: [0, 0, 0, 0, 0],
    markets: [
      { label: 'To Score',        odds: 4.33 },
      { label: 'Score or Assist', odds: 2.60 },
      { label: 'To be Booked',    odds: 4.33 },
    ],
  },
  {
    name: 'Vincenzo Grifo', number: '32', team: 'away',
    last5: [1, 1, 0, 1, 0],
    markets: [
      { label: 'To Score',        odds: 4.50 },
      { label: 'Score or Assist', odds: 2.87 },
      { label: 'To be Booked',    odds: 5.50 },
    ],
  },
];

// Extra players for alternate tabs
const ALL_PLAYERS: Omit<EuropaPlayerRow, 'last5' | 'markets'>[] = [
  { name: 'Ollie Watkins',    number: '11', team: 'home' },
  { name: 'Morgan Rogers',    number: '27', team: 'home' },
  { name: 'Igor Matanovic',   number: '31', team: 'away' },
  { name: 'John McGinn',      number: '7',  team: 'home' },
  { name: 'Youri Tielemans',  number: '8',  team: 'home' },
  { name: 'Vincenzo Grifo',   number: '32', team: 'away' },
  { name: 'Leon Bailey',      number: '31', team: 'home' },
  { name: 'Vincenzo Grifo',   number: '32', team: 'away' },
  { name: 'Johan Manzambi',   number: '9',  team: 'away' },
  { name: 'Jordy Makengo',    number: '10', team: 'away' },
];

// ── Seeded RNG ─────────────────────────────────────────────────────────────────

function seededRNG(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff; };
}

function roundTo(n: number, dp = 2) { return Math.round(n * 10 ** dp) / 10 ** dp; }

export function getEuropaPlayerRows(market: EuropaMarket): EuropaPlayerRow[] {
  if (market === 'main') return MAIN_ROWS;

  const rng = seededRNG(new Date().toDateString() + '_uel_' + market);

  const thresholds: number[] = [1, 2, 3, 4];
  const thresholdLabels = thresholds.map(t => `${t}+`);

  return ALL_PLAYERS.slice(0, 6).map(p => {
    const avgStat = market === 'shots_on_target' ? 1.5 + rng() * 1.5
                  : market === 'shots'            ? 2 + rng() * 2
                  : market === 'fouls'            ? 1 + rng() * 2
                  : 1 + rng() * 2; // tackles

    const last5 = Array.from({ length: 5 }, () => Math.round(avgStat * (0.3 + rng() * 1.4)));

    const markets = thresholds.map((t, i) => {
      const diff  = (t - avgStat) / Math.max(avgStat, 0.5);
      const odds  = roundTo(Math.max(1.05, 1.12 + (diff + 0.4) * 4 + rng() * 0.15));
      return { label: thresholdLabels[i], odds };
    });

    return { ...p, last5, markets };
  });
}
