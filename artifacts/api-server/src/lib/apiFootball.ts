/**
 * API-Football score provider (v3)
 * Secondary settlement data source — football/soccer leagues only.
 * Docs: https://www.api-football.com/documentation-v3
 *
 * Results are cached per-date for 30 minutes to stay within the free-tier
 * limit of 100 req/day (≈ 3 dates × 2 calls/hour max).
 */

import { logger } from "./logger.js";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

// ─── Odds API sport key → API-Football league IDs ────────────────────────────
const SPORT_LEAGUE_MAP: Record<string, number[]> = {
  soccer_epl:                         [39],        // English Premier League
  soccer_england_efl_champ:           [40],        // Championship
  soccer_england_league1:             [41],        // League One
  soccer_england_league2:             [42],        // League Two
  soccer_uefa_champs_league:          [2],         // UEFA Champions League
  soccer_uefa_europa_league:          [3],         // UEFA Europa League
  soccer_uefa_europa_conference_league:[848],      // Conference League
  soccer_spain_la_liga:               [140],       // La Liga
  soccer_spain_segunda_division:      [141],       // La Liga 2
  soccer_germany_bundesliga:          [78],        // Bundesliga
  soccer_germany_bundesliga2:         [79],        // 2. Bundesliga
  soccer_italy_serie_a:               [135],       // Serie A
  soccer_italy_serie_b:               [136],       // Serie B
  soccer_france_ligue_one:            [61],        // Ligue 1
  soccer_france_ligue_two:            [62],        // Ligue 2
  soccer_netherlands_eredivisie:      [88],        // Eredivisie
  soccer_portugal_primeira_liga:      [94],        // Primeira Liga
  soccer_turkey_super_league:         [203],       // Süper Lig
  soccer_usa_mls:                     [253],       // MLS
  soccer_australia_aleague:           [188],       // A-League
  soccer_brazil_campeonato:           [71],        // Brasileirão Série A
  soccer_argentina_primera_division:  [128],       // Liga Profesional
  soccer_mexico_ligamx:               [262],       // Liga MX
  soccer_scotland_premiership:        [179],       // Scottish Premiership
  soccer_belgium_first_div:           [144],       // Pro League
  soccer_russia_premier_league:       [235],       // Russian Premier League
  soccer_japan_j_league:              [98],        // J1 League
  soccer_saudi_arabias_league:        [307],       // Saudi Pro League
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** Canonical format shared with the settlement worker */
export interface CompletedEvent {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores: Array<{ name: string; score: string }> | null;
}

interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league:  { id: number; name: string };
  teams:   { home: { name: string }; away: { name: string } };
  goals:   { home: number | null; away: number | null };
}

// ─── Team name normalisation for fuzzy matching ───────────────────────────────

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|afc|fk|ac|as|sc|us|ss|ud|cd|rc|bsc|rcd|ca|rca|city|united|town|athletic|sport)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function teamsMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(" ").filter(w => w.length > 3);
  const wb = nb.split(" ").filter(w => w.length > 3);
  return wa.length > 0 && wb.length > 0 && wa.some(w => wb.includes(w));
}

// ─── Per-date cache (30-min TTL) ─────────────────────────────────────────────

interface CacheEntry { fixtures: ApiFootballFixture[]; fetchedAt: number }
const _cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchFixturesForDate(date: string): Promise<ApiFootballFixture[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];

  const cached = _cache.get(date);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.fixtures;
  }

  try {
    const res = await fetch(`${API_FOOTBALL_BASE}/fixtures?date=${date}&status=FT`, {
      headers: { "x-apisports-key": key, "Accept": "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      logger.warn({ date, status: res.status }, "API-Football: fetch failed");
      return [];
    }

    const body = (await res.json()) as { response: ApiFootballFixture[]; errors?: unknown };

    if (body.errors && Object.keys(body.errors as object).length > 0) {
      logger.warn({ date, errors: body.errors }, "API-Football: API error");
      return [];
    }

    const fixtures = Array.isArray(body.response) ? body.response : [];
    _cache.set(date, { fixtures, fetchedAt: Date.now() });
    logger.info({ date, count: fixtures.length }, "API-Football: fixtures cached");
    return fixtures;
  } catch (err) {
    logger.warn({ err, date }, "API-Football: request error");
    return [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * For each open event, find a completed result in API-Football.
 * Only works for football/soccer sports with a known league mapping.
 * Returns CompletedEvent objects in the same shape as the Odds API.
 */
export async function fetchCompletedScoresApiFootball(
  sportKey: string,
  openEvents: Array<{ id: string; homeTeam: string; awayTeam: string; commenceDate?: string }>,
): Promise<CompletedEvent[]> {
  if (!process.env.API_FOOTBALL_KEY) return [];

  const leagueIds = SPORT_LEAGUE_MAP[sportKey];
  if (!leagueIds) return []; // sport not covered by API-Football

  // Collect dates to check.
  // When ALL events have a known commenceDate we only search those exact dates
  // (avoids matching a fixture from the wrong day, which reduces mis-association
  // risk between similarly-named teams).  When some events lack commenceDate we
  // fall back to the standard ±2-day window for backward compatibility.
  const now = new Date();
  const knownDates = openEvents.map(ev => ev.commenceDate?.slice(0, 10)).filter(Boolean) as string[];
  const allKnown   = knownDates.length === openEvents.length;

  const datesToCheck = new Set<string>(allKnown ? knownDates : [
    dateStr(now),
    dateStr(new Date(now.getTime() - 86_400_000)),       // yesterday
    dateStr(new Date(now.getTime() - 2 * 86_400_000)),   // 2 days ago
    ...knownDates,
  ]);

  // Fetch (cached) fixtures for each date
  const allFixtures: ApiFootballFixture[] = [];
  for (const date of datesToCheck) {
    const fixtures = await fetchFixturesForDate(date);
    allFixtures.push(...fixtures);
  }

  // Keep only fixtures from the relevant leagues
  const validLeagues = new Set(leagueIds);
  const sportFixtures = allFixtures.filter(f => validLeagues.has(f.league.id));

  // Match each open event to a completed fixture
  const results: CompletedEvent[] = [];

  for (const ev of openEvents) {
    const matched = sportFixtures.find(f =>
      teamsMatch(f.teams.home.name, ev.homeTeam) &&
      teamsMatch(f.teams.away.name, ev.awayTeam),
    );

    if (!matched) continue;
    if (matched.goals.home === null || matched.goals.away === null) continue;

    results.push({
      id:         ev.id,          // keep the Odds API event ID as primary key
      sport_key:  sportKey,
      home_team:  ev.homeTeam,    // use original names so score mapping works
      away_team:  ev.awayTeam,
      completed:  true,
      scores: [
        { name: ev.homeTeam, score: String(matched.goals.home) },
        { name: ev.awayTeam, score: String(matched.goals.away) },
      ],
    });

    logger.info(
      { eventId: ev.id, apiFootballId: matched.fixture.id, league: matched.league.name,
        home: ev.homeTeam, away: ev.awayTeam,
        score: `${matched.goals.home}-${matched.goals.away}` },
      "API-Football: matched event result",
    );
  }

  return results;
}

/** Check whether a sport key is covered by API-Football */
export function isApiFootballSport(sportKey: string): boolean {
  return sportKey in SPORT_LEAGUE_MAP;
}
