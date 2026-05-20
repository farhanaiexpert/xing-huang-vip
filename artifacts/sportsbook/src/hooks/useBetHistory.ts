import {
  createContext, useContext, useState, useCallback,
  ReactNode, createElement,
} from 'react';
import { Selection } from '../types';

export interface PlacedBet {
  betId:           string;
  betType:         'single' | 'acca';
  selections:      Selection[];
  stake:           number;
  totalOdds:       number;
  estimatedPayout: number;
  placedAt:        Date;
}

interface BetHistoryState {
  bets:   PlacedBet[];
  addBet: (bet: PlacedBet) => void;
}

const BetHistoryContext = createContext<BetHistoryState | null>(null);

const STORAGE_KEY = 'gobet_bet_history_v2';

function loadBets(): PlacedBet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<PlacedBet & { placedAt: string }>;
    return parsed.map(b => ({ ...b, placedAt: new Date(b.placedAt) }));
  } catch {
    return [];
  }
}

export function BetHistoryProvider({ children }: { children: ReactNode }) {
  const [bets, setBets] = useState<PlacedBet[]>(loadBets);

  const addBet = useCallback((bet: PlacedBet) => {
    setBets(prev => {
      const next = [bet, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return createElement(BetHistoryContext.Provider, { value: { bets, addBet }, children });
}

export function useBetHistory(): BetHistoryState {
  const ctx = useContext(BetHistoryContext);
  if (!ctx) throw new Error('useBetHistory must be used within a BetHistoryProvider');
  return ctx;
}
