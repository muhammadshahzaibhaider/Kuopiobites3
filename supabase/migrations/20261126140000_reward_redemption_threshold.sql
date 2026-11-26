-- Keep reward redemption separate from earning the next stamp. Preserve BUG-002 recovery.
begin;
create or replace function public.process_stripe_checkout_event(
 p_event_id text, p_event_type text, p_order_id text, p_session_id text,
 p_payment_intent_id text, p_amount_total bigint, p_currency text,
 p_payment_status text, p_session_status text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
 o public.orders%rowtype;
 v_extra jsonb;
 v_state jsonb;
 v_cfg jsonb;
 v_count integer;
 v_target integer := 7;
 v_ready boolean;
 v_internal boolean := p_event_type = 'checkout.creation_failed';
 v_paid boolean := p_payment_status = 'paid';
 v_failure boolean := p_event_type in ('checkout.session.expired','checkout.session.async_payment_failed','checkout.creation_failed');
begin
 if p_event_id is null or length(p_event_id) > 255 or p_order_id is null then
   raise exception 'payment.invalidIdentity';
 end if;
 if not v_failure and p_event_type not in ('checkout.session.completed','checkout.session.async_payment_succeeded') then
   return jsonb_build_object('received',true,'ignored','unhandledEvent');
 end if;
 -- Checkout/configuration also lock settings before order/promotion rows. Keep the
 -- same order for success and expiry, preventing callback/checkout lock inversion.
 -- Absence is checked inside cleanup so the verified paid fact can still persist.
 perform 1 from public.shop_settings where id = true for update;
 select * into o from public.orders where id = p_order_id for update;
 if not found then return jsonb_build_object('received',true,'ignored','orderNotFound'); end if;
 -- A completed failure receipt is not proof that a later canonical payment
 -- was saved. Even the same event ID must recover a pending paid session.
 if exists(select 1 from public.stripe_events where event_id = p_event_id and processed_at is not null)
    and (not v_paid or (o.payment_status in ('paid','refunded') and o.stripe_paid_processed)) then
   return jsonb_build_object('received',true,'duplicate',true);
 end if;

 if v_internal then
   -- Only the backend's failed-creation path may cancel an unbound, unpaid checkout.
   if o.payment_status <> 'pending' or o.checkout_session_id is not null or o.payment_ref is not null then
     return jsonb_build_object('received',true,'ignored','alreadyBoundOrFinal');
   end if;
 else
   if p_session_id is null or p_session_id !~ '^cs_' or length(p_session_id) > 255 then
     return jsonb_build_object('received',true,'ignored','missingSession');
   end if;
   if o.checkout_session_id is not null then
     if o.checkout_session_id <> p_session_id then
       return jsonb_build_object('received',true,'ignored','sessionMismatch');
     end if;
   elsif o.payment_ref like 'cs\_%' escape '\' then
     if o.payment_ref <> p_session_id then
       return jsonb_build_object('received',true,'ignored','sessionMismatch');
     end if;
   elsif o.payment_status in ('paid','refunded') and o.payment_ref like 'pi\_%' escape '\'
      and o.payment_ref = p_payment_intent_id then
     -- Legacy paid row: matching trusted PaymentIntent + canonical Stripe metadata.
     null;
   else
     raise exception 'payment.sessionBindingUnavailable';
   end if;
   if o.payment_status = 'refunded' then
     return jsonb_build_object('received',true,'ignored','alreadyFinal');
   end if;
 end if;

 if v_paid then
   if p_amount_total is null or p_amount_total <= 0 or p_amount_total <> round(o.total * 100)::bigint
      or p_currency is distinct from 'eur'
      or p_payment_intent_id is null or p_payment_intent_id !~ '^pi_' then
     return jsonb_build_object('received',true,'ignored','invalidPayment');
   end if;
   if o.payment_status = 'refunded' then
     return jsonb_build_object('received',true,'ignored','alreadyFinal');
   end if;
   if o.payment_status = 'paid' and o.payment_ref like 'pi\_%' escape '\'
      and o.payment_ref <> p_payment_intent_id then
     return jsonb_build_object('received',true,'ignored','paymentIntentMismatch');
   end if;
   -- Payment is a fact verified against Stripe. Auxiliary cleanup must never
   -- keep a charged customer pending. The nested block is a savepoint: cleanup
   -- and its receipt roll back together while the paid flag remains durable.
   update public.orders set
     payment_status = 'paid', payment_ref = p_payment_intent_id, checkout_session_id = p_session_id,
     status = case when stripe_cancel_processed and status = 'cancelled'
                   and payment_status = 'pending' then 'placed' else status end
    where id = o.id;
   begin
   if not o.stripe_paid_processed then
     if o.customer_id is not null then
       select coalesce(extra,'{}'::jsonb) into v_extra from public.shop_settings where id = true for update;
       if not found then raise exception 'payment.settingsUnavailable'; end if;
       v_cfg := coalesce(v_extra->'orderStreak','{}'::jsonb);
       v_state := coalesce(v_extra #> array['orderStreaks',o.customer_id::text], '{}'::jsonb);
       if jsonb_typeof(v_state) <> 'object' then v_state := '{}'::jsonb; end if;
       if jsonb_typeof(v_cfg->'target') = 'number' then
         v_target := greatest(2,least(20,round((v_cfg->>'target')::numeric)::integer));
       end if;
       if coalesce(v_state->>'count','') ~ '^[0-9]+$' then
         v_count := greatest(0,least(20,(v_state->>'count')::integer));
       else v_count := 0; end if;
       v_ready := case when jsonb_typeof(v_state->'rewardReady')='boolean' then (v_state->>'rewardReady')::boolean else v_count >= v_target end;
       if ((coalesce(v_cfg->'enabled','true'::jsonb) <> 'false'::jsonb and o.total >= 10)
             or o.checkout_redeems_reward or v_state->>'pendingRedeemOrderId' = o.id)
          and coalesce(v_state->>'lastOrderId','') <> o.id then
         if o.checkout_redeems_reward or v_state->>'pendingRedeemOrderId' = o.id then
           v_state := jsonb_build_object('count',case when o.total >= 10 and coalesce(v_cfg->'enabled','true'::jsonb) <> 'false'::jsonb then 1 else 0 end,'rewardReady',false,'lastOrderId',o.id);
         elsif coalesce(v_ready,false) then
           v_state := v_state || jsonb_build_object('lastOrderId',o.id);
         else
           v_count := least(v_target,v_count+1);
           v_state := v_state || jsonb_build_object('count',v_count,'rewardReady',v_count>=v_target,'lastOrderId',o.id);
         end if;
         v_extra := jsonb_set(v_extra,'{orderStreaks}',
           case when jsonb_typeof(v_extra->'orderStreaks')='object' then v_extra->'orderStreaks' else '{}'::jsonb end,true);
         update public.shop_settings set extra = jsonb_set(v_extra,array['orderStreaks',o.customer_id::text],v_state,true)
          where id = true;
       end if;
       -- A delayed retry cannot wipe a new cart or a line edited after checkout.
       delete from public.cart_items c
        using jsonb_array_elements(coalesce(o.checkout_cart_snapshot,'[]'::jsonb)) snap
        where c.customer_id = o.customer_id and c.id::text = snap->>'id'
          and c.qty = (snap->>'qty')::integer and c.updated_at = (snap->>'updated_at')::timestamptz;
     end if;
     if o.stripe_cancel_processed and o.offer_id is not null then
       -- A contradictory late payment must not silently exceed a promotion cap.
       update public.promotions set used_count = used_count + 1 where id = o.offer_id
         and (usage_limit is null or used_count < usage_limit);
       if not found then raise exception 'payment.promotionReconciliationRequired'; end if;
     end if;
     update public.orders set stripe_paid_processed = true where id = o.id;
   end if;
   insert into public.stripe_events(event_id,processed_at) values(p_event_id,clock_timestamp())
    on conflict(event_id) do update set processed_at = excluded.processed_at;
   update public.orders set stripe_effects_error = null where id = o.id;
   exception when others then
     update public.orders set stripe_effects_error = SQLSTATE || ':' || SQLERRM where id = o.id;
     return jsonb_build_object('received',true,'paidSaved',true,'effectsPending',true);
   end;
   return jsonb_build_object('received',true,'paidSaved',true);
 elsif v_failure then
   if o.payment_status <> 'pending' then
     return jsonb_build_object('received',true,'ignored','alreadyFinal');
   end if;
   if not v_internal and not (p_payment_status = 'unpaid' and
       (p_session_status = 'expired' or p_event_type = 'checkout.session.async_payment_failed')) then
     return jsonb_build_object('received',true,'ignored','unpaidSession');
   end if;
   if not o.stripe_cancel_processed then
     if o.offer_id is not null then
       update public.promotions set used_count = greatest(0,used_count-1) where id = o.offer_id;
     end if;
     if o.customer_id is not null then
       select coalesce(extra,'{}'::jsonb) into v_extra from public.shop_settings where id = true for update;
       if not found then raise exception 'payment.settingsUnavailable'; end if;
       v_state := v_extra #> array['orderStreaks',o.customer_id::text];
       if v_state->>'pendingRedeemOrderId' = o.id then
         update public.shop_settings set extra = jsonb_set(v_extra,array['orderStreaks',o.customer_id::text],
             v_state - 'pendingRedeemOrderId',true) where id = true;
       end if;
     end if;
     update public.orders set status = 'cancelled',stripe_cancel_processed = true where id = o.id;
   end if;
 else
   return jsonb_build_object('received',true,'ignored','unpaidSession');
 end if;

 -- INSERT is the final operation of the same transaction, never an early claim.
 insert into public.stripe_events(event_id,processed_at) values(p_event_id,clock_timestamp())
 on conflict(event_id) do update set processed_at = excluded.processed_at;
 return jsonb_build_object('received',true,'paidSaved',v_paid);
end;
$function$;

revoke all on function public.process_stripe_checkout_event(text,text,text,text,text,bigint,text,text,text)
 from public, anon, authenticated;
grant execute on function public.process_stripe_checkout_event(text,text,text,text,text,bigint,text,text,text)
 to service_role;
notify pgrst,'reload schema';
commit;
