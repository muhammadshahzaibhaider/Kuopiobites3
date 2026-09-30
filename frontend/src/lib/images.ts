import type { MenuItem } from "./types";

/**
 * v3.1 §32 — one image per dish, shared across size/meal variants.
 * This file is BOTH the runtime mapping (item name → image key) and the
 * generation checklist used to batch-produce the photos.
 *
 * Entry format: [categorySlug, imageKey, angle, description, ...itemNames]
 * Files live at /public/menu/<categorySlug>/<imageKey>.webp (1200×1200, WebP).
 */

export type ImageAngle = "top-down" | "45°" | "side";

export interface ImageSpec {
  cat: string;
  key: string;
  angle: ImageAngle;
  desc: string;
  items: string[];
}

type Row = [string, string, ImageAngle, string, ...string[]];

export const CATEGORY_SLUG: Record<string, string> = {
  specials: "specials",
  pizza1: "pizza",
  pizza2: "pizza",
  pizza3: "pizza",
  pizza4: "pizza",
  pizza5: "pizza",
  fantasia: "pizza",
  pannu: "pizza",
  burgers: "burgers",
  zinger: "zinger",
  kebab: "kebab",
  kanakebab: "kanakebab",
  shawarma: "shawarma",
  grilli: "grilli",
  falafel: "falafel",
  salads: "salads",
  wings: "wings",
  mix: "mix",
  koivet: "koivet",
  wraps: "wraps",
  fillets: "fillets",
  fish: "fish",
  buckets: "buckets",
  noodles: "noodles",
  rice: "rice",
  naan: "naan",
  curries: "curries",
  sides: "sides",
  dips: "dips",
  drinks: "drinks",
};

/** Branded placeholder icon per category slug (never a broken image). */
export const CATEGORY_ICON: Record<string, string> = {
  specials: "🍛",
  pizza: "🍕",
  burgers: "🍔",
  zinger: "🍔",
  kebab: "🥙",
  kanakebab: "🥙",
  shawarma: "🌯",
  grilli: "🍟",
  falafel: "🧆",
  salads: "🥗",
  wings: "🍗",
  mix: "🍗",
  koivet: "🍗",
  wraps: "🌯",
  fillets: "🍗",
  fish: "🐟",
  buckets: "🍗",
  noodles: "🍜",
  rice: "🍚",
  naan: "🫓",
  curries: "🍲",
  sides: "🍟",
  dips: "🥫",
  drinks: "🥤",
};

