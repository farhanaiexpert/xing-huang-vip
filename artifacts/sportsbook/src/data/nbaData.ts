/**
 * NBA data — CLE Cavaliers @ NY Knicks (2025-26 Playoffs).
 * Static matchup data sourced from actual bet365 markets.
 * Assists / Rebounds / Threes tabs are seeded from today's date.
 */

const NBA_CDN = 'https://content001.bet365.com/SoccerSilks/';

export interface NbaPlayer {
  name:   string;
  number: string;
  ppg:    number;
  apg:    number;
  rpg:    number;
  tpg:    number;
  team:   'home' | 'away';
}

export interface NbaTeamDef {
  name:    string;
  abbr:    string;
  iconUrl: string;
  color:   string;
  players: Omit<NbaPlayer, 'team'>[];
}

export interface NbaBoostCard {
  id:           string;
  title:        string;
  matchup:      string;
  selections:   { label: string; teamAbbr: string }[];
  popularity:   number;
  originalOdds: number;
  boostedOdds:  number;
  returnExample: string;
}

export interface NbaMatchup {
  id:        string;
  home:      NbaTeamDef;
  away:      NbaTeamDef;
  time:      string;
  day:       string;
  spread:    { line: number; homeOdds: number; awayOdds: number };
  total:     { line: number; overOdds: number; underOdds: number };
  moneyLine: { homeOdds: number; awayOdds: number };
  players:   NbaPlayer[];
}

export type NbaMarket = 'points' | 'assists' | 'rebounds' | 'threes';

export interface PlayerPropRow {
  player:     NbaPlayer & { abbr: string; iconUrl: string };
  last5:      number[];
  thresholds: { value: number; odds: number }[];
}

// ── Static team definitions ────────────────────────────────────────────────────

const CLE: NbaTeamDef = {
  name: 'CLE Cavaliers', abbr: 'CLE', color: '#6F263D',
  iconUrl: 'https://media.ourwebprojects.pro/wp-content/uploads/2026/05/CLE_Cavaliers_Icon_Front_25.svg',
  players: [
    { name: 'Donovan Mitchell',  number: '45', ppg: 26.5, apg: 5.8,  rpg: 4.7,  tpg: 2.1 },
    { name: 'James Harden',      number: '1',  ppg: 20.0, apg: 8.5,  rpg: 4.5,  tpg: 2.0 },
    { name: 'Evan Mobley',       number: '4',  ppg: 18.0, apg: 2.8,  rpg: 9.4,  tpg: 0.8 },
    { name: 'Jarrett Allen',     number: '31', ppg: 13.0, apg: 1.5,  rpg: 10.5, tpg: 0.0 },
    { name: 'Darius Garland',    number: '10', ppg: 17.5, apg: 6.5,  rpg: 2.7,  tpg: 1.5 },
  ],
};

const NYK: NbaTeamDef = {
  name: 'NY Knicks', abbr: 'NYK', color: '#006BB6',
  iconUrl: `${NBA_CDN}NY_Knicks_Icon_Front_25.svg`,
  players: [
    { name: 'Jalen Brunson',      number: '11', ppg: 28.7, apg: 6.7,  rpg: 3.6,  tpg: 1.8 },
    { name: 'Karl-Anthony Towns', number: '32', ppg: 24.0, apg: 3.1,  rpg: 13.9, tpg: 2.1 },
    { name: 'Mikal Bridges',      number: '25', ppg: 19.6, apg: 3.6,  rpg: 4.5,  tpg: 1.7 },
    { name: 'OG Anunoby',         number: '8',  ppg: 14.7, apg: 1.6,  rpg: 4.2,  tpg: 2.0 },
    { name: 'Josh Hart',          number: '3',  ppg: 13.2, apg: 4.7,  rpg: 8.5,  tpg: 0.6 },
  ],
};

// ── Static matchup (exact from bet365 screenshot) ─────────────────────────────

const STATIC_MATCHUP: NbaMatchup = {
  id:   'nba_cle_nyk_playoffs',
  away: CLE,
  home: NYK,
  time: '03:00',
  day:  'Wed 20 May',
  spread:    { line: 7.0, homeOdds: 1.90, awayOdds: 1.90 },
  total:     { line: 217.5, overOdds: 1.90, underOdds: 1.90 },
  moneyLine: { homeOdds: 1.37, awayOdds: 3.20 },
  players: [
    // away (CLE)
    { ...CLE.players[0], team: 'away' },
    { ...CLE.players[1], team: 'away' },
    { ...CLE.players[2], team: 'away' },
    { ...CLE.players[3], team: 'away' },
    // home (NYK)
    { ...NYK.players[0], team: 'home' },
    { ...NYK.players[1], team: 'home' },
    { ...NYK.players[2], team: 'home' },
    { ...NYK.players[3], team: 'home' },
    { ...NYK.players[4], team: 'home' },
  ],
};

