/**
 * useLiveOdds — polls two sources every 30 s and merges results:
 *   1. /api/live/events + /api/live/scores  — Odds API in-play events
 *   2. /api/betsapi/live                    — BetsAPI inplay (128+ events, real scores)
 *
 * BetsAPI events are preferred for score accuracy; Odds API for markets breadth.
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchBetsApiLive, type BetsApiEvent } from '../lib/betsApi';

// ─── Raw Odds API response shapes ─────────────────────────────────────────────

interface RawOutcome   { name: string; price: number; }
interface RawMarket    { key: string; outcomes: RawOutcome[]; }
interface RawBookmaker { key: string; markets: RawMarket[]; }

interface LiveEventRaw {
  id:            string;
  sport_key:     string;
  sport_title:   string;
  home_team:     string;
  away_team:     string;
  commence_time: string;
  bookmakers:    RawBookmaker[];
}

interface LiveScoreRaw {
  id:          string;
  sport_key:   string;
  home_team:   string;
  away_team:   string;
  scores:      { name: string; score: string }[] | null;
  last_update: string;
  completed:   boolean;
}

interface LiveEventsResponse { events: LiveEventRaw[]; count: number; }
interface LiveScoresResponse { scores: LiveScoreRaw[]; count: number; }

// ─── Exported normalised match type ───────────────────────────────────────────

export interface NormalizedLiveMatch {
  id:        string;
  sport:     string;
  /** Full sport key, e.g. "basketball_nba" or "betsapi_1" */
  sportKey:  string;
  icon:      string;
  league:    string;
  stage:     string;
  homeTeam:  string;
  awayTeam:  string;
  homeScore: number | string;
  awayScore: number | string;
  liveLabel: string;
  volume:    string;
  bettors:   number;
  isHot:     boolean;
  accent:    string;
  outcomes: {
    key:      string;
    label:    string;
    name:     string;
    baseOdds: number;
    color:    string;
    glow:     string;
  }[];
  ouOver25?:  number;
  ouUnder25?: number;
  bttsYes?:   number;
  bttsNo?:    number;
  /** BetsAPI real game clock — minutes elapsed (e.g. 37 for 37') */
  timerMin?:  number;
  /** BetsAPI real game clock — seconds within the current minute */
  timerSec?:  number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seededInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return min + (Math.abs(h) % (max - min));
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

function formatLeagueName(sportKey: string): string {
  return sportKey
    .replace(/^soccer_/,            '')
    .replace(/^basketball_/,        '')
    .replace(/^americanfootball_/,  '')
    .replace(/^tennis_/,            '')
    .replace(/^cricket_/,           '')
    .replace(/^baseball_/,          '')
    .replace(/^mma_/,               'MMA — ')
    .replace(/^aussierules_/,       '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bEpl\b/,   'EPL')
    .replace(/\bNba\b/,   'NBA')
    .replace(/\bNfl\b/,   'NFL')
    .replace(/\bAtp\b/,   'ATP')
    .replace(/\bWta\b/,   'WTA')
    .replace(/\bIpl\b/,   'IPL')
    .replace(/\bMlb\b/,   'MLB')
    .replace(/\bMma\b/,   'MMA')
    .replace(/\bUcl\b/,   'UCL');
}

function getSportMeta(sportKey: string): { icon: string; accent: string; hasDraw: boolean } {
  if (sportKey.startsWith('soccer_'))            return { icon: '⚽', accent: '#EF4444', hasDraw: true  };
  if (sportKey.startsWith('basketball_'))        return { icon: '🏀', accent: '#A855F7', hasDraw: false };
  if (sportKey.startsWith('tennis_'))            return { icon: '🎾', accent: '#00DFA9', hasDraw: false };
  if (sportKey.startsWith('americanfootball_'))  return { icon: '🏈', accent: '#F97316', hasDraw: false };
  if (sportKey.startsWith('cricket_'))           return { icon: '🏏', accent: '#22C55E', hasDraw: false };
  if (sportKey.startsWith('baseball_'))          return { icon: '⚾', accent: '#38BDF8', hasDraw: false };
  if (sportKey.startsWith('mma_'))               return { icon: '🥊', accent: '#EF4444', hasDraw: false };
  if (sportKey.startsWith('aussierules_'))       return { icon: '🏉', accent: '#F59E0B', hasDraw: false };
  if (sportKey.startsWith('rugbyleague_'))       return { icon: '🏉', accent: '#A78BFA', hasDraw: false };
  if (sportKey.startsWith('rugbyunion_'))        return { icon: '🏉', accent: '#7C3AED', hasDraw: false };
  if (sportKey.startsWith('icehockey_'))         return { icon: '🏒', accent: '#38BDF8', hasDraw: false };
  if (sportKey.startsWith('snooker_'))           return { icon: '🎱', accent: '#22C55E', hasDraw: false };
  if (sportKey.startsWith('darts_'))             return { icon: '🎯', accent: '#38BDF8', hasDraw: false };
  return { icon: '🏆', accent: '#94A3B8', hasDraw: false };
}

function computeLiveLabel(sportKey: string, commenceTime: string): string {
  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(commenceTime).getTime()) / 60_000));

  if (sportKey.startsWith('soccer_')) {
    if (elapsedMin <= 45) return `${Math.min(elapsedMin, 45)}'`;
    if (elapsedMin <= 60) return 'HT';
    return `${Math.min(elapsedMin - 15, 90)}'`;
  }
  if (sportKey.startsWith('basketball_'))       return `Q${Math.min(4, Math.floor(elapsedMin / 12) + 1)}`;
  if (sportKey.startsWith('americanfootball_')) return `Q${Math.min(4, Math.floor(elapsedMin / 15) + 1)}`;
  if (sportKey.startsWith('cricket_'))          return `${elapsedMin}min`;
  return 'LIVE';
}

