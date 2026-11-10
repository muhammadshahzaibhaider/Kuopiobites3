import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const { computeDiscount, itemInOfferScope } = await import("../src/lib/v3.ts");
const { MENU } = await import("../src/lib/menu.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/hours.ts");
const { deliveryFeeFor, matchesDeliveryRule } = await import("../src/delivery.ts");

const shami = MENU.find((m) => m.name === "Shami Kebab");
const biryani = MENU.find((m) => m.name === "Karachi Biryani");
assert.ok(shami?.excludeFromCategoryOffers);
assert.ok(biryani);

const halloween = {
  id: "halloween",
  type: "percent",
  value: 20,
  scope: { categories: ["specials"], category: "specials" },
  titleEn: "Halloween",
  titleFi: "Halloween",
  active: true,
  priority: 10,
};

test("Shami Kebab is not in a specials-category percent deal", () => {
  assert.equal(itemInOfferScope(halloween, shami), false);
  assert.equal(itemInOfferScope(halloween, biryani), true);
  const settings = { ...DEFAULT_SETTINGS, offers: [halloween] };
  const lines = [
    { key: "b", itemId: biryani.id, name: biryani.name, variantLabel: "Full", qty: 1, unitPrice: 9.9, options: [] },
    { key: "s", itemId: shami.id, name: shami.name, variantLabel: "", qty: 1, unitPrice: 1.8, options: [] },
  ];
  const disc = computeDiscount(settings, lines, 11.7, "en", undefined, { type: "pickup", weightKg: 0 }, MENU);
  assert.equal(disc.amount, Math.round(9.9 * 0.2 * 100) / 100);
});

test("explicit itemIds still discount Shami Kebab", () => {
  const offer = { ...halloween, id: "shami-only", scope: { itemIds: [shami.id] } };
  assert.equal(itemInOfferScope(offer, shami), true);
});

test("first matching active delivery rule wins; inactive skipped", () => {
  const settings = {
    ...DEFAULT_SETTINGS,
    deliveryFee: 5,
    deliveryRules: [
      { id: "far", name: "Far", minDistanceKm: 3, maxDistanceKm: 6, fee: 4.5, active: true },
      { id: "near", name: "Near", minDistanceKm: 0, maxDistanceKm: 3, fee: 2, active: true },
      { id: "off", name: "Off", minDistanceKm: 0, maxDistanceKm: 99, fee: 0, active: false },
    ],
  };
  assert.equal(deliveryFeeFor(settings, 1.2, 0), 2);
  assert.equal(deliveryFeeFor(settings, 4, 0), 4.5);
  assert.equal(deliveryFeeFor(settings, 8, 0), 5);
  assert.equal(matchesDeliveryRule(settings.deliveryRules[2], 1, 0), false);
});
