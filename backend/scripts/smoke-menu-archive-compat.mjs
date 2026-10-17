/*
 * Integration smoke for deployments where API code arrives before the additive
 * archive migration. Run against the local mock/API only:
 *   node scripts/smoke-menu-archive-compat.mjs
 */
const apiBase = process.env.API_BASE || "http://127.0.0.1:4400";
const supabaseBase = process.env.SUPABASE_URL || "http://127.0.0.1:4599";
const serviceKey = "test-service-role-key";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(apiBase) || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(supabaseBase)) {
  throw new Error("Compatibility smoke is restricted to localhost test services");
}

async function mockRequest(path, init = {}) {
  const response = await fetch(`${supabaseBase}${path}`, init);
  if (!response.ok) throw new Error(`mock ${path}: ${response.status} ${await response.text()}`);
  return response;
}

const id = `compat-${Date.now()}`;
const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  "content-type": "application/json",
};

try {
  await mockRequest("/rest/v1/menu_items", {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      id,
      category_id: "compat-test-category",
      name_fi: "Yhteensopivuustesti",
      name_en: "Compatibility test item",
      description_fi: null,
      description_en: null,
      price_med: 6,
      price_perhe: null,
      price_variants: null,
      available_days: [],
      pre_order_only: false,
      preorder_cutoff: null,
      lead_time_hours: null,
      mods: [],
      tags: [],
      photo_url: null,
      sort_order: 0,
    }),
  });

  await mockRequest("/__test__/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ legacyMenuSchema: true }),
  });

  const response = await fetch(`${apiBase}/api/items?cat=compat-test-category`);
  const result = await response.json();
  if (!response.ok) throw new Error(`legacy schema GET /api/items returned ${response.status}: ${JSON.stringify(result)}`);
  const item = result.data?.find((row) => row.id === id);
  if (!item || item.archived !== false || item.weightKg !== undefined) {
    throw new Error(`unexpected legacy item shape: ${JSON.stringify(item)}`);
  }
  console.log("PASS public menu read falls back safely while menu_items.is_archived is missing");
} finally {
  await mockRequest("/__test__/config", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ legacyMenuSchema: false }),
  }).catch(() => {});
  await mockRequest(`/rest/v1/menu_items?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  }).catch(() => {});
}
