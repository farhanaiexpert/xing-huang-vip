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
 * Pick best (highest) odds across all bookmakers for a given market key and outcome name.
 */
function bestOddsForMarket(
  event:       OddsApiEvent,
  marketKey:   string,
  outcomeName: string,
): number | undefined {
  let best: number | undefined;
  for (const bm of event.bookmakers) {
    const mkt = bm.markets.find(m => m.key === marketKey);
    if (!mkt) continue;
    const outcome = mkt.outcomes.find(o => o.name === outcomeName);
    if (outcome && (!best || outcome.price > best)) best = outcome.price;
  }
  return best ? round2(best) : undefined;
}

/** Convenience wrapper — reads from h2h market only */
function bestOdds(
  event:       OddsApiEvent,
  outcomeName: string,
): number | undefined {
  return bestOddsForMarket(event, 'h2h', outcomeName);
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

      // Extract real totals / BTTS odds when present in the API response.
      // Soccer sports request these markets; non-soccer gets undefined here.
      const ouOver25  = bestOddsForMarket(event, 'totals', 'Over');
      const ouUnder25 = bestOddsForMarket(event, 'totals', 'Under');
      const bttsYes   = config.hasDraw ? bestOddsForMarket(event, 'btts', 'Yes') : undefined;
      const bttsNo    = config.hasDraw ? bestOddsForMarket(event, 'btts', 'No')  : undefined;

      const commence = new Date(event.commence_time);

      return {
        id:          `api_${event.id}`,
        team1:       event.home_team,
        team2:       event.away_team,
        date:        toDisplayDate(commence),
        dateTag:     toDateTag(commence),
        leagueId:    `api_${config.key}`,
        sportId:     config.sportId,
        sportKey:    config.key,
        isLive:      false as boolean,
        marketCount: 20,
        commenceIso: event.commence_time,
        odds: { home, draw, away },
        ...(ouOver25  !== undefined && { ouOver25  }),
        ...(ouUnder25 !== undefined && { ouUnder25 }),
        ...(bttsYes   !== undefined && { bttsYes   }),
        ...(bttsNo    !== undefined && { bttsNo    }),
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
    sportKey:    config.key,
    countryCode: config.countryCode,
    matches,
  };
}
