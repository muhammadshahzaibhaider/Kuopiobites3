import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDeliveryRules, haversineKm } from "../src/delivery";
import { expectedUnitPrice } from "../src/logic";
import { cartLineSchema, deliveryRuleSchema, promotionPatchSchema } from "../src/schemas";
import { computeDiscount } from "../src/lib/v3";
import { forbiddenSettingsChanges, changedSettings } from "../src/settings-roles";
import { isRevenueEligible } from "../../src/lib/revenue";
import type { CartLine, DeliveryRule, MenuItem, Offer, Settings } from "../src/lib/types";

const settings = (overrides: Partial<Settings> = {}) => ({
  offItems: {}, offCats: {}, offOptions: {},
  toppings: ["Jalapeño"],
  toppingMeta: { "Jalapeño": { en: "Jalapeño", fi: "Jalapeeno", priceMed: 1.5, pricePerhe: 2.25 } },
  offers: [], deliveryFee: 4, radiusKm: 6, deliveryRules: [], vatRate: 0.14,
  ...overrides,
}) as Settings;

const product = (included: string[] = []): MenuItem => ({
  id: "test-product", cat: "sides", name: "Test product", prices: [
    { label: "Med", value: 10 }, { label: "Perhe", value: 18 },
  ], available: true,
  includedToppingIds: included,
  mods: [{
    id: "product-toppings", name: "Toppings", type: "multi", min: 0, max: 10,
    options: [{ label: "jalapeno", labelEn: "Jalapeño", labelFi: "Jalapeeno", price: 99, priceByVariant: [99, 99], toppingId: "jalapeno" }],
  }],
});

const toppingLine = (variantLabel: string): CartLine => ({
  key: "line", itemId: "test-product", name: "untrusted name", variantLabel,
  qty: 1, unitPrice: 0, options: ["Toppings: Jalapeño"],
  selections: [{ groupId: "product-toppings", optionLabel: "jalapeno" }],
});

test("settings saves diff canonical values and enforce manager/kitchen field allowlists", () => {
  const current = settings();
  const submitted = settings({ ...current, deliveryFee: 8, offItems: { "test-product": { off: true } } });
  const changed = changedSettings(current, submitted);
  assert.deepEqual([...changed].sort(), ["deliveryFee", "offItems"]);
  assert.deepEqual(forbiddenSettingsChanges("manager", changed), ["deliveryFee"]);
  assert.deepEqual(forbiddenSettingsChanges("kitchen", changed), ["deliveryFee"]);
  assert.deepEqual(forbiddenSettingsChanges("owner", changed), []);
  assert.deepEqual(changedSettings(current, settings()), []);
});

test("dashboard revenue includes paid/demo-paid orders and excludes pending/refunded orders", () => {
  const orders = [
    { paymentStatus: "paid", refunded: false },
    { paymentStatus: "demo_paid", refunded: false },
    { paymentStatus: "pending", refunded: false },
    { paymentStatus: "refunded", refunded: true },
    { paymentStatus: "paid", refunded: true },
  ];
  assert.deepEqual(orders.filter(isRevenueEligible), [orders[0], orders[1]]);
});

test("topping option is priced from current server metadata for each variant", () => {
  const current = settings();
  assert.equal(expectedUnitPrice(current, [product()], toppingLine("Med")), 11.5);
  assert.equal(expectedUnitPrice(current, [product()], toppingLine("Perhe")), 20.25);
});

test("included product toppings have zero add-on price even if the client submits a price", () => {
  assert.equal(expectedUnitPrice(settings(), [product(["jalapeno"])], toppingLine("Med")), 10);
});

test("removed toppings cannot be selected at checkout", () => {
  assert.throws(
    () => expectedUnitPrice(settings({ toppings: [] }), [product()], toppingLine("Med")),
    /avail\.unavailable/,
  );
});

test("structured option selections require a group ID and option key", () => {
  const line = cartLineSchema.parse({
    itemId: "test-product", variantLabel: "Med", qty: 1,
    options: ["Toppings: Jalapeño"],
    selections: [{ groupId: "product-toppings", optionLabel: "jalapeno" }],
  });
  assert.deepEqual(line.selections, [{ groupId: "product-toppings", optionLabel: "jalapeno" }]);
  assert.throws(() => cartLineSchema.parse({
    itemId: "test-product", variantLabel: "Med", qty: 1, options: [],
    selections: [{ groupId: "", optionLabel: "jalapeno" }],
  }));
});

