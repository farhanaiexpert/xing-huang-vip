import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';
import { Selection } from '../types';

interface BetSlipState {
  selections: Selection[];
  stake: string;
  addSelection: (selection: Selection) => void;
  removeSelection: (id: string) => void;
  setStake: (stake: string) => void;
  clearSlip: () => void;
  hasSelection: (id: string) => boolean;
}

const BetSlipContext = createContext<BetSlipState | null>(null);

export function BetSlipProvider({ children }: { children: ReactNode }) {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [stake, setStakeState] = useState('');

  const addSelection = useCallback((selection: Selection) => {
    setSelections((prev) => [...prev, selection]);
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const setStake = useCallback((stake: string) => {
    setStakeState(stake);
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState('');
  }, []);

  const hasSelection = useCallback(
    (id: string) => selections.some((s) => s.id === id),
    [selections]
  );

  return createElement(BetSlipContext.Provider, {
    value: { selections, stake, addSelection, removeSelection, setStake, clearSlip, hasSelection },
    children,
  });
}

export function useBetSlip(): BetSlipState {
  const ctx = useContext(BetSlipContext);
  if (!ctx) throw new Error('useBetSlip must be used within a BetSlipProvider');
  return ctx;
}
