import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(__dirname, "dist/public");
const port = parseInt(process.env.PORT || "23744", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

const server = createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  let filePath = join(distDir, urlPath);

  let isFile = false;
  try {
    isFile = statSync(filePath).isFile();
  } catch {}

  if (!isFile) {
    filePath = join(distDir, "index.html");
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const isHtml = ext === ".html";

  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Cache-Control",
    isHtml
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable"
  );
  if (isHtml) {
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    res.writeHead(404);
    res.end("Not found");
  });
  stream.pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Admin running on port ${port}`);
});
