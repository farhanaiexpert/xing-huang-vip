export type BetType = 'single' | 'acca';

export type Selection = {
  id: string;
  /** Used to prevent duplicate picks from the same market */
  marketId: string;
  matchId: string;
  matchName: string;
  leagueName: string;
  marketName: string;
  /** Short label: "1" | "X" | "2" */
  selectionType: string;
  /** Full display label: "Home Win" | "Draw" | "Away Win" | player name */
  selectionName: string;
  odds: number;
  /** The Odds API sport key, e.g. "soccer_epl" — preferred for settlement */
  sportKey?: string;
  /** Internal sport category ID (legacy, prefer sportKey) */
  sportId?: string;
  /** True when this selection was added from the live betting page */
  isLive?: boolean;
  /** Score at time of placement, e.g. "1-0" */
  scoreAtPlacement?: string;
  /** Formatted kickoff time, e.g. "Today, 20:00" or "Sat, 15:30" */
  kickoffTime?: string;
  /** ISO 8601 match start time — used for settlement timing */
  commenceTime?: string;
  /** Home team name — used for settlement */
  homeTeam?: string;
  /** Away team name — used for settlement */
  awayTeam?: string;
  /** Handicap / totals line, e.g. 2.5 — used for settlement */
  point?: number;
};

export type Match = {
  id: string;
  team1: string;
  team2: string;
  date: string;
  dateTag: 'today' | 'tomorrow' | 'upcoming';
  leagueId: string;
  sportId: string;
  /** Full Odds API sport key, e.g. "soccer_epl" */
  sportKey?: string;
  odds: {
    home: number;
    draw?: number;
    away: number;
  };
  isLive?: boolean;
  liveMinute?: number;
  score?: { home: number; away: number };
  marketCount?: number;
  /** Formatted kickoff time, e.g. "Today, 20:00" or "Sat, 15:30" */
  kickoffTime?: string;
  /** ISO 8601 commence time — used to re-filter past matches from stale cache */
  commenceIso?: string;
  /** Real API O/U 2.5 over odds (from totals market), when available */
  ouOver25?: number;
  /** Real API O/U 2.5 under odds (from totals market), when available */
  ouUnder25?: number;
  /** Real API BTTS Yes odds, when available */
  bttsYes?: number;
  /** Real API BTTS No odds, when available */
  bttsNo?: number;
  /**
   * BetsAPI rich market availability flags — populated for BetsAPI events only.
   * Parsed from the prematch API at no extra credit cost.
   */
  richMarkets?: {
    hasHcp:      boolean;
    hasOU:       boolean;
    hasHT:       boolean;
    hasBTTS:     boolean;
    hasCS:       boolean;
    hasCorners:  boolean;
    hasCards:    boolean;
    hasNextGoal: boolean;
    marketScore: number;
    hcpHome?:   number;
    hcpAway?:   number;
    hcpLine?:   string;
    ou25Over?:  number;
    ou25Under?: number;
    htHome?:    number;
    htDraw?:    number;
    htAway?:    number;
    bttsY?:     number;
    bttsN?:     number;
  };
  /** True for BetsAPI matches with 4+ rich market types available */
  featuredMatch?: boolean;
};

export type League = {
  id: string;
  name: string;
  sportId: string;
  /** Full Odds API sport key, e.g. "soccer_epl" */
  sportKey?: string;
  countryCode?: string;
  matches: Match[];
};

export type Sport = {
  id: string;
  name: string;
  icon: string;
  isPopular?: boolean;
};

export type FeaturedCard = {
  id: string;
  title: string;
  subtitle: string;
  odds: string;
  bgGradient: string;
  selections?: string[];
  boostLabel?: string;
  returnExample?: string;
};
