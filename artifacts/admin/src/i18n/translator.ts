import dict from "./zh-CN.json";

const TRANSLATIONS: Record<string, string> = dict;

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "SELECT", "OPTION", "CODE", "PRE", "SVG",
]);

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
  const translated = TRANSLATIONS[trimmed];
  if (!translated) return;
  const start = raw.indexOf(trimmed);
  node.textContent =
    raw.slice(0, start) + translated + raw.slice(start + trimmed.length);
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

let mo: MutationObserver | null = null;

export function startChineseTranslation(): void {
  walkAndApply();

  mo = new MutationObserver(() => {
    mo!.disconnect();
    walkAndApply();
    mo!.observe(document.body, { childList: true, subtree: true });
  });

  mo.observe(document.body, { childList: true, subtree: true });
}

export function stopChineseTranslation(): void {
  mo?.disconnect();
  mo = null;
}
