/**
 * SPORT DETAIL DATA
 * Static competition configs + mock matches for the sport detail pages.
 * Used when The Odds API has no events (off-season) or doesn't cover the sport.
 */

export interface CompetitionConfig {
  id:          string;
  name:        string;
  countryCode: string;
  matchCount?: number;
}

export interface MockMatchCard {
  id:           string;
  team1:        string;
  team2:        string;
  leagueName:   string;
  dateLabel:    string;
  odds1:        number;
  odds2:        number;
  oddsDraw?:    number;
  isLive?:      boolean;
}

export interface SportDetailConfig {
  sportId:        string;
  name:           string;
  emoji:          string;
  defaultTab:     'featured' | 'competitions';
  competitions:   CompetitionConfig[];
  futuresMarkets: string[];
  mockMatches:    MockMatchCard[];
}

// ─── Date helpers (evaluated at import time so dates stay fresh) ─────────────

function rel(daysAhead: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  if (daysAhead === 0) return `Today, ${hh}:${mm}`;
  if (daysAhead === 1) return `Tomorrow, ${hh}:${mm}`;
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const dm = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${wd} ${dm}, ${hh}:${mm}`;
}

function future(monthsAhead: number, day: number, hour: number, minute: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead, day);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const dm = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${wd} ${dm}, ${hh}:${mm}`;
}

// ─── Sport configs ────────────────────────────────────────────────────────────

