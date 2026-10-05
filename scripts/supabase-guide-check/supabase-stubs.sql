-- Minimal stand-ins for the objects a hosted Supabase project already has, so the SQL in
-- SUPABASE-SETUP.md can be executed and tested against a plain PostgreSQL 17 server.
-- Definitions of auth.uid()/auth.role()/auth.jwt() mirror Supabase's own.
-- Simulates the post-2026-05-30 default: NO automatic grants on new public tables.

create role anon          nologin noinherit;
create role authenticated nologin noinherit;
create role service_role  nologin noinherit bypassrls;
create role authenticator login   noinherit;
grant anon, authenticated, service_role to authenticator;

-- Supabase grants schema usage to the API roles; table privileges must be explicit.
grant usage on schema public to anon, authenticated, service_role;
revoke create on schema public from public;

-- ── auth schema ──────────────────────────────────────────────────────────────
create schema auth;
create table auth.users (
  instance_id        uuid,
  id                 uuid primary key default gen_random_uuid(),
  aud                varchar(255),
  role               varchar(255),
  email              varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  last_sign_in_at    timestamptz,
  phone              text unique default null,
  raw_app_meta_data  jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  banned_until       timestamptz,
  is_anonymous       boolean not null default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Supabase Auth also owns this table. The hosted Auth service inserts identities after users;
-- the guide's Google audit trigger listens here so linking an identity to an existing user is
-- audited too.
create table auth.identities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  provider_id      text not null,
  identity_data    jsonb not null default '{}'::jsonb,
  provider         text not null,
  last_sign_in_at  timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (provider, provider_id)
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- ── storage schema ───────────────────────────────────────────────────────────
create schema storage;
create table storage.buckets (
  id                 text primary key,
  name               text not null unique,
  owner              uuid,
  public             boolean default false,
  avif_autodetection boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
create table storage.objects (
  id               uuid primary key default gen_random_uuid(),
  bucket_id        text references storage.buckets(id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  path_tokens      text[] generated always as (string_to_array(name, '/')) stored,
  version          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated;
grant all on storage.buckets to service_role;

-- ── realtime ─────────────────────────────────────────────────────────────────
create publication supabase_realtime;
