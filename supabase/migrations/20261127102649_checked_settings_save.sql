-- Serialize the existing multi-table write against the snapshot used to plan it.
create or replace function public.apply_settings_changes_checked(p_changes jsonb, p_expected timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_version timestamptz;
begin
  select updated_at into strict current_version from public.shop_settings where id = true for update;
  if p_expected is null or current_version is distinct from p_expected then
    raise exception 'settings.concurrentUpdate';
  end if;
  perform public.apply_settings_changes(p_changes);
end;
$$;
revoke all on function public.apply_settings_changes_checked(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_settings_changes_checked(jsonb, timestamptz) to service_role;

-- The dashboard action owns just this JSON field. Pickup, menu availability,
-- rewards and any concurrent settings edits stay on the same locked row.
create or replace function public.set_delivery_enabled(p_enabled boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_enabled is null then raise exception 'settings.persist.delivery'; end if;
  update public.shop_settings set extra = jsonb_set(extra, '{deliveryEnabled}', to_jsonb(p_enabled))
    where id = true;
  if not found then raise exception 'settings.persist.delivery'; end if;
end;
$$;
revoke all on function public.set_delivery_enabled(boolean) from public, anon, authenticated;
grant execute on function public.set_delivery_enabled(boolean) to service_role;
