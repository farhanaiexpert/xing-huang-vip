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

/**
 * Canonical sport → emoji map keyed by a normalised sport token (lowercase, no
 * separators). Used as the single source of truth for team-badge fallback icons
 * across the whole sportsbook so a team with no flag/logo never shows initials.
 */
const SPORT_EMOJI: Record<string, string> = {
  soccer: '⚽', football: '⚽', futsal: '⚽', ucl: '⚽',
  tennis: '🎾', tabletennis: '🏓',
  basketball: '🏀', nba: '🏀',
  baseball: '⚾',
  volleyball: '🏐', beachvolleyball: '🏐',
  cricket: '🏏',
  mma: '🥊', ufc: '🥊', boxing: '🥊',
  icehockey: '🏒', hockey: '🏒',
  americanfootball: '🏈', nfl: '🏈',
  rugby: '🏉', rugbyleague: '🏉', rugbyunion: '🏉',
  darts: '🎯',
  handball: '🤾', golf: '⛳', snooker: '🎱', pool: '🎱',
  esports: '🎮', horseracing: '🏇', horse: '🏇',
  formula1: '🏎️', f1: '🏎️', motorsport: '🏎️',
  aussierules: '🦘', badminton: '🏸',
};

/**
 * Resolve a guaranteed sport emoji for any sport id / key variant the app uses
 * (e.g. `sp_soccer`, `soccer_epl`, `betsapi_rugby`, `mma_ufc`, `table_tennis`).
 * Always returns a non-empty icon (🏆 as last resort) so it is safe to use as a
 * never-broken fallback. Pure + cheap; result is deterministic per input.
 */
export function sportIconFor(raw?: string | null): string {
  if (!raw) return '🏆';
  const s = raw.toLowerCase().trim().replace(/^sp_/, '').replace(/^betsapi_/, '');
  const collapsed = s.replace(/[_\s-]/g, '');
  const first = s.split(/[_\s-]/)[0];
  return SPORT_EMOJI[collapsed] ?? SPORT_EMOJI[first] ?? SPORT_EMOJI[s] ?? '🏆';
}

export function sportMetaFor(sportId: string): { label: string; icon: string } {
  if (SPORT_META[sportId]) return SPORT_META[sportId];
  const label = sportId
    .replace(/^sp_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: label || 'Other', icon: sportIconFor(sportId) };
}

export function marketMeta(match: Match): { marketId: string; marketName: string } {
  if (match.sportId === 'sp_soccer') return { marketId: `mkt_${match.id}_mr`, marketName: 'Match Result' };
  return { marketId: `mkt_${match.id}_mw`, marketName: 'Match Winner' };
}

/**
 * BetsAPI fixtures for the "Matches With More Markets" section, sorted by depth.
 *
 * Returns the rich-market fixtures (flagged `featuredMatch`) whenever any exist,
 * so the section keeps showing genuine "more markets" matches. Only when NONE are
 * flagged — e.g. BetsAPI rich-market enrichment is momentarily thin or empty — it
 * falls back to all bettable BetsAPI matches (valid teams + 1X2 odds) so the
 * section never disappears entirely. Sorted by marketScore, then marketCount.
 */
export function selectFeaturedEntries(leagues: League[]): FeaturedEntry[] {
  const featured: FeaturedEntry[] = [];
  const fallback: FeaturedEntry[] = [];
  for (const league of leagues) {
    for (const match of league.matches) {
      if (!match.id.startsWith('betsapi_')) continue;
      // Require a real, bettable fixture: both teams + valid home/away odds.
      if (!match.team1 || !match.team2) continue;
      const home = match.odds?.home ?? 0;
      const away = match.odds?.away ?? 0;
      if (home <= 1 || away <= 1) continue;
      const entry: FeaturedEntry = { match, leagueName: league.name };
      fallback.push(entry);
      if (match.featuredMatch) featured.push(entry);
    }
  }
  const chosen = featured.length > 0 ? featured : fallback;
  chosen.sort(
    (a, b) =>
      (b.match.richMarkets?.marketScore ?? 0) - (a.match.richMarkets?.marketScore ?? 0) ||
      (b.match.marketCount ?? 0) - (a.match.marketCount ?? 0),
  );
  return chosen;
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
