-- Axiomic Studio — contact enquiries
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  service text not null,
  budget text not null,
  message text not null,
  source text not null default 'website:contact',
  user_agent text
);

comment on table public.leads is 'Contact-form enquiries from the Axiomic Studio site';

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx on public.leads (email);

-- The API route writes with the service-role key, which bypasses RLS.
-- No public policies: rows are never readable from the browser.
alter table public.leads enable row level security;