function computeStage(sportKey: string, commenceTime: string): string {
  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(commenceTime).getTime()) / 60_000));

  if (sportKey.startsWith('soccer_')) {
    if (elapsedMin <= 45) return `First Half · ${Math.min(elapsedMin, 45)}'`;
    if (elapsedMin <= 60) return 'Half Time';
    return `Second Half · ${Math.min(elapsedMin - 15, 90)}'`;
  }
  if (sportKey.startsWith('basketball_')) {
    const q = Math.min(4, Math.floor(elapsedMin / 12) + 1);
    return `Quarter ${q} · In Progress`;
  }
  if (sportKey.startsWith('americanfootball_')) {
    const q = Math.min(4, Math.floor(elapsedMin / 15) + 1);
    return `Q${q} · In Progress`;
  }
  if (sportKey.startsWith('cricket_')) return `In Progress · ${elapsedMin} min`;
  return 'In Progress';
}

function bestOddsForMarket(bookmakers: RawBookmaker[], marketKey: string, outcomeName: string): number | undefined {
  let best: number | undefined;
  for (const bm of bookmakers) {
    const mkt = bm.markets.find(m => m.key === marketKey);
    if (!mkt) continue;
    const outcome = mkt.outcomes.find(o => o.name === outcomeName);
    if (outcome && (!best || outcome.price > best)) best = outcome.price;
  }
  return best ? Math.round(best * 100) / 100 : undefined;
}

function bestOdds(bookmakers: RawBookmaker[], outcomeName: string): number | undefined {
  return bestOddsForMarket(bookmakers, 'h2h', outcomeName);
}

// ─── Odds API event normaliser ────────────────────────────────────────────────

