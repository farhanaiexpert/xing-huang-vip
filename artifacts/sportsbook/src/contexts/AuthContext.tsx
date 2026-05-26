import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, setTokens, clearTokens, getRefreshToken, getAccessToken } from '../lib/apiClient';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  role: string;
  referralCode: string | null;
  createdAt?: string;
  kycStatus?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
    } catch {
      // silent — stay with existing user
    }
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  // On mount: try to restore session from refresh token
  useEffect(() => {
    async function restore() {
      const refresh = getRefreshToken();
      if (!refresh) { setLoading(false); return; }

      const access = getAccessToken();
      if (access) {
        try {
          const me = await api.get<AuthUser>('/auth/me');
          setUser(me);
          setLoading(false);
          return;
        } catch {}
      }

      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (res.ok) {
          const data = await res.json() as { accessToken: string; refreshToken?: string };
          setTokens(data.accessToken, data.refreshToken ?? refresh);
          const me = await api.get<AuthUser>('/auth/me');
          setUser(me);
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
      setLoading(false);
    }
    restore();
  }, []);

  // When the API client detects an unrecoverable 401 (refresh failed),
  // it fires 'cb:session-expired'. We sync that into React state here.
  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener('cb:session-expired', handleExpired);
    return () => window.removeEventListener('cb:session-expired', handleExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, referralCode?: string) => {
    const body = referralCode ? { email, username, password, referralCode } : { email, username, password };
    const data = await api.post<AuthResponse>('/auth/register', body);
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      await api.post('/auth/logout', { refreshToken: refresh });
    } catch {}
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
