/**
 * NORMALIZATION — The Odds API events → our internal League / Match types
 */
import type { League, Match } from '../types';
import type { OddsApiEvent, OddsApiSportConfig } from './oddsApi';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDateBoundaries() {
  const now       = new Date();
  const todayEnd  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomEnd    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  return { now, todayEnd, tomEnd };
}

function toDateTag(d: Date): 'today' | 'tomorrow' | 'upcoming' {
  const { todayEnd, tomEnd } = getDateBoundaries();
  if (d < todayEnd) return 'today';
  if (d < tomEnd)   return 'tomorrow';
  return 'upcoming';
}

function toDisplayDate(d: Date): string {
  const { todayEnd, tomEnd } = getDateBoundaries();
  const hhmm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d < todayEnd) return `Today, ${hhmm}`;
  if (d < tomEnd)   return `Tomorrow, ${hhmm}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${hhmm}`;
}

// ─── Odds helpers ─────────────────────────────────────────────────────────────

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pick best (highest) odds across all bookmakers for a given outcome name.
 * Falls back to first bookmaker if none have the expected name.
 */
function bestOdds(
  event:       OddsApiEvent,
  outcomeName: string,
): number | undefined {
  let best: number | undefined;
  for (const bm of event.bookmakers) {
    const h2h = bm.markets.find(m => m.key === 'h2h');
    if (!h2h) continue;
    const outcome = h2h.outcomes.find(o => o.name === outcomeName);
    if (outcome && (!best || outcome.price > best)) {
      best = outcome.price;
    }
  }
  return best ? round2(best) : undefined;
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

export function normalizeEvents(
  events:  OddsApiEvent[],
  config:  OddsApiSportConfig,
): Match[] {
  const now = new Date();

  return events
    .filter(e => {
      const start = new Date(e.commence_time);
      return start > now && e.bookmakers.length > 0;
    })
    .slice(0, 10)
    .map(event => {
      const home = bestOdds(event, event.home_team);
      const away = bestOdds(event, event.away_team);
      const draw = config.hasDraw ? bestOdds(event, 'Draw') : undefined;

      if (!home || !away) return null;

      const commence = new Date(event.commence_time);

      return {
        id:          `api_${event.id}`,
        team1:       event.home_team,
        team2:       event.away_team,
        date:        toDisplayDate(commence),
        dateTag:     toDateTag(commence),
        leagueId:    `api_${config.key}`,
        sportId:     config.sportId,
        isLive:      false as boolean,
        marketCount: 20,
        commenceIso: event.commence_time,
        odds: {
          home,
          draw,
          away,
        },
      } as Match;
    })
    .filter((m): m is Match => m !== null);
}

/** Build a League from a batch of normalised matches */
export function buildLeague(
  matches: Match[],
  config:  OddsApiSportConfig,
): League {
  return {
    id:          `api_${config.key}`,
    name:        config.leagueName,
    sportId:     config.sportId,
    countryCode: config.countryCode,
    matches,
  };
}
