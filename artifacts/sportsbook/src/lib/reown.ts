import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, bsc } from '@reown/appkit/networks';

const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string) || '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const networks = [mainnet, polygon, bsc] as any;

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

export const appkit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: 'CupBett',
    description: 'CupBett Sportsbook — Deposit USDT',
    url: typeof window !== 'undefined' ? window.location.origin : '',
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
  },
});