function normalizeOddsApiEvent(
  event:    LiveEventRaw,
  scoreMap: Map<string, LiveScoreRaw>,
): NormalizedLiveMatch | null {
  const homeOdds = bestOdds(event.bookmakers, event.home_team);
  const awayOdds = bestOdds(event.bookmakers, event.away_team);
  if (!homeOdds || !awayOdds) return null;

  const { icon, accent, hasDraw } = getSportMeta(event.sport_key);
  const drawOdds = hasDraw ? bestOdds(event.bookmakers, 'Draw') : undefined;

  const score     = scoreMap.get(event.id);
  const rawHome   = score?.scores?.find(s => s.name === event.home_team)?.score ?? null;
  const rawAway   = score?.scores?.find(s => s.name === event.away_team)?.score ?? null;
  const homeScore = rawHome !== null ? (isNaN(Number(rawHome)) ? rawHome : Number(rawHome)) : '-';
  const awayScore = rawAway !== null ? (isNaN(Number(rawAway)) ? rawAway : Number(rawAway)) : '-';

  const closeGame =
    typeof homeScore === 'number' &&
    typeof awayScore === 'number' &&
    Math.abs(homeScore - awayScore) <= 1;

  const outcomes = [
    { key: 'home', label: '1', name: event.home_team, baseOdds: homeOdds, color: '#00DFA9', glow: 'rgba(0,223,169,0.25)' },
    ...(hasDraw && drawOdds
      ? [{ key: 'draw', label: 'X', name: 'Draw', baseOdds: drawOdds, color: '#FACC15', glow: 'rgba(250,204,21,0.25)' }]
      : []),
    { key: 'away', label: '2', name: event.away_team, baseOdds: awayOdds, color: '#38BDF8', glow: 'rgba(56,189,248,0.25)' },
  ];

  const isSoccer  = event.sport_key.startsWith('soccer_');
  const ouOver25  = isSoccer ? bestOddsForMarket(event.bookmakers, 'totals', 'Over')  : undefined;
  const ouUnder25 = isSoccer ? bestOddsForMarket(event.bookmakers, 'totals', 'Under') : undefined;
  const bttsYes   = isSoccer ? bestOddsForMarket(event.bookmakers, 'btts',   'Yes')   : undefined;
  const bttsNo    = isSoccer ? bestOddsForMarket(event.bookmakers, 'btts',   'No')    : undefined;

  return {
    id:        `api_live_${event.id}`,
    sport:     event.sport_key.split('_')[0],
    sportKey:  event.sport_key,
    icon,
    league:    formatLeagueName(event.sport_key),
    stage:     computeStage(event.sport_key, event.commence_time),
    homeTeam:  event.home_team,
    awayTeam:  event.away_team,
    homeScore,
    awayScore,
    liveLabel: computeLiveLabel(event.sport_key, event.commence_time),
    volume:    formatVolume(seededInt(event.id, 200_000, 3_000_000)),
    bettors:   seededInt(event.id + 'b', 2_000, 14_000),
    isHot:     closeGame,
    accent,
    outcomes,
    ...(ouOver25  !== undefined && { ouOver25  }),
    ...(ouUnder25 !== undefined && { ouUnder25 }),
    ...(bttsYes   !== undefined && { bttsYes   }),
    ...(bttsNo    !== undefined && { bttsNo    }),
  };
}

// ─── BetsAPI sport_id → sport string mapping ─────────────────────────────────

const BETSAPI_SPORT_STRING: Record<string, string> = {
  '1':  'soccer',  '3':  'cricket',       '8':  'rugbyunion',     '9':  'boxing',
  '12': 'americanfootball',               '13': 'baseball',       '14': 'icehockey',
  '16': 'basketball',                     '17': 'tennis',         '18': 'golf',
  '19': 'handball',                       '36': 'aussierules',    '78': 'rugbyleague',
  '91': 'volleyball',                     '92': 'tabletennis',    '94': 'snooker',
  '161':'mma',
  '95': 'darts',
};

