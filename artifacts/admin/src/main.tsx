import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startChineseTranslation } from "./i18n/translator";

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
  }
} catch {
  /* ignore localStorage errors in sandboxed contexts */
}

createRoot(document.getElementById("root")!).render(<App />);
