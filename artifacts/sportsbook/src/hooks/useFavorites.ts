import { createContext, useContext, useState, useCallback, ReactNode, createElement } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecentMatch {
  id: string;
  name: string;
  leagueName: string;
  sportIcon: string;
  viewedAt: number;
}

interface FavoritesState {
  favSports:     string[];
  favLeagues:    string[];
  recentMatches: RecentMatch[];
  toggleFavSport:   (id: string) => void;
  toggleFavLeague:  (id: string) => void;
  addRecentMatch:   (m: Omit<RecentMatch, 'viewedAt'>) => void;
  isFavSport:  (id: string) => boolean;
  isFavLeague: (id: string) => boolean;
}

// ── Context ───────────────────────────────────────────────────────────────────

const FavCtx = createContext<FavoritesState | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favSports,     setFavSports]     = useState<string[]>    (() => readLS('oc_fav_sports',     []));
  const [favLeagues,    setFavLeagues]    = useState<string[]>    (() => readLS('oc_fav_leagues',    []));
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>(() => readLS('oc_recent_matches', []));

  const toggleFavSport = useCallback((id: string) => {
    setFavSports(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem('oc_fav_sports', JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleFavLeague = useCallback((id: string) => {
    setFavLeagues(prev => {
      const next = prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id];
      localStorage.setItem('oc_fav_leagues', JSON.stringify(next));
      return next;
    });
  }, []);

  const addRecentMatch = useCallback((m: Omit<RecentMatch, 'viewedAt'>) => {
    setRecentMatches(prev => {
      const filtered = prev.filter(x => x.id !== m.id);
      const next = [{ ...m, viewedAt: Date.now() }, ...filtered].slice(0, 6);
      localStorage.setItem('oc_recent_matches', JSON.stringify(next));
      return next;
    });
  }, []);

  const isFavSport  = useCallback((id: string) => favSports.includes(id),  [favSports]);
  const isFavLeague = useCallback((id: string) => favLeagues.includes(id), [favLeagues]);

  return createElement(FavCtx.Provider, {
    value: { favSports, favLeagues, recentMatches, toggleFavSport, toggleFavLeague, addRecentMatch, isFavSport, isFavLeague },
    children,
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavCtx);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
