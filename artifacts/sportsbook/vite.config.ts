import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "buffer": "buffer",
      "@ton/crypto": path.resolve(import.meta.dirname, "src/lib/ton-crypto-shim.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          // Radix UI component primitives
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // TanStack Query
          if (id.includes("node_modules/@tanstack/")) {
            return "vendor-query";
          }
          // Reown AppKit UI / modal layer
          if (
            id.includes("node_modules/@reown/appkit-ui") ||
            id.includes("node_modules/@reown/appkit-wallet") ||
            id.includes("node_modules/@reown/appkit-common") ||
            id.includes("node_modules/@reown/appkit-controllers") ||
            id.includes("node_modules/@web3modal/")
          ) {
            return "web3-appkit-ui";
          }
          // WalletConnect protocol stack (large — split from appkit)
          if (id.includes("node_modules/@walletconnect/")) {
            return "web3-walletconnect";
          }
          // Reown AppKit core / adapters
          if (id.includes("node_modules/@reown/appkit")) {
            return "web3-appkit-core";
          }
          // wagmi + @wagmi/core
          if (
            id.includes("node_modules/wagmi/") ||
            id.includes("node_modules/@wagmi/")
          ) {
            return "web3-wagmi";
          }
          // viem + ox (circular dep — must stay in same chunk)
          if (
            id.includes("node_modules/viem/") ||
            id.includes("node_modules/ox/")
          ) {
            return "web3-viem";
          }
          // TronWeb (heavy — isolate it)
          if (id.includes("node_modules/tronweb")) {
            return "web3-tronweb";
          }
          // TON / Solana / TronLink wallets
          if (
            id.includes("node_modules/@ton/") ||
            id.includes("node_modules/@solana/") ||
            id.includes("node_modules/@tonconnect/")
          ) {
            return "web3-alt-chains";
          }
          // Lucide icons
          if (id.includes("node_modules/lucide-react/")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
