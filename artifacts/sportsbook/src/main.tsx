import { Buffer } from "buffer";
if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).Buffer = Buffer;

import { wagmiAdapter } from "./lib/reown";
import { WagmiProvider } from "wagmi";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startChineseTranslation } from "./i18n/translator";

try {
  // One-time migration: enforce Chinese as the default language. Any stale
  // stored preference (e.g. a previously persisted "en") is reset to zh-CN once.
  // After this, an explicit English choice still persists normally.
  const DEFAULT_FLAG = "cupbett_lang_default_zh_v1";
  if (!localStorage.getItem(DEFAULT_FLAG)) {
    localStorage.setItem("cupbett_lang", "zh-CN");
    localStorage.setItem(DEFAULT_FLAG, "1");
  }
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
