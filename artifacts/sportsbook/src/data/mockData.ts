/**
 * BACKWARD-COMPATIBILITY SHIM
 * ─────────────────────────────────────────────────────────────────────────────
 * All components that previously imported from ./mockData continue to work
 * without any changes. This file simply re-exports from the structured data
 * layer index.
 *
 * When migrating to a backend, update src/data/index.ts — this file stays.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export { SPORTS, LEAGUES, FEATURED_CARDS } from './index';
