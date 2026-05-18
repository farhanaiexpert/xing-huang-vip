import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';

export type OddsFormat = 'decimal' | 'fractional' | 'american';

interface OddsFormatState {
  format: OddsFormat;
  setFormat: (f: OddsFormat) => void;
  fmt: (decimal: number) => string;
}

const OddsFormatContext = createContext<OddsFormatState | null>(null);

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function toFractional(dec: number): string {
  if (Math.abs(dec - 2.0) < 0.01) return 'EVS';
  const num = dec - 1;
  const mult = 100;
  const n = Math.round(num * mult);
  const d = mult;
  const g = gcd(Math.abs(n), d);
  return `${n / g}/${d / g}`;
}

function toAmerican(dec: number): string {
  if (dec >= 2.0) return `+${Math.round((dec - 1) * 100)}`;
  return `${Math.round(-100 / (dec - 1))}`;
}

export function OddsFormatProvider({ children }: { children: ReactNode }) {
  const [format, setFormatState] = useState<OddsFormat>('decimal');

  const setFormat = useCallback((f: OddsFormat) => setFormatState(f), []);

  const fmt = useCallback(
    (decimal: number): string => {
      if (format === 'fractional') return toFractional(decimal);
      if (format === 'american')   return toAmerican(decimal);
      return decimal.toFixed(2);
    },
    [format]
  );

  return createElement(OddsFormatContext.Provider, { value: { format, setFormat, fmt } }, children);
}

export function useOddsFormat(): OddsFormatState {
  const ctx = useContext(OddsFormatContext);
  if (!ctx) throw new Error('useOddsFormat must be used within OddsFormatProvider');
  return ctx;
}
