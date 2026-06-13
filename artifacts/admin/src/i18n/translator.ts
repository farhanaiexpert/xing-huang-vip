import staticDict from "./zh-CN.json";

const STATIC: Record<string, string> = staticDict;
const CACHE_KEY = "admin_zh_deepl_v3";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const TRANSLATE_ENDPOINT = `/api/translate`;

// Tags whose text content must never be translated.
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "SELECT", "OPTION", "CODE", "PRE", "SVG",
]);

// Tags whose *attributes* (placeholder/title/aria-label/alt) we still translate.
// Note: form controls ARE allowed here — that's where placeholders live.
const ATTR_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG"]);

// User-facing attributes worth translating.
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

// Terms that must always stay verbatim (tickers, brand, codes). A string made up
// *only* of these tokens (plus numbers/punctuation) is never sent to DeepL and is
// left untouched in the DOM. Anything that is also a curated dictionary entry is
// still translated via that exact match, so keep this list to true "never translate".
const PROTECTED = new Set([
  "USDT", "USDC", "USD", "BTC", "ETH", "BNB", "SOL", "TON", "TRX", "XRP", "DOGE",
  "TRC20", "ERC20", "BEP20", "TRC-20", "ERC-20", "BEP-20",
  "Xing", "Huang", "CupBett", "NOWPayments", "Cryptomus", "Web3", "DeepL",
]);

// Runtime dictionary: starts with static, gets enriched by DeepL.
// Keys may be exact strings OR number-templated strings (digits → \u0000index\u0000).
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

// ── Number templating ──────────────────────────────────────────────────────
// "5 matches" / "1,234 USDT" collapse to one template key so every numeric
// variant resolves instantly without a per-value DeepL round-trip.

const NUM_RE = /\d[\d.,]*\d|\d/g;

function templatize(s: string): { tmpl: string; nums: string[] } {
  const nums: string[] = [];
  const tmpl = s.replace(NUM_RE, (m) => {
    nums.push(m);
    return `\u0000${nums.length - 1}\u0000`;
  });
  return { tmpl, nums };
}

function detemplatize(tmpl: string, nums: string[]): string {
  return tmpl.replace(/\u0000(\d+)\u0000/g, (_, i) => nums[Number(i)] ?? "");
}

// Build a template pair mapping target numbers back to source positions by value.
// Returns null when DeepL altered/dropped a number (then we store the literal).
function makeTemplatePair(src: string, tr: string): { key: string; val: string } | null {
  const a = templatize(src);
  if (a.nums.length === 0) return null;
  const used = new Array<boolean>(a.nums.length).fill(false);
  let ok = true;
  const val = tr.replace(NUM_RE, (m) => {
    // Map by value to the next *unused* source occurrence so repeated numbers
    // ("10 ... 10") keep distinct placeholder indices.
    let idx = -1;
    for (let i = 0; i < a.nums.length; i++) {
      if (!used[i] && a.nums[i] === m) { idx = i; break; }
    }
    if (idx === -1) { ok = false; return m; }
    used[idx] = true;
    return `\u0000${idx}\u0000`;
  });
  return ok ? { key: a.tmpl, val } : null;
}

// ── Lookup ─────────────────────────────────────────────────────────────────

function translateString(trimmed: string): string | null {
  const exact = dict[trimmed];
  if (exact != null) return exact;
  const { tmpl, nums } = templatize(trimmed);
  if (nums.length === 0) return null;
  const t = dict[tmpl];
  if (t == null) return null;
  return detemplatize(t, nums);
}

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
  if (!/[a-zA-Z]/.test(s)) return false;          // must contain letters
  if (isOnlyProtected(s)) return false;            // tickers / brand / codes only
  return true;
}

// ── Protected-term masking ─────────────────────────────────────────────────
// Replace allowlisted tokens with a sentinel DeepL leaves untouched, then
// restore them verbatim so tickers / brand / codes stay verbatim even when
// embedded in a larger phrase. Fail-safe: if the sentinel comes back mangled we
// skip caching that entry (the string simply stays in English).

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

// ── DOM application (text + attributes) ─────────────────────────────────────

function elIsSkipped(el: Element | null, tagSet: Set<string>): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (tagSet.has(cur.tagName)) return true;
    if (cur.getAttribute("translate") === "no") return true;
    cur = cur.parentElement;
  }
  return false;
}

function applyToTextNode(node: Text) {
  const raw = node.textContent ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const translated = translateString(trimmed);
  if (translated == null || translated === trimmed) return;
  const start = raw.indexOf(trimmed);
  node.textContent = raw.slice(0, start) + translated + raw.slice(start + trimmed.length);
}

function applyToElementAttrs(el: Element) {
  if (elIsSkipped(el, ATTR_SKIP_TAGS)) return;
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const raw = el.getAttribute(attr) ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const translated = translateString(trimmed);
    if (translated == null || translated === trimmed) continue;
    const start = raw.indexOf(trimmed);
    el.setAttribute(attr, raw.slice(0, start) + translated + raw.slice(start + trimmed.length));
  }
}

