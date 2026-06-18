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
  // The sportsbook frontend is always Chinese. Force zh-CN on every boot so the
  // stored preference can never drift to another language, then start the DOM
  // translator unconditionally.
  localStorage.setItem("cupbett_lang", "zh-CN");
  startChineseTranslation();
  zhActive = true;
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
