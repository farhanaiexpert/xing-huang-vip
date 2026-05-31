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
  sportKey?:    string;
  sportId?:     string;
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
    mockMatches: [],
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
