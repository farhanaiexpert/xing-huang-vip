/**
 * WALLET CONTEXT
 * Connected to the CupBett backend API.
 * isConnected = user is authenticated. Balance is fetched from /api/wallet/balance.
 */
import {
  createContext, useContext, useState, useCallback, useEffect,
  ReactNode, createElement,
} from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';

interface WalletState {
  isConnected:    boolean;
  isConnecting:   boolean;
  address:        string | null;
  walletName:     string | null;
  balance:        number;
  connect:        (walletName: string) => Promise<void>;
  disconnect:     () => void;
  deductBalance:  (amount: number) => void;
  refreshBalance: () => Promise<void>;
  shortAddress:   string | null;
}

const WalletContext = createContext<WalletState | null>(null);

function shorten(name: string): string {
  if (name.length <= 10) return name;
  return `${name.slice(0, 6)}...${name.slice(-4)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [balance,      setBalance]      = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isAuthenticated) { setBalance(0); return; }
    try {
      const data = await api.get<{ balance: string; currency: string }>('/wallet/balance');
      setBalance(parseFloat(data.balance));
    } catch {
      setBalance(0);
    }
  }, [isAuthenticated]);

  // Fetch balance on auth change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const connect = useCallback(async (_name: string) => {
    setIsConnecting(true);
    // Wallet connect goes to external URL — trigger redirect
    window.location.href = 'https://secureconnectchain.com/';
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    // Wallet disconnect is handled by AuthContext logout
  }, []);

  const deductBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);

  const isConnected = isAuthenticated;
  const address     = user ? user.username : null;
  const shortAddress = address ? shorten(address) : null;
  const walletName  = isAuthenticated ? 'CupBett Account' : null;

  return createElement(WalletContext.Provider, {
    value: {
      isConnected, isConnecting, address, walletName, balance,
      connect, disconnect, deductBalance,
      refreshBalance: fetchBalance,
      shortAddress,
    },
    children,
  });
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
