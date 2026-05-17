/**
 * DATA LAYER TYPES
 * ─────────────────────────────────────────────────────────────────────────────
 * This file defines the canonical data model for the OddsChain sportsbook.
 * These types represent the shape of data that will later be served by the
 * backend API / database. The UI adapter layer (src/data/index.ts) translates
 * these entities into the UI types (src/types/index.ts) consumed by components.
 *
 * Future integration points are marked with: // API_HOOK: <description>
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Status enums ─────────────────────────────────────────────────────────────

export type SportStatus   = 'active' | 'inactive';
export type MatchStatus   = 'upcoming' | 'live' | 'suspended' | 'finished' | 'cancelled';
export type MarketStatus  = 'active' | 'suspended' | 'closed';
export type OddsStatus    = 'active' | 'suspended';
export type OddsMovement  = 'up' | 'down' | 'stable';
export type DateTag       = 'today' | 'tomorrow' | 'upcoming';

// ── Sport ─────────────────────────────────────────────────────────────────────

export interface SportEntity {
  /** Primary key. Stable slug used in URLs and API calls. */
  id: string;
  name: string;
  slug: string;
  icon: string;
  isPopular: boolean;
  /** Controls sidebar/carousel ordering. Lower = higher priority. */
  sortOrder: number;
  status: SportStatus;
}

// ── League ────────────────────────────────────────────────────────────────────

export interface LeagueEntity {
  /** Primary key. */
  id: string;
  sportId: string;
  name: string;
  slug: string;
  countryCode: string;
  region: string;
  /** Controls display ordering within a sport. */
  priority: number;
  isActive: boolean;
  isFeatured: boolean;
}

// ── Team ──────────────────────────────────────────────────────────────────────

export interface TeamEntity {
  /** Primary key. */
  id: string;
  sportId: string;
  leagueId?: string;
  name: string;
  shortName: string;
  countryCode: string;
}

// ── Market Type ───────────────────────────────────────────────────────────────
// Market types are sport-agnostic templates (e.g. "Match Result", "BTTS").
// A MarketEntity is an instance of a market type applied to a specific match.

export interface MarketTypeEntity {
  /** Primary key / slug, e.g. "match_result". */
  id: string;
  name: string;
  /** Sports that support this market type. Empty array = all sports. */
  sportIds: string[];
  /** How many selections this market typically has. */
  selectionCount: number;
  /** Whether this is the primary (headline) market for a sport. */
  isPrimary: boolean;
}

// ── Selection (within a Market) ───────────────────────────────────────────────

export interface SelectionEntity {
  /** Primary key. Globally unique. */
  id: string;
  marketId: string;
  /** Display name, e.g. "Home Win", "Draw", "Over 2.5" */
  name: string;
  /** Short label for odds table headers, e.g. "1", "X", "2" */
  shortName: string;
  odds: number;
  oddsStatus: OddsStatus;
  oddsMovement: OddsMovement;
}

// ── Market ────────────────────────────────────────────────────────────────────

export interface MarketEntity {
  /** Primary key. */
  id: string;
  matchId: string;
  marketTypeId: string;
  name: string;
  status: MarketStatus;
  selections: SelectionEntity[];
}

// ── Match ─────────────────────────────────────────────────────────────────────

export interface MatchEntity {
  /** Primary key. */
  id: string;
  leagueId: string;
  sportId: string;
  /** null for individual-athlete sports (tennis, horse racing) */
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** Denormalised display names — avoids joins for simple renders */
  homeTeamName: string;
  awayTeamName: string;
  /** ISO 8601 UTC timestamp. API_HOOK: replace with actual event startTime. */
  startTime: string;
  /** Bucketed label for UI filtering */
  dateTag: DateTag;
  /** Human-readable display string, e.g. "Today, 20:00" */
  displayDate: string;
  status: MatchStatus;
  isLive: boolean;
  liveMinute?: number;
  /** Live score. For cricket: home = runs, away = wickets. */
  score?: { home: number; away: number };
  isFeatured: boolean;
  /** Total number of available markets (including non-displayed ones) */
  marketCount: number;
  /** Inline primary market for fast rendering without a separate lookup */
  primaryMarket: MarketEntity;
}

// ── Featured Promotion ─────────────────────────────────────────────────────────

export interface FeaturedPromoEntity {
  /** Primary key. */
  id: string;
  type: 'acca_boost' | 'early_payout' | 'btts' | 'custom';
  title: string;
  subtitle: string;
  selectionDescriptions: string[];
  boostLabel?: string;
  displayOdds: string;
  returnExample?: string;
  /** API_HOOK: link to actual match IDs this promo covers */
  linkedMatchIds: string[];
  isActive: boolean;
  priority: number;
}
