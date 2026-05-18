import { createContext, useContext, useEffect, useState, createElement, ReactNode } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────

interface OddsSimCtx {
  tick: number;
  suspendedMarketIds: Set<string>;
}

const Ctx = createContext<OddsSimCtx>({ tick: 0, suspendedMarketIds: new Set() });

// Live market IDs eligible for temporary suspension (primary markets of live matches)
const SUSPENDABLE = [
  'mkt_m1_mr', 'mkt_m4_mr', 'mkt_sa1_mr', 'mkt_m13_mw',
  'mkt_cr1_mw', 'mkt_m10_mw', 'mkt_lf1_mr', 'mkt_bl3_mr',
];

export function OddsSimulationProvider({ children }: { children: ReactNode }) {
  const [tick, setTick]                   = useState(0);
  const [suspendedMarketIds, setSuspended] = useState<Set<string>>(new Set());

  // Tick every 5 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Every 10 ticks (~50 s) briefly suspend one live market for 8 s
  useEffect(() => {
    if (tick === 0 || tick % 10 !== 0) return;
    const idx = Math.floor(tick / 10) % SUSPENDABLE.length;
    const mkt  = SUSPENDABLE[idx];
    setSuspended(new Set([mkt]));
    const t = setTimeout(() => setSuspended(new Set()), 8000);
    return () => clearTimeout(t);
  }, [tick]);

  return createElement(Ctx.Provider, { value: { tick, suspendedMarketIds } }, children);
}

export function useOddsSimulation(): OddsSimCtx {
  return useContext(Ctx);
}

// ── Pure helpers (no React) ───────────────────────────────────────────────────

function h(s: string): number {
  let v = 0;
  for (let i = 0; i < s.length; i++) v = (v * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return v;
}

/** Deterministic movement for a selectionId at a given tick (only for live markets). */
export function getMovement(selectionId: string, tick: number): 'up' | 'down' | 'stable' {
  const n = h(selectionId + String(tick));
  if (n % 13 === 0) return 'up';
  if (n % 13 === 1) return 'down';
  return 'stable';
}

/** ±0.05 or 0 */
export function getOddsDelta(selectionId: string, tick: number): number {
  const m = getMovement(selectionId, tick);
  return m === 'up' ? 0.05 : m === 'down' ? -0.05 : 0;
}
