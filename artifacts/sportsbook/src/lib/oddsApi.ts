/**
 * THE ODDS API — CLIENT TYPES & FETCH HELPERS
 * All requests are proxied through the CupBett API server (/api/odds/:sport).
 * The Odds API key lives server-side only — it is never sent to the browser.
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
 * Full list of sport keys fetched from The Odds API (100k plan).
 * Refreshed every 25-35 minutes by the server-side cron.
 * Add/remove entries here to change which competitions pull real data.
 */
export const ODDS_API_SPORTS: OddsApiSportConfig[] = [
  // ── Soccer ───────────────────────────────────────────────────────────────────
  { key: 'soccer_epl',                         sportId: 'sp_soccer',            leagueName: 'Premier League',           countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_spain_la_liga',               sportId: 'sp_soccer',            leagueName: 'La Liga',                  countryCode: 'ES', hasDraw: true  },
  { key: 'soccer_italy_serie_a',               sportId: 'sp_soccer',            leagueName: 'Serie A',                  countryCode: 'IT', hasDraw: true  },
  { key: 'soccer_france_ligue_one',            sportId: 'sp_soccer',            leagueName: 'Ligue 1',                  countryCode: 'FR', hasDraw: true  },
  { key: 'soccer_germany_bundesliga',          sportId: 'sp_soccer',            leagueName: 'Bundesliga',               countryCode: 'DE', hasDraw: true  },
  { key: 'soccer_uefa_champs_league',          sportId: 'sp_ucl',               leagueName: 'Champions League',         countryCode: 'EU', hasDraw: true  },
  { key: 'soccer_uefa_europa_league',          sportId: 'sp_soccer',            leagueName: 'Europa League',            countryCode: 'EU', hasDraw: true  },
  { key: 'soccer_usa_mls',                     sportId: 'sp_soccer',            leagueName: 'MLS',                      countryCode: 'US', hasDraw: true  },
  { key: 'soccer_turkey_super_league',         sportId: 'sp_soccer',            leagueName: 'Süper Lig',                countryCode: 'TR', hasDraw: true  },
  { key: 'soccer_netherlands_eredivisie',      sportId: 'sp_soccer',            leagueName: 'Eredivisie',               countryCode: 'NL', hasDraw: true  },
  { key: 'soccer_brazil_campeonato',           sportId: 'sp_soccer',            leagueName: 'Brasileirão',              countryCode: 'BR', hasDraw: true  },
  { key: 'soccer_mexico_ligamx',               sportId: 'sp_soccer',            leagueName: 'Liga MX',                  countryCode: 'MX', hasDraw: true  },
  { key: 'soccer_efl_champ',                   sportId: 'sp_soccer',            leagueName: 'EFL Championship',         countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_scotland_premiership',        sportId: 'sp_soccer',            leagueName: 'Scottish Premiership',     countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_portugal_primeira_liga',      sportId: 'sp_soccer',            leagueName: 'Primeira Liga',            countryCode: 'PT', hasDraw: true  },
  { key: 'soccer_belgium_first_div',           sportId: 'sp_soccer',            leagueName: 'Belgian First Division',   countryCode: 'BE', hasDraw: true  },
  { key: 'soccer_argentina_primera_division',  sportId: 'sp_soccer',            leagueName: 'Primera División',         countryCode: 'AR', hasDraw: true  },
  { key: 'soccer_conmebol_copa_libertadores',  sportId: 'sp_soccer',            leagueName: 'Copa Libertadores',        countryCode: 'AR', hasDraw: true  },
  { key: 'soccer_korea_kleague1',              sportId: 'sp_soccer',            leagueName: 'K League 1',               countryCode: 'KR', hasDraw: true  },
  { key: 'soccer_japan_j_league',              sportId: 'sp_soccer',            leagueName: 'J1 League',                countryCode: 'JP', hasDraw: true  },
  { key: 'soccer_australia_aleague',           sportId: 'sp_soccer',            leagueName: 'A-League',                 countryCode: 'AU', hasDraw: true  },
  // ── American Football ────────────────────────────────────────────────────────
  { key: 'americanfootball_nfl',               sportId: 'sp_american_football', leagueName: 'NFL',                      countryCode: 'US', hasDraw: false },
  { key: 'americanfootball_ncaaf',             sportId: 'sp_american_football', leagueName: 'NCAAF',                    countryCode: 'US', hasDraw: false },
  { key: 'americanfootball_ufl',               sportId: 'sp_american_football', leagueName: 'UFL',                      countryCode: 'US', hasDraw: false },
  // ── Australian Rules ─────────────────────────────────────────────────────────
  { key: 'aussierules_afl',                    sportId: 'sp_aussie_rules',      leagueName: 'AFL',                      countryCode: 'AU', hasDraw: false },
  // ── Basketball ────────────────────────────────────────────────────────────────
  { key: 'basketball_nba',                     sportId: 'sp_basketball',        leagueName: 'NBA',                      countryCode: 'US', hasDraw: false },
  { key: 'basketball_ncaab',                   sportId: 'sp_basketball',        leagueName: 'NCAA Basketball',          countryCode: 'US', hasDraw: false },
  { key: 'basketball_euroleague',              sportId: 'sp_basketball',        leagueName: 'EuroLeague',               countryCode: 'EU', hasDraw: false },
  { key: 'basketball_nbl',                     sportId: 'sp_basketball',        leagueName: 'NBL Australia',            countryCode: 'AU', hasDraw: false },
  // ── Tennis ────────────────────────────────────────────────────────────────────
  { key: 'tennis_atp_french_open',             sportId: 'sp_tennis',            leagueName: 'French Open — ATP',        countryCode: 'FR', hasDraw: false },
  { key: 'tennis_wta_french_open',             sportId: 'sp_tennis',            leagueName: 'French Open — WTA',        countryCode: 'FR', hasDraw: false },
  { key: 'tennis_atp_wimbledon',               sportId: 'sp_tennis',            leagueName: 'Wimbledon — ATP',          countryCode: 'GB', hasDraw: false },
  { key: 'tennis_wta_wimbledon',               sportId: 'sp_tennis',            leagueName: 'Wimbledon — WTA',          countryCode: 'GB', hasDraw: false },
  { key: 'tennis_atp_us_open',                 sportId: 'sp_tennis',            leagueName: 'US Open — ATP',            countryCode: 'US', hasDraw: false },
  { key: 'tennis_wta_us_open',                 sportId: 'sp_tennis',            leagueName: 'US Open — WTA',            countryCode: 'US', hasDraw: false },
  { key: 'tennis_atp_australian_open',         sportId: 'sp_tennis',            leagueName: 'Australian Open — ATP',    countryCode: 'AU', hasDraw: false },
  { key: 'tennis_wta_australian_open',         sportId: 'sp_tennis',            leagueName: 'Australian Open — WTA',    countryCode: 'AU', hasDraw: false },
  // ── Cricket ───────────────────────────────────────────────────────────────────
  { key: 'cricket_ipl',                        sportId: 'sp_cricket',           leagueName: 'Indian Premier League',    countryCode: 'IN', hasDraw: false },
  { key: 'cricket_international_t20',          sportId: 'sp_cricket',           leagueName: 'International T20',        countryCode: 'GL', hasDraw: false },
  { key: 'cricket_big_bash',                   sportId: 'sp_cricket',           leagueName: 'Big Bash League',          countryCode: 'AU', hasDraw: false },
  { key: 'cricket_psl',                        sportId: 'sp_cricket',           leagueName: 'Pakistan Super League',    countryCode: 'PK', hasDraw: false },
  { key: 'cricket_test_match',                 sportId: 'sp_cricket',           leagueName: 'Test Matches',             countryCode: 'GL', hasDraw: false },
  // ── Baseball ─────────────────────────────────────────────────────────────────
  { key: 'baseball_mlb',                       sportId: 'sp_baseball',          leagueName: 'MLB',                      countryCode: 'US', hasDraw: false },
  { key: 'baseball_npb',                       sportId: 'sp_baseball',          leagueName: 'NPB (Japan)',               countryCode: 'JP', hasDraw: false },
  { key: 'baseball_kbo',                       sportId: 'sp_baseball',          leagueName: 'KBO (Korea)',               countryCode: 'KR', hasDraw: false },
  // ── Ice Hockey ───────────────────────────────────────────────────────────────
  { key: 'icehockey_nhl',                      sportId: 'sp_ice_hockey',        leagueName: 'NHL',                      countryCode: 'US', hasDraw: false },
  { key: 'icehockey_sweden_hockey_league',     sportId: 'sp_ice_hockey',        leagueName: 'SHL (Sweden)',              countryCode: 'SE', hasDraw: false },
  { key: 'icehockey_nhl_championship_winner',  sportId: 'sp_ice_hockey',        leagueName: 'NHL Championship Winner',  countryCode: 'US', hasDraw: false },
  // ── Rugby League ─────────────────────────────────────────────────────────────
  { key: 'rugbyleague_nrl',                    sportId: 'sp_rugby_league',      leagueName: 'NRL',                      countryCode: 'AU', hasDraw: false },
  { key: 'rugbyleague_super_league',           sportId: 'sp_rugby_league',      leagueName: 'Super League',             countryCode: 'GB', hasDraw: false },
  { key: 'rugbyleague_nrl_premiership_winner', sportId: 'sp_rugby_league',      leagueName: 'NRL Premiership Winner',   countryCode: 'AU', hasDraw: false },
  // ── Rugby Union ──────────────────────────────────────────────────────────────
  { key: 'rugbyunion_premiership',             sportId: 'sp_rugby_union',       leagueName: 'Premiership',              countryCode: 'GB', hasDraw: false },
  { key: 'rugbyunion_super_rugby',             sportId: 'sp_rugby_union',       leagueName: 'Super Rugby',              countryCode: 'AU', hasDraw: false },
  { key: 'rugbyunion_six_nations',             sportId: 'sp_rugby_union',       leagueName: 'Six Nations',              countryCode: 'EU', hasDraw: false },
  { key: 'rugbyunion_world_cup',               sportId: 'sp_rugby_union',       leagueName: 'Rugby World Cup',          countryCode: 'GL', hasDraw: false },
  { key: 'rugbyunion_champions_cup',           sportId: 'sp_rugby_union',       leagueName: 'Champions Cup',            countryCode: 'EU', hasDraw: false },
  // ── Golf ─────────────────────────────────────────────────────────────────────
  { key: 'golf_masters_tournament_winner',     sportId: 'sp_golf',              leagueName: 'Masters Tournament',       countryCode: 'US', hasDraw: false },
  { key: 'golf_pga_championship_winner',       sportId: 'sp_golf',              leagueName: 'PGA Championship',         countryCode: 'US', hasDraw: false },
  { key: 'golf_us_open_winner',                sportId: 'sp_golf',              leagueName: 'US Open',                  countryCode: 'US', hasDraw: false },
  { key: 'golf_the_open_championship_winner',  sportId: 'sp_golf',              leagueName: 'The Open Championship',    countryCode: 'GB', hasDraw: false },
  { key: 'golf_pga_tour_winner',               sportId: 'sp_golf',              leagueName: 'PGA Tour',                 countryCode: 'US', hasDraw: false },
  // ── Handball ─────────────────────────────────────────────────────────────────
  { key: 'handball_ehf_champions_league',      sportId: 'sp_handball',          leagueName: 'EHF Champions League',     countryCode: 'EU', hasDraw: false },
  // ── Volleyball ───────────────────────────────────────────────────────────────
  { key: 'volleyball_brazil_superliga',        sportId: 'sp_volleyball',        leagueName: 'Brazilian Superliga',      countryCode: 'BR', hasDraw: false },
  // ── Darts ────────────────────────────────────────────────────────────────────
  { key: 'darts_betway_premier_league',        sportId: 'sp_darts',             leagueName: 'Premier League Darts',     countryCode: 'GB', hasDraw: false },
  { key: 'darts_world_championship',           sportId: 'sp_darts',             leagueName: 'World Darts Championship', countryCode: 'GB', hasDraw: false },
  // ── Boxing ───────────────────────────────────────────────────────────────────
  { key: 'boxing_event',                       sportId: 'sp_boxing',            leagueName: 'Boxing',                   countryCode: 'GL', hasDraw: false },
  // ── MMA ───────────────────────────────────────────────────────────────────────
  { key: 'mma_mixed_martial_arts',             sportId: 'sp_mma',               leagueName: 'MMA / UFC',                countryCode: 'US', hasDraw: false },
  // ── Snooker ───────────────────────────────────────────────────────────────────
  { key: 'snooker_world_championship',         sportId: 'sp_snooker',           leagueName: 'World Championship',       countryCode: 'GB', hasDraw: false },
  { key: 'snooker_premier_league',             sportId: 'sp_snooker',           leagueName: 'Premier League Snooker',   countryCode: 'GB', hasDraw: false },
  // ── Basketball — WNBA ────────────────────────────────────────────────────────
  { key: 'basketball_wnba',                    sportId: 'sp_basketball',        leagueName: 'WNBA',                     countryCode: 'US', hasDraw: false },
  // ── Soccer — Nordic + additional leagues ─────────────────────────────────────
  { key: 'soccer_sweden_allsvenskan',          sportId: 'sp_soccer',            leagueName: 'Allsvenskan',              countryCode: 'SE', hasDraw: true  },
  { key: 'soccer_norway_eliteserien',          sportId: 'sp_soccer',            leagueName: 'Eliteserien',              countryCode: 'NO', hasDraw: true  },
  { key: 'soccer_denmark_superliga',           sportId: 'sp_soccer',            leagueName: 'Superliga (DEN)',          countryCode: 'DK', hasDraw: true  },
  { key: 'soccer_finland_veikkausliiga',       sportId: 'sp_soccer',            leagueName: 'Veikkausliiga',            countryCode: 'FI', hasDraw: true  },
  { key: 'soccer_spain_segunda_division',      sportId: 'sp_soccer',            leagueName: 'Segunda División',         countryCode: 'ES', hasDraw: true  },
  { key: 'soccer_england_league1',             sportId: 'sp_soccer',            leagueName: 'EFL League One',           countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_england_league2',             sportId: 'sp_soccer',            leagueName: 'EFL League Two',           countryCode: 'GB', hasDraw: true  },
  { key: 'soccer_china_superleague',           sportId: 'sp_soccer',            leagueName: 'Chinese Super League',     countryCode: 'CN', hasDraw: true  },
  { key: 'soccer_india_superleague',           sportId: 'sp_soccer',            leagueName: 'Indian Super League',      countryCode: 'IN', hasDraw: true  },
  { key: 'soccer_conmebol_copa_america',       sportId: 'sp_soccer',            leagueName: 'Copa América',             countryCode: 'AR', hasDraw: true  },
  { key: 'soccer_uefa_nations_league',         sportId: 'sp_soccer',            leagueName: 'UEFA Nations League',      countryCode: 'EU', hasDraw: true  },
];

/** sportIds that real data covers — used to suppress mock leagues and show correct empty states */
export const REAL_DATA_SPORT_IDS = new Set(ODDS_API_SPORTS.map(s => s.sportId));

// ─── Fetch helpers ────────────────────────────────────────────────────────────

interface ServerOddsResponse {
  data:   OddsApiEvent[];
  cached: boolean;
}

interface ServerAllOddsResponse {
  sports:     Record<string, OddsApiEvent[]>;
  cached:     boolean;
  sportCount: number;
}

interface ServerErrorResponse {
  error_code?: string;
  message?:    string;
  error?:      string;
}

/** Fetch a single sport — kept for MatchDetail / sport-detail page deep links. */
export async function fetchSportOdds(
  sportKey: string,
): Promise<OddsApiEvent[]> {
  const res = await fetch(`/api/odds/${sportKey}`);

  if (res.status === 503) throw new Error('Odds API not configured on server');
  if (res.status === 401) {
    const body = await res.json().catch(() => ({} as ServerErrorResponse)) as ServerErrorResponse;
    if (body.error_code === 'OUT_OF_USAGE_CREDITS') throw new Error('QUOTA_EXHAUSTED');
    throw new Error('INVALID_KEY');
  }
  if (res.status === 422) return [];
  if (res.status === 429) throw new Error('Odds API rate limit reached');
  if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`);

  const json = await res.json() as ServerOddsResponse;
  return Array.isArray(json.data) ? json.data : [];
}

/**
 * Fetch ALL cached sports in one request — replaces 78 individual fetches.
 * The server reads from PostgreSQL cache only; no Odds API calls are made.
 */
export async function fetchAllOdds(): Promise<Record<string, OddsApiEvent[]>> {
  const res = await fetch('/api/odds/all');

  if (res.status === 503) throw new Error('Odds API not configured on server');
  if (res.status === 401) {
    const body = await res.json().catch(() => ({} as ServerErrorResponse)) as ServerErrorResponse;
    if (body.error_code === 'OUT_OF_USAGE_CREDITS') throw new Error('QUOTA_EXHAUSTED');
    throw new Error('INVALID_KEY');
  }
  if (!res.ok) throw new Error(`Odds API HTTP ${res.status}`);

  const json = await res.json() as ServerAllOddsResponse;
  return json.sports ?? {};
}
