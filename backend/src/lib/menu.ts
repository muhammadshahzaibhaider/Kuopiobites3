import type { Category, MenuItem, ModGroup, PriceVariant, Tag } from "./types";

export const RESTAURANT = {
  name: "Kuopio Bites",
  tagline: "& Asian cuisine",
  address: "Jalkasenkatu 7, 70820 Kuopio",
  phone: "044 981 6223",
  phoneHref: "tel:+358449816223",
  email: "hello@kuopiobites.fi",
  instagram: "https://instagram.com/kuopiobites",
  facebook: "https://facebook.com/kuopiobites",
  mapEmbed:
    "https://www.google.com/maps?q=Jalkasenkatu%207%2C%2070820%20Kuopio%2C%20Finland&output=embed",
  mapLink: "https://www.google.com/maps?q=Jalkasenkatu+7,+70820+Kuopio",
};

export const DIPS = [
  "Valkosipulimajoneesi", "Kurkkumajoneesi", "Currymajoneesi",
  "Makea Chili Majoneesi", "Chipotle-Ranchmajoneesi", "Tulinen Kastike",
  "Las Vegas BBQ Kastike", "Wings Sauce (Med)", "Wings Sauce (Hot)",
  "Raita/Jogurttikastike",
];

const spiceMod: ModGroup = {
  id: "spice",
  name: "Tulisuus / Spice level",
  type: "single",
  options: [
    { label: "Mild", price: 0 },
    { label: "Medium", price: 0 },
    { label: "Hot", price: 0 },
  ],
};

const dipMod: ModGroup = {
  id: "dips",
  name: "Extra dipit (+€1.00 / kpl)",
  type: "multi",
  max: 4,
  options: DIPS.map((d) => ({ label: d, price: 1 })),
};

const kanaSauce: ModGroup = {
  id: "sauce",
  name: "Valitse kastike",
  type: "single",
  required: true,
  options: [
    { label: "Curry mayo", price: 0 },
    { label: "American mayo (orange)", price: 0 },
    { label: "Garlic mayo", price: 0 },
    { label: "Spicy mayo", price: 0 },
  ],
};

/** build-your-own: first `n` toppings included; each beyond = lisätäyte at perVariantExtra */
function builderMods(n: number): ModGroup[] {
  return [
    {
      id: "top",
      name: "toppings",
      type: "multi",
      min: n,
      max: 12,
      perVariantExtra: [1, 2],
      options: [], // filled at runtime from settings.toppings
    },
  ];
}

const mp = (med: number, perhe: number): PriceVariant[] => [
  { label: "Med", value: med },
  { label: "Perhe", value: perhe },
];
const pa = (p: number, a: number): PriceVariant[] => [
  { label: "Pelkkä", value: p },
  { label: "Ateria", value: a },
];
const one = (v: number): PriceVariant[] => [{ label: "", value: v }];

let seq = 0;
function it(
  cat: string,
  name: string,
  prices: PriceVariant[],
  desc?: string,
  tags?: Tag[],
  mods?: ModGroup[]
): MenuItem {
  seq += 1;
  return { id: `${cat}-${seq}`, cat, name, desc, prices, tags, mods };
}

