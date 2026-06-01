/**
 * matchTime.ts — sport duration estimates + kickoff/end time formatting.
 *
 * The Odds API provides commence_time but no end time.
 * We estimate end time = start + typical sport duration.
 * Sports with highly variable durations (tennis, cricket, golf) are omitted.
 */

/** Typical match duration in minutes per normalised sport key. */
const DURATION_MINUTES: Record<string, number> = {
  soccer:             105,  // 90 min + ~15 min halftime
  basketball:         130,  // 48 min regulated + stoppages
  nba:                130,
  americanfootball:   210,  // NFL averages ~3.5 hours
  icehockey:          150,  // 60 min + stoppages + possible OT
  boxing:             120,
  mma:                 60,  // per-fight window
  baseball:           180,  // MLB averages ~3 hours
  handball:            90,
  volleyball:         120,
  rugbyunion:         110,  // 80 min + halftime
  rugbyleague:        110,
  aussierules:        120,  // 80 min quarters + breaks
  snooker:            120,
  darts:               60,
  tabletennis:         45,
  horseracing:         15,  // per race
  formula1:           120,
};

/** Normalise any sport identifier to a lookup key. Handles:
 *  - Odds API sportId format: "sp_soccer", "sp_horse_racing", "sp_nba"
 *  - LivePage sport string: "soccer", "basketball", "americanfootball"
 *  - BetsAPI sport string:  "tabletennis", "rugbyleague"
 */
function normalizeSport(id: string): string {
  return id.toLowerCase().replace(/^sp_/, '').replace(/_/g, '');
}

/** Return estimated duration in minutes for a sport, or null if unknown. */
export function sportDurationMinutes(sportId: string): number | null {
  return DURATION_MINUTES[normalizeSport(sportId)] ?? null;
}

/** Format an ISO timestamp as local HH:MM (24-hour). */
export function formatKickoffTime(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Return the estimated end time as local HH:MM, or null if sport duration unknown. */
export function estimatedEndTime(
  commenceIso: string | undefined,
  sportId: string,
): string | null {
  if (!commenceIso) return null;
  const duration = sportDurationMinutes(sportId);
  if (duration === null) return null;
  const start = new Date(commenceIso);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
}
