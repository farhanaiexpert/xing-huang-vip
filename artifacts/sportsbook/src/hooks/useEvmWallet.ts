import { useState, useEffect, useCallback } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEth(): any { return typeof window !== 'undefined' ? (window as any).ethereum ?? null : null; }

export interface EvmWalletState {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
}

export function useEvmWallet() {
  const [state, setState] = useState<EvmWalletState>({
    address: undefined,
    isConnected: false,
    chainId: 1,
  });

  useEffect(() => {
    const e = getEth();
    if (!e) return;

    e.request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setState(s => ({ ...s, address: accounts[0], isConnected: true }));
      })
      .catch(() => {});

    e.request({ method: 'eth_chainId' })
      .then((hex: string) => setState(s => ({ ...s, chainId: parseInt(hex, 16) })))
      .catch(() => {});

    function onAccounts(accounts: string[]) {
      if (accounts.length === 0) setState({ address: undefined, isConnected: false, chainId: 1 });
      else setState(s => ({ ...s, address: accounts[0], isConnected: true }));
    }
    function onChain(hex: string) { setState(s => ({ ...s, chainId: parseInt(hex, 16) })); }
    e.on?.('accountsChanged', onAccounts);
    e.on?.('chainChanged', onChain);
    return () => {
      e.removeListener?.('accountsChanged', onAccounts);
      e.removeListener?.('chainChanged', onChain);
    };
  }, []);

  const connect = useCallback(async (): Promise<string | null> => {
    const e = getEth();
    if (!e) { window.open('https://metamask.io', '_blank'); return null; }
    try {
      const accounts: string[] = await e.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) return null;
      const hexChain: string = await e.request({ method: 'eth_chainId' });
      const addr = accounts[0];
      setState({ address: addr, isConnected: true, chainId: parseInt(hexChain, 16) });
      return addr;
    } catch { return null; }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: undefined, isConnected: false, chainId: 1 });
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    const e = getEth();
    if (!e) throw new Error('No EVM wallet detected');
    const accounts: string[] = await e.request({ method: 'eth_accounts' });
    const from = accounts[0] ?? state.address;
    if (!from) throw new Error('Wallet not connected');
    const msgHex = '0x' + Array.from(new TextEncoder().encode(message))
      .map((b: number) => b.toString(16).padStart(2, '0')).join('');
    const sig: string = await e.request({ method: 'personal_sign', params: [msgHex, from] });
    return sig;
  }, [state.address]);

  return { ...state, connect, disconnect, signMessage };
}
