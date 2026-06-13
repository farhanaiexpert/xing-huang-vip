import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import App from "./App";
import "./index.css";
import { startChineseTranslation, applyChineseTranslations } from "./i18n/translator";

let zhActive = false;
try {
  // One-time migration: enforce Chinese as the default language. Any stale
  // stored preference (e.g. a previously persisted "en") is reset to zh-CN once.
  // After this, an explicit English choice still persists normally.
  const DEFAULT_FLAG = "admin_lang_default_zh_v1";
  if (!localStorage.getItem(DEFAULT_FLAG)) {
    localStorage.setItem("admin_lang", "zh-CN");
    localStorage.setItem(DEFAULT_FLAG, "1");
  }
  if ((localStorage.getItem("admin_lang") ?? "zh-CN") === "zh-CN") {
    startChineseTranslation();
    zhActive = true;
  }
} catch {
  /* ignore localStorage errors in sandboxed contexts */
}

const root = createRoot(document.getElementById("root")!);

if (zhActive) {
  // flushSync forces React's initial mount to commit synchronously, so the DOM
  // is guaranteed in place when we translate it below — all within one task,
  // before the browser paints. Result: Chinese on first paint, no English flash.
  flushSync(() => root.render(<App />));
  applyChineseTranslations();
} else {
  root.render(<App />);
}