test("delivery rules apply server-side using distance, subtotal and weight conditions", () => {
  const rule: DeliveryRule = {
    id: "free-nearby", nameEn: "Nearby free delivery", nameFi: "Lähellä ilmainen toimitus",
    conditionType: "combined", conditions: { distanceKm: { max: 3 }, subtotalEur: { min: 20 }, weightKg: { max: 10 } },
    outcome: "free_delivery", active: true, priority: 10, stackable: false,
  };
  assert.equal(deliveryRuleSchema.parse(rule).id, rule.id);
  const base = { deliveryFee: 4, radiusKm: 6, deliveryRules: [rule] };
  assert.equal(evaluateDeliveryRules(base, { distanceKm: 2, subtotalEur: 25, weightKg: 4 }).deliveryFee, 0);
  assert.equal(evaluateDeliveryRules(base, { distanceKm: 4, subtotalEur: 25, weightKg: 4 }).deliveryFee, 4);
  assert.equal(evaluateDeliveryRules(base, { distanceKm: 7, subtotalEur: 25, weightKg: 4 }).deliveryAllowed, false);
});

test("delivery rule schema rejects empty ranges and inverted bounds", () => {
  const base = {
    id: "bad-range", nameEn: "Invalid", nameFi: "Virheellinen", conditionType: "distance", conditions: { distanceKm: {} },
    outcome: "free_delivery", active: true, priority: 0, stackable: false,
  };
  assert.throws(() => deliveryRuleSchema.parse(base));
  assert.throws(() => deliveryRuleSchema.parse({ ...base, conditions: { distanceKm: { min: 5, max: 2 } } }));
});

test("Haversine distance uses kilometer units", () => {
  const distance = haversineKm({ latitude: 60, longitude: 25 }, { latitude: 61, longitude: 25 });
  assert.ok(distance > 111 && distance < 112);
});

test("promotion writes reject impossible values, missing targets, invalid dates, and client usage counters", () => {
  const valid = {
    type: "percent", value: 100, scope: { category: "new-category" },
    titleEn: "Category discount", titleFi: "Kategoria-alennus", active: true, priority: 0,
  };
  assert.equal(promotionPatchSchema.parse(valid).value, 100);
  assert.throws(() => promotionPatchSchema.parse({ ...valid, value: 100.01 }));
  assert.throws(() => promotionPatchSchema.parse({ ...valid, scope: { whole: false } }));
  assert.throws(() => promotionPatchSchema.parse({ ...valid, start: "2026-12-01", end: "2026-11-01" }));
  assert.throws(() => promotionPatchSchema.parse({ ...valid, uses: 99 }));
});

test("promotion pricing uses dynamic database catalog and caps fixed discounts to scoped lines", () => {
  const dynamicItem: MenuItem = {
    id: "dynamic-noodle", cat: "new-category", name: "Noodles",
    prices: [{ label: "Regular", value: 12 }], available: true,
  };
  const otherItem: MenuItem = {
    id: "other-item", cat: "another-category", name: "Other",
    prices: [{ label: "Regular", value: 20 }], available: true,
  };
  const lines: CartLine[] = [
    { itemId: dynamicItem.id, name: dynamicItem.name, variantLabel: "Regular", qty: 1, unitPrice: 12, options: [] },
    { itemId: otherItem.id, name: otherItem.name, variantLabel: "Regular", qty: 1, unitPrice: 20, options: [] },
  ];
  const categoryOffer: Offer = {
    id: "category-10", type: "percent", value: 10, scope: { category: "new-category" },
    titleEn: "Noodle offer", titleFi: "Nuudeli tarjous", active: true, priority: 1,
  };
  const priced = computeDiscount(settings({ offers: [categoryOffer] }), lines, 32, "en", undefined, [dynamicItem, otherItem]);
  assert.equal(priced.amount, 1.2);

  const fixedOffer: Offer = { ...categoryOffer, id: "fixed-50", type: "fixed", value: 50 };
  const fixed = computeDiscount(settings({ offers: [fixedOffer] }), lines, 32, "en", undefined, [dynamicItem, otherItem]);
  assert.equal(fixed.amount, 12);
});
