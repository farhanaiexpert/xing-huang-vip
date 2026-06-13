import { Buffer } from "buffer";
if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).Buffer = Buffer;

import { wagmiAdapter } from "./lib/reown";
import { WagmiProvider } from "wagmi";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startChineseTranslation } from "./i18n/translator";

try {
  if ((localStorage.getItem("cupbett_lang") ?? "zh-CN") === "zh-CN") {
    startChineseTranslation();
  }
} catch {
  /* ignore localStorage errors in sandboxed contexts */
}

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <App />
  </WagmiProvider>
);
