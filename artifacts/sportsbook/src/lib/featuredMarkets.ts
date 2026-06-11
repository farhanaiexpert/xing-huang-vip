/**
 * Shared selectors + metadata for "Matches With More Markets" (BetsAPI fixtures
 * with rich market depth). Used by both the homepage carousel
 * (FeaturedMatchesCarousel) and the dedicated /more-markets page so the two
 * stay perfectly in sync.
 */
import type { League, Match } from '../types';

export interface FeaturedEntry {
  match:      Match;
  leagueName: string;
}

/** Market availability pills shown on each card. */
export const MARKET_PILLS: { key: keyof NonNullable<Match['richMarkets']>; label: string }[] = [
  { key: 'hasHcp',     label: 'Handicap' },
  { key: 'hasOU',      label: 'O/U 2.5' },
  { key: 'hasBTTS',    label: 'BTTS' },
  { key: 'hasHT',      label: 'Half-Time' },
  { key: 'hasCS',      label: 'Correct Score' },
  { key: 'hasCorners', label: 'Corners' },
  { key: 'hasCards',   label: 'Cards' },
];

/** Friendly label + icon per internal sport id (BetsAPI matches only). */
export const SPORT_META: Record<string, { label: string; icon: string }> = {
  sp_soccer:           { label: 'Soccer',       icon: '⚽' },
  sp_basketball:       { label: 'Basketball',   icon: '🏀' },
  sp_tennis:           { label: 'Tennis',       icon: '🎾' },
  sp_table_tennis:     { label: 'Table Tennis', icon: '🏓' },
  sp_cricket:          { label: 'Cricket',      icon: '🏏' },
  sp_rugby:            { label: 'Rugby',        icon: '🏉' },
  sp_americanfootball: { label: 'NFL',          icon: '🏈' },
  sp_baseball:         { label: 'Baseball',     icon: '⚾' },
  sp_icehockey:        { label: 'Ice Hockey',   icon: '🏒' },
  sp_golf:             { label: 'Golf',         icon: '⛳' },
  sp_handball:         { label: 'Handball',     icon: '🤾' },
  sp_snooker:          { label: 'Snooker',      icon: '🎱' },
  sp_darts:            { label: 'Darts',        icon: '🎯' },
  sp_volleyball:       { label: 'Volleyball',   icon: '🏐' },
};

export function sportMetaFor(sportId: string): { label: string; icon: string } {
  if (SPORT_META[sportId]) return SPORT_META[sportId];
  const label = sportId
    .replace(/^sp_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: label || 'Other', icon: '🏆' };
}

export function marketMeta(match: Match): { marketId: string; marketName: string } {
  if (match.sportId === 'sp_soccer') return { marketId: `mkt_${match.id}_mr`, marketName: 'Match Result' };
  return { marketId: `mkt_${match.id}_mw`, marketName: 'Match Winner' };
}

/** All BetsAPI rich-market matches across every league, sorted by market depth. */
export function selectFeaturedEntries(leagues: League[]): FeaturedEntry[] {
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

export interface SportGroup {
  id:    string;
  count: number;
  label: string;
  icon:  string;
}

/** Sports present among the featured matches, with counts (most matches first). */
export function groupFeaturedBySport(entries: FeaturedEntry[]): SportGroup[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const id = e.match.sportId || 'other';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, ...sportMetaFor(id) }))
    .sort((a, b) => b.count - a.count);
}
