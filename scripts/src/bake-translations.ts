/**
 * Bake Chinese translations into the static dictionaries.
 *
 * WHY: at runtime the apps translate instantly from a built-in dictionary and
 * fall back to a live DeepL call for anything uncovered. That live call causes a
 * brief English "flash" the first time a phrase is seen. This script pre-extracts
 * every hardcoded UI string from the source, translates it once via DeepL, and
 * merges it into the dictionaries so the text is already Chinese on first paint.
 *
 * It is idempotent: re-running only translates strings that aren't already in the
 * dictionary, so run it again whenever new UI text is added.
 *
 * Requirements:
 *   - The api-server workflow must be running (this script POSTs to its public
 *     /api/translate endpoint, which uses DEEPL_API_KEY server-side).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run bake:translations
 */
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "../..");
const ENDPOINT = process.env.BAKE_ENDPOINT ?? "http://localhost:80/api/translate";

interface AppConfig {
  name: string;
  srcDir: string;
  dictFile: string;
  dictType: "ts" | "json";
}

const APPS: AppConfig[] = [
  {
    name: "sportsbook",
    srcDir: "artifacts/sportsbook/src",
    dictFile: "artifacts/sportsbook/src/i18n/zh.ts",
    dictType: "ts",
  },
  {
    name: "admin",
    srcDir: "artifacts/admin/src",
    dictFile: "artifacts/admin/src/i18n/zh-CN.json",
    dictType: "json",
  },
];

// ── Shared rules (mirrors artifacts/*/src/i18n/translator.ts) ───────────────

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt"]);

const PROTECTED = new Set([
  "USDT", "USDC", "USD", "BTC", "ETH", "BNB", "SOL", "TON", "TRX", "XRP", "DOGE",
  "TRC20", "ERC20", "BEP20", "TRC-20", "ERC-20", "BEP-20",
  "Xing", "Huang", "CupBett", "NOWPayments", "Cryptomus", "Web3", "DeepL",
]);

function isOnlyProtected(s: string): boolean {
  const words = s.split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  return words.every(
    (w) =>
      PROTECTED.has(w.replace(/[.,:%!?()]+$/, "").replace(/^[(]+/, "")) ||
      /^[\d.,:%+\-$/()]+$/.test(w),
  );
}

function isTranslatable(s: string): boolean {
  if (s.length < 2 || s.length > 200) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  if (isOnlyProtected(s)) return false;
  return true;
}

function maskProtected(s: string): { masked: string; tokens: string[] } {
  const tokens: string[] = [];
  const masked = s.replace(/[A-Za-z][A-Za-z0-9]*/g, (w) => {
    if (!PROTECTED.has(w)) return w;
    tokens.push(w);
    return `@@P${tokens.length - 1}@@`;
  });
  return { masked, tokens };
}

function restoreProtected(s: string, tokens: string[]): string | null {
  let ok = true;
  const out = s.replace(/@@P(\d+)@@/g, (_, i) => {
    const tok = tokens[Number(i)];
    if (tok == null) { ok = false; return ""; }
    return tok;
  });
  if (!ok || /@@P\d+@@/.test(out)) return null;
  return out;
}

// ── Source extraction ───────────────────────────────────────────────────────

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  const skipDirs = new Set(["node_modules", "dist", "build", ".vite"]);
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(full);
      } else if (/\.(tsx|ts)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
        // skip translation infra itself
        if (/[\\/]i18n[\\/]/.test(full)) continue;
        out.push(full);
      }
    }
  };
  walk(dir);
  return out;
}

function normalizeJsxText(raw: string): string {
  // Mirror JSX whitespace collapsing: trim each line, drop empties, join w/ space.
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(" ")
    .trim();
}

function looseStringOk(t: string): boolean {
  if (!isTranslatable(t)) return false;
  if (/^[a-z0-9_]+(-[a-z0-9_]+)+$/.test(t)) return false; // kebab/snake identifiers
  if (t.includes("/") || t.includes("\\")) return false;   // paths / urls
  if (/^https?:/i.test(t)) return false;
  if (/[{}<>]/.test(t)) return false;                       // template / jsx fragments
  const hasSpace = /\s/.test(t);
  if (!hasSpace && !/^[A-Z]/.test(t)) return false;         // lone lowercase token → identifier
  return true;
}

function extractFromFile(file: string, sink: Set<string>): void {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const add = (s: string) => {
    const t = s.trim();
    if (t) sink.add(t);
  };

  // Collect every translatable string literal anywhere inside a node (handles
  // ternaries / logical expressions in attribute values, e.g. title={x ? "A" : "B"}).
  const collectStringsDeep = (n: ts.Node | undefined) => {
    if (!n) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (isTranslatable(n.text.trim())) add(n.text);
      return;
    }
    ts.forEachChild(n, collectStringsDeep);
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;

    if (ts.isJsxText(node)) {
      const norm = normalizeJsxText(node.text);
      if (norm && isTranslatable(norm)) add(norm);
      return;
    }

    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf);
      if (ATTRS.has(name)) collectStringsDeep(node.initializer);
      // Do not descend into non-UI attribute values (className, href, etc.).
      return;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // Skip object/property *keys* (left side of `:`); values still flow through.
      const parent = node.parent;
      const isName =
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isPropertySignature(parent) && parent.name === node);
      if (!isName && looseStringOk(node.text.trim())) add(node.text);
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
}

