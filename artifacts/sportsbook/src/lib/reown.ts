import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, bsc, polygon, arbitrum, optimism, base, linea, type AppKitNetwork } from '@reown/appkit/networks';

const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string) || '';

const networks = [mainnet, bsc, polygon, arbitrum, optimism, base, linea] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

const siteUrl = (() => {
  if (typeof window === 'undefined') return '';
  // Use the real origin so WalletConnect deep links work on mobile.
  // In Replit preview iframes the href includes the real production host.
  return window.location.origin;
})();

export const appkit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'CupBett',
    description: 'CupBett Sportsbook — Deposit USDT',
    url: siteUrl,
    icons: ['https://media.ourwebprojects.pro/wp-content/uploads/2026/05/cupbetlogo-1.webp'],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#00DFA9',
    '--w3m-border-radius-master': '12px',
    '--w3m-z-index': 2147483647,
  },
});

// Log AppKit lifecycle events in dev — helps debug mobile wallet issues
if (import.meta.env.DEV && typeof window !== 'undefined') {
  try {
    appkit.subscribeEvents(e => {
      // Skip INITIALIZE — the SDK reconnects to the relay every ~10 s, creating noise
      if (e.data.event === 'INITIALIZE') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log('[CupBett AppKit]', e.data.event, (e.data as any).properties ?? '');
    });
  } catch { /* subscribeEvents may not exist on older SDK versions */ }
}
