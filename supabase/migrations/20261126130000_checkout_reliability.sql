-- Review/stage before deployment. No automatic production application.
begin;
alter table public.menu_items add column if not exists weight_kg numeric(7,3),
 add column if not exists is_archived boolean not null default false;
alter table public.orders add column if not exists estimated_ready_at timestamptz,
 add column if not exists checkout_attempt_id text,
 add column if not exists checkout_request_hash text;
create unique index if not exists orders_customer_checkout_attempt
 on public.orders(customer_id, checkout_attempt_id) where checkout_attempt_id is not null;

-- Preserve payment-owned private keys even when an admin saves stale configuration.
create or replace function public.preserve_private_settings()
returns trigger language plpgsql set search_path = '' as $$
begin
 if not (new.extra ? 'orderStreaks') then
   new.extra := new.extra || jsonb_build_object('orderStreaks',coalesce(old.extra->'orderStreaks','{}'::jsonb));
 end if;
 if not (new.extra ? 'orderStreakClaims') then
   new.extra := new.extra || jsonb_build_object('orderStreakClaims',coalesce(old.extra->'orderStreakClaims','[]'::jsonb));
 end if;
 return new;
end $$;
create trigger preserve_private_settings before update of extra on public.shop_settings
 for each row execute function public.preserve_private_settings();

