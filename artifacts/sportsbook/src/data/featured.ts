/**
 * FEATURED PROMOTIONS DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Editorial/marketing content curated by the trading desk.
 * API_HOOK: GET /api/promotions/featured — returns active promotions
 *           sorted by priority, filtered by isActive flag.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FeaturedPromoEntity } from './types';

export const FEATURED_PROMOS: FeaturedPromoEntity[] = [];
