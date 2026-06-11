/**
 * Shared helpers for "Matches With More Markets" (rich-market / featured
 * BetsAPI matches). Used by both the homepage FeaturedMatchesCarousel and the
 * dedicated /more-markets page so the derivation, sport icons/labels and market
 * mapping stay in lock-step.
 */
import type { League, Match } from '../types';

export interface FeaturedEntry {
  match:      Match;
  leagueName: string;
}

export interface SportChip {
  id:    string;
  count: number;
  label: string;
  icon:  string;
}

export const FEATURED_ALL = '__all__';

export const SPORT_ICONS: Record<string, string> = {
  sp_soccer: '⚽', sp_tennis: '🎾', sp_table_tennis: '🏓', sp_basketball: '🏀',
  sp_ice_hockey: '🏒', sp_cricket: '🏏', sp_baseball: '⚾', sp_american_football: '🏈',
  sp_volleyball: '🏐', sp_darts: '🎯', sp_boxing: '🥊', sp_mma: '🥋',
  sp_rugby_league: '🏉', sp_rugby_union: '🏉', sp_esports: '🎮', sp_handball: '🤾',
  sp_snooker: '🎱', sp_badminton: '🏸', sp_futsal: '⚽',
};

export const SPORT_LABELS: Record<string, string> = {
  sp_soccer: 'Soccer', sp_tennis: 'Tennis', sp_table_tennis: 'Table Tennis',
  sp_basketball: 'Basketball', sp_ice_hockey: 'Ice Hockey', sp_cricket: 'Cricket',
  sp_baseball: 'Baseball', sp_american_football: 'NFL', sp_volleyball: 'Volleyball',
  sp_darts: 'Darts', sp_boxing: 'Boxing', sp_mma: 'MMA', sp_rugby_league: 'Rugby League',
  sp_rugby_union: 'Rugby Union', sp_esports: 'Esports', sp_handball: 'Handball',
  sp_snooker: 'Snooker', sp_badminton: 'Badminton', sp_futsal: 'Futsal',
};

export function sportIconFor(id?: string): string {
  return (id && SPORT_ICONS[id]) || '🏅';
}

export function sportLabelFor(id?: string): string {
  if (id && SPORT_LABELS[id]) return SPORT_LABELS[id];
  if (!id) return 'Other';
  return id.replace(/^sp_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Match Result (soccer) vs Match Winner (everything else) market identity. */
export function marketMeta(match: Match) {
  if (match.sportId === 'sp_soccer') return { marketId: `mkt_${match.id}_mr`, marketName: 'Match Result' };
  return { marketId: `mkt_${match.id}_mw`, marketName: 'Match Winner' };
}

/** All BetsAPI featured (rich-market) matches across leagues, sorted by depth. */
export function deriveFeatured(leagues: League[]): FeaturedEntry[] {
  const entries: FeaturedEntry[] = [];
  for (const league of leagues) {
    for (const match of league.matches) {
      if (!match.id.startsWith('betsapi_')) continue;
      if (!match.featuredMatch) continue;
      entries.push({ match, leagueName: league.name });
    }
  }
  entries.sort(
    (a, b) => (b.match.richMarkets?.marketScore ?? 0) - (a.match.richMarkets?.marketScore ?? 0),
  );
  return entries;
}

/** Per-sport chips derived from the featured set, sorted by count desc. */
export function deriveSportChips(entries: FeaturedEntry[]): SportChip[] {
  const counts = new Map<string, number>();
  for (const { match } of entries) {
    const id = match.sportId ?? 'other';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, label: sportLabelFor(id), icon: sportIconFor(id) }))
    .sort((a, b) => b.count - a.count);
}
