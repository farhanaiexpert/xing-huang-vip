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
  totalOdds: number;
  accaReturn: number;
  totalSingleReturn: number;
}

const BetSlipContext = createContext<BetSlipState | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [betType, setBetTypeState] = useState<BetType>('acca');
  const [stake, setStakeState] = useState('');
  const [singleStakes, setSingleStakesState] = useState<Record<string, string>>({});

  const addSelection = useCallback((selection: Selection) => {
    setSelections((prev) => [...prev, selection]);
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
    setSingleStakesState((prev) => {
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
    setSingleStakesState((prev) => ({ ...prev, [id]: s }));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState('');
    setSingleStakesState({});
  }, []);

  const hasSelection = useCallback(
    (id: string) => selections.some((s) => s.id === id),
    [selections]
  );

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);

  const accaReturn = parseFloat(stake || '0') * totalOdds;

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
      totalOdds, accaReturn, totalSingleReturn,
    },
    children,
  });
}

export function useBetSlip(): BetSlipState {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
}
