import { useCallback } from 'react';
import { useAccount, useChainId, useDisconnect, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { wagmiAdapter } from '../lib/reown';

export interface EvmWalletState {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
}

/**
 * Read the first connected address out of the live wagmi config state.
 * Works without importing @wagmi/core (which is a transitive-only dep).
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
  const { open } = useAppKit();
  const { data: walletClient } = useWalletClient();

  const connect = useCallback(async (): Promise<string | null> => {
    // Already connected — return immediately so callers can proceed to signing.
    if (isConnected && address) return address;

    // Open the AppKit modal (non-blocking: it resolves before the user picks a wallet).
    await open();

    // Poll the wagmi config store for a connected account.
    // We can't use the useAccount hook value here because it won't update inside
    // an async closure; instead we read wagmiConfig.state directly.
    for (let i = 0; i < 60; i++) {
      await new Promise<void>(r => setTimeout(r, 500));
      const addr = getConnectedAddress();
      if (addr) return addr;
    }

    // User dismissed the modal or timed out after 30 s.
    return null;
  }, [open, isConnected, address]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletClient) throw new Error('No EVM wallet detected');
    const sig = await walletClient.signMessage({ message });
    return sig;
  }, [walletClient]);

  return { address, isConnected, chainId, connect, disconnect, signMessage };
}