export const CATEGORIES: Category[] = [
  { id: "specials", title: "South Asian Specials", en: "South Asian Specials" },
  { id: "pizza1", title: "Pizzat · 1 täyte", en: "Pizzas · 1 topping" },
  { id: "pizza2", title: "Pizzat · 2 täytettä", en: "Pizzas · 2 toppings" },
  { id: "pizza3", title: "Pizzat · 3 täytettä", en: "Pizzas · 3 toppings" },
  { id: "pizza4", title: "Pizzat · 4 täytettä", en: "Pizzas · 4 toppings" },
  { id: "pizza5", title: "Pizzat · 5 täytettä", en: "Pizzas · 5 toppings" },
  { id: "fantasia", title: "Fantasia Pizzat", en: "Fantasia Pizzas · build your own" },
  { id: "pannu", title: "Pannu Pizzat", en: "Pannu Pizzas · pan pizza" },
  { id: "burgers", title: "Hampurilaiset", en: "Burgers" },
  { id: "zinger", title: "Crispy-Zinger Kana Burger", en: "Crispy Zinger Chicken Burgers" },
  { id: "kebab", title: "Kebab-Annokset", en: "Kebab Dishes" },
  { id: "kanakebab", title: "Kana Kebab-Annokset", en: "Chicken Kebab Dishes" },
  { id: "shawarma", title: "Shawarma", en: "Shawarma" },
  { id: "grilli", title: "Grilli-Annokset", en: "Grill Dishes" },
  { id: "falafel", title: "Falafel Kasvis", en: "Falafel · Vegetarian" },
  { id: "salads", title: "Salaatit", en: "Salads" },
  { id: "wings", title: "Wings Tarjouksia", en: "Wings Deals" },
  { id: "mix", title: "Mix Tarjouksia", en: "Mix Deals" },
  { id: "koivet", title: "Koivet Tarjouksia", en: "Drumstick Deals" },
  { id: "wraps", title: "Kana Wrap Tarjouksia", en: "Chicken Wrap Deals" },
  { id: "fillets", title: "Fileepalat Tarjouksia", en: "Fillet Strips Deals" },
  { id: "fish", title: "Fish & Chips", en: "Fish & Chips" },
  { id: "buckets", title: "Kori Tarjoukset", en: "Bucket Deals" },
  { id: "noodles", title: "Noodles", en: "Noodles" },
  { id: "rice", title: "Rice", en: "Rice" },
  { id: "naan", title: "Naan Leipää", en: "Naan Breads" },
  { id: "curries", title: "Curries", en: "Curries" },
  { id: "sides", title: "Lisukkeet / Sides", en: "Sides" },
  { id: "dips", title: "Extra Dipit", en: "Extra Dips" },
  { id: "drinks", title: "Juomat", en: "Drinks" },
];

export const CATEGORY_IMG: Record<string, string> = {
  specials: "/menu/specials/karachi-biryani.webp",
  pizza1: "/menu/pizza/margareta-tupla-juusto.webp",
  pizza2: "/menu/pizza/torino.webp",
  pizza3: "/menu/pizza/maestro.webp",
  pizza4: "/menu/pizza/apollo.webp",
  pizza5: "/menu/pizza/seafood.webp",
  fantasia: "/menu/pizza/fantasia.webp",
  pannu: "/menu/pizza/pannu.webp",
  burgers: "/menu/burgers/premiumhampurilainen.webp",
  zinger: "/menu/zinger/tulinen-zinger.webp",
  kebab: "/menu/kebab/ranskalaisilla.webp",
  kanakebab: "/menu/kanakebab/ranskalaisilla.webp",
  shawarma: "/menu/shawarma/ateria.webp",
  grilli: "/menu/grilli/makkaraperunat.webp",
  falafel: "/menu/falafel/pitaleivalla.webp",
  salads: "/menu/salads/salaatti.webp",
  wings: "/menu/wings/small.webp",
  mix: "/menu/mix/small.webp",
  koivet: "/menu/koivet/small.webp",
  wraps: "/menu/wraps/crispy.webp",
  fillets: "/menu/fillets/small.webp",
  fish: "/menu/fish/fish-chips.webp",
  buckets: "/menu/buckets/l-bucket.webp",
  noodles: "/menu/noodles/chicken-chow-mein.webp",
  rice: "/menu/rice/chicken-biryani.webp",
  naan: "/menu/naan/plain.webp",
  curries: "/menu/curries/karahi.webp",
  sides: "/menu/sides/ranskalaiset.webp",
  dips: "/menu/dips/dip-rivi.webp",
  drinks: "/menu/drinks/cola.webp",
};

