/**
 * THE ODDS API — CLIENT TYPES & FETCH HELPERS
 * All requests are made browser-side (frontend-only, no backend).
 * API key is read from import.meta.env.VITE_ODDS_API_KEY.
 */

// ─── Raw API response shapes ──────────────────────────────────────────────────

export interface OddsApiOutcome {
  name:  string;
  price: number;
}

export interface OddsApiMarket {
  key:         string;
  last_update: string;
  outcomes:    OddsApiOutcome[];
}

export interface OddsApiBookmaker {
  key:         string;
  title:       string;
  last_update: string;
  markets:     OddsApiMarket[];
}

export interface OddsApiEvent {
  id:            string;
  sport_key:     string;
  sport_title:   string;
  commence_time: string;
  home_team:     string;
  away_team:     string;
  bookmakers:    OddsApiBookmaker[];
}

// ─── Sport configuration ──────────────────────────────────────────────────────

export interface OddsApiSportConfig {
  /** The Odds API sport key */
  key:         string;
  /** Internal sportId used by our data layer */
  sportId:     string;
  /** Human-readable league/competition name */
  leagueName:  string;
  /** ISO 3166-1 alpha-2 for flag emoji */
  countryCode: string;
  /** Soccer/football has a Draw outcome; most other sports don't */
  hasDraw:     boolean;
}

/**
 * Ordered list of sport keys to fetch.
 * Add/remove entries here to change which competitions pull real data.
 */
export const ODDS_API_SPORTS: OddsApiSportConfig[] = [
  // ── Soccer ───────────────────────────────────────────────────────────────────
  { key: 'soccer_epl',               sportId: 'sp_soccer',            leagueName: 'Premier League',        countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_spain_la_liga',     sportId: 'sp_soccer',            leagueName: 'La Liga',               countryCode: 'ES', hasDraw: true  },
  { key: 'soccer_italy_serie_a',     sportId: 'sp_soccer',            leagueName: 'Serie A',               countryCode: 'IT', hasDraw: true  },
  { key: 'soccer_france_ligue_one',  sportId: 'sp_soccer',            leagueName: 'Ligue 1',               countryCode: 'FR', hasDraw: true  },
  { key: 'soccer_germany_bundesliga',sportId: 'sp_soccer',            leagueName: 'Bundesliga',            countryCode: 'DE', hasDraw: true  },
  { key: 'soccer_uefa_champs_league',sportId: 'sp_soccer',            leagueName: 'Champions League',      countryCode: 'EU', hasDraw: true  },
  // ── American Football ────────────────────────────────────────────────────────
  { key: 'americanfootball_nfl',     sportId: 'sp_american_football', leagueName: 'NFL',                   countryCode: 'US', hasDraw: false },
  { key: 'americanfootball_ncaaf',   sportId: 'sp_american_football', leagueName: 'NCAAF',                 countryCode: 'US', hasDraw: false },
  { key: 'americanfootball_ufl',     sportId: 'sp_american_football', leagueName: 'UFL',                   countryCode: 'US', hasDraw: false },
  // ── Australian Rules ─────────────────────────────────────────────────────────
  { key: 'aussierules_afl',          sportId: 'sp_aussie_rules',      leagueName: 'AFL',                   countryCode: 'AU', hasDraw: false },
  // ── Basketball ────────────────────────────────────────────────────────────────
  { key: 'basketball_nba',           sportId: 'sp_basketball',        leagueName: 'NBA',                   countryCode: 'US', hasDraw: false },
  { key: 'basketball_ncaab',         sportId: 'sp_basketball',        leagueName: 'NCAA Basketball',       countryCode: 'US', hasDraw: false },
  { key: 'basketball_euroleague',    sportId: 'sp_basketball',        leagueName: 'EuroLeague',            countryCode: 'EU', hasDraw: false },
  // ── Tennis ────────────────────────────────────────────────────────────────────
  { key: 'tennis_atp_french_open',   sportId: 'sp_tennis',            leagueName: 'French Open — ATP',     countryCode: 'FR', hasDraw: false },
  { key: 'tennis_wta_french_open',   sportId: 'sp_tennis',            leagueName: 'French Open — WTA',     countryCode: 'FR', hasDraw: false },
  // ── Cricket ───────────────────────────────────────────────────────────────────
  { key: 'cricket_ipl',              sportId: 'sp_cricket',           leagueName: 'Indian Premier League', countryCode: 'IN', hasDraw: false },
  { key: 'cricket_international_t20',sportId: 'sp_cricket',           leagueName: 'International T20',     countryCode: 'GL', hasDraw: false },
  // ── MMA ───────────────────────────────────────────────────────────────────────
  { key: 'mma_mixed_martial_arts',   sportId: 'sp_mma',               leagueName: 'MMA / UFC',             countryCode: 'US', hasDraw: false },
];

/** sportIds that real data covers — used to suppress mock leagues for the same sport */
export const REAL_DATA_SPORT_IDS = new Set(ODDS_API_SPORTS.map(s => s.sportId));

// ─── Fetch helper ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.the-odds-api.com/v4';

export async function fetchSportOdds(
  sportKey: string,
  apiKey: string,
): Promise<OddsApiEvent[]> {
  const params = new URLSearchParams({
    apiKey,
    regions:    'uk,eu,us',
    markets:    'h2h',
    oddsFormat: 'decimal',
    dateFormat: 'iso',
  });
  const res = await fetch(`${BASE_URL}/sports/${sportKey}/odds?${params}`);

  if (res.status === 401) {
    // Parse body to distinguish "invalid key" from "quota exhausted"
    try {
      const body = await res.json() as { error_code?: string };
      if (body.error_code === 'OUT_OF_USAGE_CREDITS') {
        throw new Error('QUOTA_EXHAUSTED');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'QUOTA_EXHAUSTED') throw e;
    }
    throw new Error('INVALID_KEY');
  }

  if (res.status === 422) return [];           // sport not currently available
  if (res.status === 429) throw new Error('Odds API rate limit reached');
  if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
