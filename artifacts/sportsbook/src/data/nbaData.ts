/**
 * NBA data — daily-rotating matchup generator.
 * Seeded from today's date so data stays consistent within a day,
 * changes automatically every 24 h. Cached in localStorage.
 */

const NBA_CDN = 'https://content001.bet365.com/SoccerSilks/';

export interface NbaPlayer {
  name:   string;
  number: string;
  ppg:    number; // avg points/game  — drives prop thresholds
  apg:    number;
  rpg:    number;
  tpg:    number; // avg three-pointers/game
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
  id:          string;
  title:       string;
  matchup:     string;
  selections:  { label: string; teamAbbr: string }[];
  popularity:  number;
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

// ── Team pool ──────────────────────────────────────────────────────────────────

const TEAMS: NbaTeamDef[] = [
  {
    name: 'CLE Cavaliers', abbr: 'CLE', color: '#6F263D',
    iconUrl: `${NBA_CDN}CLE_Cavaliers_Icon_Front_25.svg`,
    players: [
      { name: 'Donovan Mitchell',  number: '45', ppg: 26.5, apg: 5.8, rpg: 4.7, tpg: 2.1 },
      { name: 'Darius Garland',    number: '10', ppg: 21.7, apg: 7.8, rpg: 2.7, tpg: 2.2 },
      { name: 'Evan Mobley',       number: '4',  ppg: 18.0, apg: 2.8, rpg: 9.4, tpg: 0.8 },
      { name: 'Jarrett Allen',     number: '31', ppg: 13.0, apg: 1.5, rpg: 10.5, tpg: 0.0 },
      { name: 'Max Strus',         number: '1',  ppg: 12.5, apg: 2.8, rpg: 3.9, tpg: 2.0 },
    ],
  },
  {
    name: 'NY Knicks', abbr: 'NYK', color: '#006BB6',
    iconUrl: `${NBA_CDN}NY_Knicks_Icon_Front_25.svg`,
    players: [
      { name: 'Jalen Brunson',      number: '11', ppg: 28.7, apg: 6.7, rpg: 3.6, tpg: 1.8 },
      { name: 'Mikal Bridges',      number: '25', ppg: 19.6, apg: 3.6, rpg: 4.5, tpg: 1.7 },
      { name: 'Josh Hart',          number: '3',  ppg: 13.2, apg: 4.7, rpg: 8.5, tpg: 0.6 },
      { name: 'Karl-Anthony Towns', number: '32', ppg: 24.0, apg: 3.1, rpg: 13.9, tpg: 2.1 },
      { name: 'OG Anunoby',         number: '8',  ppg: 14.7, apg: 1.6, rpg: 4.2, tpg: 2.0 },
    ],
  },
  {
    name: 'Boston Celtics', abbr: 'BOS', color: '#007A33',
    iconUrl: `${NBA_CDN}BOS_Celtics_Icon_Front_25.svg`,
    players: [
      { name: 'Jayson Tatum',    number: '0',  ppg: 26.9, apg: 4.9, rpg: 8.1, tpg: 2.9 },
      { name: 'Jaylen Brown',    number: '7',  ppg: 23.0, apg: 3.6, rpg: 5.5, tpg: 2.3 },
      { name: 'Jrue Holiday',    number: '4',  ppg: 12.5, apg: 4.8, rpg: 4.9, tpg: 0.9 },
      { name: 'Al Horford',      number: '42', ppg: 9.8,  apg: 3.0, rpg: 7.0, tpg: 1.1 },
      { name: 'Derrick White',   number: '9',  ppg: 15.2, apg: 4.2, rpg: 4.3, tpg: 2.4 },
    ],
  },
  {
    name: 'Indiana Pacers', abbr: 'IND', color: '#002D62',
    iconUrl: `${NBA_CDN}IND_Pacers_Icon_Front_25.svg`,
    players: [
      { name: 'Tyrese Haliburton', number: '0',  ppg: 20.1, apg: 10.9, rpg: 4.0, tpg: 2.6 },
      { name: 'Pascal Siakam',     number: '43', ppg: 22.1, apg: 3.8, rpg: 6.9, tpg: 0.8 },
      { name: 'Myles Turner',      number: '33', ppg: 14.9, apg: 1.4, rpg: 7.2, tpg: 1.6 },
      { name: 'Bennedict Mathurin',number: '00', ppg: 16.6, apg: 2.0, rpg: 4.7, tpg: 1.3 },
      { name: 'Andrew Nembhard',   number: '2',  ppg: 11.0, apg: 4.9, rpg: 3.8, tpg: 0.9 },
    ],
  },
  {
    name: 'OKC Thunder', abbr: 'OKC', color: '#007AC1',
    iconUrl: `${NBA_CDN}OKC_Thunder_Icon_Front_25.svg`,
    players: [
      { name: 'Shai Gilgeous-Alexander', number: '2',  ppg: 31.4, apg: 6.4, rpg: 4.5, tpg: 0.7 },
      { name: 'Jalen Williams',           number: '8',  ppg: 22.5, apg: 5.6, rpg: 4.5, tpg: 1.2 },
      { name: 'Chet Holmgren',            number: '7',  ppg: 14.6, apg: 1.9, rpg: 7.9, tpg: 1.2 },
      { name: 'Isaiah Hartenstein',       number: '55', ppg: 8.5,  apg: 2.7, rpg: 10.1, tpg: 0.0 },
      { name: 'Lu Dort',                  number: '5',  ppg: 13.3, apg: 2.0, rpg: 4.2, tpg: 2.1 },
    ],
  },
  {
    name: 'Minnesota T-Wolves', abbr: 'MIN', color: '#236192',
    iconUrl: `${NBA_CDN}MIN_Wolves_Icon_Front_25.svg`,
    players: [
      { name: 'Anthony Edwards',   number: '5',  ppg: 25.9, apg: 5.1, rpg: 5.4, tpg: 2.7 },
      { name: 'Julius Randle',     number: '30', ppg: 21.2, apg: 5.3, rpg: 8.9, tpg: 1.2 },
      { name: 'Mike Conley',       number: '10', ppg: 9.5,  apg: 5.1, rpg: 2.8, tpg: 1.2 },
      { name: 'Naz Reid',          number: '11', ppg: 13.4, apg: 1.5, rpg: 6.0, tpg: 1.2 },
      { name: 'Jaden McDaniels',   number: '3',  ppg: 12.5, apg: 1.8, rpg: 5.0, tpg: 1.0 },
    ],
  },
];

// Playoff matchup pairs — always seeded so different each day
const PLAYOFF_PAIRS = [
  [0, 1], // CLE vs NYK
  [2, 3], // BOS vs IND
  [4, 5], // OKC vs MIN
  [1, 2], // NYK vs BOS
  [0, 4], // CLE vs OKC
  [3, 5], // IND vs MIN
];

// Game times (in CET)
const GAME_TIMES = ['01:30', '02:00', '03:00', '03:30', '04:00'];

// Boost card title pool
const BOOST_TITLES = [
  '2K PLAYOFF POINT PURSUIT',
  'NOT SLOWING DOWN NOW!',
  'KEY CONTRIBUTORS',
  'RAINING THREES',
];

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRNG(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function range(min: number, max: number, rng: () => number) {
  return min + rng() * (max - min);
}

function roundTo(n: number, dp = 2) {
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}

// ── Generators ───────────────────────────────────────────────────────────────

function getDayLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' });
}

export function generateNbaMatchup(): NbaMatchup {
  const dateKey = new Date().toDateString();
  const cacheKey = `nba_matchup_${dateKey}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as NbaMatchup; } catch { /* fall through */ }
  }

  const rng  = seededRNG(dateKey + '_nba');
  const pair = PLAYOFF_PAIRS[Math.floor(rng() * PLAYOFF_PAIRS.length)];
  const home = TEAMS[pair[0]];
  const away = TEAMS[pair[1]];

  // Spread: home is favourite (negative) or underdog (positive)
  const homeIsFav = rng() > 0.45;
  const spreadLine = Math.round(range(2, 9, rng) * 2) / 2; // 2.0 – 9.0 in 0.5 steps
  const homeSpread = homeIsFav ? -spreadLine : +spreadLine;
  const awaySpread = -homeSpread;
  const spreadOdds = roundTo(1.82 + range(0, 0.10, rng), 2);

  // Total
  const totalLine = Math.round(range(210, 230, rng) * 2) / 2;
  const overOdds  = roundTo(1.85 + range(0, 0.08, rng), 2);
  const underOdds = roundTo(1.85 + range(0, 0.08, rng), 2);

  // Money line
  const favML  = roundTo(1.25 + range(0, 0.20, rng), 2);
  const dogML  = roundTo(2.80 + range(0, 0.70, rng), 2);
  const homeML = homeIsFav ? favML : dogML;
  const awayML = homeIsFav ? dogML : favML;

  const time = pick(GAME_TIMES, rng);
  const day  = getDayLabel();

  const players: NbaPlayer[] = [
    ...away.players.slice(0, 3).map(p => ({ ...p, team: 'away' as const })),
    ...home.players.slice(0, 3).map(p => ({ ...p, team: 'home' as const })),
  ];

  const matchup: NbaMatchup = {
    id: `nba_${dateKey}`,
    home, away, time, day,
    spread:    { line: spreadLine, homeOdds: spreadOdds, awayOdds: spreadOdds },
    total:     { line: totalLine, overOdds, underOdds },
    moneyLine: { homeOdds: homeML, awayOdds: awayML },
    players,
  };

  localStorage.setItem(cacheKey, JSON.stringify(matchup));
  return matchup;
}

export function generateBoostCards(matchup: NbaMatchup): NbaBoostCard[] {
  const dateKey = new Date().toDateString();
  const rng = seededRNG(dateKey + '_nba_boost');

  const { home, away } = matchup;
  const matchupStr = `${away.name} @ ${home.name}`;

  // Helper to pick N players from both teams
  const allPlayers = [
    ...away.players.map(p => ({ ...p, abbr: away.abbr })),
    ...home.players.map(p => ({ ...p, abbr: home.abbr })),
  ];

  function playerProp(player: typeof allPlayers[0], stat: 'ppg' | 'tpg', threshold: number): { label: string; teamAbbr: string } {
    const statLabel = stat === 'tpg' ? 'Three-Pointers' : 'Points';
    return { label: `${player.name}: ${threshold}+ ${statLabel}`, teamAbbr: player.abbr };
  }

  // Card 1: Point Pursuit — mix of match result + points props
  const card1Players = [allPlayers[0], allPlayers[2], allPlayers[1]];
  const card1Odds = roundTo(range(3.5, 6.0, rng), 2);
  const card1Boost = roundTo(card1Odds + range(0.5, 1.5, rng), 2);
  const c1Thresh = [Math.round(card1Players[0].ppg * 0.9 / 5) * 5, Math.round(card1Players[2].ppg * 0.85 / 5) * 5];
  const card1: NbaBoostCard = {
    id: 'nba_boost_1',
    title: BOOST_TITLES[0],
    matchup: matchupStr,
    selections: [
      { label: `Match Result will be ${away.name}`, teamAbbr: away.abbr },
      { label: `${home.name} to Score ${Math.round(range(115, 125, rng) / 5) * 5} Points`, teamAbbr: home.abbr },
      playerProp({ ...card1Players[2], abbr: card1Players[2].team === away.players[0] ? away.abbr : home.abbr }, 'ppg', c1Thresh[1]),
    ],
    popularity: Math.floor(range(150, 300, rng)),
    originalOdds: card1Odds,
    boostedOdds: card1Boost,
    returnExample: `€10 returns €${(card1Boost * 10).toFixed(2)}`,
  };

  // Card 2: Not Slowing Down — 3-4 player point props  
  const card2Players = allPlayers.slice(0, 4);
  const c2Odds = roundTo(range(8, 16, rng), 2);
  const c2Boost = roundTo(c2Odds + range(1.5, 3.5, rng), 2);
  const card2: NbaBoostCard = {
    id: 'nba_boost_2',
    title: BOOST_TITLES[1],
    matchup: matchupStr,
    selections: card2Players.map(p => {
      const thresh = Math.round(p.ppg * 0.85 / 5) * 5;
      const abbr = away.players.includes(p as typeof away.players[0]) ? away.abbr : home.abbr;
      return playerProp({ ...p, abbr }, 'ppg', thresh);
    }),
    popularity: Math.floor(range(80, 160, rng)),
    originalOdds: c2Odds,
    boostedOdds: c2Boost,
    returnExample: `€10 returns €${(c2Boost * 10).toFixed(2)}`,
  };

  // Card 3: Key Contributors — role players 15+ pts
  const card3Players = [allPlayers[2], allPlayers[3], allPlayers[5]];
  const c3Odds = roundTo(range(12, 20, rng), 2);
  const c3Boost = roundTo(c3Odds + range(2, 5, rng), 2);
  const card3: NbaBoostCard = {
    id: 'nba_boost_3',
    title: BOOST_TITLES[2],
    matchup: matchupStr,
    selections: card3Players.map(p => {
      const thresh = 15;
      const abbr = away.players.some(ap => ap.name === p.name) ? away.abbr : home.abbr;
      return playerProp({ ...p, abbr }, 'ppg', thresh);
    }),
    popularity: Math.floor(range(180, 280, rng)),
    originalOdds: c3Odds,
    boostedOdds: c3Boost,
    returnExample: `€10 returns €${(c3Boost * 10).toFixed(2)}`,
  };

  // Card 4: Raining Threes — 3+ three-pointers each
  const card4Players = [allPlayers[0], allPlayers[1], allPlayers[4], allPlayers[3]];
  const c4Odds = roundTo(range(10, 17, rng), 2);
  const c4Boost = roundTo(c4Odds + range(2, 4, rng), 2);
  const card4: NbaBoostCard = {
    id: 'nba_boost_4',
    title: BOOST_TITLES[3],
    matchup: matchupStr,
    selections: card4Players.map(p => {
      const abbr = away.players.some(ap => ap.name === p.name) ? away.abbr : home.abbr;
      return playerProp({ ...p, abbr }, 'tpg', 3);
    }),
    popularity: Math.floor(range(100, 200, rng)),
    originalOdds: c4Odds,
    boostedOdds: c4Boost,
    returnExample: `€10 returns €${(c4Boost * 10).toFixed(2)}`,
  };

  return [card1, card2, card3, card4];
}

// ── Player props market ───────────────────────────────────────────────────────

export type NbaMarket = 'points' | 'assists' | 'rebounds' | 'threes';

export interface PlayerPropRow {
  player:      NbaPlayer & { abbr: string; iconUrl: string };
  last5:       number[];
  thresholds:  { value: number; odds: number }[];
}

export function generatePlayerProps(matchup: NbaMatchup, market: NbaMarket): PlayerPropRow[] {
  const dateKey = new Date().toDateString();
  const rng = seededRNG(`${dateKey}_nba_props_${market}`);

  const { home, away } = matchup;

  // Pick top 3 from each team (6 total)
  const players: (NbaPlayer & { abbr: string; iconUrl: string })[] = [
    ...away.players.slice(0, 3).map(p => ({ ...p, team: 'away' as const, abbr: away.abbr, iconUrl: away.iconUrl })),
    ...home.players.slice(0, 3).map(p => ({ ...p, team: 'home' as const, abbr: home.abbr, iconUrl: home.iconUrl })),
  ];

  return players.map(player => {
    // Average for this market
    const avg = market === 'points'   ? player.ppg
              : market === 'assists'  ? player.apg
              : market === 'rebounds' ? player.rpg
              : player.tpg;

    // Last 5 game scores — realistic variance around avg
    const last5 = Array.from({ length: 5 }, () => {
      const v = avg * (0.55 + rng() * 0.9);
      return Math.round(market === 'points' ? v : v * 2) / (market === 'points' ? 1 : 2);
    });

    // Thresholds — start well below avg, go up past avg
    let thresholds: { value: number; odds: number }[];
    if (market === 'points') {
      const base = Math.max(10, Math.round((avg - 10) / 5) * 5);
      thresholds = [0, 5, 10, 15, 20].map((step, i) => {
        const val  = base + step;
        // Odds scale with how far above avg the threshold is
        const diff = (val - avg) / avg; // -ve = below avg → easy, small odds; +ve = above → hard, big odds
        const odds = roundTo(Math.max(1.05, 1.05 + (diff + 0.6) * 4.5 + rng() * 0.15), 2);
        return { value: val, odds };
      });
    } else if (market === 'assists') {
      const base = Math.max(3, Math.round((avg - 3) / 1) * 1);
      thresholds = [0, 2, 4, 6, 8].map(step => {
        const val  = base + step;
        const diff = (val - avg) / avg;
        const odds = roundTo(Math.max(1.05, 1.10 + (diff + 0.4) * 5 + rng() * 0.12), 2);
        return { value: val, odds };
      });
    } else if (market === 'rebounds') {
      const base = Math.max(3, Math.round((avg - 3) / 1) * 1);
      thresholds = [0, 2, 4, 6, 8].map(step => {
        const val  = base + step;
        const diff = (val - avg) / avg;
        const odds = roundTo(Math.max(1.05, 1.10 + (diff + 0.4) * 5 + rng() * 0.12), 2);
        return { value: val, odds };
      });
    } else {
      // threes
      const base = Math.max(1, Math.round(avg));
      thresholds = [0, 1, 2, 3, 4].map(step => {
        const val  = base + step;
        const diff = (val - avg) / Math.max(avg, 0.5);
        const odds = roundTo(Math.max(1.05, 1.15 + (diff + 0.2) * 6 + rng() * 0.15), 2);
        return { value: val, odds };
      });
    }

    return { player, last5, thresholds };
  });
}
