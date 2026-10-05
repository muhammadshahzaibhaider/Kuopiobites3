create table public.newsletter_subscribers (
  email text primary key,
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
grant select, insert, update, delete on public.newsletter_subscribers to service_role;

create or replace function public.erase_customer(p_customer_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
     set customer_id = null,
         contact_name = 'Deleted customer',
         contact_phone = null,
         contact_email = null,
         address = null,
         note = null
   where customer_id = p_customer_id;

  delete from public.reservations where customer_id = p_customer_id;
  delete from public.customers where id = p_customer_id;
end $$;

revoke all on function public.erase_customer(uuid) from public, anon, authenticated;
grant execute on function public.erase_customer(uuid) to service_role;