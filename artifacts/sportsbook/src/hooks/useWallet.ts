/**
 * WALLET CONTEXT
 * Connected to the Xing Huang backend API.
 * isConnected = user is authenticated (Xing Huang account via wallet login).
 * Balance is fetched from /api/wallet/balance.
 */
import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
  ReactNode, createElement,
} from 'react';
import { useDisconnect } from 'wagmi';
import { watchAccount } from '@wagmi/core';
import { wagmiAdapter } from '../lib/reown';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/apiClient';
import { shortAddress as toShortAddr } from '../lib/utils';
import { openWalletPicker } from '../lib/depositGate';

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
  const { user, isAuthenticated, logout } = useAuth();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [balance,      setBalance]      = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  // Whether the current session is EVM (address starts with 0x).
  // Only EVM sessions are subject to Wagmi account-change logout.
  // Tron (base58), Solana (base58/44-char), TON — not touched by Wagmi.
  const isEvmSession = isAuthenticated && !!user?.walletAddress?.startsWith('0x');

  // Track the EVM wallet address bound at login to detect account switches
  const boundEvmAddressRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEvmSession && user?.walletAddress) {
      boundEvmAddressRef.current = user.walletAddress.toLowerCase();
    } else {
      boundEvmAddressRef.current = null;
    }
  }, [isEvmSession, user?.walletAddress]);

  // ── Watch for Wagmi account changes (disconnect / account switch) ───────────
  // Only applies to EVM sessions. Tron/Solana/TON sessions are not managed by
  // Wagmi and must not be inadvertently logged out by this watcher.
  useEffect(() => {
    if (!isEvmSession) return;
    const unwatch = watchAccount(wagmiAdapter.wagmiConfig, {
      onChange(account: { address?: string; status?: string }) {
        if (!isAuthenticated) return;
        const bound = boundEvmAddressRef.current;
        if (!bound) return;

        const accountAddr = account.address?.toLowerCase();
        const isDisconnected = account.status === 'disconnected' || !account.address;
        const isSwitched = accountAddr && accountAddr !== bound;

        if (isDisconnected || isSwitched) {
          logout();
        }
      },
    });
    return () => unwatch();
  }, [isEvmSession, isAuthenticated, logout]);

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
    // Open the in-app WalletPickerModal for wallet-only auth
    openWalletPicker();
  }, []);

  const disconnect = useCallback(() => {
    // Clear both auth session and EVM wallet state in one step
    wagmiDisconnect();
    logout();
  }, [wagmiDisconnect, logout]);

  const deductBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);

  const isConnected  = isAuthenticated;

  // Prefer walletAddress → displayName → username for display
  const fullAddress  = user?.walletAddress ?? null;
  const shortAddress = user ? (toShortAddr(user.walletAddress) || user.displayName || null) : null;
  const walletName   = isAuthenticated ? 'Xing Huang Account' : null;

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
