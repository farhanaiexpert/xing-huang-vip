import {
  createContext, useContext, useMemo,
  ReactNode, createElement,
} from 'react';
import { useGetUserBets, getGetUserBetsQueryKey } from '@workspace/api-client-react';
import type { BetResponse } from '@workspace/api-client-react';
import { useAuth } from './useAuth';
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
  bets:      PlacedBet[];
  isLoading: boolean;
}

const BetHistoryContext = createContext<BetHistoryState | null>(null);

function fromApiResponse(bet: BetResponse): PlacedBet {
  const rawSels = (bet.selections ?? []) as Record<string, unknown>[];
  const sels: Selection[] = rawSels.map(s => {
    const homeTeam = String(s.homeTeam ?? '');
    const awayTeam = String(s.awayTeam ?? '');
    const matchName = homeTeam && awayTeam
      ? `${homeTeam} vs ${awayTeam}`
      : String(s.matchId ?? '');
    return {
      id:            String(s.id ?? s.matchId ?? ''),
      marketId:      String(s.matchId ?? ''),
      matchId:       String(s.matchId ?? ''),
      matchName,
      leagueName:    String(s.sport ?? ''),
      marketName:    String(s.market ?? ''),
      selectionType: String(s.selection ?? ''),
      selectionName: String(s.selection ?? ''),
      odds:          parseFloat(String(s.odds ?? '0')),
    };
  });

  return {
    betId:           `#BET-${bet.id.slice(0, 8).toUpperCase()}`,
    betType:         sels.length > 1 ? 'acca' : 'single',
    selections:      sels,
    stake:           parseFloat(bet.stake),
    totalOdds:       parseFloat(bet.totalOdds),
    estimatedPayout: parseFloat(bet.potentialReturn),
    placedAt:        new Date(bet.createdAt),
  };
}

export function BetHistoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useGetUserBets({
    query: { enabled: isAuthenticated, queryKey: getGetUserBetsQueryKey() },
  });

  const bets = useMemo(
    () => (data?.bets ?? []).map(fromApiResponse),
    [data]
  );

  return createElement(BetHistoryContext.Provider, { value: { bets, isLoading } }, children);
}

export function useBetHistory(): BetHistoryState {
  const ctx = useContext(BetHistoryContext);
  if (!ctx) throw new Error('useBetHistory must be used within a BetHistoryProvider');
  return ctx;
}
