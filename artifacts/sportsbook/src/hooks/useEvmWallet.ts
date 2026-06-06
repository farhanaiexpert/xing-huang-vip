import { useCallback, useRef } from 'react';
import { useAccount, useChainId, useDisconnect, useWalletClient, useSwitchChain, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAppKit } from '@reown/appkit/react';
import { watchAccount } from '@wagmi/core';
import { wagmiAdapter } from '../lib/reown';

export interface EvmWalletState {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
}

// ── Module-level EIP-6963 provider cache ─────────────────────────────────────
// Wallets announce themselves via EIP-6963 as soon as the page loads.
// We cache their providers here so connect() can use them immediately.
const _eip6963Providers = new Map<string, unknown>();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e: Event) => {
    const ev = e as CustomEvent<{ info: { rdns: string }; provider: unknown }>;
    const rdns = ev.detail?.info?.rdns;
    const provider = ev.detail?.provider;
    if (rdns && provider) _eip6963Providers.set(rdns, provider);
  });
  // Request all installed wallets to announce themselves now
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

export function useEvmWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  const { connectAsync } = useConnect();
  const { open } = useAppKit();
  const { data: walletClient } = useWalletClient();

  const walletClientRef = useRef(walletClient);
  walletClientRef.current = walletClient;

  /**
   * Connect a wallet.
   *
   * rdns provided:
   *   1. If the wallet announced via EIP-6963, connect to it directly (no popup, instant).
   *   2. Otherwise fall through to Path B.
   *
   * rdns omitted:
   *   1. If window.ethereum exists, use any injected provider (Path A).
   *   2. Otherwise open AppKit modal (Path B).
   */
  const connect = useCallback(async (rdns?: string): Promise<string | null> => {
    if (isConnected && address) return address;

    // ── Path A: EIP-6963 specific wallet ──────────────────────────────────────
    if (rdns) {
      const provider = _eip6963Providers.get(rdns);
      if (provider) {
        try {
          const result = await connectAsync({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            connector: injected({ target: () => provider as any }),
          });
          return result.accounts[0] ?? null;
        } catch (err) {
          const msg = (err as Error)?.message ?? '';
          if (/reject|cancel|denied|user denied/i.test(msg)) {
            throw new Error('Connection cancelled.');
          }
          // Wallet locked or some other error → fall through to AppKit
        }
      }
      // RDNS not in cache (wallet not installed / no EIP-6963 support)
      // → open AppKit so user can scan QR or use deep-link
    }

    // ── Path A fallback: any injected provider (window.ethereum) ─────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!rdns && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const result = await connectAsync({ connector: injected() });
        return result.accounts[0] ?? null;
      } catch (err) {
        const msg = (err as Error)?.message ?? '';
        if (/reject|cancel|denied|user denied/i.test(msg)) {
          throw new Error('Connection cancelled.');
        }
        // Fall through to AppKit
      }
    }

    // ── Path B: AppKit modal (WalletConnect / QR / deep-link) ─────────────────
    try {
      await open();
    } catch (err) {
      console.error('[Xing Huang] AppKit open() failed:', err);
      throw new Error('APPKIT_OPEN_FAILED');
    }

    // Subscribe to account changes via the public wagmi/core API (no internal state access).
    // Resolves as soon as an address is detected, or after 5 minutes.
    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => { unwatch(); resolve(null); }, 5 * 60 * 1000);
      const unwatch = watchAccount(wagmiAdapter.wagmiConfig, {
        onChange(account: { address?: string }) {
          if (account.address) {
            clearTimeout(timer);
            unwatch();
            resolve(account.address);
          }
        },
      });
    });
  }, [open, isConnected, address, connectAsync]);

  const disconnect = useCallback(() => wagmiDisconnect(), [wagmiDisconnect]);

  /** Switch chain and surface rejections to the caller. */
  const switchChain = useCallback(async (targetChainId: number): Promise<void> => {
    try {
      await wagmiSwitchChain({ chainId: targetChainId });
    } catch (err) {
      const msg = (err as Error)?.message ?? '';
      if (/reject|cancel|denied|user denied/i.test(msg)) {
        throw new Error('Chain switch cancelled.');
      }
      throw err;
    }
  }, [wagmiSwitchChain]);

  const openNetworks = useCallback(() => {
    void open({ view: 'Networks' });
  }, [open]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    let client = walletClientRef.current;
    if (!client) {
      for (let i = 0; i < 20; i++) {
        await new Promise<void>(r => setTimeout(r, 250));
        client = walletClientRef.current;
        if (client) break;
      }
    }
    if (!client) throw new Error('No EVM wallet detected. Please connect your wallet and try again.');
    return client.signMessage({ message });
  }, []);

  /** Opens the official Reown/AppKit wallet modal directly (skips injected shortcut). */
  const openWalletModal = useCallback(async () => {
    try {
      await open();
    } catch (err) {
      console.error('[Xing Huang] AppKit open() failed:', err);
      throw new Error('APPKIT_OPEN_FAILED');
    }
  }, [open]);

  return { address, isConnected, chainId, connect, disconnect, signMessage, switchChain, openNetworks, openWalletModal };
}
