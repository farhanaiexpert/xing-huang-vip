/**
 * Seed curated Chinese name translations into the live `translation_overrides`
 * table (Task #254).
 *
 * WHY: the sportsbook is always shown in Chinese. Team / league / country names
 * are translated by the curated dictionary in
 * `artifacts/sportsbook/src/i18n/custom.ts`, but that dictionary only lives in
 * the frontend bundle. The server-side "needs translation" queue
 * (lib/translationQueue.ts) decides whether a freshly-fetched name still needs
 * translating by checking `translation_overrides`. Without this seed every name
 * already curated in custom.ts would (wrongly) show up as "needs translation".
 *
 * This loads the curated EN→ZH pairs from custom.ts into `translation_overrides`
 * (lang `zh-CN`) so that:
 *   1. the queue's covered-set excludes already-known names, and
 *   2. those names are editable from the admin Translations page and resolve via
 *      the same live-override path as everything else.
 *
 * Idempotent: existing rows are left untouched (ON CONFLICT DO NOTHING), so it
 * never clobbers an operator's manual edit. Re-run after adding names to
 * custom.ts.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:name-translations
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { db, translationOverridesTable } from "@workspace/db";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CUSTOM_FILE = path.join(ROOT, "artifacts/sportsbook/src/i18n/custom.ts");
const LANG = "zh-CN";
const MAX_LEN = 500;

/** Find the body of the `"zh-CN": { ... }` block inside custom.ts by matching
 *  braces from the first `{` after the lang key to its balancing `}`. */
function extractLangBlock(src: string, lang: string): string {
  const marker = `"${lang}":`;
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`Could not find "${lang}" block in ${CUSTOM_FILE}`);
  const open = src.indexOf("{", at);
  if (open === -1) throw new Error(`Malformed "${lang}" block (no opening brace)`);

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`Unbalanced braces in "${lang}" block`);
}

function hasInvalidChars(s: string): boolean {
  // Control chars (incl. the \u0000 number-template sentinels) or unpaired
  // surrogates — Postgres rejects these as invalid UTF-8.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) return true;
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s)) return true;
  return false;
}

function unquote(literal: string): string {
  try {
    return JSON.parse(`"${literal}"`) as string;
  } catch {
    return literal;
  }
}

/** Extract every `"source": "target"` pair from the block. */
function parsePairs(block: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const source = unquote(m[1]).trim();
    const target = unquote(m[2]).trim();
    // Skip blanks, the plural-suffix cleanup entry ("s": ""), no-op identity
    // pairs, and anything over the column's sane length.
    if (!source || !target) continue;
    if (source === target) continue;
    if (source.length > MAX_LEN || target.length > MAX_LEN) continue;
    // Skip number-template keys (they embed \u0000 sentinels) and anything with
    // control chars or lone surrogates — Postgres rejects invalid UTF-8.
    if (hasInvalidChars(source) || hasInvalidChars(target)) continue;
    pairs.set(source, target); // last occurrence wins
  }
  return pairs;
}

async function main() {
  const src = fs.readFileSync(CUSTOM_FILE, "utf8");
  const block = extractLangBlock(src, LANG);
  const pairs = parsePairs(block);
  console.log(`Parsed ${pairs.size} curated ${LANG} pairs from custom.ts`);
  if (pairs.size === 0) {
    console.log("Nothing to seed.");
    return;
  }

  const values = [...pairs.entries()].map(([source, target]) => ({ lang: LANG, source, target }));

  // Insert in chunks; ON CONFLICT DO NOTHING preserves any existing/edited rows.
  const CHUNK = 500;
  let created = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    const inserted = await db
      .insert(translationOverridesTable)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: translationOverridesTable.id });
    created += inserted.length;
    console.log(`  upserted ${Math.min(i + CHUNK, values.length)}/${values.length}`);
  }

  console.log(`\n✅ Seed complete — ${created} new overrides created, ${pairs.size - created} already present.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