function getBetsApiSportMeta(sportId: string): { icon: string; accent: string; hasDraw: boolean } {
  const sport = BETSAPI_SPORT_STRING[sportId] ?? '';
  if (sport === 'soccer')              return { icon: '⚽', accent: '#EF4444', hasDraw: true  };
  if (sport === 'basketball')          return { icon: '🏀', accent: '#A855F7', hasDraw: false };
  if (sport === 'tennis')              return { icon: '🎾', accent: '#00DFA9', hasDraw: false };
  if (sport === 'americanfootball')    return { icon: '🏈', accent: '#F97316', hasDraw: false };
  if (sport === 'cricket')             return { icon: '🏏', accent: '#22C55E', hasDraw: false };
  if (sport === 'baseball')            return { icon: '⚾', accent: '#38BDF8', hasDraw: false };
  if (sport === 'rugbyunion')          return { icon: '🏉', accent: '#7C3AED', hasDraw: false };
  if (sport === 'rugbyleague')         return { icon: '🏉', accent: '#A78BFA', hasDraw: false };
  if (sport === 'icehockey')           return { icon: '🏒', accent: '#38BDF8', hasDraw: false };
  if (sport === 'golf')                return { icon: '⛳', accent: '#22C55E', hasDraw: false };
  if (sport === 'handball')            return { icon: '🤾', accent: '#F97316', hasDraw: false };
  if (sport === 'aussierules')         return { icon: '🏉', accent: '#F59E0B', hasDraw: false };
  if (sport === 'volleyball')          return { icon: '🏐', accent: '#38BDF8', hasDraw: false };
  if (sport === 'boxing')              return { icon: '🥊', accent: '#EF4444', hasDraw: false };
  if (sport === 'mma')                 return { icon: '🥋', accent: '#EF4444', hasDraw: false };
  if (sport === 'tabletennis')         return { icon: '🏓', accent: '#00DFA9', hasDraw: false };
  if (sport === 'snooker')             return { icon: '🎱', accent: '#22C55E', hasDraw: false };
  if (sport === 'darts')               return { icon: '🎯', accent: '#38BDF8', hasDraw: false };
  return { icon: '🏆', accent: '#94A3B8', hasDraw: false };
}

function getBetsApiStageLiveLabel(ev: BetsApiEvent): { stage: string; liveLabel: string } {
  const sportId = ev.sport_id;
  const tm      = ev.timer?.tm;
  const elMin   = tm ? parseInt(tm, 10) : 0;

  if (sportId === '1') {
    // Soccer
    if (elMin <= 45) return { stage: `First Half · ${elMin}'`, liveLabel: `${elMin}'` };
    if (elMin <= 60) return { stage: 'Half Time', liveLabel: 'HT' };
    return { stage: `Second Half · ${elMin}'`, liveLabel: `${elMin}'` };
  }
  if (sportId === '16') {
    const q = Math.min(4, Math.floor(elMin / 12) + 1);
    return { stage: `Q${q} · In Progress`, liveLabel: `Q${q}` };
  }
  if (sportId === '3') {
    return { stage: `In Progress · ${elMin} min`, liveLabel: `${elMin}m` };
  }
  return { stage: 'In Progress', liveLabel: 'LIVE' };
}

