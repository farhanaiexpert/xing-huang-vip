import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, type AppKitNetwork } from '@reown/appkit/networks';

const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string) || '';
const networks = [mainnet] as [AppKitNetwork, ...AppKitNetwork[]];

// wagmiAdapter is created eagerly — required by WagmiProvider in main.tsx.
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

// createAppKit MUST be called at module-load time (before WagmiProvider mounts)
// so it can properly wire into the wagmiAdapter.
// The modal only opens when the user explicitly clicks "Connect Wallet".
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'Xing Huang',
    description: 'Xing Huang Sportsbook — Deposit USDT',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: ['https://media.ourwebprojects.pro/wp-content/uploads/2026/06/Xing-Huang-Logo-official.webp'],
  },
  features: {
    analytics: false,
    email: true,
    socials: ['google', 'x'],
    emailShowWallets: true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00DFA9',
    '--w3m-border-radius-master': '12px',
    '--w3m-z-index': 2147483647,
  },
  allowUnsupportedChain: true,
});

if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    appKit.subscribeEvents(e => {
      const RELAY_NOISE = new Set(['INITIALIZE', 'CONNECT_SUCCESS']);
      if (RELAY_NOISE.has(e.data.event)) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('[Xing Huang AppKit]', e.data.event, (e.data as any).properties ?? '');
    });
  } catch { /* subscribeEvents may not exist on older SDK versions */ }
}

/**
 * Subscribe to whether the AppKit modal is currently open.
 * Returns an unsubscribe function.
 */
export function subscribeAppKitOpen(callback: (open: boolean) => void): () => void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsub = (appKit as any).subscribeState?.((state: { open?: boolean }) => {
      callback(!!state.open);
    });
    return typeof unsub === 'function' ? unsub : () => {};
  } catch {
    return () => {};
  }
}
