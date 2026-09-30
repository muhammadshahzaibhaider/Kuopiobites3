#!/usr/bin/env node
/**
 * Build-time locale key completeness check.
 * Fails when the EN and FI dictionaries in src/lib/i18n.tsx drift apart.
 * Usage: node scripts/check-i18n.mjs   (wired as `npm run check-i18n`)
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");

function keysOf(varName) {
  const start = src.indexOf(`const ${varName}: Dict = {`);
  if (start < 0) throw new Error(`dict ${varName} not found`);
  let i = src.indexOf("{", start);
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
  }
  const body = src.slice(i + 1, end);
  const keys = new Set();
  const re = /"([a-zA-Z0-9_.\-]+)"\s*:/g;
  let m;
  while ((m = re.exec(body))) keys.add(m[1]);
  return keys;
}

const en = keysOf("en");
const fi = keysOf("fi");
const missingFi = [...en].filter((k) => !fi.has(k));
const missingEn = [...fi].filter((k) => !en.has(k));

if (missingFi.length || missingEn.length) {
  console.error("✗ i18n key mismatch:");
  if (missingFi.length) console.error(`  missing in FI (${missingFi.length}): ${missingFi.join(", ")}`);
  if (missingEn.length) console.error(`  missing in EN (${missingEn.length}): ${missingEn.join(", ")}`);
  process.exit(1);
}
console.log(`✓ i18n complete — ${en.size} keys in EN and FI`);
