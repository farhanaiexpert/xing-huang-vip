/**
 * World Cup 2026 — dedicated near-real-time data layer.
 *
 * ISOLATED from the shared odds pipeline (useOddsApi / fetchAllOdds). This file
 * talks ONLY to the WC-scoped server endpoint `/api/odds/worldcup`, which the
 * server refreshes on a short (2-min) window and augments with live scores.
 *
 * Why a separate path: the shared normalizer (normalizeOdds) hard-filters out
 * any started match and always sets isLive=false, so the WC section could never
 * show in-play matches or scores. Here we KEEP live fixtures, attach scores, and
 * drop only genuinely finished/stale ones — without affecting any other sport.
 *
 * Match ids are kept as `api_${event.id}` so bet settlement and the shared
 * /match/:id detail page continue to resolve WC selections correctly.
 */
import { API_BASE } from './apiBase';
import type { Match } from '../types';
import type { OddsApiEvent } from './oddsApi';

const WC_SPORT_KEY = 'soccer_fifa_world_cup';
/** A soccer match is plausibly in-play for ~3.5h after kickoff; older => finished. */
const INPLAY_WINDOW_MS = 3.5 * 60 * 60 * 1000;

// ─── Server response shapes ───────────────────────────────────────────────────

interface WcScoreEntry {
  id?:         string;
  completed?:  boolean;
  home_team?:  string;
  away_team?:  string;
  scores?:     { name: string; score: string }[] | null;
}

interface WcResponse {
  events:    OddsApiEvent[];
  scores:    WcScoreEntry[];
  updatedAt: string;
  stale:     boolean;
  disabled?: boolean;
}

export interface WorldCupData {
  matches:   Match[];
  updatedAt: number;
  stale:     boolean;
}

// ─── Odds helpers (best price across bookmakers) ──────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bestOddsForMarket(event: OddsApiEvent, marketKey: string, outcomeName: string): number | undefined {
  let best: number | undefined;
  for (const bm of event.bookmakers) {
    const mkt = bm.markets.find(m => m.key === marketKey);
    if (!mkt) continue;
    const outcome = mkt.outcomes.find(o => o.name === outcomeName);
    if (outcome && (!best || outcome.price > best)) best = outcome.price;
  }
  return best ? round2(best) : undefined;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateBoundaries() {
  const now      = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  return { todayEnd, tomEnd };
}

function toDateTag(d: Date): 'today' | 'tomorrow' | 'upcoming' {
  const { todayEnd, tomEnd } = dateBoundaries();
  if (d < todayEnd) return 'today';
  if (d < tomEnd)   return 'tomorrow';
  return 'upcoming';
}

function toDisplayDate(d: Date): string {
  const { todayEnd, tomEnd } = dateBoundaries();
  const hhmm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d < todayEnd) return `Today, ${hhmm}`;
  if (d < tomEnd)   return `Tomorrow, ${hhmm}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${hhmm}`;
}

// ─── Score lookup ─────────────────────────────────────────────────────────────

interface LiveScore { home: number; away: number; completed: boolean }

function buildScoreIndex(scores: WcScoreEntry[]): Map<string, LiveScore> {
  const byId = new Map<string, LiveScore>();
  for (const s of scores) {
    if (!s.id || !Array.isArray(s.scores)) continue;
    const home = s.scores.find(x => x.name === s.home_team);
    const away = s.scores.find(x => x.name === s.away_team);
    const h = home ? parseInt(home.score, 10) : NaN;
    const a = away ? parseInt(away.score, 10) : NaN;
    if (Number.isNaN(h) || Number.isNaN(a)) continue;
    byId.set(s.id, { home: h, away: a, completed: !!s.completed });
  }
  return byId;
}

// ─── Normalizer — KEEPS live matches, drops finished/stale ────────────────────

export function normalizeWorldCup(events: OddsApiEvent[], scores: WcScoreEntry[]): Match[] {
  const now       = Date.now();
  const scoreById = buildScoreIndex(scores);
  const out: Match[] = [];

  for (const event of events) {
    if (!Array.isArray(event.bookmakers) || event.bookmakers.length === 0) continue;

    const home = bestOddsForMarket(event, 'h2h', event.home_team);
    const away = bestOddsForMarket(event, 'h2h', event.away_team);
    const draw = bestOddsForMarket(event, 'h2h', 'Draw');
    if (!home || !away) continue;

    const commence  = new Date(event.commence_time);
    const startedMs  = now - commence.getTime();
    const live       = scoreById.get(event.id);

    // Drop finished matches and anything stale (started long ago, no live score).
    if (live?.completed) continue;
    if (startedMs > 0 && !live && startedMs > INPLAY_WINDOW_MS) continue;

    const isLive = startedMs > 0 && !live?.completed && (!!live || startedMs <= INPLAY_WINDOW_MS);

    const ouOver25  = bestOddsForMarket(event, 'totals', 'Over');
    const ouUnder25 = bestOddsForMarket(event, 'totals', 'Under');
    const bttsYes   = bestOddsForMarket(event, 'btts', 'Yes');
    const bttsNo    = bestOddsForMarket(event, 'btts', 'No');

    const match: Match = {
      id:          `api_${event.id}`,
      team1:       event.home_team,
      team2:       event.away_team,
      date:        toDisplayDate(commence),
      dateTag:     toDateTag(commence),
      leagueId:    `api_${WC_SPORT_KEY}`,
      sportId:     'sp_soccer',
      sportKey:    WC_SPORT_KEY,
      isLive,
      marketCount: 20,
      kickoffTime: toDisplayDate(commence),
      commenceIso: event.commence_time,
      odds:        { home, draw, away },
      ...(live ? { score: { home: live.home, away: live.away } } : {}),
      ...(ouOver25  !== undefined ? { ouOver25 }  : {}),
      ...(ouUnder25 !== undefined ? { ouUnder25 } : {}),
      ...(bttsYes   !== undefined ? { bttsYes }   : {}),
      ...(bttsNo    !== undefined ? { bttsNo }    : {}),
    };
    out.push(match);
  }

  return out;
}

// ─── "Last updated" label ─────────────────────────────────────────────────────

export function getLastUpdatedLabelWc(fetchedAt: Date | null): string {
  if (!fetchedAt) return '';
  const diffSec = Math.floor((Date.now() - fetchedAt.getTime()) / 1000);
  if (diffSec < 20)  return 'Live · just updated';
  if (diffSec < 60)  return 'Updated moments ago';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `Updated ${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `Updated ${diffHour}h ago`;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchWorldCupMatches(): Promise<WorldCupData> {
  const res = await fetch(`${API_BASE}/api/odds/worldcup`);
  if (res.status === 503) throw new Error('Odds API not configured on server');
  if (!res.ok) throw new Error(`World Cup odds HTTP ${res.status}`);

  const json = (await res.json()) as WcResponse;
  const matches = normalizeWorldCup(json.events ?? [], json.scores ?? []);
  return {
    matches,
    updatedAt: json.updatedAt ? new Date(json.updatedAt).getTime() : Date.now(),
    stale:     !!json.stale,
  };
}