// ── Static boost cards (exact from bet365 screenshot) ─────────────────────────

const STATIC_BOOST_CARDS: NbaBoostCard[] = [
  {
    id:           'boost_1',
    title:        '2K PLAYOFF POINT PURSUIT',
    matchup:      'CLE Cavaliers @ NY Knicks',
    selections: [
      { label: 'Match Result will be NY Knicks', teamAbbr: 'NYK' },
      { label: 'NY Knicks to Score 120 Points',  teamAbbr: 'NYK' },
      { label: 'Jalen Brunson: 25+ Points',      teamAbbr: 'NYK' },
    ],
    popularity:   219,
    originalOdds: 4.30,
    boostedOdds:  4.75,
    returnExample: '€10 returns €47.50',
  },
  {
    id:           'boost_2',
    title:        'NOT SLOWING DOWN NOW!',
    matchup:      'CLE Cavaliers @ NY Knicks',
    selections: [
      { label: 'Match Result will be CLE Cavaliers', teamAbbr: 'CLE' },
      { label: 'Donovan Mitchell: 25+ Points',       teamAbbr: 'CLE' },
      { label: 'James Harden: 20+ Points',           teamAbbr: 'CLE' },
      { label: 'Evan Mobley: 15+ Points',            teamAbbr: 'CLE' },
    ],
    popularity:   116,
    originalOdds: 11.50,
    boostedOdds:  13.00,
    returnExample: '€10 returns €130',
  },
  {
    id:           'boost_3',
    title:        'KEY CONTRIBUTORS',
    matchup:      'CLE Cavaliers @ NY Knicks',
    selections: [
      { label: 'Mikal Bridges: 15+ Points', teamAbbr: 'NYK' },
      { label: 'Josh Hart: 15+ Points',     teamAbbr: 'NYK' },
      { label: 'Jarrett Allen: 15+ Points', teamAbbr: 'CLE' },
    ],
    popularity:   231,
    originalOdds: 16.00,
    boostedOdds:  17.00,
    returnExample: '€10 returns €170',
  },
  {
    id:           'boost_4',
    title:        'RAINING THREES',
    matchup:      'CLE Cavaliers @ NY Knicks',
    selections: [
      { label: 'Donovan Mitchell: 3+ Three-Pointers', teamAbbr: 'CLE' },
      { label: 'Jalen Brunson: 3+ Three-Pointers',    teamAbbr: 'NYK' },
      { label: 'James Harden: 3+ Three-Pointers',     teamAbbr: 'CLE' },
      { label: 'OG Anunoby: 3+ Three-Pointers',       teamAbbr: 'NYK' },
    ],
    popularity:   178,
    originalOdds: 13.00,
    boostedOdds:  15.00,
    returnExample: '€10 returns €150',
  },
];

// ── Static Points props (exact from bet365 screenshot) ───────────────────────

