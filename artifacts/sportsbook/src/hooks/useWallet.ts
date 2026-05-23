/**
 * WALLET CONTEXT
 * Wraps real JWT auth (useAuth) + live balance from API.
 * The "Connect Wallet" flow opens the login/register modal.
 */
import {
  createContext, useContext, useState, useCallback,
  ReactNode, createElement, useEffect, Fragment,
} from 'react';
import { useAuth } from './useAuth';
import { useGetBalance, getGetBalanceQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { LoginModal } from '../components/LoginModal';

export interface WalletState {
  isConnected:    boolean;
  isConnecting:   boolean;
  address:        string | null;
  walletName:     string | null;
  balance:        number;
  role:           'user' | 'admin' | null;
  connect:        (_walletName?: string) => void;
  disconnect:     () => void;
  deductBalance:  (amount: number) => void;
  shortAddress:   string | null;
  openLoginModal: () => void;
}

function shorten(s: string): string {
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const auth         = useAuth();
  const queryClient  = useQueryClient();
  const [loginOpen,  setLoginOpen]  = useState(false);
  const [localBal,   setLocalBal]   = useState(0);

  const balanceQuery = useGetBalance({
    query: { enabled: auth.isAuthenticated, queryKey: getGetBalanceQueryKey() },
  });

  useEffect(() => {
    if (balanceQuery.data) {
      setLocalBal(parseFloat(balanceQuery.data.available ?? '0'));
    }
  }, [balanceQuery.data]);

  useEffect(() => {
    if (!auth.isAuthenticated) setLocalBal(0);
  }, [auth.isAuthenticated]);

  const connect = useCallback((_walletName?: string) => {
    setLoginOpen(true);
  }, []);

  const disconnect = useCallback(() => {
    auth.logout().then(() => queryClient.clear());
  }, [auth, queryClient]);

  const deductBalance = useCallback((amount: number) => {
    setLocalBal(prev => Math.max(0, prev - amount));
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
    }, 600);
  }, [queryClient]);

  const user         = auth.user;
  const isConnected  = auth.isAuthenticated;
  const address      = user?.walletAddress ?? user?.username ?? null;
  const shortAddress = address ? shorten(address) : null;

  const value: WalletState = {
    isConnected,
    isConnecting:  auth.isLoading,
    address,
    walletName:    user?.username ?? null,
    balance:       localBal,
    role:          (user?.role as 'user' | 'admin' | null) ?? null,
    connect,
    disconnect,
    deductBalance,
    shortAddress,
    openLoginModal: () => setLoginOpen(true),
  };

  return createElement(WalletContext.Provider, { value },
    createElement(Fragment, null,
      children,
      createElement(LoginModal, { open: loginOpen, onOpenChange: setLoginOpen }),
    )
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
