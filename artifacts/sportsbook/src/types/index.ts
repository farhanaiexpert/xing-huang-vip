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
  /** The Odds API sport key, e.g. "soccer_epl" */
  sportId?: string;
  /** True when this selection was added from the live betting page */
  isLive?: boolean;
  /** Score at time of placement, e.g. "1-0" */
  scoreAtPlacement?: string;
};

export type Match = {
  id: string;
  team1: string;
  team2: string;
  date: string;
  dateTag: 'today' | 'tomorrow' | 'upcoming';
  leagueId: string;
  sportId: string;
  odds: {
    home: number;
    draw?: number;
    away: number;
  };
  isLive?: boolean;
  liveMinute?: number;
  score?: { home: number; away: number };
  marketCount?: number;
};

export type League = {
  id: string;
  name: string;
  sportId: string;
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
