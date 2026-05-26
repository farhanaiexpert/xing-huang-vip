import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
  ReactNode, createElement,
} from 'react';
import { Selection } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { useToast } from './use-toast';

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
  bets:          PlacedBet[];
  isLoading:     boolean;
  openBetsCount: number;
  addBet:        (bet: PlacedBet) => void;
  refresh:       () => Promise<void>;
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

function isOpenStatus(s?: string) {
  return !s || s === 'open' || s === 'pending';
}

export function BetHistoryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [bets, setBets]         = useState<PlacedBet[]>([]);
  const [isLoading, setLoading] = useState(false);

  // Track previous bet statuses so we can detect settlements
  const prevStatusRef = useRef<Record<string, string | undefined>>({});

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setBets([]); return; }
    setLoading(true);
    try {
      const data = await api.get<ApiBet[]>('/bets');
      const mapped = data.map(mapApiBet);

      // Detect status changes → settlement toasts
      const prev = prevStatusRef.current;
      for (const bet of mapped) {
        const oldStatus = prev[bet.betId];
        const newStatus = bet.status ?? 'open';
        if (oldStatus && isOpenStatus(oldStatus) && !isOpenStatus(newStatus)) {
          const profit = bet.estimatedPayout - bet.stake;
          if (newStatus === 'won' || newStatus === 'settled') {
            toast({
              title: '🎉 Bet Won!',
              description: `${bet.betId} settled — you won ${profit.toFixed(2)} USDT`,
            });
          } else if (newStatus === 'lost') {
            toast({
              title: 'Bet Settled — Lost',
              description: `${bet.betId} — stake of ${bet.stake.toFixed(2)} USDT lost`,
              variant: 'destructive',
            });
          } else if (newStatus === 'void' || newStatus === 'voided') {
            toast({
              title: 'Bet Voided',
              description: `${bet.betId} — stake of ${bet.stake.toFixed(2)} USDT refunded`,
            });
          }
        }
      }

      // Update previous status map
      const newPrev: Record<string, string | undefined> = {};
      for (const bet of mapped) newPrev[bet.betId] = bet.status;
      prevStatusRef.current = newPrev;

      setBets(mapped);
    } catch {
      setBets([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derived boolean — true when there is at least one open/pending bet
  const hasOpenBets = bets.some(b => isOpenStatus(b.status));

  // Auto-poll every 30s while tab is visible AND there are open bets.
  // Effect re-runs whenever hasOpenBets flips, starting or stopping the interval.
  useEffect(() => {
    if (!isAuthenticated || !hasOpenBets) return;

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, hasOpenBets, refresh]);

  const addBet = useCallback((bet: PlacedBet) => {
    setBets(prev => [bet, ...prev]);
    // Register in prev status so next poll can detect changes
    prevStatusRef.current[bet.betId] = bet.status ?? 'open';
  }, []);

  const openBetsCount = bets.filter(b => isOpenStatus(b.status)).length;

  return createElement(BetHistoryContext.Provider, {
    value: { bets, isLoading, openBetsCount, addBet, refresh },
    children,
  });
}

export function useBetHistory(): BetHistoryState {
  const ctx = useContext(BetHistoryContext);
  if (!ctx) throw new Error('useBetHistory must be used within a BetHistoryProvider');
  return ctx;
}
