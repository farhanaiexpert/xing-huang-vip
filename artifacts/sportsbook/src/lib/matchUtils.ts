/**
 * Shared match utilities — no React dependencies so they can be imported
 * freely without triggering HMR invalidations on component files.
 */
import type { League } from '../types';

/** Find a Match by ID across all leagues. Returns null if not found. */
export function findMatchInLeagues(matchId: string, leagues: League[]) {
  for (const league of leagues) {
    const match = league.matches.find(m => m.id === matchId);
    if (match) return { match, league };
  }
  return null;
}
