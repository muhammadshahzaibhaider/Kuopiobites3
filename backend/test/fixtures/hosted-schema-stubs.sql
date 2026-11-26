-- Disposable platform schema stand-ins; application migrations are loaded unchanged.
drop schema if exists private cascade;
drop schema if exists auth cascade;
drop schema if exists storage cascade;
drop schema public cascade;
create schema public;
create schema auth;
create schema storage;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
create table auth.users(id uuid primary key,email text,phone text,email_confirmed_at timestamptz,
 raw_user_meta_data jsonb not null default '{}',raw_app_meta_data jsonb not null default '{}');
create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),provider text,identity_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);

drop publication if exists supabase_realtime;
create publication supabase_realtime;
