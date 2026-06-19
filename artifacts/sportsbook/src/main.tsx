import { Buffer } from "buffer";
if (typeof window !== "undefined") (window as unknown as Record<string, unknown>).Buffer = Buffer;

import { wagmiAdapter } from "./lib/reown";
import { WagmiProvider } from "wagmi";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import App from "./App";
import "./index.css";
import { startChineseTranslation, applyChineseTranslations } from "./i18n/translator";

let zhActive = false;
try {
  // Read the saved language preference. Only English ("en") and Chinese
  // ("zh-CN") are supported; anything else (incl. first-time visitors with no
  // saved value) defaults to Chinese. Persist the sanitized value so the
  // default sticks. The Chinese DOM translator runs ONLY in Chinese mode —
  // English mode renders the original source text, no overlay, no DeepL.
  const stored = localStorage.getItem("cupbett_lang");
  const lang = stored === "en" || stored === "zh-CN" ? stored : "zh-CN";
  if (stored !== lang) localStorage.setItem("cupbett_lang", lang);
  if (lang === "zh-CN") {
    startChineseTranslation();
    zhActive = true;
  }
} catch {
  /* ignore localStorage errors in sandboxed contexts */
}

const root = createRoot(document.getElementById("root")!);
const tree = (
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <App />
  </WagmiProvider>
);

if (zhActive) {
  // flushSync forces React's initial mount to commit synchronously, so the DOM
  // is guaranteed in place when we translate it below — all within one task,
  // before the browser paints. Result: Chinese on first paint, no English flash.
  flushSync(() => root.render(tree));
  applyChineseTranslations();
} else {
  root.render(tree);
}
