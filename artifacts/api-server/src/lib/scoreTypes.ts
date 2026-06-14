/**
 * Canonical completed-event shape shared across settlement data sources
 * (The Odds API and BetsAPI). Used by the settlement worker to grade bets.
 */
export interface CompletedEvent {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores: Array<{ name: string; score: string }> | null;
}
