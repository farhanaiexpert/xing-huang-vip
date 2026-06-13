import { zh } from "./zh";
import { API_BASE } from "../lib/apiBase";

const STATIC: Record<string, string> = zh;
const CACHE_KEY = "sportsbook_zh_deepl_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "SELECT", "OPTION", "CODE", "PRE", "SVG",
]);

// Runtime dictionary: starts with static, gets enriched by DeepL
let dict: Record<string, string> = { ...STATIC };

// ── Cache helpers ──────────────────────────────────────────────────────────

function loadCache(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: Record<string, string> };
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY); return null; }
    return data;
  } catch { return null; }
}

function saveCache(data: Record<string, string>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch { /* quota */ }
}

// ── DOM walker ─────────────────────────────────────────────────────────────

function shouldSkip(node: Node): boolean {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.getAttribute("translate") === "no") return true;
    el = el.parentElement;
  }
  return false;
}

function applyToTextNode(node: Text) {
  const raw = node.textContent ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const translated = dict[trimmed];
  if (!translated) return;
  const start = raw.indexOf(trimmed);
  node.textContent = raw.slice(0, start) + translated + raw.slice(start + trimmed.length);
}

function walkAndApply(root: Node = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const node of nodes) {
    if (!shouldSkip(node)) applyToTextNode(node);
  }
}

// ── Collect untranslated strings from the live DOM ─────────────────────────

function collectUntranslated(): string[] {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const missing = new Set<string>();
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (shouldSkip(t)) continue;
    const trimmed = (t.textContent ?? "").trim();
    // Skip pure numbers, currency, very short tokens, and overly long strings
    if (
      trimmed &&
      !dict[trimmed] &&
      trimmed.length >= 2 &&
      trimmed.length <= 200 &&
      /[a-zA-Z]/.test(trimmed) &&
      !/^[\d.,:%+\-$/\s]+$/.test(trimmed)
    ) {
      missing.add(trimmed);
    }
  }
  return [...missing];
}

// ── DeepL enrichment (public server proxy) ─────────────────────────────────

async function enrichFromDeepL(strings: string[]): Promise<void> {
  if (!strings.length) return;

  const CHUNK = 50;
  const newEntries: Record<string, string> = {};

  for (let i = 0; i < strings.length; i += CHUNK) {
    const chunk = strings.slice(i, i + CHUNK);
    try {
      const resp = await fetch(`${API_BASE}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: chunk, targetLang: "ZH" }),
      });
      if (!resp.ok) continue;
      const { translations } = await resp.json() as { translations: string[] };
      chunk.forEach((src, idx) => {
        if (translations[idx] && translations[idx] !== src) {
          newEntries[src] = translations[idx];
        }
      });
    } catch { /* network error — skip chunk */ }
  }

  if (Object.keys(newEntries).length) {
    dict = { ...dict, ...newEntries };
    saveCache(dict);
    walkAndApply();
  }
}

// ── MutationObserver ───────────────────────────────────────────────────────

let mo: MutationObserver | null = null;
let enrichTimer: ReturnType<typeof setTimeout> | null = null;

export function startChineseTranslation(): void {
  // 1. Merge cached DeepL translations (if any)
  const cached = loadCache();
  if (cached) dict = { ...STATIC, ...cached };

  // 2. Apply immediately
  walkAndApply();

  // 3. Observe DOM mutations (re-applies on SPA navigation / async content)
  mo = new MutationObserver(() => {
    mo!.disconnect();
    walkAndApply();
    mo!.observe(document.body, { childList: true, subtree: true });

    // Debounced enrichment: pick up newly-rendered untranslated strings
    if (enrichTimer) clearTimeout(enrichTimer);
    enrichTimer = setTimeout(() => {
      const missing = collectUntranslated();
      if (missing.length) enrichFromDeepL(missing);
    }, 1200);
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // 4. Initial enrichment pass for whatever the static dict missed
  setTimeout(() => {
    const missing = collectUntranslated();
    if (missing.length) enrichFromDeepL(missing);
  }, 1500);
}

export function stopChineseTranslation(): void {
  mo?.disconnect();
  mo = null;
  if (enrichTimer) { clearTimeout(enrichTimer); enrichTimer = null; }
}

export function clearTranslationCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  dict = { ...STATIC };
}
