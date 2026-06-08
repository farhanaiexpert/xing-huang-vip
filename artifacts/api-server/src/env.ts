import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Workspace root is 3 levels up from src/  (src → api-server → artifacts → root)
const workspaceRoot = resolve(__dirname, "../../..");

// Load .env from workspace root — silently does nothing if the file doesn't exist
// (on Replit the platform injects env vars directly so no .env file is needed)
config({ path: resolve(workspaceRoot, ".env"), override: false });
