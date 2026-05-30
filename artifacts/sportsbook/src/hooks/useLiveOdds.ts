/**
 * useLiveOdds — polls /api/live/events and /api/live/scores every 30 s
 * and normalises raw Odds API in-play events into LiveMatch objects
 * ready for the Live betting page.
 */
import { useState, useEffect, useCallback } from 'react';

// ─── Raw API response shapes ───────────────────────────────────────────────────

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

function bestOdds(bookmakers: RawBookmaker[], outcomeName: string): number | undefined {
  let best: number | undefined;
  for (const bm of bookmakers) {
    const h2h = bm.markets.find(m => m.key === 'h2h');
    if (!h2h) continue;
    const outcome = h2h.outcomes.find(o => o.name === outcomeName);
    if (outcome && (!best || outcome.price > best)) best = outcome.price;
  }
  return best ? Math.round(best * 100) / 100 : undefined;
}

function normalizeEvent(
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
      ? [{ key: 'draw', label: 'X', name: 'Draw',            baseOdds: drawOdds, color: '#FACC15', glow: 'rgba(250,204,21,0.25)' }]
      : []),
    { key: 'away', label: '2', name: event.away_team, baseOdds: awayOdds, color: '#38BDF8', glow: 'rgba(56,189,248,0.25)' },
  ];

  return {
    id:        `api_live_${event.id}`,
    sport:     event.sport_key.split('_')[0],
    icon,
    league:    formatLeagueName(event.sport_key),
    stage:     computeStage(event.sport_key, event.commence_time),
    homeTeam:  event.home_team,
    awayTeam:  event.away_team,
    homeScore,
    awayScore,
    liveLabel: computeLiveLabel(event.sport_key, event.commence_time),
    volume:    formatVolume(seededInt(event.id,       200_000, 3_000_000)),
    bettors:   seededInt(event.id + 'b',  2_000, 14_000),
    isHot:     closeGame,
    accent,
    outcomes,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const POLL_MS = 30_000;

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
      const [eventsRes, scoresRes] = await Promise.all([
        fetch('/api/live/events'),
        fetch('/api/live/scores'),
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

      const normalized = (eventsData.events ?? [])
        .map(ev => normalizeEvent(ev, scoreMap))
        .filter((m): m is NormalizedLiveMatch => m !== null)
        .slice(0, 12); // cap at 12 cards

      setMatches(normalized);
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
