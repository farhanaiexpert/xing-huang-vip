/**
 * FEATURED PROMOTIONS DATA
 * ─────────────────────────────────────────────────────────────────────────────
 * Editorial/marketing content curated by the trading desk.
 * API_HOOK: GET /api/promotions/featured — returns active promotions
 *           sorted by priority, filtered by isActive flag.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FeaturedPromoEntity } from './types';

export const FEATURED_PROMOS: FeaturedPromoEntity[] = [
  {
    id: 'promo_f1',
    type: 'acca_boost',
    title: 'ACCUMULATOR BOOST',
    subtitle: 'European Giants — Result/Both Teams to Score',
    selectionDescriptions: [
      'Real Madrid & Yes (v Sevilla)',
      'PSG & Yes (v Paris FC)',
      'Monaco & Yes (v Strasbourg)',
      'Barcelona & Yes (v Real Betis)',
    ],
    boostLabel: '+7.5% ACCA BOOST',
    displayOdds: '76.54',
    returnExample: '€10 stake returns €822.09',
    linkedMatchIds: ['m4', 'm6'],
    isActive: true,
    priority: 1,
  },
  {
    id: 'promo_f2',
    type: 'early_payout',
    title: 'EARLY PAYOUT',
    subtitle: 'Full Time Result',
    selectionDescriptions: [
      'Athletic Club (v Celta Vigo)',
      'Atletico Madrid (v Girona)',
      'Real Madrid (v Sevilla)',
    ],
    boostLabel: '+20% ACCA BOOST',
    displayOdds: '142.40',
    returnExample: '€10 stake returns €1,706.87',
    linkedMatchIds: ['m5'],
    isActive: true,
    priority: 2,
  },
  {
    id: 'promo_f3',
    type: 'btts',
    title: 'BOTH TEAMS TO SCORE',
    subtitle: 'Both Teams to Score',
    selectionDescriptions: [
      'Yes (Athletic Club v Celta Vigo)',
      'Yes (Atletico Madrid v Girona)',
      'Yes (Elche v Getafe)',
    ],
    boostLabel: '+30% ACCA BOOST',
    displayOdds: '145.32',
    returnExample: '€10 stake returns €1,886.24',
    linkedMatchIds: ['m5b'],
    isActive: true,
    priority: 3,
  },
];
