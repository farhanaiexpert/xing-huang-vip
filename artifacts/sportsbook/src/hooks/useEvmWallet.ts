import { useCallback, useRef } from 'react';
import { useAccount, useChainId, useDisconnect, useWalletClient, useSwitchChain, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAppKit } from '@reown/appkit/react';
import { wagmiAdapter } from '../lib/reown';

export interface EvmWalletState {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
}

/**
 * Read the first connected address out of the live wagmi config state.
 * Works without importing @wagmi/core (transitive-only dep not in sportsbook).
 */
function getConnectedAddress(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = wagmiAdapter.wagmiConfig as any;
  const state = cfg?.state;
  const current: string | undefined = state?.current;
  if (!current) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conn: any = state?.connections?.get(current);
  return conn?.accounts?.[0] as string | undefined;
}

export function useEvmWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  const { connectAsync } = useConnect();
  const { open } = useAppKit();
  const { data: walletClient } = useWalletClient();

  // Keep a ref that always points to the latest walletClient.
  // This lets signMessage read it after an async gap (post-connect re-render)
  // without a stale closure capturing the pre-connect undefined value.
  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;

  const connect = useCallback(async (): Promise<string | null> => {
    // Already connected — return immediately so callers can proceed to signing.
    if (isConnected && address) return address;

    // ── Path A: injected provider (MetaMask, Brave, Rabby, etc.) ─────────────
    // Connect directly via the browser extension, bypassing WalletConnect and
    // any domain-registration requirement on the Reown Cloud dashboard.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const result = await connectAsync({ connector: injected() });
        return result.accounts[0] ?? null;
      } catch (err) {
        const msg = (err as Error)?.message ?? '';
        // User explicitly rejected → surface immediately, don't fall through.
        if (/reject|cancel|denied|user denied/i.test(msg)) {
          throw new Error('Connection cancelled.');
        }
        // Any other error (locked wallet, wrong network prompt, etc.) →
        // fall through to AppKit so user still has options.
      }
    }

    // ── Path B: no injected provider → open AppKit modal (WalletConnect / QR) ─
    try {
      await open();
    } catch (err) {
      console.error('[CupBett] AppKit open() failed:', err);
      throw new Error('APPKIT_OPEN_FAILED');
    }

    // Poll the wagmi config store for a connected account.
    // We read wagmiConfig.state directly because the useAccount hook value
    // won't update inside an async closure after a re-render.
    for (let i = 0; i < 60; i++) {
      await new Promise<void>(r => setTimeout(r, 500));
      const addr = getConnectedAddress();
      if (addr) return addr;
    }

    return null;
  }, [open, isConnected, address, connectAsync]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const switchChain = useCallback((targetChainId: number) => {
    wagmiSwitchChain({ chainId: targetChainId });
  }, [wagmiSwitchChain]);

  /** Open the Reown AppKit network picker */
  const openNetworks = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (open as any)({ view: 'Networks' });
  }, [open]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    // walletClientRef.current is updated on every render, so this always sees
    // the latest value — even when called in a .then() after connect(), before
    // the component re-renders with the fresh wagmi hook state.
    let client = walletClientRef.current;

    if (!client) {
      // Brief wait for the post-connect wagmi state to propagate through React.
      // This covers the window between connect() resolving and the next render.
      for (let i = 0; i < 20; i++) {
        await new Promise<void>(r => setTimeout(r, 250));
        client = walletClientRef.current;
        if (client) break;
      }
    }

    if (!client) throw new Error('No EVM wallet detected. Please connect your wallet and try again.');
    return client.signMessage({ message });
  }, []); // walletClientRef is stable — no deps needed

  return { address, isConnected, chainId, connect, disconnect, signMessage, switchChain, openNetworks };
}
