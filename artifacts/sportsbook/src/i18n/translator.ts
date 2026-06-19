import { zh } from "./zh";
import { API_BASE } from "../lib/apiBase";

const STATIC: Record<string, string> = zh;
const CACHE_KEY = "sportsbook_zh_deepl_v4";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const TRANSLATE_ENDPOINT = `${API_BASE}/api/translate`;

// Database-backed manual overrides set by an operator in the admin panel.
// These take the HIGHEST priority — above the curated static dict and DeepL —
// and apply on the live site within seconds without a rebuild.
const OVERRIDES_CACHE_KEY = "sportsbook_zh_overrides_v1";
const OVERRIDES_ENDPOINT = `${API_BASE}/api/translations/zh-CN`;
const OVERRIDES_POLL_MS = 20 * 1000; // re-check for operator edits every 20s
let overrides: Record<string, string> = {};
let overridesTimer: ReturnType<typeof setInterval> | null = null;
let lastOverridesVersion: string | null = null;

// Lets React (I18nContext) read operator overrides for t()-based renders (e.g.
// league names via <SportName>) and re-render when they change on poll.
const OVERRIDES_EVENT = "cb-overrides-changed";

export function getOverrides(): Record<string, string> {
  return overrides;
}

function notifyOverridesChanged(): void {
  try { window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT)); } catch { /* SSR / no window */ }
}

export function onOverridesChanged(cb: () => void): () => void {
  window.addEventListener(OVERRIDES_EVENT, cb);
  return () => window.removeEventListener(OVERRIDES_EVENT, cb);
}

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

// ── Manual override helpers ────────────────────────────────────────────────

function loadOverridesCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(OVERRIDES_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { version?: string; data?: Record<string, string> };
    lastOverridesVersion = parsed.version ?? null;
    return parsed.data ?? {};
  } catch { return {}; }
}

function saveOverridesCache(version: string, data: Record<string, string>) {
  try { localStorage.setItem(OVERRIDES_CACHE_KEY, JSON.stringify({ version, data })); } catch { /* quota */ }
}

// Fetch fresh overrides from the server and re-apply only if they changed. A
// full replace (not merge) so operator deletions take effect immediately. The
// version short-circuit avoids re-walking the DOM on every unchanged poll.
async function refreshOverrides(): Promise<void> {
  try {
    const resp = await fetch(OVERRIDES_ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!resp.ok) return;
    const { version, translations } = await resp.json() as { version: string; translations: Record<string, string> };
    if (version === lastOverridesVersion) return;
    lastOverridesVersion = version;
    overrides = translations ?? {};
    saveOverridesCache(version, overrides);
    notifyOverridesChanged();
    walkAndApply();
  } catch { /* offline / server down — keep cached overrides */ }
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
  // Manual operator overrides win over everything else (exact match only).
  const override = overrides[trimmed];
  if (override != null) return override;
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

// ── DeepL enrichment (public server proxy) ─────────────────────────────────

// Templates already requested in this session — avoids re-requesting on every
// mutation. Failed requests are un-marked so a later pass retries them.
const requested = new Set<string>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Circuit breaker: when DeepL is unavailable (429 quota / 5xx), stop hammering
// the proxy. MutationObserver fires every few seconds, so without this a quota
// outage produces a continuous stream of failed POST /api/translate requests.
const DEEPL_COOLDOWN_MS = 10 * 60 * 1000; // 10 min back-off after repeated failure
let deeplCooldownUntil = 0;

function storeEntry(target: Record<string, string>, src: string, tr: string) {
  if (!tr || tr === src) return;
  const pair = makeTemplatePair(src, tr);
  if (pair) target[pair.key] = pair.val;
  else target[src] = tr;
}

async function enrichFromDeepL(strings: string[]): Promise<void> {
  if (Date.now() < deeplCooldownUntil) return; // backing off after repeated failure
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
    let outage = false; // 429 quota / 5xx / network — distinct from a one-off 4xx

    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const resp = await fetch(TRANSLATE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: payload, targetLang: "ZH" }),
        });
        if (resp.status === 429 || resp.status >= 500) {
          outage = true;
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
        outage = true;
        await sleep(800 * (attempt + 1));
      }
    }

    // Allow a future pass to retry templates we failed to fetch.
    if (!ok) {
      for (const src of chunk) requested.delete(templatize(src).tmpl);
      // Only a genuine outage (quota 429 / 5xx / network) trips the circuit
      // breaker — a one-off non-retryable 4xx for a single chunk shouldn't
      // silence DeepL for everyone. On outage, back off and drop the rest of
      // the queue (un-marked, so they retry after the cooldown expires).
      if (outage) {
        deeplCooldownUntil = Date.now() + DEEPL_COOLDOWN_MS;
        for (let j = i + CHUNK; j < fresh.length; j++) {
          requested.delete(templatize(fresh[j]).tmpl);
        }
        break;
      }
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
  // 1. Merge cached DeepL translations (if any). STATIC is merged LAST so the
  //    curated/locked dictionary is always authoritative over DeepL cache —
  //    locked sportsbook terms never drift to a stale auto-translation.
  const cached = loadCache();
  if (cached) dict = { ...cached, ...STATIC };

  // 1b. Load cached operator overrides synchronously for first paint.
  overrides = loadOverridesCache();
  notifyOverridesChanged();

  // 2. Apply immediately
  walkAndApply();

  // 2b. Pull fresh overrides from the server, then poll so admin edits appear
  //     on the live site within seconds (stale-while-revalidate).
  refreshOverrides();
  if (overridesTimer) clearInterval(overridesTimer);
  overridesTimer = setInterval(refreshOverrides, OVERRIDES_POLL_MS);

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
  if (overridesTimer) { clearInterval(overridesTimer); overridesTimer = null; }
}

export function clearTranslationCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(OVERRIDES_CACHE_KEY); } catch { /* ignore */ }
  dict = { ...STATIC };
  overrides = {};
  lastOverridesVersion = null;
}
