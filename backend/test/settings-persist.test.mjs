// saveSettings() persistence contract: only rows that actually changed are
// written, independent writes run in a bounded pool, and any database error
// still surfaces as settings.persist.<operation>.
process.env.SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

import { test } from "node:test";
import assert from "node:assert/strict";

const { saveSettings } = await import("../src/supabase-settings.ts");
const { DEFAULT_SETTINGS } = await import("../src/lib/hours.ts");

/* ── in-memory PostgREST stand-in ─────────────────────────────────────────── */
function makeDb(seed, hooks = {}) {
  const tables = structuredClone(seed);
  const calls = [];
  const state = { inFlight: 0, maxInFlight: 0 };
  const match = (rows, filters) => rows.filter((row) => filters.every(([column, value]) => row[column] === value));
  const builder = (table) => {
    const query = { table, op: null, payload: undefined, filters: [], columns: undefined };
    const settle = async () => {
      state.inFlight += 1;
      state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
      try {
        if (hooks.delay) await new Promise((resolve) => setTimeout(resolve, hooks.delay));
        if (hooks.fail?.(query)) return { data: null, error: { message: "simulated database rejection" } };
        calls.push(structuredClone({ table: query.table, op: query.op, payload: query.payload, filters: query.filters }));
        const rows = tables[table];
        if (query.op === "select") {
          const picked = match(rows, query.filters);
          return { data: structuredClone(picked), error: null };
        }
        if (query.op === "update") {
          for (const row of match(rows, query.filters)) Object.assign(row, structuredClone(query.payload));
          return { data: null, error: null };
        }
        if (query.op === "delete") {
          tables[table] = rows.filter((row) => !match([row], query.filters).length);
          return { data: null, error: null };
        }
        if (query.op === "upsert") {
          const incoming = Array.isArray(query.payload) ? query.payload : [query.payload];
          const next = [...tables[table]];
          for (const row of incoming) {
            const index = next.findIndex((stored) => stored.id === row.id);
            if (index < 0) next.push(structuredClone(row));
            else next[index] = { ...next[index], ...structuredClone(row) };
          }
          tables[table] = next;
          return { data: null, error: null };
        }
        throw new Error(`unsupported operation ${query.op}`);
      } finally {
        state.inFlight -= 1;
      }
    };
    const api = {
      select(columns) { query.op ??= "select"; query.columns = columns; return api; },
      update(patch) { query.op = "update"; query.payload = patch; return api; },
      delete() { query.op = "delete"; return api; },
      upsert(values, options) { query.op = "upsert"; query.payload = values; query.options = options; return api; },
      eq(column, value) { query.filters.push([column, value]); return api; },
      then(onFulfilled, onRejected) { return settle().then(onFulfilled, onRejected); },
    };
    return api;
  };
  return {
    db: { from: (table) => builder(table) },
    calls,
    writes: () => calls.filter((call) => call.op !== "select"),
    state,
    tables,
  };
}

const CATEGORY = {
  id: "specials", name_fi: "South Asian Specials", name_en: "South Asian Specials",
  photo_url: null, photo_alt_fi: null, photo_alt_en: null, sort_order: 0, visible: true,
};
const ITEM = {
  id: "specials-3", mods: null, available: true, sold_out_on: null,
  photo_url: null, photo_alt_fi: null, photo_alt_en: null,
};
const TOPPING = {
  id: "jauheliha", name_fi: "jauheliha", name_en: null,
  surcharge_med: 1, surcharge_perhe: 2, active: true, sort_order: 0,
};
const SPECIAL = {
  id: "ts-2", menu_item_id: "specials-3", discount_type: null, discount_value: null,
  photo_override_url: null, label_fi: "Päivän annos", label_en: "Today's Special",
  sort_order: 0, active: true, active_from: null, active_to: null,
};

const PROMO = {
  id: "of-1", code: null, discount_type: "percent", discount_value: 10, scope: { whole: true },
  min_order: null, days: [0], starts_at: null, expires_at: null, usage_limit: null, used_count: 0,
  title_fi: "Tarjous", title_en: "Offer", description_fi: null, description_en: null,
  badge_fi: null, badge_en: null, banner_url: null, priority: 10, active: true,
};
const PROMO_SETTING = {
  id: "of-1", type: "percent", value: 10, scope: { whole: true }, days: [0], uses: 0,
  titleFi: "Tarjous", titleEn: "Offer", priority: 10, active: true,
};

function seed() {
  return {
    shop_settings: [{ id: true }],
    categories: [CATEGORY],
    menu_items: [ITEM],
    toppings: [TOPPING],
    promotions: [PROMO],
    todays_special: [SPECIAL],
  };
}

function fixture() {
  return {
    ...DEFAULT_SETTINGS,
    offers: [PROMO_SETTING],
    toppings: ["jauheliha"],
    toppingMeta: { jauheliha: { fi: "jauheliha", priceMed: 1, pricePerhe: 2 } },
    catMeta: { specials: { nameFi: "South Asian Specials", nameEn: "South Asian Specials", hidden: false } },
    catOrder: ["specials"],
    todaysSpecials: [{ id: "ts-2", itemId: "specials-3", textFi: "Päivän annos", textEn: "Today's Special", sortOrder: 0, active: true }],
    offItems: {},
    itemImages: {},
    offOptions: {},
  };
}

