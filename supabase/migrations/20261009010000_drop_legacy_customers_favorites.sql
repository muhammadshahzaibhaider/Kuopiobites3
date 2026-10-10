-- Follow-up to 20261009000000_customer_favorites_table.sql: remove the legacy
-- array column once preference data lives in customer_favorites and the app no
-- longer selects it (the app tolerates both, so order of rollout is flexible).
-- `if exists` keeps this migration harmless on databases that never had it.
alter table public.customers drop column if exists favorites;

notify pgrst, 'reload schema';
