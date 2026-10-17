-- Allow the kitchen to decline an order from the new-order takeover.
-- Status changes are manual only; this only widens the allowed value set.
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('placed','accepted','preparing','ready','completed','cancelled'));