test("a settings snapshot that matches the database writes nothing but shop_settings", async () => {
  const mock = makeDb(seed());
  await saveSettings(fixture(), mock.db);
  assert.deepEqual(mock.writes().map((call) => `${call.table}.${call.op}`), ["shop_settings.upsert"]);
});

test("editing a promotion writes only the promotion row", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.offers = [{ ...next.offers[0], value: 15 }];
  await saveSettings(next, mock.db);
  const offerWrites = mock.writes().filter((call) => call.table === "promotions");
  assert.equal(offerWrites.length, 1);
  assert.equal(offerWrites[0].op, "upsert");
  assert.equal(offerWrites[0].payload.discount_value, 15);
});

test("today's special price change writes only that special row", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.todaysSpecials = [{ ...next.todaysSpecials[0], overridePrice: 2.5 }];
  await saveSettings(next, mock.db);

  const specialWrites = mock.writes().filter((call) => call.table === "todays_special");
  assert.equal(specialWrites.length, 1);
  assert.equal(specialWrites[0].op, "upsert");
  assert.equal(specialWrites[0].payload.length, 1);
  assert.equal(specialWrites[0].payload[0].discount_type, "fixed_price");
  assert.equal(specialWrites[0].payload[0].discount_value, 2.5);
  assert.equal(mock.writes().filter((call) => call.table !== "todays_special" && call.table !== "shop_settings").length, 0);
});

test("duplicating and removing specials upserts the new row and deletes the removed one", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.todaysSpecials = [
    { ...next.todaysSpecials[0], id: "ts-new", itemId: "specials-3", sortOrder: 0 },
  ];
  await saveSettings(next, mock.db);
  const specialWrites = mock.writes().filter((call) => call.table === "todays_special");
  assert.deepEqual(specialWrites.map((call) => call.op).sort(), ["delete", "upsert"]);
  assert.equal(specialWrites.find((call) => call.op === "delete").filters[0][1], "ts-2");
  assert.equal(specialWrites.find((call) => call.op === "upsert").payload[0].id, "ts-new");
});

test("duplicate draft ids collapse into one upsert row, last value wins", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.todaysSpecials = [
    { ...next.todaysSpecials[0], overridePrice: 2 },
    { ...next.todaysSpecials[0], overridePrice: 3 },
  ];
  await saveSettings(next, mock.db);
  const upsert = mock.writes().find((call) => call.table === "todays_special" && call.op === "upsert");
  assert.equal(upsert.payload.length, 1);
  assert.equal(upsert.payload[0].discount_value, 3);
});

test("switching one dish off does not rewrite the rest of the menu", async () => {
  const mock = makeDb({ ...seed(), menu_items: [ITEM, { ...ITEM, id: "pizza1-12", available: true }] });
  const next = fixture();
  next.offItems = { "specials-3": { off: true } };
  await saveSettings(next, mock.db);
  const itemWrites = mock.writes().filter((call) => call.table === "menu_items");
  assert.equal(itemWrites.length, 1);
  assert.equal(itemWrites[0].payload.available, false);
  assert.equal(itemWrites[0].filters[0][1], "specials-3");
});

test("a rejected special write keeps the stable persist error code", async () => {
  const mock = makeDb(seed(), { fail: (query) => query.table === "todays_special" && query.op === "upsert" });
  const next = fixture();
  next.todaysSpecials = [{ ...next.todaysSpecials[0], active: false }];
  await assert.rejects(() => saveSettings(next, mock.db), /^Error: settings\.persist\.special$/);
});

test("independent writes use a bounded pool instead of one round trip per row", async () => {
  const items = Array.from({ length: 40 }, (_, index) => ({ ...ITEM, id: `item-${index}` }));
  const mock = makeDb({ ...seed(), menu_items: items }, { delay: 5 });
  const next = fixture();
  next.offItems = Object.fromEntries(items.map((item) => [item.id, { off: true }]));
  await saveSettings(next, mock.db);
  assert.equal(mock.writes().filter((call) => call.table === "menu_items").length, 40);
  assert.ok(mock.state.maxInFlight > 1, "writes should overlap");
  assert.ok(mock.state.maxInFlight <= 8, `pool must stay bounded, saw ${mock.state.maxInFlight}`);
});

test("delivery rules ride along in the shop_settings extra snapshot", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.deliveryRules = [
    { id: "delivery-a", name: "Keskusta 0-3 km", fee: 2.5, active: true, minDistanceKm: 0, maxDistanceKm: 3 },
    { id: "delivery-b", name: "Heavy orders", fee: 6, active: false, minWeightKg: 15 },
  ];
  await saveSettings(next, mock.db);
  const upsert = mock.writes().find((call) => call.table === "shop_settings" && call.op === "upsert");
  assert.deepEqual(upsert.payload.extra.deliveryRules, next.deliveryRules);
  assert.deepEqual(mock.writes().map((call) => call.table), ["shop_settings"]);
});

test("clearing every delivery rule persists an empty snapshot instead of dropping the key", async () => {
  const mock = makeDb(seed());
  const next = fixture();
  next.deliveryRules = [];
  await saveSettings(next, mock.db);
  const upsert = mock.writes().find((call) => call.table === "shop_settings" && call.op === "upsert");
  assert.deepEqual(upsert.payload.extra.deliveryRules, []);
});
