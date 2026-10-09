-- Customer favorites are stored as item ids so old menu rows remain valid when
-- item descriptions or images are absent. The application deduplicates on read/write.
alter table public.customers
  add column if not exists favorites text[] not null default '{}';

comment on column public.customers.favorites is 'Saved menu item ids for the customer; guests merge from localStorage on sign-in';
