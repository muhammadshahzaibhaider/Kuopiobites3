-- Service-owned settings contain private reward claims. Public shop data uses Express projections.
revoke select on table public.shop_settings, public.promotions from public, anon, authenticated;

create or replace function public.orders_status_requires_paid()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  -- Canonical payment recovery and completed full refunds are explicit internal transitions.
  if current_user in ('service_role', 'postgres') then
    if old.status = 'cancelled' and old.payment_status = 'pending'
       and new.payment_status = 'paid' and new.status = 'placed' then return new; end if;
    if old.payment_status = 'paid' and new.payment_status = 'refunded'
       and new.status = 'completed' then return new; end if;
  end if;
  if new.status <> 'cancelled' and new.payment_status <> 'paid' then
    raise exception 'payment.notPaid';
  end if;
  if not ((old.status = 'placed' and new.status in ('accepted','cancelled'))
       or (old.status = 'accepted' and new.status in ('preparing','cancelled'))
       or (old.status = 'preparing' and new.status in ('ready','cancelled'))
       or (old.status = 'ready' and new.status = 'completed')) then
    raise exception 'order.badTransition';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_status_requires_paid on public.orders;
create trigger orders_status_requires_paid before update of status on public.orders
 for each row execute function public.orders_status_requires_paid();
