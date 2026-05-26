/**
 * Tennis data — daily-rotating match generator + acca card presets.
 * Matches are seeded from today's date so they look different each day.
 * Results are cached in localStorage for 24 h.
 */

// ── Player pools ──────────────────────────────────────────────────────────────
// Index ≈ rough ranking: lower index → stronger player → lower odds

export const ATP_PLAYERS = [
  'Jannik Sinner',       'Carlos Alcaraz',        'Alexander Zverev',
  'Daniil Medvedev',     'Andrey Rublev',          'Casper Ruud',
  'Holger Rune',         'Taylor Fritz',            'Tommy Paul',
  'Stefanos Tsitsipas',  'Felix Auger-Aliassime',  'Sebastian Korda',
  'Lorenzo Musetti',     'Karen Khachanov',         'Alexei Popyrin',
  'Grigor Dimitrov',     'Ugo Humbert',             'Francisco Cerundolo',
  'Nicolas Jarry',       'Jaume Munar',             'Borna Gojo',
  'Luciano Darderi',     'Denis Shapovalov',        'Arthur Fils',
  'Hugo Gaston',         'Matteo Arnaldi',          'Sebastian Báez',
  'Coleman Wong',        'Billy Harris',            'James McCabe',
  'Zdenek Kolar',        'Colton Smith',            'Alvaro Guillen Meza',
  'Gustavo Heide',       'Dan Added',               'Vit Kopriva',
  'Laslo Djere',         'Jenson Brooksby',         'Nishesh Basavareddy',
  'Roman Andres Burruchaga',
];

export const WTA_PLAYERS = [
  'Iga Swiatek',       'Aryna Sabalenka',   'Coco Gauff',
  'Elena Rybakina',    'Jessica Pegula',     'Karolina Muchova',
  'Maria Sakkari',     'Ons Jabeur',         'Mirra Andreeva',
  'Emma Raducanu',     'Elina Svitolina',    'Belinda Bencic',
  'Diane Parry',       'Cristina Bucsa',     'Daria Kasatkina',
  'Shuai Zhang',       'Yulia Putintseva',   'Anastasia Pavlyuchenkova',
  'Madison Keys',      'Victoria Azarenka',  'Peyton Stearns',
  'Sara Sorribes Tormo', 'Veronika Kudermetova', 'Elise Mertens',
];

const TOURNAMENTS = [
  'Roland Garros',
  'French Open',
  'ATP Masters',
  'WTA 1000 Rome',
  'Challenger Tour',
];

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seededRNG(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  while (result.length < n && copy.length) {
    const i = Math.floor(rand() * copy.length);
    result.push(copy.splice(i, 1)[0]);
  }
  return result;
}

// ── Match type ────────────────────────────────────────────────────────────────

export interface TennisMatch {
  id: string;
  player1: string;
  player2: string;
  /** Odds for player 1 to win */
  odds1: number;
  /** Odds for player 2 to win */
  odds2: number;
  time: string;
  tour: 'ATP' | 'WTA';
  tournament: string;
}

// ── Daily match generator ─────────────────────────────────────────────────────

const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export function generateDailyMatches(dateSeed: string, count = 8): TennisMatch[] {
  const rand = seededRNG(dateSeed);
  const matches: TennisMatch[] = [];

  const atpPool = pickN(ATP_PLAYERS, count * 2, rand);
  const wtaPool = pickN(WTA_PLAYERS, count * 2, rand);

  for (let i = 0; i < count; i++) {
    const isWTA  = i >= Math.floor(count * 0.6);   // last ~40 % are WTA
    const pool   = isWTA ? wtaPool : atpPool;
    const p1Name = pool[i * 2];
    const p2Name = pool[i * 2 + 1];

    // Odds: lower-index player (higher ranking) is the favourite
    const p1Rank = (isWTA ? WTA_PLAYERS : ATP_PLAYERS).indexOf(p1Name);
    const p2Rank = (isWTA ? WTA_PLAYERS : ATP_PLAYERS).indexOf(p2Name);
    const favIsP1 = p1Rank <= p2Rank;

    const favOdds = parseFloat((1.08 + rand() * 0.72).toFixed(2));   // 1.08 – 1.80
    const spread  = parseFloat((0.4  + rand() * 4.5).toFixed(2));    // gap varies a lot
    const undOdds = parseFloat((favOdds + spread).toFixed(2));

    matches.push({
      id:         `${dateSeed}_${i}`,
      player1:    p1Name,
      player2:    p2Name,
      odds1:      favIsP1 ? favOdds : undOdds,
      odds2:      favIsP1 ? undOdds : favOdds,
      time:       TIMES[Math.floor(rand() * TIMES.length)],
      tour:       isWTA ? 'WTA' : 'ATP',
      tournament: TOURNAMENTS[Math.floor(rand() * TOURNAMENTS.length)],
    });
  }

  return matches;
}

