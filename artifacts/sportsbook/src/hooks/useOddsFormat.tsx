import { createContext, useContext, useState } from 'react';
import type { OddsFormat } from '../lib/oddsFormat';
import { safeGet, safeSet } from '../lib/safeStorage';

interface OddsFormatContextValue {
  format: OddsFormat;
  setFormat: (f: OddsFormat) => void;
}

const OddsFormatContext = createContext<OddsFormatContextValue>({
  format: 'decimal',
  setFormat: () => {},
});

export function OddsFormatProvider({ children }: { children: React.ReactNode }) {
  const [format, setFormat] = useState<OddsFormat>(() => {
    return (safeGet('oddsFormat') as OddsFormat) ?? 'decimal';
  });

  function handleSetFormat(f: OddsFormat) {
    setFormat(f);
    safeSet('oddsFormat', f);
  }

  return (
    <OddsFormatContext.Provider value={{ format, setFormat: handleSetFormat }}>
      {children}
    </OddsFormatContext.Provider>
  );
}

export function useOddsFormat() {
  return useContext(OddsFormatContext);
}
