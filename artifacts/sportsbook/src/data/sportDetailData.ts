/**
 * SPORT DETAIL DATA
 * Static competition configs + mock matches for sport detail pages.
 * Used when The Odds API has no events (off-season) or doesn't cover the sport.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabId =
  | 'featured'
  | 'competitions'
  | 'futures'
  | 'offers'
  | 'coupons'
  | 'outrights'
  | 'matches'
  | 'freeGames';

export interface TabConfig {
  id:    TabId;
  label: string;
}

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
  team1Country?: string;
  team2Country?: string;
  leagueName:   string;
  dateLabel:    string;
  odds1:        number;
  odds2:        number;
  oddsDraw?:    number;
  isLive?:      boolean;
  score1?:      string;
  score2?:      string;
  liveStatus?:  string;
}

export interface BetBoostCard {
  id:            string;
  title:         string;
  subtitle?:     string;
  matchName:     string;
  baseOdds:      number;
  boostedOdds:   number;
  exampleReturn: string;
}

export interface MatchListItem {
  id:            string;
  name:          string;
  count?:        number;
  isHighlighted?: boolean;
}

export interface InPlayItem {
  id:     string;
  name:   string;
  sport?: string;
}

export interface MatchCouponItem {
  id:   string;
  name: string;
}

export interface SportDetailConfig {
  sportId:              string;
  name:                 string;
  emoji:                string;
  tabs:                 TabConfig[];
  defaultTab:           TabId;
  featuredSectionLabel?: string;
  competitions:         CompetitionConfig[];
  futuresMarkets:       string[];
  mockMatches:          MockMatchCard[];
  betBoostCards?:       BetBoostCard[];
  matchLists?:          MatchListItem[];
  inPlayItems?:         InPlayItem[];
  matchCouponItems?:    MatchCouponItem[];
  showCompInCoupons?:   boolean;
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

// ─── Standard tabs ────────────────────────────────────────────────────────────

const STANDARD_TABS: TabConfig[] = [
  { id: 'featured',     label: 'Featured'     },
  { id: 'competitions', label: 'Competitions' },
  { id: 'futures',      label: 'Futures'      },
  { id: 'offers',       label: 'Offers'       },
];

// ─── Sport configs ────────────────────────────────────────────────────────────

export const SPORT_DETAIL_CONFIGS: Record<string, SportDetailConfig> = {

  // ── American Football ───────────────────────────────────────────────────────
  sp_american_football: {
    sportId:    'sp_american_football',
    name:       'American Football',
    emoji:      '🏈',
    tabs:       STANDARD_TABS,
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
      { id: 'af_1', team1: 'Kansas City Chiefs',   team2: 'Baltimore Ravens',     leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 15, 20, 0),  odds1: 1.67, odds2: 2.15, team1Country: 'US', team2Country: 'US' },
      { id: 'af_2', team1: 'Dallas Cowboys',        team2: 'New York Giants',      leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 15, 23, 30), odds1: 1.45, odds2: 2.65, team1Country: 'US', team2Country: 'US' },
      { id: 'af_3', team1: 'San Francisco 49ers',   team2: 'Las Vegas Raiders',    leagueName: 'NFL Preseason',          dateLabel: future(3, 16, 22, 0),  odds1: 1.57, odds2: 2.30, team1Country: 'US', team2Country: 'US' },
      { id: 'af_4', team1: 'Philadelphia Eagles',   team2: 'New England Patriots', leagueName: 'NFL Preseason',          dateLabel: future(3, 16, 23, 30), odds1: 1.38, odds2: 2.90, team1Country: 'US', team2Country: 'US' },
      { id: 'af_5', team1: 'Buffalo Bills',         team2: 'Miami Dolphins',       leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 17, 20, 0),  odds1: 1.72, odds2: 2.05, team1Country: 'US', team2Country: 'US' },
      { id: 'af_6', team1: 'Los Angeles Rams',      team2: 'Seattle Seahawks',     leagueName: 'NFL Look Ahead Matches', dateLabel: future(3, 17, 22, 30), odds1: 1.80, odds2: 1.95, team1Country: 'US', team2Country: 'US' },
    ],
  },

  // ── Australian Rules ────────────────────────────────────────────────────────
  sp_aussie_rules: {
    sportId:    'sp_aussie_rules',
    name:       'Australian Rules',
    emoji:      '🏉',
    tabs:       STANDARD_TABS,
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
      { id: 'ar_1', team1: 'Collingwood Magpies', team2: 'Melbourne Demons',     leagueName: 'AFL', dateLabel: rel(0, 15, 20), odds1: 2.10, odds2: 1.72, team1Country: 'AU', team2Country: 'AU' },
      { id: 'ar_2', team1: 'Brisbane Lions',       team2: 'Port Adelaide Power',  leagueName: 'AFL', dateLabel: rel(0, 18, 45), odds1: 1.90, odds2: 1.90, team1Country: 'AU', team2Country: 'AU' },
      { id: 'ar_3', team1: 'Carlton Blues',        team2: 'Essendon Bombers',     leagueName: 'AFL', dateLabel: rel(1, 13, 15), odds1: 1.65, odds2: 2.25, team1Country: 'AU', team2Country: 'AU' },
      { id: 'ar_4', team1: 'Sydney Swans',         team2: 'GWS Giants',           leagueName: 'AFL', dateLabel: rel(1, 16, 35), odds1: 1.45, odds2: 2.60, team1Country: 'AU', team2Country: 'AU' },
      { id: 'ar_5', team1: 'Richmond Tigers',      team2: 'Hawthorn Hawks',       leagueName: 'AFL', dateLabel: rel(2, 15, 20), odds1: 2.40, odds2: 1.58, team1Country: 'AU', team2Country: 'AU' },
      { id: 'ar_6', team1: 'Geelong Cats',         team2: 'West Coast Eagles',    leagueName: 'AFL', dateLabel: rel(2, 18, 10), odds1: 1.25, odds2: 3.80, team1Country: 'AU', team2Country: 'AU' },
    ],
  },

  // ── Badminton ───────────────────────────────────────────────────────────────
  sp_badminton: {
    sportId:    'sp_badminton',
    name:       'Badminton',
    emoji:      '🏸',
    tabs:       STANDARD_TABS,
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
      { id: 'bad_1', team1: 'Po-Wei Wang',          team2: 'Tharun Mannepalli',  leagueName: 'Malaysia Masters',       dateLabel: rel(0, 4,  50), odds1: 1.83, odds2: 1.83, team1Country: 'TW', team2Country: 'US' },
      { id: 'bad_2', team1: 'Moh. Zaki Ubaidillah', team2: 'Lakshya Sen',        leagueName: 'Malaysia Masters',       dateLabel: rel(0, 5,  40), odds1: 3.00, odds2: 1.36, team1Country: 'MY', team2Country: 'IN' },
      { id: 'bad_3', team1: 'H.S. Prannoy',         team2: 'Kodai Naraoka',      leagueName: 'Malaysia Masters',       dateLabel: rel(0, 6,  30), odds1: 3.75, odds2: 1.25, team1Country: 'IN', team2Country: 'JP' },
      { id: 'bad_4', team1: 'Shi Yu Qi',             team2: 'Anders Antonsen',   leagueName: 'Malaysia Masters',       dateLabel: rel(0, 7,  10), odds1: 1.40, odds2: 2.75, team1Country: 'CN', team2Country: 'DK' },
      { id: 'bad_5', team1: 'Viktor Axelsen',        team2: 'Lee Zii Jia',       leagueName: 'Malaysia Masters',       dateLabel: rel(0, 8,  0),  odds1: 1.22, odds2: 4.25, team1Country: 'DK', team2Country: 'MY' },
      { id: 'bad_6', team1: 'Jonatan Christie',      team2: 'Ng Ka Long Angus',  leagueName: 'Malaysia Masters',       dateLabel: rel(0, 9,  15), odds1: 2.10, odds2: 1.70, team1Country: 'ID', team2Country: 'HK' },
      { id: 'bad_7', team1: 'An Se-young',           team2: 'Carolina Marin',    leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 6,  0),  odds1: 1.20, odds2: 4.50, team1Country: 'KR', team2Country: 'ES' },
      { id: 'bad_8', team1: 'PV Sindhu',             team2: 'Ratchanok Intanon', leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 7,  20), odds1: 2.80, odds2: 1.40, team1Country: 'IN', team2Country: 'TH' },
      { id: 'bad_9', team1: 'Tai Tzu-ying',          team2: 'Nozomi Okuhara',    leagueName: 'Malaysia Masters Women', dateLabel: rel(0, 8,  40), odds1: 1.55, odds2: 2.35, team1Country: 'TW', team2Country: 'JP' },
    ],
  },

  // ── Basketball ──────────────────────────────────────────────────────────────
  sp_basketball: {
    sportId:    'sp_basketball',
    name:       'Basketball',
    emoji:      '🏀',
    tabs: [
      { id: 'featured',     label: 'Featured'     },
      { id: 'competitions', label: 'Competitions' },
      { id: 'futures',      label: 'Futures'      },
      { id: 'offers',       label: 'Offers'       },
      { id: 'freeGames',    label: 'Free Games'   },
    ],
    defaultTab: 'featured',
    competitions: [
      { id: 'nba',       name: 'NBA',                       countryCode: 'US' },
      { id: 'wnba',      name: 'WNBA',                      countryCode: 'US' },
      { id: 'euro',      name: 'Euroleague',                countryCode: 'EU' },
      { id: 'arg_lp',    name: 'Argentina La Liga Proximo', countryCode: 'AR' },
      { id: 'arg_ln',    name: 'Argentina Liga Nacional',   countryCode: 'AR' },
      { id: 'arg_lf',    name: 'Argentina La Liga Federal', countryCode: 'AR' },
      { id: 'aut_bun',   name: 'Austria Bundesliga',        countryCode: 'AT' },
      { id: 'bnxt_bel',  name: 'BNXT Belgium',              countryCode: 'BE' },
      { id: 'ncaa_bb',   name: 'NCAA Basketball',           countryCode: 'US' },
      { id: 'acb',       name: 'Spanish ACB',               countryCode: 'ES' },
      { id: 'bbl_ger',   name: 'German Bundesliga',         countryCode: 'DE' },
      { id: 'lnb',       name: 'French Pro A',              countryCode: 'FR' },
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
      { id: 'bb_1', team1: 'Boston Celtics',         team2: 'Indiana Pacers',        leagueName: 'NBA',        dateLabel: rel(0, 22, 0),  odds1: 1.35, odds2: 3.10, isLive: true, team1Country: 'US', team2Country: 'US' },
      { id: 'bb_2', team1: 'Oklahoma City Thunder',  team2: 'Denver Nuggets',        leagueName: 'NBA',        dateLabel: rel(1, 0,  30), odds1: 1.57, odds2: 2.40, team1Country: 'US', team2Country: 'US' },
      { id: 'bb_3', team1: 'Minnesota Timberwolves', team2: 'Golden State Warriors', leagueName: 'NBA',        dateLabel: rel(1, 23, 0),  odds1: 1.72, odds2: 2.10, team1Country: 'US', team2Country: 'US' },
      { id: 'bb_4', team1: 'Cleveland Cavaliers',    team2: 'Miami Heat',            leagueName: 'NBA',        dateLabel: rel(2, 0,  0),  odds1: 1.48, odds2: 2.55, team1Country: 'US', team2Country: 'US' },
      { id: 'bb_5', team1: 'Real Madrid',            team2: 'Fenerbahce Beko',       leagueName: 'Euroleague', dateLabel: rel(2, 20, 0),  odds1: 1.45, odds2: 2.65, team1Country: 'ES', team2Country: 'TR' },
      { id: 'bb_6', team1: 'Olympiacos',             team2: 'Panathinaikos',         leagueName: 'Euroleague', dateLabel: rel(2, 18, 30), odds1: 2.20, odds2: 1.65, team1Country: 'GR', team2Country: 'GR' },
    ],
  },

  // ── Baseball ────────────────────────────────────────────────────────────────
  sp_baseball: {
    sportId:    'sp_baseball',
    name:       'Baseball',
    emoji:      '⚾',
    tabs:       STANDARD_TABS,
    defaultTab: 'featured',
    competitions: [
      { id: 'mlb',     name: 'MLB',               countryCode: 'US' },
      { id: 'aaa',     name: 'Triple-A East',      countryCode: 'US' },
      { id: 'npb',     name: 'Japanese NPB',       countryCode: 'JP' },
      { id: 'kbo',     name: 'Korean KBO',         countryCode: 'KR' },
      { id: 'lmb',     name: 'Mexican LMB',        countryCode: 'MX' },
      { id: 'dlb',     name: 'Dominican LB',       countryCode: 'DO' },
      { id: 'cbl',     name: 'Cuban National Ser', countryCode: 'CU' },
      { id: 'lbp_ven', name: 'Venezuelan LPB',     countryCode: 'VE' },
    ],
    futuresMarkets: [
      'World Series Winner 2026',
      'AL Pennant Winner 2026',
      'NL Pennant Winner 2026',
      'AL MVP 2026',
      'NL MVP 2026',
      'AL Cy Young Award 2026',
      'NL Cy Young Award 2026',
      'AL Rookie of the Year',
    ],
    mockMatches: [
      { id: 'bsb_1', team1: 'New York Yankees',       team2: 'Boston Red Sox',          leagueName: 'MLB', dateLabel: rel(0, 23, 10), odds1: 1.72, odds2: 2.05, team1Country: 'US', team2Country: 'US' },
      { id: 'bsb_2', team1: 'Los Angeles Dodgers',    team2: 'San Francisco Giants',    leagueName: 'MLB', dateLabel: rel(0, 2,  10), odds1: 1.35, odds2: 3.00, team1Country: 'US', team2Country: 'US' },
      { id: 'bsb_3', team1: 'Houston Astros',         team2: 'Texas Rangers',           leagueName: 'MLB', dateLabel: rel(1, 23, 5),  odds1: 1.65, odds2: 2.20, team1Country: 'US', team2Country: 'US' },
      { id: 'bsb_4', team1: 'Atlanta Braves',         team2: 'New York Mets',           leagueName: 'MLB', dateLabel: rel(1, 1,  10), odds1: 1.50, odds2: 2.45, team1Country: 'US', team2Country: 'US' },
      { id: 'bsb_5', team1: 'Yomiuri Giants',         team2: 'Fukuoka SoftBank Hawks',  leagueName: 'Japanese NPB', dateLabel: rel(0, 11, 0), odds1: 2.00, odds2: 1.80, team1Country: 'JP', team2Country: 'JP' },
      { id: 'bsb_6', team1: 'Samsung Lions',          team2: 'LG Twins',                leagueName: 'Korean KBO',   dateLabel: rel(0, 10, 0), odds1: 1.90, odds2: 1.90, team1Country: 'KR', team2Country: 'KR' },
    ],
  },

  // ── Boxing ──────────────────────────────────────────────────────────────────
  sp_boxing: {
    sportId:              'sp_boxing',
    name:                 'Boxing',
    emoji:                '🥊',
    tabs: [
      { id: 'coupons',   label: 'Coupons'    },
      { id: 'outrights', label: 'Outrights'  },
    ],
    defaultTab:           'coupons',
    featuredSectionLabel: 'Featured Bouts',
    showCompInCoupons:    true,
    competitions: [
      { id: 'bx_main',     name: 'Main',                   countryCode: 'GL' },
      { id: 'bx_wbc',      name: 'WBC Championships',      countryCode: 'GL' },
      { id: 'bx_ibf',      name: 'IBF Championships',      countryCode: 'GL' },
      { id: 'bx_wbo',      name: 'WBO Championships',      countryCode: 'GL' },
      { id: 'bx_wba',      name: 'WBA Championships',      countryCode: 'GL' },
    ],
    futuresMarkets: [
      'WBC Heavyweight Championship',
      'IBF Heavyweight Championship',
      'WBO Heavyweight Championship',
      'WBA Super Heavyweight Championship',
      'WBC Light Heavyweight Championship',
      'IBF Middleweight Championship',
    ],
    mockMatches: [
      { id: 'bx_1', team1: 'Oleksandr Usyk',  team2: 'Rico Verhoeven',    leagueName: 'Heavyweight',       dateLabel: rel(5, 23, 0), odds1: 1.055, odds2: 9.00,  team1Country: 'UA', team2Country: 'NL' },
      { id: 'bx_2', team1: 'Jack Catterall',   team2: 'Shakhram Giyasov', leagueName: 'Super Lightweight', dateLabel: rel(5, 23, 0), odds1: 1.36,  odds2: 3.00,  team1Country: 'GB', team2Country: 'UZ' },
      { id: 'bx_3', team1: 'Hamzah Sheeraz',   team2: 'Alem Begic',       leagueName: 'Light Middleweight',dateLabel: rel(5, 22, 0), odds1: 1.05,  odds2: 10.00, team1Country: 'GB', team2Country: 'BA' },
    ],
    betBoostCards: [
      { id: 'bx_bb_1', title: 'Fight Result: Frank Sanchez', matchName: 'Frank Sanchez vs Richard Torrez Jr', baseOdds: 9.00,  boostedOdds: 10.00, exampleReturn: '10 USDT returns 100 USDT' },
      { id: 'bx_bb_2', title: 'Fight Result: Richard Torrez Jr', matchName: 'Frank Sanchez vs Richard Torrez Jr', baseOdds: 3.75, boostedOdds: 4.00,  exampleReturn: '10 USDT returns 40 USDT'  },
      { id: 'bx_bb_3', title: 'Fight Result: Hamzah Sheeraz',    matchName: 'Hamzah Sheeraz vs Alem Begic',      baseOdds: 5.50, boostedOdds: 6.00,  exampleReturn: '10 USDT returns 60 USDT'  },
      { id: 'bx_bb_4', title: 'Fight Result: Alem Begic',        matchName: 'Hamzah Sheeraz vs Alem Begic',      baseOdds: 17.00,boostedOdds: 19.00, exampleReturn: '10 USDT returns 190 USDT' },
    ],
  },

  // ── Cricket ─────────────────────────────────────────────────────────────────
  sp_cricket: {
    sportId:    'sp_cricket',
    name:       'Cricket',
    emoji:      '🏏',
    tabs: [
      { id: 'matches',   label: 'Matches'    },
      { id: 'outrights', label: 'Outrights'  },
    ],
    defaultTab:           'matches',
    featuredSectionLabel: 'Featured Matches',
    competitions: [
      { id: 'ipl',       name: 'Indian Premier League',      countryCode: 'IN' },
      { id: 'int_t20',   name: 'International T20',          countryCode: 'GL' },
      { id: 'eng_w',     name: "England Women's Cricket",    countryCode: 'GB' },
      { id: 'test',      name: 'Test Matches',               countryCode: 'GL' },
      { id: 'cwc',       name: 'ICC CWC League 2',           countryCode: 'GL' },
      { id: 'sa20',      name: 'SA20',                       countryCode: 'ZA' },
      { id: 'bbl',       name: 'Big Bash League',            countryCode: 'AU' },
    ],
    futuresMarkets: [
      'ICC World Test Championship Final',
      'ICC T20 World Cup Winner',
      'ICC ODI World Cup Winner',
      'IPL 2026 Winner',
      'The Ashes 2025-26 Winner',
    ],
    mockMatches: [
      { id: 'cr_1', team1: 'Rajasthan Royals',          team2: 'Lucknow Super Giants',   leagueName: 'Indian Premier League', dateLabel: 'Today, 14:00',  odds1: 1.62,  odds2: 2.15,  isLive: true,  score1: '220/3', liveStatus: 'T20 · 16.2 Ov' },
      { id: 'cr_2', team1: 'Bangladesh',                 team2: 'Pakistan',               leagueName: 'Test Matches',          dateLabel: 'Live — Day 5',  odds1: 1.061, odds2: 10.00, oddsDraw: 51.00, isLive: true, score1: '278 & 390', score2: '232 & 316/7', liveStatus: '2nd Test — Day 5' },
      { id: 'cr_3', team1: 'Kolkata Knight Riders',     team2: 'Mumbai Indians',         leagueName: 'Indian Premier League', dateLabel: rel(2, 17, 0),   odds1: 1.96,  odds2: 1.76  },
      { id: 'cr_4', team1: 'England Women',             team2: 'New Zealand Women',      leagueName: 'International T20',     dateLabel: rel(3, 14, 30),  odds1: 1.72,  odds2: 2.10  },
      { id: 'cr_5', team1: 'Royal Challengers Bengaluru', team2: 'Chennai Super Kings', leagueName: 'Indian Premier League', dateLabel: rel(3, 19, 30),  odds1: 2.10,  odds2: 1.72  },
    ],
    inPlayItems: [
      { id: 'cr_ip_1', name: 'Rajasthan Royals vs Lucknow Super Giants — T20' },
      { id: 'cr_ip_2', name: 'Bangladesh vs Pakistan — 2nd Test' },
    ],
    matchCouponItems: [
      { id: 'cr_mc_1', name: 'Indian Premier League' },
      { id: 'cr_mc_2', name: "England (W) vs New Zealand (W) — 1st T20 Match" },
      { id: 'cr_mc_3', name: 'Bangladesh vs Pakistan — 2nd Test' },
      { id: 'cr_mc_4', name: 'ICC CWC League 2' },
    ],
  },

  // ── Esports ─────────────────────────────────────────────────────────────────
  sp_esports: {
    sportId:    'sp_esports',
    name:       'Esports',
    emoji:      '🎮',
    tabs: [
      { id: 'coupons',   label: 'Coupons'   },
      { id: 'outrights', label: 'Outrights' },
    ],
    defaultTab:           'coupons',
    featuredSectionLabel: 'Featured Matches',
    competitions: [],
    futuresMarkets: [
      'League of Legends World Championship',
      'DOTA 2 International Winner',
      'CS2 Major Championship Winner',
      'VALORANT Champions Winner',
      'Rocket League World Championship',
    ],
    mockMatches: [
      { id: 'es_1', team1: 'Natus Vincere',     team2: 'Aurora Gaming',   leagueName: 'DOTA2 — DreamLeague', dateLabel: rel(0, 20, 0),  odds1: 1.47, odds2: 2.60, team1Country: 'UA', team2Country: 'RU' },
      { id: 'es_2', team1: 'T1',                team2: 'Kiwoom DRX',      leagueName: 'LOL — LCX',           dateLabel: rel(2, 11, 0),  odds1: 1.04, odds2: 9.00, team1Country: 'KR', team2Country: 'KR' },
      { id: 'es_3', team1: 'Nongshim RedForce', team2: 'KT Rolster',      leagueName: 'LOL — LCX',           dateLabel: rel(2, 13, 0),  odds1: 3.75, odds2: 1.25, team1Country: 'KR', team2Country: 'KR' },
    ],
    betBoostCards: [
      { id: 'es_bb_1', title: 'Weibo Gaming',  subtitle: 'Map 1 — Race to 30 Kills',             matchName: 'Weibo Gaming vs Bilibili Gaming', baseOdds: 3.75, boostedOdds: 4.00, exampleReturn: '10 USDT returns 40 USDT'  },
      { id: 'es_bb_2', title: 'Cloud',         subtitle: 'Map 1 — First Dragon to Spawn',        matchName: 'Weibo Gaming vs Bilibili Gaming', baseOdds: 5.50, boostedOdds: 6.00, exampleReturn: '10 USDT returns 60 USDT'  },
      { id: 'es_bb_3', title: 'Cloud',         subtitle: 'Map 1 — First Dragon to Spawn',        matchName: 'JD Gaming vs Anyones Legend',     baseOdds: 5.50, boostedOdds: 6.00, exampleReturn: '10 USDT returns 60 USDT'  },
      { id: 'es_bb_4', title: 'Yes',           subtitle: 'Both Teams to Destroy an Inhibitor',   matchName: 'JD Gaming vs Anyones Legend',     baseOdds: 8.50, boostedOdds: 9.50, exampleReturn: '10 USDT returns 95 USDT'  },
    ],
    matchLists: [
      { id: 'ml_all',  name: 'All Matches',        count: 15, isHighlighted: true },
      { id: 'ml_lol',  name: 'LOL',                count: 15, isHighlighted: true },
      { id: 'ml_cs2',  name: 'CS2' },
      { id: 'ml_dota', name: 'DOTA2' },
      { id: 'ml_val',  name: 'VALORANT' },
      { id: 'ml_rl',   name: 'Rocket League' },
      { id: 'ml_sbg',  name: 'Sports Based Games' },
    ],
  },
};

export const SPORT_DETAIL_IDS = new Set(Object.keys(SPORT_DETAIL_CONFIGS));