/* eslint-disable prettier/prettier */
const ROWS: Row[] = [
  // ── South Asian Specials ──
  ["specials", "halwa-puri", "top-down", "2 puffed puri, a mound of orange semolina halwa, chickpea channa curry, small onion/pickle side", "Halwa Puri Platter"],
  ["specials", "extra-puri", "45°", "one large puffed golden puri", "Extra Puri"],
  ["specials", "karachi-biryani", "top-down", "red-orange saffron rice with visible separate white rice grains, chicken piece, small raita bowl, lemon (NOT uniformly brown)", "Karachi Biryani"],
  ["specials", "biryani-meal", "top-down", "biryani plate plus chicken shami patty, raita, salad and a glass of cold drink", "Biryani Meal"],
  ["specials", "biryani-half", "top-down", "smaller portion of red-and-white Karachi biryani with raita", "Biryani Half Plate"],
  ["specials", "samosa", "45°", "golden triangular samosas with ketchup and raita cups", "Samosa (1 pc)", "Samosa (2 pcs)"],
  ["specials", "shami-kebab", "45°", "one round spiced beef-and-lentil patty", "Shami Kebab"],
  ["specials", "zinger-paratha", "45°", "flaky paratha wrap with crispy chicken", "Zinger Paratha"],
  ["specials", "tea", "side", "milk tea (chai) in a cup", "Tea"],
  ["specials", "lassi", "side", "tall glass of creamy lassi", "Lassi"],

  // ── Pizzas 1 topping ──
  ["pizza", "margareta-tupla-juusto", "top-down", "double mozzarella with basil on tomato sauce", "Margareta (tupla juusto)"],
  ["pizza", "jauheliha", "top-down", "seasoned minced beef crumbles on mozzarella", "Jauheliha"],
  ["pizza", "salami", "top-down", "round salami slices on mozzarella", "Salami"],
  ["pizza", "pepperoni", "top-down", "pepperoni slices with crispy edges", "Pepperoni"],

  // ── Pizzas 2 toppings ──
  ["pizza", "tropicana", "top-down", "diced ham and pineapple chunks", "Tropicana"],
  ["pizza", "opera", "top-down", "diced ham and flaked tuna", "Opera"],
  ["pizza", "sicilia", "top-down", "salami and pepperoni slices", "Sicilia"],
  ["pizza", "roma", "top-down", "diced ham and sliced mushrooms", "Roma"],
  ["pizza", "capriccioca", "top-down", "diced ham and salami", "Capriccioca"],
  ["pizza", "palermo", "top-down", "minced beef and red onion strips", "Palermo"],

  // ── Pizzas 3 toppings ──
  ["pizza", "americana-special", "top-down", "ham, pineapple and blue cheese", "Americana Special"],
  ["pizza", "opera-special", "top-down", "ham, tuna and salami", "Opera Special"],
  ["pizza", "seafood", "top-down", "tuna, shrimp and mussels", "Seafood"],
  ["pizza", "chicken-hawaii", "top-down", "chicken, pineapple and blue cheese", "Chicken Hawaii"],
  ["pizza", "romesco", "top-down", "mushrooms, peppers and pineapple", "Romesco"],
  ["pizza", "milano", "top-down", "tuna, pepperoni and olives", "Milano"],

  // ── Pizzas 4 toppings ──
  ["pizza", "bella-roma", "top-down", "chicken, pineapple, blue cheese and tomato", "Bella Roma"],
  ["pizza", "quatro", "top-down", "ham, mushrooms, tuna and shrimp", "Quatro"],
  ["pizza", "vegatariana-special", "top-down", "feta, olives, tomato and peppers", "Vegatariana Special"],
  ["pizza", "torino", "top-down", "ham, mushrooms, tuna and salami", "Torino"],
  ["pizza", "romeo", "top-down", "kebab meat, blue cheese, tomato and olives", "Romeo"],
  ["pizza", "familia", "top-down", "kebab meat, tomato, onion and jalapeno", "Familia"],
  ["pizza", "paradise", "top-down", "chicken, onion, tomato and olives", "Paradise"],
  ["pizza", "julia", "top-down", "pineapple, minced beef, salami and tomato", "Julia"],
  ["pizza", "viola", "top-down", "kebab meat, ham, salami and feta", "Viola"],
  ["pizza", "italiana", "top-down", "chicken, olives, pepperoni and onion", "Italiana"],
  ["pizza", "perfetta", "top-down", "kebab meat, ham, blue cheese and mayonnaise", "Perfetta"],
  ["pizza", "apollo", "top-down", "kebab meat, pineapple, blue cheese and mayonnaise", "Apollo"],
  ["pizza", "classico", "top-down", "kebab meat, minced beef, tuna and mayonnaise", "Classico"],
  ["pizza", "oriental", "top-down", "kebab meat, ham, pineapple and mayonnaise", "Oriental"],
  ["pizza", "maestro", "top-down", "kebab meat, bacon, mushrooms and salami", "Maestro"],

  // ── Pizzas 5 toppings ──
  ["pizza", "napoli-special", "top-down", "kebab meat, ham, pineapple, jalapeno and mayonnaise", "Napoli Special"],
  ["pizza", "calzone", "top-down", "folded calzone with kebab meat, tomato, blue cheese, pineapple and olives", "Calzone"],
  ["pizza", "bbq-pizza", "top-down", "chicken, bacon, blue cheese and ham with BBQ sauce", "BBQ-pizza"],
  ["pizza", "capollo", "top-down", "kebab meat, pineapple, peppers, blue cheese and garlic mayo", "Capollo"],
  ["pizza", "formaggio", "top-down", "five cheeses: blue, feta, mozzarella, edam and cheddar", "Formaggio"],

  // ── Fantasia / Pannu (one image each) ──
  ["pizza", "fantasia", "top-down", "loaded build-your-own pizza with many colourful toppings", "Fantasia Pizza 1 Täyte", "Fantasia Pizza 2 Täytettä", "Fantasia Pizza 3 Täytettä", "Fantasia Pizza 4 Täytettä", "Fantasia Pizza 5 Täytettä"],
  ["pizza", "pannu", "top-down", "thick pan-crust pizza in a round pan", "Pannu Pizza 1 Täyte", "Pannu Pizza 2 Täytettä", "Pannu Pizza 3 Täytettä", "Pannu Pizza 4 Täytettä", "Pannu Pizza 5 Täytettä"],

  // ── Hampurilaiset (burger only, no fries) ──
  ["burgers", "juustohampurilainen", "45°", "cheeseburger with melted cheese", "Juustohampurilainen"],
  ["burgers", "kananmuna-hampurilainen", "45°", "burger topped with a fried egg", "Kananmuna hampurilainen"],
  ["burgers", "aurahampurilainen", "45°", "burger with blue cheese", "Aurahampurilainen"],
  ["burgers", "kerroshampurilainen", "45°", "double patty double cheese burger", "Kerroshampurilainen"],
  ["burgers", "herkkuhampurilainen", "45°", "double patty burger with a fried egg", "Herkkuhampurilainen"],
  ["burgers", "premiumhampurilainen", "45°", "tall triple patty triple cheese burger", "Premiumhampurilainen"],

  // ── Crispy-Zinger ──
  ["zinger", "zinger-kana-burgeri", "45°", "crispy fried chicken fillet burger", "Zinger Kana Burgeri"],
  ["zinger", "peri-peri-kanaburgeri", "45°", "grilled chicken burger with red-orange peri peri glaze", "Peri Peri-Grillattu Kanaburgeri"],
  ["zinger", "tulinen-zinger", "45°", "spicy crispy chicken burger with chili and jalapeno", "Tulinen Zinger Kana Burgeri"],
  ["zinger", "kanahampurilainen", "45°", "plain chicken burger", "Kanahampurilainen"],

  // ── Kebab-Annokset ──
  ["kebab", "pitaleivalla", "top-down", "kebab meat in an open pita bread with salad and sauce", "Pitaleivällä Kebab"],
  ["kebab", "ranskalaisilla", "top-down", "kebab meat over french fries with salad", "Kebab Ranskalaisilla"],
  ["kebab", "lohkoperunoilla", "top-down", "kebab meat over potato wedges with salad", "Kebab Lohkoperunoilla"],
  ["kebab", "iskender", "top-down", "kebab meat over bread with yogurt and tomato sauce", "Kebab Iskender"],
  ["kebab", "riisilla", "top-down", "kebab meat with white rice and salad", "Kebab Riisillä"],
  ["kebab", "salaatilla", "top-down", "kebab meat over a fresh salad", "Kebab Salaatilla"],
  ["kebab", "rullakebab", "45°", "kebab roll wrapped and cut in half", "Rullakebab"],
  ["kebab", "rullakebab-feta", "45°", "kebab roll with feta cheese, cut in half", "Rullakebab Fetajuustolla"],
  ["kebab", "rullakebab-aura", "45°", "kebab roll with blue cheese, cut in half", "Rullakebab Aurajuustolla"],
  ["kebab", "erikoisrulla", "45°", "large loaded special kebab roll cut in half", "Erikoisrulla"],

  // ── Kana Kebab (chicken, lighter meat, orange mayo drizzle) ──
  ["kanakebab", "pitaleivalla", "top-down", "chicken kebab in an open pita with salad and orange mayo", "Pitaleivällä Kana Kebab"],
  ["kanakebab", "ranskalaisilla", "top-down", "chicken kebab over fries with orange mayo", "Kana Kebab Ranskalaisilla"],
  ["kanakebab", "lohkoperunoilla", "top-down", "chicken kebab over potato wedges with orange mayo", "Kana Kebab Lohkoperunoilla"],
  ["kanakebab", "iskender", "top-down", "chicken kebab over bread with yogurt and tomato sauce", "Kana Kebab Iskender"],
  ["kanakebab", "riisilla", "top-down", "chicken kebab with white rice and salad", "Kana Kebab Riisillä"],
  ["kanakebab", "salaatilla", "top-down", "chicken kebab over a fresh salad", "Kana Kebab Salaatilla"],
  ["kanakebab", "rullakebab", "45°", "chicken kebab roll cut in half", "Kana Rullakebab"],
  ["kanakebab", "rullakebab-feta", "45°", "chicken kebab roll with feta, cut in half", "Kana Rullakebab Fetajuustolla"],
  ["kanakebab", "rullakebab-aura", "45°", "chicken kebab roll with blue cheese, cut in half", "Kana Rullakebab Aurajuustolla"],
  ["kanakebab", "erikoisrulla", "45°", "large loaded chicken special roll cut in half", "Kana Erikoisrulla"],

  // ── Shawarma ──
  ["shawarma", "ateria", "top-down", "shawarma wrap with fries and salad", "Shawarma Ateria"],
  ["shawarma", "rulla", "45°", "shawarma roll wrapped in flatbread", "Shawarma Rulla"],
  ["shawarma", "spicy-ateria", "top-down", "spicy shawarma meal with red chili sauce, fries and salad", "Spicy Shawarma Ateria"],
  ["shawarma", "spicy-rulla", "45°", "spicy shawarma roll with red chili sauce", "Spicy Shawarma Rulla"],
  ["shawarma", "napoli-ateria", "top-down", "shawarma meal with pizza-style tomato sauce and melted cheese", "Napoli Shawarma Ateria"],
  ["shawarma", "napoli-rulla", "45°", "shawarma roll with tomato sauce and melted cheese", "Napoli Shawarma Rulla"],

  // ── Grilli ──
  ["grilli", "makkaraperunat", "top-down", "grilled sausage slices over french fries", "Makkaraperunat"],
  ["grilli", "makkaraperunat-kebab", "top-down", "sausage and fries topped with kebab meat", "Makkaraperunat Kebabilla"],
  ["grilli", "juustomakkaraperunat", "top-down", "sausage and fries with melted cheese", "Juustomakkaraperunat"],
  ["grilli", "jattilautanen", "top-down", "giant mixed grill plate with sausage, kebab, fries and salad", "Jättilautanen"],
  ["grilli", "grillilautanen", "top-down", "grill plate with sausage, fries and salad", "Grillilautanen"],
  ["grilli", "talon-lautanen", "top-down", "largest loaded house plate with several grilled items", "Talon Lautanen"],

  // ── Falafel ──
  ["falafel", "pitaleivalla", "top-down", "green-brown falafel balls in a pita with salad", "Pitaleivällä Falafel"],
  ["falafel", "ranskalaisilla", "top-down", "falafel balls with french fries and salad", "Falafel Ranskalaisilla"],
  ["falafel", "riisilla", "top-down", "falafel balls with rice and salad", "Falafel Riisillä"],
  ["falafel", "rulla", "45°", "falafel roll wrapped in flatbread, cut in half", "Falafel Rulla"],

  // ── Salads ──
  ["salads", "tonnikala", "top-down", "tuna salad bowl with lettuce, tomato and cucumber", "Tonnikalasalaatti"],
  ["salads", "katkarapu", "top-down", "shrimp salad bowl with lettuce and lemon", "Katkarapusalaatti"],
  ["salads", "feta", "top-down", "greek-style feta salad bowl with olives", "Fetasalaatti"],
  ["salads", "kinkku", "top-down", "ham salad bowl with lettuce and vegetables", "Kinkkusalaatti"],

  // ── Wings / Mix / Koivet / Fillets (portion ranges share) ──
  ["wings", "small", "45°", "crispy fried chicken wings in a paper-lined basket, small portion", "Crispy Wings 4kpl", "Crispy Wings 6kpl", "Crispy Wings 9kpl"],
  ["wings", "large", "45°", "large heap of crispy fried chicken wings in a paper-lined basket", "Crispy Wings 12kpl", "Crispy Wings 18kpl", "Crispy Wings 24kpl"],
  ["mix", "small", "45°", "basket with wings, drumsticks and fillet strips, medium portion", "Wings×4, Legs×1, Fillet×1", "Wings×2, Legs×2, Fillet×2"],
  ["mix", "large", "45°", "large basket with wings, drumsticks and fillet strips", "Wings×4, Legs×2, Fillet×2", "Wings×6, Legs×2, Fillet×2"],
  ["koivet", "small", "45°", "crispy fried chicken drumsticks in a basket, small portion", "Tasty Koivet 2kpl", "Tasty Koivet 3kpl", "Tasty Koivet 4kpl"],
  ["koivet", "large", "45°", "large basket of crispy fried chicken drumsticks", "Tasty Koivet 5kpl", "Tasty Koivet 9kpl", "Tasty Koivet 12kpl"],
  ["fillets", "small", "45°", "crispy chicken fillet strips with a dip, small portion", "Fillet Strips 3kpl", "Fillet Strips 4kpl", "Fillet Strips 6kpl"],
  ["fillets", "large", "45°", "large portion of crispy chicken fillet strips with dips", "Fillet Strips 8kpl", "Fillet Strips 10kpl", "Fillet Strips 12kpl"],

  // ── Wraps ──
  ["wraps", "crispy", "45°", "crispy chicken wrap cut diagonally", "Crispy Chicken Wrap"],
  ["wraps", "spicy", "45°", "spicy chicken wrap with red sauce, cut diagonally", "Tulinen Chicken Wrap"],
  ["wraps", "grilled", "45°", "grilled chicken wrap with visible grill marks", "Grillattua Chicken Wrap"],

  // ── Fish & Chips ──
  ["fish", "fish-chips", "45°", "battered fish fillet with french fries", "Fish & Chips"],
  ["fish", "fish-chips-juoma", "45°", "battered fish fillet with fries and a small unbranded drink", "Fish & Chips + juoma 0.33l"],

  // ── Buckets (each size its own image) ──
  ["buckets", "s-bucket", "45°", "small paper bucket with wings, strips and fries plus one dip", "S-Bucket"],
  ["buckets", "m-bucket", "45°", "medium paper bucket overflowing with wings, strips, legs and fries with dips", "M-Bucket"],
  ["buckets", "l-bucket", "45°", "large paper bucket overflowing with wings, strips, legs, nuggets, onion rings and fries with dips and an unbranded 1.5L bottle", "L-Bucket"],
  ["buckets", "xl-bucket", "45°", "extra large paper bucket overflowing with wings, strips, legs, nuggets, onion rings and fries with dips and two unbranded 1.5L bottles", "XL-Bucket"],

  // ── Noodles ──
  ["noodles", "chicken-chow-mein", "top-down", "chicken chow mein noodles with vegetables", "Chicken Chow Mein"],
  ["noodles", "vegetable-chow-mein", "top-down", "vegetable chow mein noodles", "Vegetables Chow Mein"],
  ["noodles", "jauhelihamakaroni", "top-down", "fried minced beef macaroni", "Paistettua Jauhelihamakaronia"],

  // ── Rice ──
  ["rice", "egg-fried-rice", "top-down", "egg fried rice with raita and salad", "Egg Fried Rice"],
  ["rice", "vegetable-fried-rice", "top-down", "vegetable fried rice with mixed vegetables", "Vegetable Fried Rice"],
  ["rice", "chicken-biryani", "top-down", "chicken biryani with red-and-white rice grains", "Chicken Biryani"],
  ["rice", "boiled-rice", "top-down", "plain boiled white rice", "Boiled Rice"],

  // ── Naan ──
  ["naan", "plain", "45°", "plain naan bread with charred spots", "Plain Naan"],
  ["naan", "voi", "45°", "glossy butter naan bread", "Voi Naan"],
  ["naan", "valkosipuli", "45°", "garlic naan with garlic and herbs", "Valkosipuli Naan"],

  // ── Curries ──
  ["curries", "karahi", "top-down", "boneless chicken karahi in tomato-ginger sauce with green chilies, served with naan and salad", "Boneless Chicken Karahi"],
  ["curries", "butter-chicken", "top-down", "creamy orange butter chicken in a bowl with naan and salad", "Butter Chicken"],
  ["curries", "manchurian", "top-down", "chicken manchurian in dark glossy sauce with spring onion", "Chicken Manchurian"],
  ["curries", "linssit", "top-down", "yellow fried lentils (dal) with tadka in a bowl", "Paistetut Linssit"],

  // ── Sides ──
  ["sides", "onion-rings", "45°", "golden onion rings in a basket", "Onion Rings"],
  ["sides", "mozzarella-sticks", "45°", "mozzarella sticks with a cheese pull", "Mozzarella Sticks"],
  ["sides", "ranskalaiset", "45°", "golden french fries in a basket", "Ranskalaiset"],
  ["sides", "vegetarian-samosa", "45°", "vegetarian samosas with chutney", "Vegetarian Samosa"],

  // ── Dips (one shared image) ──
  ["dips", "dip-rivi", "top-down", "a row of small sauce cups: garlic mayo, cucumber mayo, curry mayo, sweet chili mayo, chipotle ranch, hot sauce, BBQ sauce, wings sauce and raita",
    "Valkosipulimajoneesi", "Kurkkumajoneesi", "Currymajoneesi", "Makea Chili Majoneesi", "Chipotle-Ranchmajoneesi",
    "Tulinen Kastike", "Las Vegas BBQ Kastike", "Wings Sauce (Med)", "Wings Sauce (Hot)", "Raita/Jogurttikastike"],

  // ── Drinks: GENERIC UNBRANDED ONLY (no logos, no brand names in image) ──
  ["drinks", "cola", "side", "generic unbranded dark cola in a glass with ice and condensation", "Coca-Cola", "Pepsi"],
  ["drinks", "cola-zero", "side", "generic unbranded dark zero-sugar cola in a glass with ice", "Coca-Cola Zero", "Pepsi Max"],
  ["drinks", "orange-soda", "side", "generic unbranded orange soda in a glass with ice", "Jaffa", "Fanta"],
  ["drinks", "lemon-lime-soda", "side", "generic unbranded clear lemon-lime soda in a glass with ice and a lemon slice", "Sprite"],
  ["drinks", "milk", "side", "glass of cold milk", "Maito"],
  ["drinks", "coffee", "side", "black coffee in a cup on a saucer", "Kahvi"],
];
/* eslint-enable prettier/prettier */

export const IMAGE_MANIFEST: ImageSpec[] = ROWS.map(([cat, key, angle, desc, ...items]) => ({
  cat,
  key,
  angle,
  desc,
  items,
}));

/** item name (exact, as in menu.ts) → image key */
export const IMAGE_KEY_BY_NAME: Record<string, string> = {};
for (const spec of IMAGE_MANIFEST) for (const n of spec.items) IMAGE_KEY_BY_NAME[n] = spec.key;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** image key for an item: manifest sharing → slug fallback */
export function itemImageKey(m: MenuItem): string {
  return m.imageKey ?? IMAGE_KEY_BY_NAME[m.name] ?? slugify(m.name);
}

/** public path for an item's photo (may 404 → placeholder) */
export function itemImagePath(m: MenuItem): string {
  const cat = CATEGORY_SLUG[m.cat] ?? slugify(m.cat);
  return `/menu/${cat}/${itemImageKey(m)}.webp`;
}

export function specPath(cat: string, key: string): string {
  return `/menu/${cat}/${key}.webp`;
}

/** images still to generate — used by the coverage report and batching */
export function missingSpecs(have: Set<string>): ImageSpec[] {
  return IMAGE_MANIFEST.filter((s) => !have.has(specPath(s.cat, s.key)));
}
