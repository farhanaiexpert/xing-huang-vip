/**
 * useLiveMatchScore — polls for live score updates for a single match.
 *
 * Data sources (parallel):
 *   1. /api/live/scores  — Odds API event ID lookup (most accurate match)
 *   2. /api/betsapi/live — BetsAPI matched by team name (real clock data)
 *
 * Behaviour:
 *   - Only active when isLive === true
 *   - Polls every 60 seconds
 *   - Ticks the game clock locally between polls (isSoccer only)
 *   - Fires homeFlash / awayFlash for 2 s when a score changes
 *   - Exposes nextRefreshIn countdown (60 → 0)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBetsApiLive, type BetsApiEvent } from '../lib/betsApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OddsApiScoreEntry {
  id:        string;
  home_team: string;
  away_team: string;
  scores:    { name: string; score: string }[] | null;
  completed: boolean;
}

interface OddsApiScoresResponse {
  scores: OddsApiScoreEntry[];
}

export interface LiveMatchScoreResult {
  /** Latest polled score. null = not yet received. */
  score: { home: number; away: number } | null;
  /** Game clock minutes from BetsAPI. null = not available. */
  clockMin: number | null;
  /** Game clock seconds within the current minute (locally ticked). */
  clockSec: number;
  /** True for 2 s after a home-team goal is detected. */
  homeFlash: boolean;
  /** True for 2 s after an away-team goal is detected. */
  awayFlash: boolean;
  lastUpdated: Date | null;
  /** Seconds until next API poll. Counts 60 → 0. */
  nextRefreshIn: number;
  /** True while a poll request is in-flight. */
  isPolling: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_MS = 60_000;

// ─── Helper: fuzzy team name match ───────────────────────────────────────────

function teamsMatch(a: string, b: string): boolean {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return al === bl || al.includes(bl) || bl.includes(al);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveMatchScore({
  matchId,
  homeTeam,
  awayTeam,
  isLive,
  isSoccer,
}: {
  matchId:  string;
  homeTeam: string;
  awayTeam: string;
  isLive:   boolean;
  isSoccer: boolean;
}): LiveMatchScoreResult {
  const [score,          setScore]          = useState<{ home: number; away: number } | null>(null);
  const [clockMin,       setClockMin]       = useState<number | null>(null);
  const [clockSec,       setClockSec]       = useState(0);
  const [homeFlash,      setHomeFlash]      = useState(false);
  const [awayFlash,      setAwayFlash]      = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [nextRefreshIn,  setNextRefreshIn]  = useState(POLL_MS / 1000);
  const [isPolling,      setIsPolling]      = useState(false);
  const [hasClock,       setHasClock]       = useState(false);

  const prevScoreRef = useRef<{ home: number; away: number } | null>(null);

  // ── Poll both data sources ─────────────────────────────────────────────────

  const poll = useCallback(async () => {
    if (!isLive) return;
    setIsPolling(true);
    try {
      const [scoresResult, betsApiResult] = await Promise.allSettled([
        fetch('/api/live/scores').then(r =>
          r.ok ? (r.json() as Promise<OddsApiScoresResponse>) : Promise.reject(r.status)
        ),
        fetchBetsApiLive(),
      ]);

      let newHome: number | null = null;
      let newAway: number | null = null;
      let newMin:  number | null = null;
      let newSec = 0;

      // 1. Odds API scores — match by event ID
      if (scoresResult.status === 'fulfilled') {
        const entry = scoresResult.value.scores?.find(s => s.id === matchId);
        if (entry?.scores) {
          const h = entry.scores.find(s => s.name === entry.home_team);
          const a = entry.scores.find(s => s.name === entry.away_team);
          if (h) { const v = parseInt(h.score, 10); if (!isNaN(v)) newHome = v; }
          if (a) { const v = parseInt(a.score, 10); if (!isNaN(v)) newAway = v; }
        }
      }

      // 2. BetsAPI — match by team name; preferred for score accuracy + clock
      if (betsApiResult.status === 'fulfilled') {
        const ev = betsApiResult.value.find((e: BetsApiEvent) =>
          teamsMatch(e.home?.name ?? '', homeTeam) &&
          teamsMatch(e.away?.name ?? '', awayTeam)
        );
        if (ev?.ss) {
          const parts = ev.ss.split('-');
          if (parts.length >= 2) {
            const h = parseInt(parts[0], 10);
            const a = parseInt(parts[1], 10);
            if (!isNaN(h)) newHome = h;
            if (!isNaN(a)) newAway = a;
          }
        }
        if (ev?.timer?.tm) {
          const m = parseInt(ev.timer.tm, 10);
          const s = ev.timer.ts ? parseInt(ev.timer.ts, 10) : 0;
          if (!isNaN(m)) { newMin = m; newSec = isNaN(s) ? 0 : s; }
        }
      }

      // ── Update score with flash detection ──────────────────────────────────
      if (newHome !== null && newAway !== null) {
        const next = { home: newHome, away: newAway };
        if (prevScoreRef.current !== null) {
          if (next.home !== prevScoreRef.current.home) {
            setHomeFlash(true);
            setTimeout(() => setHomeFlash(false), 2000);
          }
          if (next.away !== prevScoreRef.current.away) {
            setAwayFlash(true);
            setTimeout(() => setAwayFlash(false), 2000);
          }
        }
        prevScoreRef.current = next;
        setScore(next);
      }

      // ── Update clock ───────────────────────────────────────────────────────
      if (newMin !== null) {
        setClockMin(newMin);
        setClockSec(newSec);
        setHasClock(true);
      }

      setLastUpdated(new Date());
    } catch {
      // Silently keep showing last known score
    } finally {
      setIsPolling(false);
      setNextRefreshIn(POLL_MS / 1000);
    }
  }, [matchId, homeTeam, awayTeam, isLive]);

  // ── Initial fetch + poll interval ─────────────────────────────────────────

  useEffect(() => {
    if (!isLive) return;
    void poll();
    const t = setInterval(() => { void poll(); }, POLL_MS);
    return () => clearInterval(t);
  }, [isLive, poll]);

  // ── Countdown to next refresh ──────────────────────────────────────────────

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setNextRefreshIn(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  // ── Local game-clock tick (soccer, 1 s interval) ───────────────────────────

  useEffect(() => {
    if (!isLive || !isSoccer || !hasClock) return;
    const t = setInterval(() => {
      setClockSec(s => {
        if (s >= 59) {
          setClockMin(m => (m !== null ? Math.min(m + 1, 120) : m));
          return 0;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isLive, isSoccer, hasClock]);

  return { score, clockMin, clockSec, homeFlash, awayFlash, lastUpdated, nextRefreshIn, isPolling };
}