const POINTS_ROWS: PlayerPropRow[] = [
  {
    player:     { ...NYK.players[0], team: 'home', abbr: 'NYK', iconUrl: NYK.iconUrl },
    last5:      [17, 35, 26, 33, 22],
    thresholds: [
      { value: 20, odds: 1.16 },
      { value: 25, odds: 1.54 },
      { value: 30, odds: 2.45 },
      { value: 35, odds: 4.75 },
      { value: 40, odds: 9.50 },
    ],
  },
  {
    player:     { ...CLE.players[0], team: 'away', abbr: 'CLE', iconUrl: CLE.iconUrl },
    last5:      [35, 43, 21, 18, 26],
    thresholds: [
      { value: 20, odds: 1.20 },
      { value: 25, odds: 1.62 },
      { value: 30, odds: 2.60 },
      { value: 35, odds: 5.00 },
      { value: 40, odds: 9.50 },
    ],
  },
  {
    player:     { ...CLE.players[1], team: 'away', abbr: 'CLE', iconUrl: CLE.iconUrl },
    last5:      [19, 24, 30, 23, 9],
    thresholds: [
      { value: 15, odds: 1.28 },
      { value: 20, odds: 1.95 },
      { value: 25, odds: 3.80 },
      { value: 30, odds: 8.25 },
      { value: 35, odds: 16.00 },
    ],
  },
  {
    player:     { ...NYK.players[1], team: 'home', abbr: 'NYK', iconUrl: NYK.iconUrl },
    last5:      [12, 17, 20, 8, 17],
    thresholds: [
      { value: 15, odds: 1.40 },
      { value: 20, odds: 2.25 },
      { value: 25, odds: 4.50 },
      { value: 30, odds: 9.75 },
      { value: 35, odds: 18.00 },
    ],
  },
  {
    player:     { ...NYK.players[3], team: 'home', abbr: 'NYK', iconUrl: NYK.iconUrl },
    last5:      [22, 17, 29, 18, 24],
    thresholds: [
      { value: 10, odds: 1.13 },
      { value: 15, odds: 1.60 },
      { value: 20, odds: 3.00 },
      { value: 25, odds: 7.00 },
      { value: 30, odds: 14.00 },
    ],
  },
  {
    player:     { ...CLE.players[2], team: 'away', abbr: 'CLE', iconUrl: CLE.iconUrl },
    last5:      [13, 17, 19, 18, 21],
    thresholds: [
      { value: 10, odds: 1.13 },
      { value: 15, odds: 1.66 },
      { value: 20, odds: 3.30 },
      { value: 25, odds: 8.25 },
      { value: 30, odds: 18.00 },
    ],
  },
];

// ── Seeded RNG for non-Points tabs ────────────────────────────────────────────

function seededRNG(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff; };
}

function roundTo(n: number, dp = 2) { return Math.round(n * 10 ** dp) / 10 ** dp; }

function buildSeededRows(market: Exclude<NbaMarket, 'points'>): PlayerPropRow[] {
  const rng = seededRNG(new Date().toDateString() + '_nba_' + market);

  // All six players in display order (same as Points)
  const DISPLAY_ORDER: Array<{ def: typeof NYK['players'][0]; team: 'home' | 'away'; teamDef: NbaTeamDef }> = [
    { def: NYK.players[0], team: 'home', teamDef: NYK },
    { def: CLE.players[0], team: 'away', teamDef: CLE },
    { def: CLE.players[1], team: 'away', teamDef: CLE },
    { def: NYK.players[1], team: 'home', teamDef: NYK },
    { def: NYK.players[3], team: 'home', teamDef: NYK },
    { def: CLE.players[2], team: 'away', teamDef: CLE },
  ];

  return DISPLAY_ORDER.map(({ def, team, teamDef }) => {
    const avg = market === 'assists' ? def.apg : market === 'rebounds' ? def.rpg : def.tpg;

    // last5 — realistic variance around avg
    const last5 = Array.from({ length: 5 }, () =>
      Math.max(0, Math.round(avg * (0.4 + rng() * 1.2) * 2) / 2)
    );

    // thresholds: 5 steps starting well below avg
    let steps: number[];
    if (market === 'assists') {
      const base = Math.max(2, Math.round(avg * 0.5));
      steps = [0, 2, 4, 6, 8].map(s => base + s);
    } else if (market === 'rebounds') {
      const base = Math.max(2, Math.round(avg * 0.5));
      steps = [0, 2, 4, 6, 8].map(s => base + s);
    } else {
      // threes
      const base = Math.max(1, Math.round(avg * 0.5));
      steps = [0, 1, 2, 3, 4].map(s => base + s);
    }

    const thresholds = steps.map(v => {
      const diff = avg > 0 ? (v - avg) / avg : 0;
      const odds = roundTo(Math.max(1.05, 1.10 + (diff + 0.5) * 5 + rng() * 0.12));
      return { value: v, odds };
    });

    return {
      player: { ...def, team, abbr: teamDef.abbr, iconUrl: teamDef.iconUrl },
      last5,
      thresholds,
    };
  });
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateNbaMatchup(): NbaMatchup {
  return STATIC_MATCHUP;
}

export function generateBoostCards(_matchup: NbaMatchup): NbaBoostCard[] {
  return STATIC_BOOST_CARDS;
}

export function generatePlayerProps(_matchup: NbaMatchup, market: NbaMarket): PlayerPropRow[] {
  if (market === 'points') return POINTS_ROWS;
  return buildSeededRows(market);
}
