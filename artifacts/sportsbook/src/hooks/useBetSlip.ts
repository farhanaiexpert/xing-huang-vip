import { createContext, useContext, useState, useCallback, useMemo, ReactNode, createElement } from 'react';
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
  /** Odds that drifted since selection was added: id → { prev, current } */
  oddsChanges: Record<string, { prev: number; current: number }>;
  /** Call when live odds update for an in-slip selection */
  updateSelectionOdds: (id: string, newOdds: number) => void;
  /** Accept all drifted odds — clears the change map */
  acceptOddsChanges: () => void;
  /** Combined odds (product) — for accumulator display */
  totalOdds: number;
  /** Estimated acca return (pre-boost) */
  accaReturn: number;
  /** Acca boost percentage (0–0.30): +5% per leg beyond the first, capped at 30% */
  accaBoostPct: number;
  /** Boosted acca return = accaReturn * (1 + accaBoostPct) */
  accaBoostedReturn: number;
  /** Bonus amount added by the boost = accaBoostedReturn - accaReturn */
  accaBoostBonus: number;
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
  /** Odds locked at the moment each selection was added */
  const [lockedOdds,    setLockedOdds]    = useState<Record<string, number>>({});

  const addSelection = useCallback((selection: Selection) => {
    setSelections(prev => {
      const withoutSameMarket = prev.filter(s => s.marketId !== selection.marketId);
      return [...withoutSameMarket, selection];
    });
    setLockedOdds(prev => ({ ...prev, [selection.id]: selection.odds }));
  }, []);

  const removeSelection = useCallback((id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
    setSingleStakesState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setLockedOdds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setBetType = useCallback((type: BetType) => { setBetTypeState(type); }, []);
  const setStake   = useCallback((s: string)       => { setStakeState(s); }, []);

  const setSingleStake = useCallback((id: string, s: string) => {
    setSingleStakesState(prev => ({ ...prev, [id]: s }));
  }, []);

  const clearSlip = useCallback(() => {
    setSelections([]);
    setStakeState('');
    setSingleStakesState({});
    setLockedOdds({});
  }, []);

  const hasSelection = useCallback(
    (id: string) => selections.some(s => s.id === id),
    [selections]
  );

  /** Called by OddsButton when live odds change while the selection is in the slip */
  const updateSelectionOdds = useCallback((id: string, newOdds: number) => {
    setSelections(prev => {
      const sel = prev.find(s => s.id === id);
      if (!sel || Math.abs(sel.odds - newOdds) < 0.001) return prev;
      return prev.map(s => s.id === id ? { ...s, odds: newOdds } : s);
    });
  }, []);

  /** Accept all drifted odds — updates locked prices to the current values */
  const acceptOddsChanges = useCallback(() => {
    setLockedOdds(prev => {
      const next = { ...prev };
      setSelections(sels => {
        for (const s of sels) next[s.id] = s.odds;
        return sels;
      });
      return next;
    });
  }, []);

  /** Computed: which selections have drifted ≥ 0.01 from their locked odds */
  const oddsChanges = useMemo(() => {
    const changes: Record<string, { prev: number; current: number }> = {};
    for (const sel of selections) {
      const locked = lockedOdds[sel.id];
      if (locked !== undefined && Math.abs(locked - sel.odds) >= 0.01) {
        changes[sel.id] = { prev: locked, current: sel.odds };
      }
    }
    return changes;
  }, [selections, lockedOdds]);

  const totalOdds = selections.length > 0
    ? selections.reduce((acc, s) => acc * s.odds, 1)
    : 1;

  const accaReturn = parseFloat(stake || '0') * totalOdds;

  // Acca boost: +5% per leg beyond the first, capped at +30%. Only applies to
  // genuine accumulators (2+ legs).
  const accaBoostPct = selections.length >= 2
    ? Math.min((selections.length - 1) * 0.05, 0.30)
    : 0;
  const accaBoostedReturn = accaReturn * (1 + accaBoostPct);
  const accaBoostBonus = accaBoostedReturn - accaReturn;

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
      oddsChanges, updateSelectionOdds, acceptOddsChanges,
      totalOdds, accaReturn,
      accaBoostPct, accaBoostedReturn, accaBoostBonus,
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
