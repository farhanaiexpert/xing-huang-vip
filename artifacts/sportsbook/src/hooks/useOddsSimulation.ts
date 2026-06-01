/**
 * useOddsSimulation — stubbed out.
 * All odds are now real API data; simulation has been removed.
 * This file is kept so existing imports in OddsButton.tsx continue to compile.
 */
import { createContext, useContext, createElement, ReactNode } from 'react';

interface OddsSimCtx {
  tick: number;
  suspendedMarketIds: Set<string>;
}

const STABLE: OddsSimCtx = { tick: 0, suspendedMarketIds: new Set() };
const Ctx = createContext<OddsSimCtx>(STABLE);

export function OddsSimulationProvider({ children }: { children: ReactNode }) {
  return createElement(Ctx.Provider, { value: STABLE }, children);
}

export function useOddsSimulation(): OddsSimCtx {
  return useContext(Ctx);
}

export function getMovement(_selectionId: string, _tick: number): 'up' | 'down' | 'stable' {
  return 'stable';
}

export function getOddsDelta(_selectionId: string, _tick: number): number {
  return 0;
}
