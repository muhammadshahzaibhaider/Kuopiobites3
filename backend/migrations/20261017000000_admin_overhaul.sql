-- Kuopio Bites admin/customer improvements (additive; safe to re-run).
-- Before applying, create a verified database backup. Apply after the existing
-- base schema in /supabase/migrations via Supabase SQL Editor or an operator-
-- controlled migration process. This file is intentionally under backend/ to
-- respect the approved feature-edit boundary.

begin;

alter table public.menu_items
  add column if not exists weight_kg numeric(7,3),
  add column if not exists is_archived boolean not null default false;

alter table public.orders
  add column if not exists estimated_ready_at timestamptz;

create index if not exists menu_items_active_category_idx
  on public.menu_items (category_id, sort_order)
  where is_archived = false;

-- Consolidate the separate biryani sizes into the original stable item ID.
-- The WHERE clause means re-applying this migration won't reset later admin edits.
update public.menu_items
   set name_fi = 'Karachi Biryani',
       name_en = 'Karachi Biryani',
       description_fi = 'Tarjoillaan raitan kanssa. Ateriaan kuuluu juoma, kanashami ja salaatti.',
       description_en = 'Served with raita; meal includes a drink, chicken shami and salad.',
       price_med = 4.90,
       price_perhe = null,
       price_variants = '[{"label":"Half","value":4.90},{"label":"Full","value":9.90},{"label":"Meal","value":12.80}]'::jsonb
 where id = 'specials-3'
   and category_id = 'specials'
   and price_variants is null;

update public.menu_items
   set is_archived = true
 where id in ('specials-4', 'specials-5')
   and category_id = 'specials'
   and is_archived = false;

-- Consolidate one- and two-piece samosa selections while preserving order history.
update public.menu_items
   set name_fi = 'Samosa',
       name_en = 'Samosa',
       description_fi = 'Tarjoillaan ketsupin ja raitan kanssa.',
       description_en = 'Served with ketchup and raita.',
       price_med = 2.80,
       price_perhe = null,
       price_variants = '[{"label":"1pc","value":2.80},{"label":"2pc","value":5.20}]'::jsonb
 where id = 'specials-6'
   and category_id = 'specials'
   and price_variants is null;

update public.menu_items
   set is_archived = true
 where id = 'specials-7'
   and category_id = 'specials'
   and is_archived = false;

-- Keep the existing order-creation transaction atomic while inserting the ETA.
create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  insert into public.orders (id, customer_id, type, subtotal, delivery_fee, discount, discount_title,
                             offer_id, vat, total, payment_status, payment_ref, contact_name,
                             contact_phone, contact_email, address, note, scheduled_for, estimated_ready_at)
  select id, customer_id, type, subtotal, coalesce(delivery_fee, 0), coalesce(discount, 0),
         discount_title, offer_id, vat, total, coalesce(payment_status, 'paid'), payment_ref,
         contact_name, contact_phone, contact_email, address, note, scheduled_for, estimated_ready_at
    from jsonb_populate_record(null::public.orders, p_order)
  returning * into v_order;

  insert into public.order_items (order_id, menu_item_id, item_name_snapshot, variant_label,
                                  selected_toppings, options, is_preorder, quantity, unit_price,
                                  line_price, note)
  select v_order.id, menu_item_id, item_name_snapshot, coalesce(variant_label, ''),
         selected_toppings, coalesce(options, '{}'), coalesce(is_preorder, false),
         quantity, unit_price, line_price, note
    from jsonb_populate_recordset(null::public.order_items, p_items);

  if v_order.offer_id is not null then
    update public.promotions
       set used_count = used_count + 1
     where id = v_order.offer_id and active
       and (usage_limit is null or used_count < usage_limit)
       and (starts_at is null or starts_at <= now())
       and (expires_at is null or expires_at > now());
    if not found then
      raise exception 'order.promoUnavailable';
    end if;
  end if;

  return v_order;
end $$;

revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

commit;