// ── 24-hour localStorage cache ────────────────────────────────────────────────

const CACHE_KEY = 'gobet_tennis_v1';
const TTL_MS    = 24 * 60 * 60 * 1000;

export function getDailyMatches(): TennisMatch[] {
  const today = new Date().toDateString();

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { date, matches } = JSON.parse(raw) as { date: string; matches: TennisMatch[] };
      if (date === today && Array.isArray(matches) && matches.length > 0) {
        return matches;
      }
    }
  } catch {}

  const fresh = generateDailyMatches(today, 8);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, ts: Date.now(), matches: fresh }));
  } catch {}
  return fresh;
}

// ── Acca highlight card presets ───────────────────────────────────────────────

export interface AccaCard {
  id: string;
  market: string;
  selections: string[];
  extraLegs?: number;
  boostLabel: string;
  odds: number;
  returnExample: string;
  isSpecial?: boolean;
  specialLabel?: string;
  boostedOdds?: number;
}

/**
 * Build 4 acca cards using today's generated matches for realism.
 * Rotates the set weekly so it looks different each week.
 */
export function buildAccaCards(matches: TennisMatch[]): AccaCard[] {
  if (matches.length < 4) return [];

  const fav  = (m: TennisMatch) => m.odds1 < m.odds2 ? m.player1 : m.player2;
  const und  = (m: TennisMatch) => m.odds1 < m.odds2 ? m.player2 : m.player1;
  const favO = (m: TennisMatch) => Math.min(m.odds1, m.odds2);

  // Card 1 — Set Betting (3 favourites to win in straights)
  const setMatches = matches.slice(0, 3);
  const setOdds = parseFloat(setMatches.reduce((acc, m) => acc * (favO(m) * 1.4), 1).toFixed(2));
  const card1: AccaCard = {
    id: 'set-betting',
    market: 'Set Betting',
    selections: setMatches.map(m => `${fav(m)} to win 2 - 0 (v ${und(m)})`),
    boostLabel: '+5% ACCA BOOST',
    odds: setOdds,
    returnExample: `10 USDT returns ${(setOdds * 10).toFixed(2)} USDT incl. ${(setOdds * 10 * 0.05).toFixed(2)} USDT boost`,
  };

  // Card 2 — To Win Match (4 selections)
  const winMatches = matches.slice(1, 5);
  const winOdds = parseFloat(winMatches.reduce((acc, m) => acc * favO(m), 1).toFixed(2));
  const card2: AccaCard = {
    id: 'to-win-match',
    market: 'To Win Match',
    selections: winMatches.map(m => `${fav(m)} (v ${und(m)})`),
    boostLabel: '+7.5% ACCA BOOST',
    odds: winOdds,
    returnExample: `10 USDT returns ${(winOdds * 10).toFixed(2)} USDT incl. ${(winOdds * 10 * 0.075).toFixed(2)} USDT boost`,
  };

  // Card 3 — First Set Winner (3 visible + extras)
  const fswMatches = matches.slice(2, 5);
  const fswOdds = parseFloat(fswMatches.reduce((acc, m) => acc * (favO(m) * 1.15), 1).toFixed(2));
  const card3: AccaCard = {
    id: 'first-set-winner',
    market: 'First Set Winner',
    selections: fswMatches.slice(0, 3).map(m => `${fav(m)} (v ${und(m)})`),
    extraLegs: 2,
    boostLabel: '+10% ACCA BOOST',
    odds: fswOdds,
    returnExample: `10 USDT returns ${(fswOdds * 10).toFixed(2)} USDT incl. ${(fswOdds * 10 * 0.1).toFixed(2)} USDT boost`,
  };

  // Card 4 — Match special / BET BOOST
  const special = matches[0];
  const baseOdds = parseFloat((favO(special) * 2.1).toFixed(2));
  const boostedOdds = parseFloat((baseOdds * 1.125).toFixed(2));
  const card4: AccaCard = {
    id: 'match-special',
    market: `${fav(special)} vs ${und(special)}`,
    selections: [
      `${fav(special)} will Win in Straight Sets`,
      `${fav(special)} to win Set 1 6-0`,
      `3+ Aces for ${fav(special)}`,
    ],
    boostLabel: 'BET BOOST',
    odds: baseOdds,
    boostedOdds,
    returnExample: `10 USDT returns ${(boostedOdds * 10).toFixed(2)} USDT`,
    isSpecial: true,
    specialLabel: 'BET BOOST ❯❯',
  };

  return [card1, card2, card3, card4];
}
