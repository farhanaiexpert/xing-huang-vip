import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const KEY = 'betslip_sidebar_collapsed';

interface BetSlipSidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const BetSlipSidebarContext = createContext<BetSlipSidebarCtx>({
  collapsed: false,
  toggle: () => {},
});

export function BetSlipSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(KEY) === 'true'; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <BetSlipSidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </BetSlipSidebarContext.Provider>
  );
}

export function useBetSlipSidebar() {
  return useContext(BetSlipSidebarContext);
}