/** Normalise a BetsAPI inplay event into a NormalizedLiveMatch */
function normalizeBetsApiLiveEvent(ev: BetsApiEvent): NormalizedLiveMatch | null {
  if (!ev.home?.name || !ev.away?.name) return null;

  const { icon, accent, hasDraw } = getBetsApiSportMeta(ev.sport_id);
  const { stage, liveLabel }       = getBetsApiStageLiveLabel(ev);

  // Parse score from ss field "H-A"
  let homeScore: number | string = '-';
  let awayScore: number | string = '-';
  if (ev.ss) {
    const parts = ev.ss.split('-');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const a = parseInt(parts[1], 10);
      if (!isNaN(h)) homeScore = h;
      if (!isNaN(a)) awayScore = a;
    }
  }

  const closeGame =
    typeof homeScore === 'number' &&
    typeof awayScore === 'number' &&
    Math.abs(homeScore - awayScore) <= 1;

  // Fallback odds per sport
  const metaOdds: Record<string, { home: number; draw?: number; away: number }> = {
    '1':  { home: 1.90, draw: 3.40, away: 2.10 },
    '3':  { home: 1.85, away: 1.90 },
    '8':  { home: 1.80, away: 1.95 },
    '12': { home: 1.85, away: 1.90 },
    '13': { home: 1.85, away: 1.90 },
    '14': { home: 1.90, away: 1.85 },
    '16': { home: 1.85, away: 1.90 },
    '17': { home: 1.75, away: 2.00 },
    '18': { home: 3.50, away: 4.00 },
    '19': { home: 1.80, away: 1.95 },
    '92': { home: 1.75, away: 2.00 },
    '94': { home: 1.75, away: 2.00 },
    '95': { home: 1.75, away: 2.00 },
  };
  const odds = metaOdds[ev.sport_id] ?? { home: 1.85, away: 1.90 };

  const outcomes = [
    { key: 'home', label: '1', name: ev.home.name, baseOdds: odds.home, color: '#00DFA9', glow: 'rgba(0,223,169,0.25)' },
    ...(hasDraw && odds.draw
      ? [{ key: 'draw', label: 'X', name: 'Draw', baseOdds: odds.draw, color: '#FACC15', glow: 'rgba(250,204,21,0.25)' }]
      : []),
    { key: 'away', label: '2', name: ev.away.name, baseOdds: odds.away, color: '#38BDF8', glow: 'rgba(56,189,248,0.25)' },
  ];

  const sport    = BETSAPI_SPORT_STRING[ev.sport_id] ?? 'sport';
  const sportKey = `betsapi_${ev.sport_id}`;

  const timerMin = ev.timer?.tm ? parseInt(ev.timer.tm, 10) : undefined;
  const timerSec = ev.timer?.ts ? parseInt(ev.timer.ts, 10) : undefined;

  return {
    id:        `betsapi_live_${ev.id}`,
    sport,
    sportKey,
    icon,
    league:    ev.league?.name ?? sport,
    stage,
    homeTeam:  ev.home.name,
    awayTeam:  ev.away.name,
    homeScore,
    awayScore,
    liveLabel,
    volume:    formatVolume(seededInt(ev.id, 200_000, 3_000_000)),
    bettors:   seededInt(ev.id + 'b', 2_000, 14_000),
    isHot:     closeGame,
    accent,
    outcomes,
    ...(timerMin !== undefined && !isNaN(timerMin) && { timerMin }),
    ...(timerSec !== undefined && !isNaN(timerSec) && { timerSec }),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const POLL_MS = 15 * 1000; // 15 seconds — fast enough for real-time score updates

export interface UseLiveOddsResult {
  matches:     NormalizedLiveMatch[];
  loading:     boolean;
  error:       string | null;
  isRealData:  boolean;
  lastUpdated: Date | null;
}

export function useLiveOdds(): UseLiveOddsResult {
  const [matches,     setMatches]     = useState<NormalizedLiveMatch[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLiveData = useCallback(async () => {
    try {
      // Fetch from both sources in parallel
      const [eventsRes, scoresRes, betsApiLive] = await Promise.all([
        fetch('/api/live/events'),
        fetch('/api/live/scores'),
        fetchBetsApiLive().catch(() => [] as BetsApiEvent[]),
      ]);

      if (!eventsRes.ok) {
        throw new Error(`Live events fetch failed (HTTP ${eventsRes.status})`);
      }

      const eventsData = await eventsRes.json() as LiveEventsResponse;
      const scoresData = scoresRes.ok
        ? await scoresRes.json() as LiveScoresResponse
        : { scores: [] };

      const scoreMap = new Map<string, LiveScoreRaw>(
        (scoresData.scores ?? []).map(s => [s.id, s]),
      );

      // Normalise Odds API events
      const oddsApiMatches = (eventsData.events ?? [])
        .map(ev => normalizeOddsApiEvent(ev, scoreMap))
        .filter((m): m is NormalizedLiveMatch => m !== null);

      // Track Odds API team pairs to de-dupe BetsAPI events
      const oddsApiPairs = new Set(
        oddsApiMatches.map(m => `${m.homeTeam}|${m.awayTeam}`)
      );

      // Normalise BetsAPI events (de-duplicate vs Odds API)
      const betsApiMatches = betsApiLive
        .map(ev => normalizeBetsApiLiveEvent(ev))
        .filter((m): m is NormalizedLiveMatch => {
          if (!m) return false;
          return !oddsApiPairs.has(`${m.homeTeam}|${m.awayTeam}`);
        });

      // Merge: Odds API first (has real market odds), then BetsAPI extras
      const merged = [...oddsApiMatches, ...betsApiMatches].slice(0, 50);

      setMatches(merged);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live odds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveData();
    const timer = setInterval(() => { void fetchLiveData(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchLiveData]);

  return {
    matches,
    loading,
    error,
    isRealData:  matches.length > 0,
    lastUpdated,
  };
}
