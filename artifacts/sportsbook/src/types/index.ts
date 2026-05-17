export type BetType = 'single' | 'acca';

export type Selection = {
  id: string;
  matchId: string;
  matchName: string;
  selectionType: string;
  odds: number;
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
