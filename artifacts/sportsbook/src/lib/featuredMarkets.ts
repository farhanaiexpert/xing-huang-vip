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

/** True for BetsAPI fixtures (rich markets fetched from the BetsAPI cache). */
export function isBetsApiMatch(match: Match): boolean {
  return match.id.startsWith('betsapi_');
}

/**
 * True only for the FIFA (men's) World Cup. Keyed strictly on the Odds API sport
 * key so unrelated "… World Cup" leagues (Club World Cup, rugby, etc.) are not
 * mis-promoted to the front of the featured rail.
 */
export function isWorldCupMatch(match: Match): boolean {
  return match.sportKey === 'soccer_fifa_world_cup';
}

/**
 * Market-depth badge value for any match. BetsAPI matches expose a real
 * marketScore; Odds API matches get a derived count of the extra market
 * families the detail page will generate from their primary odds.
 */
export function marketScoreFor(match: Match): number {
  if (match.richMarkets) return match.richMarkets.marketScore;
  // Generic generator always derives Handicap + Over/Under from the primary odds.
  let score = 2;
  if (match.odds.draw != null) score += 1; // Double Chance / Draw No Bet
  if (match.bttsYes != null)   score += 1; // Both Teams To Score
  return score;
}

/**
 * Availability pills for a card. BetsAPI matches use their parsed richMarkets
 * flags; Odds API matches derive pills from what the detail generator produces.
 */
export function marketPillsFor(match: Match): { key: string; label: string }[] {
  const rm = match.richMarkets;
  if (rm) return MARKET_PILLS.filter(p => rm[p.key]).map(p => ({ key: p.key as string, label: p.label }));
  const pills: { key: string; label: string }[] = [{ key: 'hcp', label: 'Handicap' }, { key: 'ou', label: 'O/U' }];
  if (match.odds.draw != null) pills.push({ key: 'dc', label: 'Double Chance' });
  if (match.bttsYes != null)   pills.push({ key: 'btts', label: 'BTTS' });
  return pills;
}

/**
 * Worldwide featured-match selection. Blends three sources so the section is no
 * longer skewed to a single (Asian-heavy) BetsAPI feed:
 *   1. FIFA World Cup matches (surfaced first — "some from worldcup").
 *   2. All other Odds API matches with a valid primary market (worldwide soccer,
 *      tennis, American football, basketball, …) — every one now has a full
 *      derived market set on its detail page.
 *   3. BetsAPI rich-market fixtures (sorted by real market depth).
 * World Cup leads, then Odds API and BetsAPI matches are interleaved so the
 * front of the list always shows a worldwide mix rather than one source.
 */
export function selectFeaturedEntries(leagues: League[]): FeaturedEntry[] {
  const wc:    FeaturedEntry[] = [];
  const world: FeaturedEntry[] = [];
  const bets:  FeaturedEntry[] = [];

  for (const league of leagues) {
    for (const match of league.matches) {
      if (isBetsApiMatch(match)) {
        if (!match.featuredMatch) continue;
        bets.push({ match, leagueName: league.name });
      } else {
        // Odds API match — must carry a usable primary price.
        if (!(match.odds?.home > 1)) continue;
        const entry = { match, leagueName: league.name };
        if (isWorldCupMatch(match)) wc.push(entry);
        else world.push(entry);
      }
    }
  }

  const byKickoff = (a: FeaturedEntry, b: FeaturedEntry) =>
    new Date(a.match.commenceIso ?? 0).getTime() - new Date(b.match.commenceIso ?? 0).getTime();

  wc.sort(byKickoff);
  world.sort(byKickoff);
  bets.sort((a, b) => (b.match.richMarkets?.marketScore ?? 0) - (a.match.richMarkets?.marketScore ?? 0));

  // Keep a handful of World Cup matches up front, fold the rest into the mix.
  const wcHead = wc.slice(0, 8);
  const tail   = interleave([world, wc.slice(8), bets]);
  return [...wcHead, ...tail];
}

/** Round-robin merge of several already-sorted lists (drops empties as they exhaust). */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}

/** Small deterministic PRNG (mulberry32) — same seed → same shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher–Yates shuffle driven by a seeded RNG. */
function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Display order for the homepage "Matches With More Markets" rail.
 *
 * Groups by source in a fixed sequence — BetsAPI → FIFA World Cup → Odds API —
 * and Fisher–Yates shuffles the matches WITHIN each group using `seed`.
 *
 * Pass a fresh seed per page load so matches re-shuffle on every reload; keeping
 * the same seed for a session means the order stays stable across background
 * odds refreshes (cards don't jump around while the user is reading them).
 * De-duplicates by match id (first occurrence wins).
 */
export function orderFeaturedForDisplay(entries: FeaturedEntry[], seed: number): FeaturedEntry[] {
  const seen = new Set<string>();
  const bets:  FeaturedEntry[] = [];
  const wc:    FeaturedEntry[] = [];
  const world: FeaturedEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.match.id)) continue;
    seen.add(e.match.id);
    if (isBetsApiMatch(e.match))        bets.push(e);
    else if (isWorldCupMatch(e.match))  wc.push(e);
    else                                world.push(e);
  }
  const rng = mulberry32(seed);
  return [
    ...shuffleSeeded(bets, rng),
    ...shuffleSeeded(wc, rng),
    ...shuffleSeeded(world, rng),
  ];
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
