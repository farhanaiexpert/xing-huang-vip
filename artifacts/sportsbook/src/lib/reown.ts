import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, type AppKitNetwork } from '@reown/appkit/networks';

const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string) || '';
const networks = [mainnet] as [AppKitNetwork, ...AppKitNetwork[]];

// wagmiAdapter is created eagerly — it is required by WagmiProvider in main.tsx
// so that wagmi hooks (useAccount, useChainId, etc.) work everywhere.
// createAppKit is NOT called here; it is deferred to initAppKit() below.
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

type AppKitInstance = ReturnType<typeof createAppKit>;
let _appkit: AppKitInstance | null = null;

/**
 * Lazily initialise Reown AppKit.
 * Safe to call multiple times — only the first call creates the instance.
 * Should be called right before opening the wallet modal (e.g. when the user
 * clicks "Connect Wallet" on the /account/wallet page).
 */
export function initAppKit(): AppKitInstance {
  if (_appkit) return _appkit;

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';

  _appkit = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: 'Xing Huang',
      description: 'Xing Huang Sportsbook — Deposit USDT',
      url: siteUrl,
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
    // Never auto-show a "Switch Network" modal — user is on TRC-20 (Tron).
    allowUnsupportedChain: true,
  });

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      _appkit.subscribeEvents(e => {
        const RELAY_NOISE = new Set(['INITIALIZE', 'CONNECT_SUCCESS']);
        if (RELAY_NOISE.has(e.data.event)) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('[Xing Huang AppKit]', e.data.event, (e.data as any).properties ?? '');
      });
    } catch { /* subscribeEvents may not exist on older SDK versions */ }
  }

  return _appkit;
}
