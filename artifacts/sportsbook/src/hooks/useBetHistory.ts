import {
  createContext, useContext, useState, useCallback, useEffect,
  ReactNode, createElement,
} from 'react';
import { Selection } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

export interface PlacedBet {
  betId:           string;
  betType:         'single' | 'acca';
  selections:      Selection[];
  stake:           number;
  totalOdds:       number;
  estimatedPayout: number;
  placedAt:        Date;
  status?:         string;
}

interface ApiBetSelection {
  id: number;
  eventId: string;
  eventName: string;
  marketType: string;
  selection: string;
  odds: string;
  status: string;
  isLive?: boolean;
  scoreAtPlacement?: string | null;
}

interface ApiBet {
  id: number;
  type: string;
  stake: string;
  totalOdds: string;
  potentialReturn: string;
  status: string;
  createdAt: string;
  selections: ApiBetSelection[];
}

interface BetHistoryState {
  bets:     PlacedBet[];
  isLoading: boolean;
  addBet:   (bet: PlacedBet) => void;
  refresh:  () => Promise<void>;
}

const BetHistoryContext = createContext<BetHistoryState | null>(null);

function mapApiBet(b: ApiBet): PlacedBet {
  const betType: 'single' | 'acca' = b.type === 'accumulator' ? 'acca' : 'single';
  const selections: Selection[] = b.selections.map(s => ({
    id: String(s.id),
    marketId: `${s.eventId}_${s.marketType}`,
    matchId: s.eventId,
    matchName: s.eventName,
    leagueName: '',
    marketName: s.marketType,
    selectionType: s.selection,
    selectionName: s.selection,
    odds: parseFloat(s.odds),
    isLive: s.isLive ?? false,
    scoreAtPlacement: s.scoreAtPlacement ?? undefined,
  }));
  return {
    betId:           `#BET-${b.id}`,
    betType,
    selections,
    stake:           parseFloat(b.stake),
    totalOdds:       parseFloat(b.totalOdds),
    estimatedPayout: parseFloat(b.potentialReturn),
    placedAt:        new Date(b.createdAt),
    status:          b.status,
  };
}

export function BetHistoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [bets, setBets]         = useState<PlacedBet[]>([]);
  const [isLoading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setBets([]); return; }
    setLoading(true);
    try {
      const data = await api.get<ApiBet[]>('/bets');
      setBets(data.map(mapApiBet));
    } catch {
      setBets([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBet = useCallback((bet: PlacedBet) => {
    setBets(prev => [bet, ...prev]);
  }, []);

  return createElement(BetHistoryContext.Provider, { value: { bets, isLoading, addBet, refresh }, children });
}

export function useBetHistory(): BetHistoryState {
  const ctx = useContext(BetHistoryContext);
  if (!ctx) throw new Error('useBetHistory must be used within a BetHistoryProvider');
  return ctx;
}
