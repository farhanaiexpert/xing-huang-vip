import { useCallback } from 'react';
import { useAccount, useChainId, useDisconnect, useWalletClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';

export interface EvmWalletState {
  address: string | undefined;
  isConnected: boolean;
  chainId: number;
}

export function useEvmWallet() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { open } = useAppKit();
  const { data: walletClient } = useWalletClient();

  const connect = useCallback(async (): Promise<string | null> => {
    await open();
    return null;
  }, [open]);

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
