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

/* ── item-level offer pricing ──────────────────────────────────────────── */

const withOffers = (...offers) => ({ ...settings, offers });

const baseOffer = {
  id: "of-test",
  type: "percent",
  value: 20,
  scope: { whole: true },
  titleEn: "20% off",
  titleFi: "−20 %",
  active: true,
  priority: 10,
  uses: 0,
};

test("whole-menu percent offer reduces every quote line and sums to the basket discount", async () => {
  const lines = [line({ key: "a", qty: 2 }), line({ key: "b", itemId: other.id, qty: 1 })];
  const res = await priceLines(withOffers(baseOffer), lines, "pickup", "en", undefined, MENU);

  assert.equal(res.invalidCount, 0);
  const gross = res.lines.reduce((sum, entry) => sum + entry.unitPrice * entry.qty, 0);
  assert.equal(res.subtotal, Math.round(gross * 100) / 100);
  assert.ok(res.discount && res.discount.amount > 0, "a discount is applied");

  const parts = Object.values(res.lineDiscounts);
  assert.equal(parts.length, 2, "both lines carry their share");
  assert.equal(
    Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100,
    res.discount.amount,
    "per-line parts add up to the amount charged"
  );
  for (const entry of res.lines) {
    const net = entry.unitPrice * entry.qty - res.lineDiscounts[entry.key];
    assert.equal(Math.round(net * 100) / 100, Math.round(entry.unitPrice * entry.qty * 0.8 * 100) / 100);
  }
  assert.equal(res.total, Math.round((res.subtotal - res.discount.amount) * 100) / 100);
});

test("multi-category offer discounts every listed category and leaves the rest", async () => {
  const second = MENU.find((m) => m.prices.length === 1 && m.cat !== single.cat);
  const third = MENU.find((m) => m.prices.length === 1 && m.cat !== single.cat && m.cat !== second.cat);
  const lines = [
    line({ key: "a", itemId: single.id }),
    line({ key: "b", itemId: second.id }),
    line({ key: "c", itemId: third.id }),
  ];
  const res = await priceLines(
    withOffers({ ...baseOffer, scope: { whole: false, categories: [single.cat, second.cat] } }),
    lines,
    "pickup",
    "en",
    undefined,
    MENU
  );
  assert.ok(res.lineDiscounts.a > 0);
  assert.ok(res.lineDiscounts.b > 0);
  assert.equal(res.lineDiscounts.c, undefined);
});

test("category offer only discounts dishes in that category", async () => {
  const inCat = MENU.find((m) => m.cat === single.cat && m.id !== single.id) ?? single;
  const outside = MENU.find((m) => m.cat !== single.cat);
  const lines = [line({ key: "in", itemId: single.id }), line({ key: "out", itemId: outside.id })];
  const res = await priceLines(
    withOffers({ ...baseOffer, scope: { whole: false, category: single.cat, itemIds: undefined } }),
    lines,
    "pickup",
    "en",
    undefined,
    MENU
  );
  assert.ok(res.lineDiscounts.in > 0, "scoped line is reduced");
  assert.equal(res.lineDiscounts.out, undefined, "other category keeps its price");
  assert.ok(inCat);
});

test("override offer prices only the selected item and keeps the rest at list price", async () => {
  const target = MENU.find((m) => m.prices.length === 1);
  const listPrice = target.prices[0].value;
  const res = await priceLines(
    withOffers({ ...baseOffer, type: "override", value: 1.5, scope: { whole: false, itemIds: [target.id] } }),
    [line({ key: "t", itemId: target.id, qty: 2 }), line({ key: "o", itemId: other.id })],
    "pickup",
    "en",
    undefined,
    MENU
  );
  assert.equal(res.lineDiscounts.t, Math.round((listPrice - 1.5) * 2 * 100) / 100);
  assert.equal(res.lineDiscounts.o, undefined);
  assert.equal(res.discount.amount, res.lineDiscounts.t);
});

test("a live offer with no price-level effect (free delivery) leaves lines untouched", async () => {
  const res = await priceLines(
    withOffers({ ...baseOffer, type: "freeDelivery", value: 0, scope: { whole: true } }),
    [line({ key: "a" })],
    "delivery",
    "en",
    undefined,
    MENU
  );
  assert.deepEqual(res.lineDiscounts, {});
  assert.equal(res.discount?.freeDelivery, true);
});

test("override offer covers every line of the chosen item, not just the first", async () => {
  const multi = MENU.find((m) => m.prices.length > 1 && m.prices.every((p) => p.value > 2));
  const [a, b] = [multi.prices[0], multi.prices[1]];
  const lines = [
    line({ key: "v1", itemId: multi.id, variantLabel: a.label, qty: 1 }),
    line({ key: "v2", itemId: multi.id, variantLabel: b.label, qty: 2 }),
  ];
  const res = await priceLines(
    withOffers({ ...baseOffer, type: "override", value: 2, scope: { whole: false, itemIds: [multi.id] } }),
    lines,
    "pickup",
    "en",
    undefined,
    MENU
  );
  const expected = Math.round(((a.value - 2) + (b.value - 2) * 2) * 100) / 100;
  assert.equal(res.discount.amount, expected);
  assert.equal(res.total, Math.round((res.subtotal - expected) * 100) / 100);
});
