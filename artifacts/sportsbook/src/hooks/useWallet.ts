/**
 * WALLET CONTEXT
 * Mock wallet state — no real Web3 integration.
 * API_HOOK: Replace connect() body with wagmi / ethers.js wallet connect call.
 */
import {
  createContext, useContext, useState, useCallback,
  ReactNode, createElement,
} from 'react';

interface WalletState {
  isConnected:    boolean;
  isConnecting:   boolean;
  address:        string | null;
  walletName:     string | null;
  balance:        number;
  connect:        (walletName: string) => Promise<void>;
  disconnect:     () => void;
  deductBalance:  (amount: number) => void;
  shortAddress:   string | null;
}

// Mock addresses for each wallet type
const MOCK_ADDRESSES: Record<string, string> = {
  'MetaMask':        '0x8f3aE2C1d4Bd9F0E3a7cD291',
  'WalletConnect':   '0x4d1B7F9C3e2A5f8D0b6E3a91',
  'Coinbase Wallet': '0x2c9F4E1B7a3D6f0C8e5A2b71',
  'Phantom':         '0x6a8D3F2C1e9B4f7A0d5E3c11',
};

const STARTING_BALANCE = 1000;

function shorten(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected,  setIsConnected]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address,      setAddress]      = useState<string | null>(null);
  const [walletName,   setWalletName]   = useState<string | null>(null);
  const [balance,      setBalance]      = useState(0);

  const connect = useCallback(async (name: string) => {
    setIsConnecting(true);
    setWalletName(name);
    await new Promise<void>(res => setTimeout(res, 1400));
    const addr = MOCK_ADDRESSES[name] ?? '0xDeAdBeEf0000000000000000000000000000DEAD';
    setAddress(addr);
    setBalance(STARTING_BALANCE);
    setIsConnected(true);
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    setAddress(null);
    setWalletName(null);
    setBalance(0);
  }, []);

  const deductBalance = useCallback((amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  }, []);

  const shortAddress = address ? shorten(address) : null;

  return createElement(WalletContext.Provider, {
    value: { isConnected, isConnecting, address, walletName, balance, connect, disconnect, deductBalance, shortAddress },
    children,
  });
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