-- Whole private-state mutations must compare the actual snapshot under the row lock.
create or replace function public.compare_private_settings(p_key text, p_expected jsonb, p_value jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare v jsonb;
begin
 if p_key not in ('orderStreaks','orderStreakClaims') then raise exception 'streak.invalidKey'; end if;
 select extra into v from public.shop_settings where id=true for update;
 if not found then raise exception 'streak.settingsUnavailable'; end if;
 if v->p_key is distinct from p_expected then raise exception 'streak.concurrentUpdate'; end if;
 update public.shop_settings set extra=jsonb_set(v,array[p_key],p_value,true) where id=true;
end $$;
revoke all on function public.compare_private_settings(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.compare_private_settings(text,jsonb,jsonb) to service_role;

-- Minimal admin mutations commit or roll back as a unit. No usage counter or private-state writes.
create or replace function public.apply_settings_changes(p_changes jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare change jsonb; row_value jsonb; tbl text; col text; cols text; assignments text; operation text;
begin
 for change in select value from jsonb_array_elements(p_changes) loop
   tbl:=change->>'table';
   if tbl not in ('shop_settings','categories','menu_items','toppings','promotions','todays_special') then raise exception 'settings.persist.invalidTable'; end if;
   operation:=case tbl when 'todays_special' then 'special' when 'promotions' then 'promotion' when 'toppings' then 'topping' else tbl end;
   begin
     if change->>'action'='delete' then
       execute format('delete from public.%I where id::text=$1',tbl) using change->>'id';
     else
       for row_value in select value from jsonb_array_elements(case when jsonb_typeof(change->'payload')='array' then change->'payload' else jsonb_build_array(change->'payload') end) loop
         cols:=''; assignments:='';
         for col in select jsonb_object_keys(row_value) loop
           if col='used_count' or col in ('created_at','updated_at')
              or (tbl='shop_settings' and col='extra' and ((row_value->'extra') ?| array['orderStreaks','orderStreakClaims'])) then
             raise exception 'settings.persist.invalidColumn';
           end if;
           cols:=cols||case when cols='' then '' else ',' end||format('%I',col);
           if col<>'id' then
             assignments:=assignments||case when assignments='' then '' else ',' end||format('%I=excluded.%I',col,col);
           end if;
         end loop;
         if change->>'action'='upsert' then
           execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(id) do update set %s',tbl,cols,cols,tbl,assignments) using row_value;
         elsif change->>'action'='update' then
           -- Select expressions from the typed record; unspecified columns remain unchanged.
           assignments:='';
           for col in select jsonb_object_keys(row_value) loop
             assignments:=assignments||case when assignments='' then '' else ',' end||format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',col,tbl,col);
           end loop;
           execute format('update public.%I set %s where id::text=$2',tbl,assignments) using row_value,change->>'id';
         else raise exception 'settings.persist.invalidAction'; end if;
       end loop;
     end if;
   exception when others then raise exception 'settings.persist.%',operation;
   end;
 end loop;
end $$;
revoke all on function public.apply_settings_changes(jsonb) from public,anon,authenticated;
grant execute on function public.apply_settings_changes(jsonb) to service_role;

-- One transaction reserves customer attempt, reward, promotion and daily preorder capacity.
create or replace function public.create_checkout_order(p_order jsonb,p_items jsonb,
 p_attempt text,p_hash text,p_redeem boolean,p_capacity integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype; v_extra jsonb; v_state jsonb; v_qty bigint; v_requested bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended('checkout:'||(p_order->>'customer_id'),0));
 select * into o from public.orders where customer_id=(p_order->>'customer_id')::uuid and checkout_attempt_id=p_attempt;
 if found then
   if o.checkout_request_hash is distinct from p_hash then raise exception 'payment.attemptMismatch'; end if;
   return jsonb_build_object('id',o.id,'reused',true);
 end if;
 -- Shared with payment RPC, serializing reward/capacity reservation and config changes.
 select extra into v_extra from public.shop_settings where id=true for update;
 if not found then raise exception 'payment.settingsUnavailable'; end if;
 if p_redeem then
   v_state := coalesce(v_extra#>array['orderStreaks',p_order->>'customer_id'],'{}'::jsonb);
   if coalesce(v_extra#>'{orderStreak,enabled}','true'::jsonb)='false'::jsonb
      or coalesce(v_state->'rewardReady','false'::jsonb)<>'true'::jsonb then raise exception 'streak.notReady'; end if;
   if v_state->>'pendingRedeemOrderId' is not null then raise exception 'streak.reserved'; end if;
 end if;
 if p_capacity is not null and p_order->>'scheduled_for' is not null then
   select coalesce(sum(i.quantity),0) into v_qty from public.orders a join public.order_items i on i.order_id=a.id
    where a.payment_status in ('pending','paid') and a.status<>'cancelled' and i.is_preorder
    and (a.scheduled_for at time zone 'Europe/Helsinki')::date =
        ((p_order->>'scheduled_for')::timestamptz at time zone 'Europe/Helsinki')::date;
   select coalesce(sum((i->>'quantity')::integer),0) into v_requested from jsonb_array_elements(p_items) i
    where (i->>'is_preorder')::boolean;
   if v_qty+v_requested>p_capacity then raise exception 'pre.errCapacity'; end if;
 end if;
 select * into o from public.create_order(p_order,p_items);
 update public.orders set checkout_attempt_id=p_attempt,checkout_request_hash=p_hash,
  checkout_redeems_reward=p_redeem,estimated_ready_at=(p_order->>'estimated_ready_at')::timestamptz,
  checkout_cart_snapshot=(select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from public.cart_items c
   where c.customer_id=o.customer_id and exists(select 1 from jsonb_array_elements(p_items) i
    where i->>'line_key'=c.line_key and (i->>'quantity')::integer=c.qty)) where id=o.id;
 if p_redeem then
   v_extra := jsonb_set(v_extra,'{orderStreaks}',coalesce(v_extra->'orderStreaks','{}'::jsonb),true);
   update public.shop_settings set extra=jsonb_set(v_extra,array['orderStreaks',o.customer_id::text],
    v_state||jsonb_build_object('pendingRedeemOrderId',o.id),true) where id=true;
 end if;
 return jsonb_build_object('id',o.id,'reused',false);
end $$;
revoke all on function public.create_checkout_order(jsonb,jsonb,text,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.create_checkout_order(jsonb,jsonb,text,text,boolean,integer) to service_role;

-- Existing UI reserves one party per time slot. Enforce that rule under contention.
create or replace function public.guard_reservation_slot()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.status='declined' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended('reservation:'||new.date::text||':'||new.time::text,0));
 if exists(select 1 from public.reservations r where r.date=new.date and r.time=new.time
   and r.status<>'declined' and r.id<>new.id) then raise exception 'resv.unavailable'; end if;
 return new;
end $$;
create trigger guard_reservation_slot before insert or update on public.reservations
 for each row execute function public.guard_reservation_slot();

-- Atomic quantity increment covers both concurrent inserts and existing lines.
create or replace function public.add_cart_line(p_customer uuid,p_line jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_qty integer;
begin
 insert into public.cart_items(customer_id,line_key,item_id,name_snap,variant_label,qty,options,note,pizza,preorder,img,unit_price)
 values(p_customer,p_line->>'key',p_line->>'itemId',p_line->>'name',coalesce(p_line->>'variantLabel',''),
   least(99,greatest(1,(p_line->>'qty')::integer)),coalesce(p_line->'options','[]'::jsonb),
   p_line->>'note',p_line->'pizza',p_line->'preorder',p_line->>'img',(p_line->>'unitPrice')::numeric)
 on conflict(customer_id,line_key) do update set qty=least(99,public.cart_items.qty+excluded.qty),updated_at=clock_timestamp()
 returning qty into v_qty;
 return v_qty;
end $$;
revoke all on function public.add_cart_line(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.add_cart_line(uuid,jsonb) to service_role;
grant select,insert,update,delete on public.cart_items,public.customer_favorites to service_role;

-- Claim identity and stamp are committed together, so an interrupted approval cannot stamp twice.
create or replace function public.mutate_walkin_claim(p_claim jsonb,p_id text,p_action text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v jsonb; claims jsonb; claim jsonb; st jsonb; user_id text; target integer; n integer;
begin
 select extra into v from public.shop_settings where id=true for update;
 if not found then raise exception 'streak.settingsUnavailable'; end if;
 claims:=coalesce(v->'orderStreakClaims','[]'::jsonb);
 if p_action='create' then
   user_id:=p_claim->>'userId';
   if coalesce(v#>'{orderStreak,enabled}','true'::jsonb)='false'::jsonb then raise exception 'streak.disabled'; end if;
   if exists(select 1 from jsonb_array_elements(claims) c where c->>'userId'=user_id and c->>'status'='pending') then raise exception 'streak.claimPending'; end if;
   st:=coalesce(v#>array['orderStreaks',user_id],'{}'::jsonb);
   if st->'rewardReady'='true'::jsonb then raise exception 'streak.rewardReady'; end if;
   claim:=p_claim||jsonb_build_object('status','pending');
   claims:=claims||jsonb_build_array(claim);
 else
   select c into claim from jsonb_array_elements(claims) c where c->>'id'=p_id;
   if claim is null then raise exception 'streak.claimNotFound'; end if;
   if claim->>'status'<>'pending' then return claim; end if;
   if p_action not in ('approve','reject') then raise exception 'streak.invalidAction'; end if;
   user_id:=claim->>'userId';
   if p_action='approve' then
     st:=coalesce(v#>array['orderStreaks',user_id],'{}'::jsonb);
     target:=greatest(2,least(20,coalesce((v#>>'{orderStreak,target}')::integer,7)));
     n:=greatest(0,least(20,coalesce((st->>'count')::integer,0)));
     if coalesce(st->'rewardReady','false'::jsonb)<>'true'::jsonb then
       n:=least(target,n+1);
       st:=st||jsonb_build_object('count',n,'rewardReady',n>=target,'lastOrderId','walkin:'||p_id);
     end if;
     v:=jsonb_set(v,'{orderStreaks}',coalesce(v->'orderStreaks','{}'::jsonb),true);
     v:=jsonb_set(v,array['orderStreaks',user_id],st,true);
   end if;
   claim:=claim||jsonb_build_object('status',case when p_action='approve' then 'approved' else 'rejected' end);
   select coalesce(jsonb_agg(case when c->>'id'=p_id then claim else c end),'[]'::jsonb) into claims from jsonb_array_elements(claims) c;
 end if;
 update public.shop_settings set extra=jsonb_set(v,'{orderStreakClaims}',claims,true) where id=true;
 return claim;
end $$;
revoke all on function public.mutate_walkin_claim(jsonb,text,text) from public,anon,authenticated;
grant execute on function public.mutate_walkin_claim(jsonb,text,text) to service_role;

-- Durable provider operation identity, even if the request/response is interrupted.
create table public.order_refunds (
 order_id text primary key references public.orders(id),
 refund_id text unique, status text not null default 'requested',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.order_refunds enable row level security;
revoke all on public.order_refunds from public,anon,authenticated;
grant all on public.order_refunds to service_role;
create or replace function public.record_order_refund(p_order_id text,p_refund_id text,p_status text,p_intent text,p_amount bigint,p_currency text)
returns void language plpgsql security invoker set search_path = '' as $$
declare o public.orders%rowtype;
begin
 select * into o from public.orders where id=p_order_id for update;
 if not found or p_refund_id is null or p_status is null or p_amount is null or o.payment_ref is distinct from p_intent or p_amount<>round(o.total*100)::bigint
    or p_currency is distinct from 'eur' then raise exception 'payment.refundMismatch'; end if;
 insert into public.order_refunds(order_id,refund_id,status) values(p_order_id,p_refund_id,p_status)
 on conflict(order_id) do update set refund_id=excluded.refund_id,status=case when public.order_refunds.status='succeeded' then 'succeeded' else excluded.status end,updated_at=now();
 if p_status='succeeded' and o.payment_status='paid' then
   update public.orders set payment_status='refunded',status='completed' where id=o.id;
 end if;
end $$;
revoke all on function public.record_order_refund(text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.record_order_refund(text,text,text,text,bigint,text) to service_role;
-- Apply the existing erasure policy to both owner and self-service paths, including private claims.
create or replace function public.erase_customer(p_customer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.order_items set note=null where order_id in (select id from public.orders where customer_id=p_customer_id);
 update public.orders set customer_id=null,contact_name='Deleted customer',contact_phone=null,
   contact_email=null,address=null,note=null where customer_id=p_customer_id;
 update public.shop_settings set extra=jsonb_set(
   jsonb_set(extra,'{orderStreaks}',coalesce(extra->'orderStreaks','{}'::jsonb)-p_customer_id::text,true),
   '{orderStreakClaims}',(select coalesce(jsonb_agg(c),'[]'::jsonb) from jsonb_array_elements(
     coalesce(extra->'orderStreakClaims','[]'::jsonb)) c where c->>'userId' is distinct from p_customer_id::text),true)
 where id=true;
 delete from public.reservations where customer_id=p_customer_id;
 delete from public.customers where id=p_customer_id;
end $$;
revoke all on function public.erase_customer(uuid) from public,anon,authenticated;
grant execute on function public.erase_customer(uuid) to service_role;
notify pgrst,'reload schema';
commit;
