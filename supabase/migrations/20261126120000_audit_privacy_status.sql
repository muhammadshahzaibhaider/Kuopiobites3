-- KB-A01 / KB-A03: repo-only until independently reviewed. Do not auto-apply to production.
-- Public clients must not read shop_settings.extra reward claims.
-- Direct staff JWT updates must not accept unpaid orders.

revoke select on table public.shop_settings from anon;
-- Authenticated app traffic uses the Express service role, not PostgREST.

create or replace function public.orders_status_requires_paid()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and new.status not in ('placed', 'cancelled')
     and new.payment_status is distinct from 'paid'
     and new.payment_status is distinct from 'refunded' then
    raise exception 'payment.notPaid';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_requires_paid on public.orders;
create trigger orders_status_requires_paid
  before update of status on public.orders
  for each row execute function public.orders_status_requires_paid();
