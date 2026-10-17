/**
 * Topping availability contract.
 *
 * A topping is orderable only when it is in the master list AND not switched
 * off. Removing a topping used to leave it visible (greyed out) in every pizza
 * dialog because item groups keep a copy of the master list — these tests pin
 * the fixed behaviour.
 */
import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { activeToppings, optionOff, sanitizeToppingGroups, visibleToppingOptions } = await import("../src/lib/v3.ts");
const { expectedUnitPrice } = await import("../src/lib/line-pricing.ts");
const { priceCart } = await import("../src/logic.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/hours.ts");

const settings = {
  ...DEFAULT_SETTINGS,
  toppings: ["kana", "salami", "ananas", "aurajuusto"],
  offOptions: { ...DEFAULT_SETTINGS.offOptions, topping: ["aurajuusto"] },
};

const pizza = {
  id: "pizza4-28",
  cat: "pizza4",
  name: "Bella Roma",
  nameFi: "Bella Roma",
  desc: "Kana, ananas, aurajuusto, tomaatti",
  prices: [{ label: "Med", value: 13.5 }, { label: "Perhe", value: 26 }],
  tags: [],
  mods: [{
    id: "topping",
    name: "Toppings",
    nameEn: "Toppings",
    nameFi: "Täytteet",
    type: "multi",
    required: false,
    min: 0,
    max: 4,
    options: [
      { label: "kana", price: 0 },
      { label: "salami", price: 0 },
      { label: "aurajuusto", price: 0 },
      { label: "pepperonil", price: 0 }, // removed from the master list
    ],
  }],
};

const line = (over = {}) => ({
  key: "l1", itemId: pizza.id, name: "Bella Roma", variantLabel: "Med",
  qty: 1, unitPrice: 0, options: [], ...over,
});

test("activeToppings drops switched-off labels", () => {
  assert.deepEqual(activeToppings(settings), ["kana", "salami", "ananas"]);
  assert.equal(optionOff(settings, "topping", "aurajuusto"), true);
});

test("visibleToppingOptions hides removed and switched-off toppings", () => {
  const visible = visibleToppingOptions(settings, pizza.mods[0]).map((option) => option.label);
  assert.deepEqual(visible, ["kana", "salami"]);
});

test("visibleToppingOptions leaves non-topping groups untouched", () => {
  const group = { id: "spice", name: "Spice", nameEn: "Spice", nameFi: "Tulisuus", type: "single", options: [{ label: "Mild", price: 0 }, { label: "Hot", price: 0 }] };
  assert.equal(visibleToppingOptions(settings, group), group.options);
});

test("sanitizeToppingGroups strips only removed toppings (off ones are kept)", () => {
  const [group] = sanitizeToppingGroups(settings, pizza.mods).filter((entry) => entry.id === "topping");
  /* aurajuusto is merely switched off: keep the data so it can be re-enabled. */
  assert.deepEqual(group.options.map((option) => option.label), ["kana", "salami", "aurajuusto"]);
  assert.equal(group.max, 3);
  assert.equal(group.min, 0);
});

test("sanitizeToppingGroups never rewrites a builder tier (product data)", () => {
  const builder = { id: "top", name: "toppings", type: "multi", min: 3, max: 12, options: [], perVariantExtra: [1, 2] };
  const mods = [builder];
  assert.equal(sanitizeToppingGroups(settings, mods), mods, "builder tier is untouched");

  const tiny = { ...settings, toppings: ["kana"], offOptions: { ...settings.offOptions, topping: [] } };
  assert.equal(sanitizeToppingGroups(tiny, mods), mods, "a temporarily short list cannot lower the tier");
});

test("an unchanged group keeps its identity (no needless writes)", () => {
  const clean = { ...settings, offOptions: { ...settings.offOptions, topping: [] } };
  const mods = [{ id: "topping", name: "T", nameEn: "T", nameFi: "T", type: "multi", options: [{ label: "kana", price: 0 }] }];
  assert.equal(sanitizeToppingGroups(clean, mods), mods);
});

test("checkout rejects a removed topping stored in an item group", () => {
  assert.throws(() => expectedUnitPrice(settings, [pizza], line({ options: ["pepperonil"] })), /validation\.invalidOption/);
});

test("checkout rejects a switched-off topping", () => {
  assert.throws(() => expectedUnitPrice(settings, [pizza], line({ options: ["aurajuusto"] })), /avail\.unavailable/);
});

test("a valid remaining topping still prices exactly as before", () => {
  assert.equal(expectedUnitPrice(settings, [pizza], line({ options: ["kana"] })), 13.5);
});

test("checkout stays strict: one ghost topping blocks the whole order", async () => {
  await assert.rejects(
    () => priceCart(settings, [line({ options: ["kana"] }), line({ key: "l2", options: ["pepperonil"] })], "pickup", "en", undefined, [pizza]),
    /validation\.invalidOption/,
  );
});

test("a topping group whose toppings are all gone no longer requires a pick", () => {
  const gone = { ...settings, toppings: [], offOptions: { ...settings.offOptions, topping: [] } };
  const item = {
    ...pizza,
    mods: [{ ...pizza.mods[0], required: true, min: 1, options: [{ label: "pepperonil", price: 0 }] }],
  };
  const [group] = sanitizeToppingGroups(gone, item.mods);
  assert.equal(group.options.length, 0);
  assert.equal(group.min, 1, "required keeps a floor of one");
  const emptyGroup = visibleToppingOptions(gone, item.mods[0]);
  assert.equal(emptyGroup.length, 0);
});

test("a builder tier above the master list stays orderable", () => {
  /* A 5-topping tier in a shop that only has 2 toppings used to be impossible
     to order. Builders are priced by extras, so the short tier must still work. */
  const small = { ...settings, toppings: ["kana", "salami"], offOptions: { ...settings.offOptions, topping: [] } };
  const builder = {
    id: "fantasia-50", cat: "fantasia", name: "Fantasia 5", nameFi: "Fantasia 5",
    prices: [{ label: "Med", value: 14.5 }, { label: "Perhe", value: 28 }], tags: [],
    mods: [{ id: "top", name: "toppings", type: "multi", min: 5, max: 12, options: [], perVariantExtra: [1, 2] }],
  };
  const line = {
    key: "b1", itemId: "fantasia-50", name: "Fantasia 5", variantLabel: "Med", qty: 1, unitPrice: 0, options: [],
    pizza: { builder: true, sizeLabel: "Med", extras: [{ label: "kana", count: 1 }, { label: "salami", count: 1 }] },
  };
  assert.equal(expectedUnitPrice(small, [builder], line), 14.5);

  const removed = { ...line, pizza: { ...line.pizza, extras: [{ label: "ananas", count: 1 }] } };
  assert.throws(() => expectedUnitPrice(small, [builder], removed), /avail\.unavailable/);
});
