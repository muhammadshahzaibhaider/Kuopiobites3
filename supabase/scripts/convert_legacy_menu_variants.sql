-- Run AFTER applying supabase/migrations and loading the menu seed.
-- Safe to re-run; normalized rows use stable IDs/on-conflict guards and legacy
-- source products are archived (never deleted) so order history remains intact.
-- Back up the project before production data changes.

-- The migration can precede the initial menu seed. Re-run the normalized
-- configuration backfill now that seeded menu rows exist.
insert into public.menu_item_variants
  (id, item_id, label, label_en, label_fi, name_en, name_fi, description_en, description_fi,
   price, weight_kg, image_url, is_default, sort_order)
select mi.id || '-v' || v.ordinality::text, mi.id,
       coalesce(nullif(v.variant ->> 'label', ''), 'Default'),
       coalesce(v.variant ->> 'labelEn', v.variant ->> 'label'),
       coalesce(v.variant ->> 'labelFi', v.variant ->> 'label'),
       coalesce(v.variant ->> 'nameEn', mi.name_en, mi.name_fi),
       coalesce(v.variant ->> 'nameFi', mi.name_fi, mi.name_en),
       coalesce(v.variant ->> 'descEn', mi.description_en),
       coalesce(v.variant ->> 'descFi', mi.description_fi),
       coalesce((v.variant ->> 'value')::numeric, mi.price_med),
       coalesce((v.variant ->> 'weightKg')::numeric, mi.weight_kg),
       coalesce(v.variant ->> 'imageUrl', mi.photo_url), v.ordinality = 1, v.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.price_variants, '[]'::jsonb)) with ordinality as v(variant, ordinality)
on conflict (id) do nothing;

insert into public.menu_item_variants
  (id, item_id, label, label_en, label_fi, name_en, name_fi, description_en, description_fi,
   price, weight_kg, image_url, is_default, sort_order)
select mi.id || '-v1', mi.id, 'Default', 'Default', 'Oletus', coalesce(mi.name_en, mi.name_fi),
       coalesce(mi.name_fi, mi.name_en), mi.description_en, mi.description_fi,
       mi.price_med, mi.weight_kg, mi.photo_url, true, 0
from public.menu_items mi
where mi.price_variants is null or jsonb_array_length(mi.price_variants) = 0
on conflict (id) do nothing;

insert into public.menu_option_groups
  (id, item_id, name_en, name_fi, selection_type, required, min_selections, max_selections, sort_order)
select mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text), mi.id,
       coalesce(g.group_json ->> 'name', 'Options'), coalesce(g.group_json ->> 'nameFi', g.group_json ->> 'name', 'Valinnat'),
       coalesce(g.group_json ->> 'type', 'multi'), coalesce((g.group_json ->> 'required')::boolean, false),
       coalesce((g.group_json ->> 'exact')::integer, (g.group_json ->> 'min')::integer, case when coalesce((g.group_json ->> 'required')::boolean, false) then 1 else 0 end),
       coalesce((g.group_json ->> 'exact')::integer, (g.group_json ->> 'max')::integer, case when g.group_json ->> 'type' = 'single' then 1 else null end), g.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.mods, '[]'::jsonb)) with ordinality as g(group_json, ordinality)
on conflict (id) do nothing;

insert into public.menu_option_choices
  (id, group_id, label_en, label_fi, topping_id, price, price_by_variant, sort_order)
select mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text) || ':c' || c.ordinality::text,
       mi.id || ':' || coalesce(g.group_json ->> 'id', g.ordinality::text),
       coalesce(c.choice ->> 'labelEn', c.choice ->> 'label', 'Option'),
       coalesce(c.choice ->> 'labelFi', c.choice ->> 'label', 'Vaihtoehto'),
       case when exists (select 1 from public.toppings topping where topping.id = c.choice ->> 'toppingId') then c.choice ->> 'toppingId' else null end,
       coalesce((c.choice ->> 'price')::numeric, 0),
       coalesce(c.choice -> 'priceByVariant', g.group_json -> 'perVariantExtra', '[]'::jsonb), c.ordinality::integer - 1
from public.menu_items mi
cross join lateral jsonb_array_elements(coalesce(mi.mods, '[]'::jsonb)) with ordinality as g(group_json, ordinality)
cross join lateral jsonb_array_elements(coalesce(g.group_json -> 'options', '[]'::jsonb)) with ordinality as c(choice, ordinality)
on conflict (id) do nothing;

-- Consolidate Biryani and Samosa sizes/pack counts into bilingual variants.
select public.convert_kuopio_bites_legacy_variants();

-- Review the resulting variants and archived source products.
select id, name_en, name_fi, price_variants, archived_at
from public.menu_items
where id in ('specials-3','specials-4','specials-5','rice-144','specials-6','specials-7','sides-156')
order by id;

select item_id, label, price, name_en, name_fi, sort_order
from public.menu_item_variants
where item_id in ('specials-3','specials-6')
order by item_id, sort_order;
