import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startChineseTranslation } from "./i18n/translator";

try {
  if ((localStorage.getItem("admin_lang") ?? "zh-CN") === "zh-CN") {
    startChineseTranslation();
  }
} catch {
  /* ignore localStorage errors in sandboxed contexts */
}

createRoot(document.getElementById("root")!).render(<App />);
