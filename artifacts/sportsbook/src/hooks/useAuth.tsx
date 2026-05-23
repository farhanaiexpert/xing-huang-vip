import {
  createContext, useContext, useState, useEffect, useCallback,
  ReactNode, createElement,
} from 'react';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import type { UserResponse } from '@workspace/api-client-react';

import { safeGet, safeSet, safeRemove } from '../lib/safeStorage';

const TOKEN_KEY = 'cupbett_jwt';

export interface AuthState {
  user:            UserResponse | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  login:           (loginId: string, password: string) => Promise<void>;
  register:        (username: string, password: string, email?: string) => Promise<void>;
  logout:          () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<UserResponse | null>(null);
  const [token,     setToken]     = useState<string | null>(() => safeGet(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(!!safeGet(TOKEN_KEY));

  useEffect(() => {
    setAuthTokenGetter(() => safeGet(TOKEN_KEY));
  }, []);

  useEffect(() => {
    const stored = safeGet(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : null)
      .then((data: UserResponse | null) => {
        if (data) setUser(data);
        else { safeRemove(TOKEN_KEY); setToken(null); }
      })
      .catch(() => { safeRemove(TOKEN_KEY); setToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const saveSession = useCallback((t: string, u: UserResponse) => {
    safeSet(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginId, password }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    saveSession(data.token, data.user);
  }, [saveSession]);

  const register = useCallback(async (username: string, password: string, email?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, ...(email ? { email } : {}) }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    saveSession(data.token, data.user);
  }, [saveSession]);

  const logout = useCallback(async () => {
    const t = safeGet(TOKEN_KEY);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        credentials: 'include',
      });
    } catch {}
    safeRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return createElement(AuthContext.Provider, {
    value: { user, token, isAuthenticated: !!user, isLoading, login, register, logout },
    children,
  });
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
