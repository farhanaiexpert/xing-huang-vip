import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';
import { Selection, BetType } from '../types';

interface BetSlipState {
  selections: Selection[];
  betType: BetType;
  setBetType: (type: BetType) => void;
  stake: string;
  setStake: (stake: string) => void;
  singleStakes: Record<string, string>;
  setSingleStake: (id: string, stake: string) => void;
  addSelection: (selection: Selection) => void;
  removeSelection: (id: string) => void;
  clearSlip: () => void;
  hasSelection: (id: string) => boolean;
  /** Combined odds (product) — for accumulator display */
  totalOdds: number;
  /** Estimated acca return */
  accaReturn: number;
  /** Sum of all single estimated returns */
  totalSingleReturn: number;
  /** Total staked across all singles */
  totalSingleStaked: number;
}

const BetSlipContext = createContext<BetSlipState | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections,    setSelections]    = useState<Selection[]>([]);
  const [betType,       setBetTypeState]  = useState<BetType>('acca');
  const [stake,         setStakeState]    = useState('');
  const [singleStakes,  setSingleStakesState] = useState<Record<string, string>>({});

  /**
   * Add a selection. If another selection from the same market (same marketId)
   * already exists, replace it — you can't back two outcomes from the same market.
   */
  const addSelection = useCallback((selection: Selection) => {
    setSelections(prev => {
      const withoutSameMarket = prev.filter(s => s.marketId !== selection.marketId);
      return [...withoutSameMarket, selection];
    });
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
    setSingleStakesState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setBetType = useCallback((type: BetType) => {
    setBetTypeState(type);
  }, []);

  const setStake = useCallback((s: string) => {
    setStakeState(s);
  }, []);

  const setSingleStake = useCallback((id: string, s: string) => {
    setSingleStakesState(prev => ({ ...prev, [id]: s }));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState('');
    setSingleStakesState({});
  }, []);

  const hasSelection = useCallback(
    (id: string) => selections.some(s => s.id === id),
    [selections]
  );

  const totalOdds = selections.length > 0
    ? selections.reduce((acc, s) => acc * s.odds, 1)
    : 1;

  const accaReturn = parseFloat(stake || '0') * totalOdds;

  const totalSingleStaked = selections.reduce(
    (acc, s) => acc + parseFloat(singleStakes[s.id] || '0'), 0
  );

  const totalSingleReturn = selections.reduce((acc, s) => {
    const st = parseFloat(singleStakes[s.id] || '0');
    return acc + st * s.odds;
  }, 0);

  return createElement(BetSlipContext.Provider, {
    value: {
      selections, betType, setBetType,
      stake, setStake,
      singleStakes, setSingleStake,
      addSelection, removeSelection,
      clearSlip, hasSelection,
      totalOdds, accaReturn,
      totalSingleReturn, totalSingleStaked,
    },
    children,
  });
}

export function useBetSlip(): BetSlipState {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
}
