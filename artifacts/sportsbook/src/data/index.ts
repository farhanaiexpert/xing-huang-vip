/**
 * DATA LAYER — MAIN BARREL EXPORT
 * ─────────────────────────────────────────────────────────────────────────────
 * Components should import from here, not from individual data files.
 * This keeps the API surface stable as the data layer evolves.
 *
 * Also exports backward-compatible UI-typed collections (SPORTS, LEAGUES,
 * FEATURED_CARDS) that satisfy the shape expected by src/types/index.ts.
 * When the backend is ready, replace these adapters with API hooks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Re-export rich data layer ─────────────────────────────────────────────────
export * from './types';
export * from './catalog';
export * from './matches';
export * from './featured';
export * from './helpers';

// ── Backward-compatible UI adapters ───────────────────────────────────────────
// These transform the rich entity model into the flat shapes that
// src/types/index.ts defines, keeping all existing components unchanged.

import type { MatchEntity }                 from './types';
import { LEAGUES_CATALOG, SPORTS_CATALOG } from './catalog';
import { ALL_MATCHES }                      from './matches';
import { FEATURED_PROMOS }                  from './featured';

import type { Sport, League, FeaturedCard, Match } from '../types';

/**
 * UI-typed Sport list (used by SportsSidebar, MainContent carousel, etc.)
 * API_HOOK: replace with useSports() react-query hook
 */
export const SPORTS: Sport[] = SPORTS_CATALOG.map(s => ({
  id:        s.id,
  name:      s.name,
  icon:      s.icon,
  isPopular: s.isPopular,
}));

/**
 * Converts a MatchEntity's primary market into the flat odds shape the
 * MatchRow component expects.
 */
function adaptMatchToUI(entity: MatchEntity): Match {
  const pm = entity.primaryMarket;
  const sels = pm.selections;

  // Find home/draw/away by shortName or position
  const home = sels.find(s => s.shortName === '1') ?? sels[0];
  const draw = sels.find(s => s.shortName === 'X');
  const away = sels.find(s => s.shortName === '2') ?? sels[sels.length - 1];

  return {
    id:          entity.id,
    team1:       entity.homeTeamName,
    team2:       entity.awayTeamName,
    date:        entity.displayDate,
    dateTag:     entity.dateTag,
    leagueId:    entity.leagueId,
    sportId:     entity.sportId,
    isLive:      entity.isLive,
    liveMinute:  entity.liveMinute,
    score:       entity.score,
    marketCount: entity.marketCount,
    odds: {
      home: home?.odds ?? 0,
      draw: draw?.odds,
      away: away?.odds ?? 0,
    },
  };
}

/**
 * UI-typed League list (used by LeagueSection, MainContent).
 * API_HOOK: replace with useLeagues() react-query hook
 */
export const LEAGUES: League[] = LEAGUES_CATALOG
  .filter(l => l.isActive)
  .sort((a, b) => a.priority - b.priority)
  .map(league => {
    const matches = ALL_MATCHES
      .filter(m => m.leagueId === league.id)
      .map(adaptMatchToUI);

    return {
      id:          league.id,
      name:        league.name,
      sportId:     league.sportId,
      countryCode: league.countryCode,
      matches,
    };
  })
  .filter(l => l.matches.length > 0);

/**
 * UI-typed FeaturedCard list (used by FeaturedCards component).
 * API_HOOK: replace with useFeaturedPromos() react-query hook
 */
export const FEATURED_CARDS: FeaturedCard[] = FEATURED_PROMOS
  .filter(p => p.isActive)
  .sort((a, b) => a.priority - b.priority)
  .map(p => ({
    id:           p.id,
    title:        p.title,
    subtitle:     p.subtitle,
    odds:         p.displayOdds,
    bgGradient:   '',
    selections:   p.selectionDescriptions,
    boostLabel:   p.boostLabel,
    returnExample: p.returnExample,
  }));
