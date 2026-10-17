/**
 * Cart quote behaviour: the lenient /api/cart/price shape vs. the strict
 * checkout path. Uses bundled menu + settings fixtures, so no network calls.
 */
import test from "node:test";
import assert from "node:assert/strict";

/* logic.ts pulls the Supabase client factory in; it only needs the env names,
   never a live connection, because every call below passes `knownItems`. */
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { priceLines, priceCart } = await import("../src/logic.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/hours.ts");
const { MENU } = await import("../src/lib/menu.ts");

const settings = DEFAULT_SETTINGS;
const single = MENU.find((m) => m.prices.length === 1);
const other = MENU.find((m) => m.prices.length === 1 && m.id !== single.id);

const line = (over = {}) => ({
  key: `k-${Math.random().toString(36).slice(2, 8)}`,
  itemId: single.id,
  name: "Client name",
  variantLabel: "",
  qty: 1,
  unitPrice: 0,
  options: [],
  ...over,
});

test("all-valid cart: lenient totals equal the strict checkout totals", async () => {
  const lines = [line({ qty: 2 }), line({ itemId: other.id })];
  const lenient = await priceLines(settings, lines, "pickup", "en", undefined, MENU);
  const strict = await priceCart(settings, lines, "pickup", "en", undefined, MENU);
  assert.equal(lenient.invalidCount, 0);
  assert.equal(lenient.subtotal, strict.subtotal);
  assert.equal(lenient.total, strict.total);
  assert.equal(lenient.vat, strict.vat);
  assert.equal(lenient.deliveryFee, strict.deliveryFee);
  assert.deepEqual(
    lenient.lines.map((l) => [l.key, l.unitPrice, l.error]),
    strict.lines.map((l) => [l.key, l.unitPrice, null])
  );
});

test("mixed cart: valid lines are priced, bad rows carry their own code", async () => {
  const good = line({ qty: 2 });
  const badVariant = line({ variantLabel: "—" });
  const badItem = line({ itemId: "nope-999" });
  const res = await priceLines(settings, [good, badVariant, badItem], "pickup", "en", undefined, MENU);

  assert.equal(res.invalidCount, 2);
  assert.equal(res.lines[0].error, null);
  assert.equal(res.lines[1].error, "validation.invalidVariant");
  assert.equal(res.lines[2].error, "avail.unavailable");
  assert.equal(res.lines[1].unitPrice, null);

  // totals cover the valid line only — never a guessed price for bad rows
  const onlyGood = await priceCart(settings, [good], "pickup", "en", undefined, MENU);
  assert.equal(res.subtotal, onlyGood.subtotal);
  assert.equal(res.total, onlyGood.total);
});

test("checkout stays strict: any invalid line still rejects the order", async () => {
  const lines = [line(), line({ variantLabel: "—" })];
  await assert.rejects(
    () => priceCart(settings, lines, "pickup", "en", undefined, MENU),
    /validation\.invalidVariant/
  );
});

test("server name wins over the client-supplied name", async () => {
  const res = await priceLines(settings, [line({ name: "Hacked" })], "pickup", "en", undefined, MENU);
  assert.notEqual(res.lines[0].name, "Hacked");
  assert.equal(res.lines[0].name, single.name);
});

test("structural junk is reported instead of 400-ing the quote", async () => {
  const res = await priceLines(settings, [null, 42, { itemId: single.id, qty: 0 }], "pickup", "en", undefined, MENU);
  assert.equal(res.invalidCount, 3);
  assert.ok(res.lines.every((l) => l.error === "validation.invalidLine"));
  assert.equal(res.total, 0);
});

test("price request schema accepts stale-but-shaped rows (route no longer 400s)", async () => {
  const { priceRequestSchema } = await import("../src/schemas.ts");
  const body = {
    type: "pickup",
    lang: "fi",
    lines: [
      { key: "a", itemId: single.id, name: "X", variantLabel: "—", qty: 1, unitPrice: 0, options: [] },
      { key: "b", itemId: single.id, name: "Y", variantLabel: "", qty: 1, unitPrice: 0, options: ["Täytteet: kebab"] },
      { key: "c", itemId: single.id, name: "Z", variantLabel: "", qty: 1, unitPrice: 0, options: [], legacyField: true },
    ],
  };
  const parsed = priceRequestSchema.parse(body);
  assert.equal(parsed.lines.length, 3);
  assert.equal(parsed.type, "pickup");
  // still not a free-for-all: a non-array body is rejected
  assert.throws(() => priceRequestSchema.parse({ type: "pickup", lang: "en", lines: "nope" }));
  assert.throws(() => priceRequestSchema.parse({ type: "pickup", lang: "en", lines: [] }));
});
