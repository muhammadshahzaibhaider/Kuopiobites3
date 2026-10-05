#!/usr/bin/env node
/**
 * Scans /public/menu and writes /public/menu/index.json — the list of dish
 * photos that actually exist. The admin "Image coverage" report reads this,
 * so it stays truthful without a deploy.
 * Runs automatically before `next build`.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/menu/", import.meta.url));
const out = [];

function walk(dir, rel) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    if (statSync(abs).isDirectory()) walk(abs, relPath);
    else if (/\.(webp|jpg|jpeg|png|avif)$/i.test(name)) out.push(`/menu/${relPath}`);
  }
}

mkdirSync(root, { recursive: true });
walk(root, "");
out.sort();
writeFileSync(join(root, "index.json"), JSON.stringify(out, null, 0));
console.log(`✓ menu image index — ${out.length} files`);