// ── Existing dictionary keys ────────────────────────────────────────────────

function loadExistingKeys(cfg: AppConfig): Set<string> {
  const full = path.join(ROOT, cfg.dictFile);
  const raw = fs.readFileSync(full, "utf8");
  if (cfg.dictType === "json") {
    return new Set(Object.keys(JSON.parse(raw) as Record<string, string>));
  }
  const keys = new Set<string>();
  const re = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    try { keys.add(JSON.parse(`"${m[1]}"`) as string); } catch { keys.add(m[1]); }
  }
  return keys;
}

// ── DeepL via server proxy ──────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function translateBatch(texts: string[]): Promise<(string | null)[]> {
  const masks = texts.map(maskProtected);
  const payload = masks.map((m) => m.masked);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: payload, targetLang: "ZH" }),
      });
      if (resp.status === 429 || resp.status >= 500) { await sleep(1000 * (attempt + 1)); continue; }
      if (!resp.ok) {
        console.error(`  translate HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
        return texts.map(() => null);
      }
      const { translations } = (await resp.json()) as { translations: string[] };
      return texts.map((src, i) => {
        const restored = restoreProtected(translations[i] ?? "", masks[i].tokens);
        if (restored == null || restored === src) return null;
        return restored;
      });
    } catch (err) {
      console.error(`  translate error (attempt ${attempt + 1}):`, (err as Error).message);
      await sleep(1000 * (attempt + 1));
    }
  }
  return texts.map(() => null);
}

// ── Dictionary writers ──────────────────────────────────────────────────────

// Write content to a temp file, validate it, then atomically rename into place.
// Guards against truncated/corrupt dictionaries if the process dies mid-write.
function atomicWrite(full: string, content: string, validate: (file: string) => void): void {
  const tmp = `${full}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  try {
    validate(tmp);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
  fs.renameSync(tmp, full);
}

function validateJson(file: string): void {
  JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateTs(file: string): void {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diags = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  if (diags.length) throw new Error(`Refusing to write ${file}: ${diags.length} TS parse error(s)`);
}

function writeJsonDict(cfg: AppConfig, additions: Record<string, string>): void {
  const full = path.join(ROOT, cfg.dictFile);
  const existing = JSON.parse(fs.readFileSync(full, "utf8")) as Record<string, string>;
  const merged: Record<string, string> = { ...existing };
  for (const [k, v] of Object.entries(additions)) if (!(k in merged)) merged[k] = v;
  atomicWrite(full, JSON.stringify(merged, null, 2) + "\n", validateJson);
}

function writeTsDict(cfg: AppConfig, additions: Record<string, string>): void {
  const full = path.join(ROOT, cfg.dictFile);
  const raw = fs.readFileSync(full, "utf8");
  const closeIdx = raw.lastIndexOf("};");
  if (closeIdx === -1) throw new Error(`Could not find closing }; in ${cfg.dictFile}`);

  const lines = Object.entries(additions).map(
    ([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`,
  );
  const block =
    `\n  // ── Auto-baked (DeepL) ${new Date().toISOString().slice(0, 10)} ──────────────────────\n` +
    lines.join("\n") +
    "\n";

  const before = raw.slice(0, closeIdx).replace(/\s*$/, "\n");
  const updated = before + block + raw.slice(closeIdx);
  atomicWrite(full, updated, validateTs);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function bakeApp(cfg: AppConfig): Promise<void> {
  console.log(`\n=== ${cfg.name} ===`);
  const files = listSourceFiles(path.join(ROOT, cfg.srcDir));
  const found = new Set<string>();
  for (const f of files) extractFromFile(f, found);
  console.log(`  scanned ${files.length} files, found ${found.size} candidate strings`);

  const existing = loadExistingKeys(cfg);
  const missing = [...found].filter((s) => !existing.has(s)).sort();
  console.log(`  ${existing.size} already in dictionary, ${missing.length} to translate`);
  if (!missing.length) return;

  const additions: Record<string, string> = {};
  const CHUNK = 40;
  for (let i = 0; i < missing.length; i += CHUNK) {
    const chunk = missing.slice(i, i + CHUNK);
    const results = await translateBatch(chunk);
    chunk.forEach((src, idx) => {
      const tr = results[idx];
      if (tr) additions[src] = tr;
    });
    console.log(`  translated ${Math.min(i + CHUNK, missing.length)}/${missing.length}`);
    await sleep(150);
  }

  const count = Object.keys(additions).length;
  if (!count) { console.log("  nothing translated (DeepL returned no usable results)"); return; }

  if (cfg.dictType === "json") writeJsonDict(cfg, additions);
  else writeTsDict(cfg, additions);
  console.log(`  ✅ added ${count} entries to ${cfg.dictFile}`);
}

async function main() {
  console.log(`Baking translations via ${ENDPOINT}`);
  for (const app of APPS) await bakeApp(app);
  console.log("\nDone. Restart the dev workflows (or rebuild) to pick up the new entries.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
