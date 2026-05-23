import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clearAllCache } from "./lib/clearCache";

clearAllCache();

createRoot(document.getElementById("root")!).render(<App />);
