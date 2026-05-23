const CACHE_KEYS = [
  'oddschain_v1',
  'oddschain_quota_exhausted',
  'oddschain_onboarding_seen',
  'oc_fav_sports',
  'oc_fav_leagues',
  'oc_recent_matches',
  'oddsFormat',
  'gobet_bet_history_v2',
  'gobet_tennis_v1',
  'gobet_predictions_v1',
  'gobet_predictor_profile_v1',
  'cupbett_referral_v2',
];

export function clearAllCache(): void {
  CACHE_KEYS.forEach(key => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  });
}

export function clearOddsCache(): void {
  try { localStorage.removeItem('oddschain_v1'); } catch { /* ignore */ }
  try { localStorage.removeItem('oddschain_quota_exhausted'); } catch { /* ignore */ }
  try { localStorage.removeItem('gobet_tennis_v1'); } catch { /* ignore */ }
}