function walkAndApply(root: Node = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  for (const node of nodes) {
    if (!elIsSkipped(node.parentElement, SKIP_TAGS)) applyToTextNode(node);
  }

  // Attributes: scan the element subtree once for the relevant attributes.
  const scope = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : document.body;
  const els = scope.querySelectorAll("[placeholder],[title],[aria-label],[alt]");
  els.forEach(applyToElementAttrs);
  if (scope !== document.body && scope.matches?.("[placeholder],[title],[aria-label],[alt]")) {
    applyToElementAttrs(scope);
  }
}

// ── Collect untranslated strings (text + attributes), deduped by template ───

function collectUntranslated(): string[] {
  const byTmpl = new Map<string, string>(); // template → example original

  const consider = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (translateString(trimmed) != null) return; // already covered
    if (!isTranslatable(trimmed)) return;
    const { tmpl } = templatize(trimmed);
    if (!byTmpl.has(tmpl)) byTmpl.set(tmpl, trimmed);
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (elIsSkipped(t.parentElement, SKIP_TAGS)) continue;
    consider(t.textContent ?? "");
  }

  document.body
    .querySelectorAll("[placeholder],[title],[aria-label],[alt]")
    .forEach((el) => {
      if (elIsSkipped(el, ATTR_SKIP_TAGS)) return;
      for (const attr of ATTRS) {
        const v = el.getAttribute(attr);
        if (v) consider(v);
      }
    });

  return [...byTmpl.values()];
}

// ── DeepL enrichment (server-side proxy) ─────────────────────────────────

// Templates already requested in this session — avoids re-requesting on every
// mutation. Failed requests are un-marked so a later pass retries them.
const requested = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function storeEntry(target: Record<string, string>, src: string, tr: string) {
  if (!tr || tr === src) return;
  const pair = makeTemplatePair(src, tr);
  if (pair) target[pair.key] = pair.val;
  else target[src] = tr;
}

async function enrichFromDeepL(strings: string[]): Promise<void> {
  const fresh = strings.filter((s) => {
    const { tmpl } = templatize(s);
    if (requested.has(tmpl)) return false;
    requested.add(tmpl);
    return true;
  });
  if (!fresh.length) return;

  const CHUNK = 40;
  const newEntries: Record<string, string> = {};

  for (let i = 0; i < fresh.length; i += CHUNK) {
    const chunk = fresh.slice(i, i + CHUNK);
    const masks = chunk.map(maskProtected);
    const payload = masks.map((m) => m.masked);
    let ok = false;

    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const resp = await fetch(TRANSLATE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: payload, targetLang: "ZH" }),
        });
        if (resp.status === 429 || resp.status >= 500) {
          await sleep(800 * (attempt + 1));
          continue;
        }
        if (!resp.ok) break; // 4xx (other than 429): not retryable, drop chunk
        const { translations } = await resp.json() as { translations: string[] };
        chunk.forEach((src, idx) => {
          const restored = restoreProtected(translations[idx] ?? "", masks[idx].tokens);
          if (restored == null) return; // sentinel mangled — leave English, don't cache
          storeEntry(newEntries, src, restored);
        });
        ok = true;
      } catch {
        await sleep(800 * (attempt + 1));
      }
    }

    // Allow a future pass to retry templates we failed to fetch.
    if (!ok) {
      for (const src of chunk) requested.delete(templatize(src).tmpl);
    }
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

function scheduleEnrich(delay: number) {
  if (enrichTimer) clearTimeout(enrichTimer);
  enrichTimer = setTimeout(() => {
    const missing = collectUntranslated();
    if (missing.length) enrichFromDeepL(missing);
  }, delay);
}

export function startChineseTranslation(): void {
  // 1. Merge cached DeepL translations (if any)
  const cached = loadCache();
  if (cached) dict = { ...STATIC, ...cached };

  // 2. Apply immediately
  walkAndApply();

  // 3. Observe DOM mutations (re-applies on SPA navigation / async content,
  //    including portal-rendered popups/modals/toasts mounted under <body>).
  mo = new MutationObserver(() => {
    mo!.disconnect();
    walkAndApply();
    mo!.observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleEnrich(1200);
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });

  // 4. Initial enrichment pass for whatever the static dict missed.
  scheduleEnrich(1500);
}

// Synchronously translate the current DOM. Call this right after the initial
// React render (before the browser paints) so Chinese shows on first paint with
// no English flash. Safe to call repeatedly.
export function applyChineseTranslations(): void {
  walkAndApply();
}

export function stopChineseTranslation(): void {
  mo?.disconnect();
  mo = null;
  if (enrichTimer) { clearTimeout(enrichTimer); enrichTimer = null; }
}

// Expose for manual cache-busting (e.g. from browser console)
export function clearTranslationCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  dict = { ...STATIC };
}