export const SPORT_DETAIL_CONFIGS: Record<string, SportDetailConfig> = {

  // ── American Football ───────────────────────────────────────────────────────
  sp_american_football: {
    sportId:    'sp_american_football',
    name:       'American Football',
    emoji:      '🏈',
    defaultTab: 'competitions',
    competitions: [
      { id: 'nfl_preseason',    name: 'NFL Preseason',              countryCode: 'US' },
      { id: 'nfl_look_ahead',   name: 'NFL Look Ahead Matches',     countryCode: 'US' },
      { id: 'ncaaf_look_ahead', name: 'NCAAF Look Ahead Matches',   countryCode: 'US' },
      { id: 'ufl',              name: 'UFL',                        countryCode: 'US' },
      { id: 'virtual_af',       name: 'Virtual American Football',  countryCode: ''   },
    ],
    futuresMarkets: [
      'NFL Super Bowl Winner',
      'NFL AFC Conference Champion',
      'NFL NFC Conference Champion',
      'NFL Regular Season MVP',
      'NFL Offensive Rookie of the Year',
      'NCAAF National Championship Winner',
      'Heisman Trophy Winner',
    ],
    mockMatches: [
      { id: 'af_1', team1: 'Kansas City Chiefs',   team2: 'Baltimore Ravens',     leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 15, 20, 0),  odds1: 1.67, odds2: 2.15 },
      { id: 'af_2', team1: 'Dallas Cowboys',        team2: 'New York Giants',      leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 15, 23, 30), odds1: 1.45, odds2: 2.65 },
      { id: 'af_3', team1: 'San Francisco 49ers',   team2: 'Las Vegas Raiders',    leagueName: 'NFL Preseason',          dateLabel: future(3, 16, 22, 0),  odds1: 1.57, odds2: 2.30 },
      { id: 'af_4', team1: 'Philadelphia Eagles',   team2: 'New England Patriots', leagueName: 'NFL Preseason',          dateLabel: future(3, 16, 23, 30), odds1: 1.38, odds2: 2.90 },
      { id: 'af_5', team1: 'Buffalo Bills',         team2: 'Miami Dolphins',       leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 17, 20, 0),  odds1: 1.72, odds2: 2.05 },
      { id: 'af_6', team1: 'Los Angeles Rams',      team2: 'Seattle Seahawks',     leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 17, 22, 30), odds1: 1.80, odds2: 1.95 },
    ],
  },

  // ── Australian Rules ────────────────────────────────────────────────────────
  sp_aussie_rules: {
    sportId:    'sp_aussie_rules',
    name:       'Australian Rules',
    emoji:      '🏉',
    defaultTab: 'featured',
    competitions: [
      { id: 'afl', name: 'AFL', countryCode: 'AU', matchCount: 9 },
    ],
    futuresMarkets: [
      'AFL Premiership Winner 2026',
      'AFL Grand Final — Top Try Scorer',
      'AFL Brownlow Medal 2026',
      'AFL Coleman Medal 2026',
      'AFL Rising Star Award 2026',
    ],
    mockMatches: [
      { id: 'ar_1', team1: 'Collingwood Magpies', team2: 'Melbourne Demons',      leagueName: 'AFL', dateLabel: rel(0, 15, 20), odds1: 2.10, odds2: 1.72 },
      { id: 'ar_2', team1: 'Brisbane Lions',       team2: 'Port Adelaide Power',  leagueName: 'AFL', dateLabel: rel(0, 18, 45), odds1: 1.90, odds2: 1.90 },
      { id: 'ar_3', team1: 'Carlton Blues',        team2: 'Essendon Bombers',     leagueName: 'AFL', dateLabel: rel(1, 13, 15), odds1: 1.65, odds2: 2.25 },
      { id: 'ar_4', team1: 'Sydney Swans',         team2: 'GWS Giants',           leagueName: 'AFL', dateLabel: rel(1, 16, 35), odds1: 1.45, odds2: 2.60 },
      { id: 'ar_5', team1: 'Richmond Tigers',      team2: 'Hawthorn Hawks',       leagueName: 'AFL', dateLabel: rel(2, 15, 20), odds1: 2.40, odds2: 1.58 },
      { id: 'ar_6', team1: 'Geelong Cats',         team2: 'West Coast Eagles',    leagueName: 'AFL', dateLabel: rel(2, 18, 10), odds1: 1.25, odds2: 3.80 },
    ],
  },

  // ── Badminton ───────────────────────────────────────────────────────────────
  sp_badminton: {
    sportId:    'sp_badminton',
    name:       'Badminton',
    emoji:      '🏸',
    defaultTab: 'featured',
    competitions: [
      { id: 'my_masters',    name: 'Malaysia Masters',       countryCode: 'MY', matchCount: 32 },
      { id: 'my_masters_w',  name: 'Malaysia Masters Women', countryCode: 'MY', matchCount: 16 },
      { id: 'my_masters_md', name: 'Malaysia Masters MD',    countryCode: 'MY', matchCount: 16 },
      { id: 'my_masters_wd', name: 'Malaysia Masters WD',    countryCode: 'MY', matchCount: 16 },
      { id: 'my_masters_xd', name: 'Malaysia Masters XD',    countryCode: 'MY', matchCount: 16 },
    ],
    futuresMarkets: [
      "BWF World Championships — Men's Singles",
      "BWF World Championships — Women's Singles",
      "All England Open — Men's Singles",
      "All England Open — Women's Singles",
      'Thomas Cup — Winner',
      'Uber Cup — Winner',
    ],
    mockMatches: [
      { id: 'bad_1', team1: 'Po-Wei Wang',           team2: 'Tharun Mannepalli',  leagueName: 'Malaysia Masters',       dateLabel: rel(0, 4,  50), odds1: 1.83, odds2: 1.83 },
      { id: 'bad_2', team1: 'Moh. Zaki Ubaidillah',  team2: 'Lakshya Sen',        leagueName: 'Malaysia Masters',       dateLabel: rel(0, 5,  40), odds1: 3.00, odds2: 1.36 },
      { id: 'bad_3', team1: 'H.S. Prannoy',          team2: 'Kodai Naraoka',      leagueName: 'Malaysia Masters',       dateLabel: rel(0, 6,  30), odds1: 3.75, odds2: 1.25 },
      { id: 'bad_4', team1: 'Shi Yu Qi',             team2: 'Anders Antonsen',    leagueName: 'Malaysia Masters',       dateLabel: rel(0, 7,  10), odds1: 1.40, odds2: 2.75 },
      { id: 'bad_5', team1: 'Viktor Axelsen',         team2: 'Lee Zii Jia',       leagueName: 'Malaysia Masters',       dateLabel: rel(0, 8,  0),  odds1: 1.22, odds2: 4.25 },
      { id: 'bad_6', team1: 'Jonatan Christie',       team2: 'Ng Ka Long Angus',  leagueName: 'Malaysia Masters',       dateLabel: rel(0, 9,  15), odds1: 2.10, odds2: 1.70 },
      { id: 'bad_7', team1: 'An Se-young',            team2: 'Carolina Marin',    leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 6,  0),  odds1: 1.20, odds2: 4.50 },
      { id: 'bad_8', team1: 'PV Sindhu',              team2: 'Ratchanok Intanon', leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 7,  20), odds1: 2.80, odds2: 1.40 },
      { id: 'bad_9', team1: 'Tai Tzu-ying',           team2: 'Nozomi Okuhara',    leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 8,  40), odds1: 1.55, odds2: 2.35 },
    ],
  },

  // ── Basketball ──────────────────────────────────────────────────────────────
  sp_basketball: {
    sportId:    'sp_basketball',
    name:       'Basketball',
    emoji:      '🏀',
    defaultTab: 'featured',
    competitions: [
      { id: 'nba',        name: 'NBA',                    countryCode: 'US', matchCount: 156 },
      { id: 'ncaa_bb',    name: 'NCAA Basketball',        countryCode: 'US', matchCount: 312 },
      { id: 'euroleague', name: 'EuroLeague',             countryCode: 'EU', matchCount: 48  },
      { id: 'acb',        name: 'Spanish ACB',            countryCode: 'ES', matchCount: 42  },
      { id: 'bbl_ger',    name: 'German Bundesliga',      countryCode: 'DE', matchCount: 36  },
      { id: 'lnb',        name: 'French Pro A',           countryCode: 'FR', matchCount: 30  },
      { id: 'lba',        name: 'Italian Lega Basket',    countryCode: 'IT', matchCount: 30  },
      { id: 'bsl',        name: 'Turkish BSL',            countryCode: 'TR', matchCount: 28  },
    ],
    futuresMarkets: [
      'NBA Champion 2025-26',
      'NBA Finals MVP',
      'NBA Regular Season MVP',
      'NBA Defensive Player of the Year',
      'NBA Rookie of the Year',
      'EuroLeague Champion',
      'NBA Coach of the Year',
    ],
    mockMatches: [
      { id: 'bb_1', team1: 'Boston Celtics',         team2: 'Indiana Pacers',        leagueName: 'NBA',        dateLabel: rel(0, 22, 0),  odds1: 1.35, odds2: 3.10, isLive: true  },
      { id: 'bb_2', team1: 'Oklahoma City Thunder',  team2: 'Denver Nuggets',        leagueName: 'NBA',        dateLabel: rel(1, 0,  30), odds1: 1.57, odds2: 2.40 },
      { id: 'bb_3', team1: 'Minnesota Timberwolves', team2: 'Golden State Warriors', leagueName: 'NBA',        dateLabel: rel(1, 23, 0),  odds1: 1.72, odds2: 2.10 },
      { id: 'bb_4', team1: 'Cleveland Cavaliers',    team2: 'Miami Heat',            leagueName: 'NBA',        dateLabel: rel(2, 0,  0),  odds1: 1.48, odds2: 2.55 },
      { id: 'bb_5', team1: 'Real Madrid',            team2: 'Fenerbahce Beko',       leagueName: 'EuroLeague', dateLabel: rel(2, 20, 0),  odds1: 1.45, odds2: 2.65 },
      { id: 'bb_6', team1: 'Olympiacos',             team2: 'Panathinaikos',         leagueName: 'EuroLeague', dateLabel: rel(2, 18, 30), odds1: 2.20, odds2: 1.65 },
    ],
  },
};

export const SPORT_DETAIL_IDS = new Set(Object.keys(SPORT_DETAIL_CONFIGS));
