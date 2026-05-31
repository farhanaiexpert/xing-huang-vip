import { Buffer } from "buffer";
if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter } from './lib/reown';

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WagmiProvider>
);