export const MENU: MenuItem[] = [
  // ── South Asian Specials ──
  { ...it("specials", "Halwa Puri Platter", one(9.9), "Puri, halwa, channa", ["popular", "veg"]), nameFi: "Halwa Puri -annos", availability: { days: [0], mode: "preorder_only", preorderCutoff: { day: 6, time: "18:00" }, leadTimeHours: 18 } },
  { ...it("specials", "Extra Puri", one(0.7), "Add-on", ["veg"]), availability: { days: [0], mode: "preorder_only", preorderCutoff: { day: 6, time: "18:00" }, leadTimeHours: 18 } },
  it("specials", "Karachi Biryani", one(9.9), "Served with raita", ["popular", "spicy"]),
  it("specials", "Biryani Meal", one(12.8), "Biryani + cold drink + chicken shami + raita + salad", ["popular"]),
  it("specials", "Biryani Half Plate", one(4.9), "Served with raita"),
  it("specials", "Samosa (1 pc)", one(2.8), "Served with ketchup & raita"),
  it("specials", "Samosa (2 pcs)", one(5.2), "Served with ketchup & raita"),
  it("specials", "Shami Kebab", one(1.8)),
  it("specials", "Zinger Paratha", one(3.9), undefined, ["spicy"]),
  it("specials", "Tea", one(2.9), undefined, ["veg"]),
  it("specials", "Lassi", one(2.9), undefined, ["veg"]),

  // ── Pizzat 1 täyte ──
  it("pizza1", "Margareta (tupla juusto)", mp(10.5, 20), undefined, ["veg"]),
  it("pizza1", "Jauheliha", mp(10.5, 20)),
  it("pizza1", "Salami", mp(10.5, 20)),
  it("pizza1", "Pepperoni", mp(10.5, 20), undefined, ["spicy"]),

  // ── Pizzat 2 täytettä ──
  it("pizza2", "Tropicana", mp(11.5, 22), "Kinkku, ananas"),
  it("pizza2", "Opera", mp(11.5, 22), "Kinkku, tonnikala"),
  it("pizza2", "Sicilia", mp(11.5, 22), "Salami, pepperoni", ["spicy"]),
  it("pizza2", "Roma", mp(11.5, 22), "Kinkku, herkkusieni"),
  it("pizza2", "Capriccioca", mp(11.5, 22), "Kinkku, salami"),
  it("pizza2", "Palermo", mp(11.5, 22), "Jauheliha, sipuli"),

  // ── Pizzat 3 täytettä ──
  it("pizza3", "Americana Special", mp(12.5, 24), "Kinkku, ananas, aurajuusto"),
  it("pizza3", "Opera Special", mp(12.5, 24), "Kinkku, tonnikala, salami"),
  it("pizza3", "Seafood", mp(12.5, 24), "Tonnikala, katkarapu, simpukka"),
  it("pizza3", "Chicken Hawaii", mp(12.5, 24), "Kana, ananas, aurajuusto"),
  it("pizza3", "Romesco", mp(12.5, 24), "Herkkusieni, paprika, ananas", ["veg"]),
  it("pizza3", "Milano", mp(12.5, 24), "Tonnikala, pepperoni, oliivi", ["spicy"]),

  // ── Pizzat 4 täytettä ──
  it("pizza4", "Bella Roma", mp(13.5, 26), "Kana, ananas, aurajuusto, tomaatti", ["popular"]),
  it("pizza4", "Quatro", mp(13.5, 26), "Kinkku, herkkusieni, tonnikala, katkarapu"),
  it("pizza4", "Vegatariana Special", mp(13.5, 26), "Feta, oliivi, tomaatti, paprika", ["veg"]),
  it("pizza4", "Torino", mp(13.5, 26), "Kinkku, herkkusieni, tonnikala, salami"),
  it("pizza4", "Romeo", mp(13.5, 26), "Kebab, aurajuusto, tomaatti, oliivi"),
  it("pizza4", "Familia", mp(13.5, 26), "Kebab, tomaatti, sipuli, jalapeno", ["spicy"]),
  it("pizza4", "Paradise", mp(13.5, 26), "Kana, sipuli, tomaatti, oliivi"),
  it("pizza4", "Julia", mp(13.5, 26), "Ananas, jauheliha, salami, tomaatti"),
  it("pizza4", "Viola", mp(13.5, 26), "Kebab, kinkku, salami, feta"),
  it("pizza4", "Italiana", mp(13.5, 26), "Kana, oliivi, pepperoni, sipuli", ["spicy"]),
  it("pizza4", "Perfetta", mp(13.5, 26), "Kebab, kinkku, aurajuusto, majoneesi"),
  it("pizza4", "Apollo", mp(13.5, 26), "Kebab, ananas, aurajuusto, majoneesi"),
  it("pizza4", "Classico", mp(13.5, 26), "Kebab, jauheliha, tonnikala, majoneesi"),
  it("pizza4", "Oriental", mp(13.5, 26), "Kebab, kinkku, ananas, majoneesi"),
  it("pizza4", "Maestro", mp(13.5, 26), "Kebab, pekoni, herkkusieni, salami"),

  // ── Pizzat 5 täytettä ──
  it("pizza5", "Napoli Special", mp(14.5, 28), "Kebab, kinkku, ananas, jalapeno, majoneesi", ["spicy"]),
  it("pizza5", "Calzone", mp(14.5, 28), "Kebab, tomaatti, aurajuusto, ananas, oliivi"),
  it("pizza5", "BBQ-pizza", mp(14.5, 28), "Kana, BBQ, pekoni, aurajuusto, kinkku"),
  it("pizza5", "Capollo", mp(14.5, 28), "Kebab, ananas, paprika, aurajuusto, valkosipulimajoneesi"),
  it("pizza5", "Formaggio", mp(14.5, 28), "Aurajuusto, feta, mozzarella, edam, cheddar", ["veg"]),

  // ── Fantasia ──
  it("fantasia", "Fantasia Pizza 1 Täyte", mp(10.5, 20), "Build-your-own · 1 topping included", undefined, builderMods(1)),
  it("fantasia", "Fantasia Pizza 2 Täytettä", mp(11.5, 22), "Build-your-own · 2 toppings included", undefined, builderMods(2)),
  it("fantasia", "Fantasia Pizza 3 Täytettä", mp(12.5, 24), "Build-your-own · 3 toppings included", undefined, builderMods(3)),
  it("fantasia", "Fantasia Pizza 4 Täytettä", mp(13.5, 26), "Build-your-own · 4 toppings included", undefined, builderMods(4)),
  it("fantasia", "Fantasia Pizza 5 Täytettä", mp(14.5, 28), "Build-your-own · 5 toppings included", undefined, builderMods(5)),

  // ── Pannu ──
  it("pannu", "Pannu Pizza 1 Täyte", mp(11.5, 22), "Pan pizza · 1 topping included", undefined, builderMods(1)),
  it("pannu", "Pannu Pizza 2 Täytettä", mp(12.5, 24), "Pan pizza · 2 toppings included", undefined, builderMods(2)),
  it("pannu", "Pannu Pizza 3 Täytettä", mp(13.5, 26), "Pan pizza · 3 toppings included", undefined, builderMods(3)),
  it("pannu", "Pannu Pizza 4 Täytettä", mp(14.5, 28), "Pan pizza · 4 toppings included", undefined, builderMods(4)),
  it("pannu", "Pannu Pizza 5 Täytettä", mp(15.5, 30), "Pan pizza · 5 toppings included", undefined, builderMods(5)),

  // ── Burgers ──
  it("burgers", "Juustohampurilainen", pa(8, 11)),
  it("burgers", "Kananmuna hampurilainen", pa(9, 12)),
  it("burgers", "Aurahampurilainen", pa(9, 12)),
  it("burgers", "Kerroshampurilainen", pa(10, 13), "2× pihvi, 2× juusto"),
  it("burgers", "Herkkuhampurilainen", pa(11, 14), "2× pihvi, kananmuna"),
  it("burgers", "Premiumhampurilainen", pa(12, 15), "3× pihvi, 3× juusto", ["popular"]),

  // ── Zinger ──
  it("zinger", "Zinger Kana Burgeri", pa(7.5, 11), undefined, undefined, [spiceMod]),
  it("zinger", "Peri Peri-Grillattu Kanaburgeri", pa(7.5, 11), undefined, ["spicy"], [spiceMod]),
  it("zinger", "Tulinen Zinger Kana Burgeri", pa(8, 11.5), undefined, ["spicy"], [spiceMod]),
  it("zinger", "Kanahampurilainen", pa(7.5, 11)),

  // ── Kebab ──
  it("kebab", "Pitaleivällä Kebab", one(11), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Kebab Ranskalaisilla", one(13), "Kebab sauce, salad, tomato, pickle, mayo", ["popular"]),
  it("kebab", "Kebab Lohkoperunoilla", one(13), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Kebab Iskender", one(13), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Kebab Riisillä", one(13), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Kebab Salaatilla", one(12), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Rullakebab", one(13), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Rullakebab Fetajuustolla", one(14), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Rullakebab Aurajuustolla", one(14), "Kebab sauce, salad, tomato, pickle, mayo"),
  it("kebab", "Erikoisrulla", one(16), "Kebab sauce, salad, tomato, pickle, mayo"),

  // ── Kana kebab ──
  it("kanakebab", "Pitaleivällä Kana Kebab", one(11), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Kebab Ranskalaisilla", one(13), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Kebab Lohkoperunoilla", one(13), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Kebab Iskender", one(13), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Kebab Riisillä", one(13), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Kebab Salaatilla", one(12), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Rullakebab", one(13), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Rullakebab Fetajuustolla", one(14), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Rullakebab Aurajuustolla", one(14), undefined, undefined, [kanaSauce]),
  it("kanakebab", "Kana Erikoisrulla", one(16), undefined, undefined, [kanaSauce]),

  // ── Shawarma ──
  it("shawarma", "Shawarma Ateria", one(13.5), "Meal"),
  it("shawarma", "Shawarma Rulla", one(11.5)),
  it("shawarma", "Spicy Shawarma Ateria", one(14), undefined, ["spicy"]),
  it("shawarma", "Spicy Shawarma Rulla", one(12), undefined, ["spicy"]),
  it("shawarma", "Napoli Shawarma Ateria", one(14.5)),
  it("shawarma", "Napoli Shawarma Rulla", one(12.5)),

  // ── Grilli ──
  it("grilli", "Makkaraperunat", one(7)),
  it("grilli", "Makkaraperunat Kebabilla", one(11)),
  it("grilli", "Juustomakkaraperunat", one(10)),
  it("grilli", "Jättilautanen", one(14.5), undefined, ["popular"]),
  it("grilli", "Grillilautanen", one(13)),
  it("grilli", "Talon Lautanen", one(16)),

  // ── Falafel ──
  it("falafel", "Pitaleivällä Falafel", one(10), "Tomato, salt cucumber, salad, mayo", ["veg"]),
  it("falafel", "Falafel Ranskalaisilla", one(10), "Tomato, salt cucumber, salad, mayo", ["veg"]),
  it("falafel", "Falafel Riisillä", one(10), "Tomato, salt cucumber, salad, mayo", ["veg"]),
  it("falafel", "Falafel Rulla", one(10), "Tomato, salt cucumber, salad, mayo", ["veg"]),

  // ── Salads ──
  it("salads", "Tonnikalasalaatti", one(10)),
  it("salads", "Katkarapusalaatti", one(10)),
  it("salads", "Fetasalaatti", one(10), undefined, ["veg"]),
  it("salads", "Kinkkusalaatti", one(10)),

  // ── Wings ──
  it("wings", "Crispy Wings 4kpl", one(5.5), undefined, undefined, [spiceMod, dipMod]),
  it("wings", "Crispy Wings 6kpl", pa(7.5, 11), "Meal: drink + fries + dip", ["popular"], [spiceMod, dipMod]),
  it("wings", "Crispy Wings 9kpl", pa(9.5, 13), "Meal: drink + fries + dip", undefined, [spiceMod, dipMod]),
  it("wings", "Crispy Wings 12kpl", one(11.5), undefined, undefined, [spiceMod, dipMod]),
  it("wings", "Crispy Wings 18kpl", one(16), undefined, undefined, [spiceMod, dipMod]),
  it("wings", "Crispy Wings 24kpl", one(20), undefined, undefined, [spiceMod, dipMod]),

  // ── Mix ──
  it("mix", "Wings×4, Legs×1, Fillet×1", pa(10, 13), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("mix", "Wings×2, Legs×2, Fillet×2", pa(11.5, 14), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("mix", "Wings×4, Legs×2, Fillet×2", pa(12.5, 15), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("mix", "Wings×6, Legs×2, Fillet×2", one(14.5), undefined, undefined, [dipMod]),

  // ── Koivet ──
  it("koivet", "Tasty Koivet 2kpl", pa(6.5, 10.5), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("koivet", "Tasty Koivet 3kpl", pa(9.5, 13), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("koivet", "Tasty Koivet 4kpl", pa(12, 14.5), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("koivet", "Tasty Koivet 5kpl", one(14.5), undefined, undefined, [dipMod]),
  it("koivet", "Tasty Koivet 9kpl", one(24.5), undefined, undefined, [dipMod]),
  it("koivet", "Tasty Koivet 12kpl", one(32), undefined, undefined, [dipMod]),

  // ── Wraps ──
  it("wraps", "Crispy Chicken Wrap", pa(8, 11.5), "Meal: drink + fries + dip"),
  it("wraps", "Tulinen Chicken Wrap", pa(8, 11.5), "Meal: drink + fries + dip", ["spicy"], [spiceMod]),
  it("wraps", "Grillattua Chicken Wrap", pa(8.5, 12), "Meal: drink + fries + dip"),

  // ── Fillets ──
  it("fillets", "Fillet Strips 3kpl", pa(5.5, 9), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("fillets", "Fillet Strips 4kpl", pa(7.5, 11), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("fillets", "Fillet Strips 6kpl", pa(10, 13), "Meal: drink + fries + dip", undefined, [dipMod]),
  it("fillets", "Fillet Strips 8kpl", one(13.5), undefined, undefined, [dipMod]),
  it("fillets", "Fillet Strips 10kpl", one(16.5), undefined, undefined, [dipMod]),
  it("fillets", "Fillet Strips 12kpl", one(19), undefined, undefined, [dipMod]),

  // ── Fish & chips ──
  it("fish", "Fish & Chips", one(6.5), "Kala & ranska"),
  it("fish", "Fish & Chips + juoma 0.33l", one(8)),

  // ── Buckets ──
  it("buckets", "S-Bucket", one(29), "6 wings, 4 fillet strips, 2 legs, 2 nuggets, 2 onion rings, 2 fries, 2 dips, 1.5L drink", ["popular"]),
  it("buckets", "M-Bucket", one(39), "9 wings, 6 fillet strips, 3 legs, 3 nuggets, 3 onion rings, 3 fries, 3 dips, 1.5L drink"),
  it("buckets", "L-Bucket", one(48), "12 wings, 8 fillet strips, 4 legs, 4 nuggets, 4 onion rings, 4 fries, 4 dips, 1.5L drink"),
  it("buckets", "XL-Bucket", one(58), "15 wings, 10 fillet strips, 5 legs, 5 nuggets, 5 onion rings, 5 fries, 5 dips, 2× 1.5L drinks"),

  // ── Noodles ──
  it("noodles", "Chicken Chow Mein", one(11)),
  it("noodles", "Vegetables Chow Mein", one(10), undefined, ["veg"]),
  it("noodles", "Paistettua Jauhelihamakaronia", one(12)),

  // ── Rice ─
  it("rice", "Egg Fried Rice", one(12), "Includes raita and salad"),
  it("rice", "Vegetable Fried Rice", one(10), "Includes raita and salad", ["veg"]),
  it("rice", "Chicken Biryani", one(15), "Includes raita and salad", ["popular"]),
  it("rice", "Boiled Rice", one(8), undefined, ["veg"]),

  // ── Naan ──
  it("naan", "Plain Naan", one(2), undefined, ["veg"]),
  it("naan", "Voi Naan", one(2.5), "Butter naan", ["veg"]),
  it("naan", "Valkosipuli Naan", one(3.5), "Garlic naan", ["veg"]),

  // ── Curries ──
  it("curries", "Boneless Chicken Karahi", pa(15, 18), "Includes one naan + salad", ["popular", "spicy"]),
  it("curries", "Butter Chicken", pa(15, 18), "Includes one naan + salad", ["popular"]),
  it("curries", "Chicken Manchurian", pa(14, 17.5), "Includes one naan + salad"),
  it("curries", "Paistetut Linssit", pa(10, 12), "Lentils · includes one naan + salad", ["veg"]),

  // ── Sides ──
  it("sides", "Onion Rings", [
    { label: "3pc", value: 2 },
    { label: "6pc", value: 3.9 },
  ], undefined, ["veg"]),
  it("sides", "Mozzarella Sticks", [
    { label: "3pc", value: 3 },
    { label: "6pc", value: 5.9 },
  ], undefined, ["veg"]),
  it("sides", "Ranskalaiset", [
    { label: "Med", value: 3 },
    { label: "Large", value: 5 },
  ], "Fries", ["veg"]),
  it("sides", "Vegetarian Samosa", [
    { label: "1pc", value: 3.5 },
    { label: "2pc", value: 6 },
  ], undefined, ["veg"]),

  // ── Dips ──
  ...DIPS.map((d) => it("dips", d, one(1), "Each dip €1.00", ["veg"])),

  // ── Drinks ──
  it("drinks", "Coca-Cola", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Coca-Cola Zero", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Pepsi", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Pepsi Max", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Jaffa", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Sprite", [
    { label: "0.33L", value: 2.5 },
    { label: "1.5L", value: 5 },
  ]),
  it("drinks", "Fanta", [
    { label: "0.33L", value: 2.5 },
    { label: "0.5L", value: 3.5 },
  ]),
  it("drinks", "Maito", one(3), "Milk", ["veg"]),
  it("drinks", "Kahvi", one(2), "Coffee", ["veg"]),
];

export const FEATURED = [
  {
    itemId: MENU.find((m) => m.name === "Halwa Puri Platter")!.id,
    title: "Halwa Puri Platter",
    blurb: "A weekend ritual, every day — puffy puri, golden halwa, channa.",
    img: "/img/halwa-puri.jpg",
    cat: "specials",
  },
  {
    itemId: MENU.find((m) => m.name === "Karachi Biryani")!.id,
    title: "Karachi Biryani",
    blurb: "Red-and-white Karachi style, fragrant and spicy, with cool raita.",
    img: "/img/biryani.jpg",
    cat: "specials",
  },
  {
    itemId: MENU.find((m) => m.name === "Bella Roma")!.id,
    title: "Bella Roma",
    blurb: "Our signature pizza — kana, ananas, aurajuusto, tomaatti.",
    img: "/img/pizza.jpg",
    cat: "pizza4",
  },
  {
    itemId: MENU.find((m) => m.name === "Kebab Ranskalaisilla")!.id,
    title: "Kebab Ranskalaisilla",
    blurb: "The Kuopio classic, done properly. Crispy fries, fresh salad.",
    img: "/img/kebab.jpg",
    cat: "kebab",
  },
  {
    itemId: MENU.find((m) => m.name === "Crispy Wings 6kpl")!.id,
    title: "Crispy Wings",
    blurb: "Shatteringly crisp, your spice level, dips on the side.",
    img: "/img/wings.jpg",
    cat: "wings",
  },
];

export function categoryTitle(id: string, lang: "en" | "fi" = "en"): string {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) return id;
  return lang === "fi" ? c.title : c.en ?? c.title;
}
