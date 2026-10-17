/**
 * Unit coverage for the pure per-line pricing (no Supabase, no network).
 * Run: npm test  →  node --import tsx --test test/*.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

import { coerceCartLine, expectedUnitPrice, priceEachLine } from "../src/lib/line-pricing.ts";
import { DEFAULT_SETTINGS } from "../src/lib/hours.ts";
import { MENU } from "../src/lib/menu.ts";

const settings = DEFAULT_SETTINGS;
const single = MENU.find((m) => m.prices.length === 1);
const multi = MENU.find((m) => m.prices.length > 1);
const withMods = MENU.find((m) => (m.mods ?? []).some((g) => g.options.length > 0));
const modGroup = withMods.mods.find((g) => g.options.length > 0);
const modOption = modGroup.options[0].label;

const line = (over = {}) => ({
  key: "k1",
  itemId: single.id,
  name: "X",
  variantLabel: "",
  qty: 1,
  unitPrice: 0,
  options: [],
  ...over,
});

test("valid single-price line prices from the server menu", () => {
  const [priced] = priceEachLine(settings, MENU, [line()]);
  assert.equal(priced.error, null);
  assert.equal(priced.unitPrice, single.prices[0].value);
});

test("stale variant label is reported per line, not thrown", () => {
  const [priced] = priceEachLine(settings, MENU, [line({ variantLabel: "—" })]);
  assert.equal(priced.unitPrice, null);
  assert.equal(priced.error, "validation.invalidVariant");
});

test("display-prefixed option is rejected with invalidOption", () => {
  const [priced] = priceEachLine(settings, MENU, [
    line({ itemId: withMods.id, variantLabel: withMods.prices[0].label, options: [`Täytteet: ${modOption}`] }),
  ]);
  assert.equal(priced.error, "validation.invalidOption");
});

test("note saved as an option is rejected with invalidOption", () => {
  const [priced] = priceEachLine(settings, MENU, [
    line({ itemId: withMods.id, variantLabel: withMods.prices[0].label, options: ["Note: less salt"] }),
  ]);
  assert.equal(priced.error, "validation.invalidOption");
});

test("duplicate option is reported", () => {
  const [priced] = priceEachLine(settings, MENU, [
    line({ itemId: withMods.id, variantLabel: withMods.prices[0].label, options: [modOption, modOption] }),
  ]);
  assert.equal(priced.error, "validation.duplicateOption");
});

test("unknown item is reported as avail.unavailable", () => {
  const [priced] = priceEachLine(settings, MENU, [line({ itemId: "nope-999" })]);
  assert.equal(priced.error, "avail.unavailable");
});

test("a valid multi-price line uses the requested variant price", () => {
  const variant = multi.prices[multi.prices.length - 1];
  const [priced] = priceEachLine(settings, MENU, [line({ itemId: multi.id, variantLabel: variant.label })]);
  assert.equal(priced.error, null);
  assert.equal(priced.unitPrice, variant.value);
});

test("shape guard drops structural junk without throwing", () => {
  for (const bad of [null, 42, "line", {}, { itemId: single.id, qty: 0 }, { itemId: single.id, options: [{ label: "x" }] }]) {
    const { error } = coerceCartLine(bad, 0);
    assert.equal(error, "validation.invalidLine");
  }
});

test("shape guard keeps a well-formed line intact", () => {
  const { line: parsed, error } = coerceCartLine(
    { key: "a", itemId: single.id, name: "X", variantLabel: "", qty: 2, unitPrice: 1, options: [], note: "no salt" },
    0
  );
  assert.equal(error, null);
  assert.equal(parsed.qty, 2);
  assert.equal(parsed.note, "no salt");
});

test("priced lines keep the contract the client relies on", () => {
  const priced = priceEachLine(settings, MENU, [line(), line({ itemId: "nope-999" })]);
  assert.equal(priced.length, 2);
  assert.equal(priced[0].error, null);
  assert.equal(priced[1].error, "avail.unavailable");
  // the valid line is untouched by its invalid neighbour
  assert.equal(expectedUnitPrice(settings, MENU, priced[0].line), priced[0].unitPrice);
});
