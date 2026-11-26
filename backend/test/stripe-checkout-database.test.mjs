import assert from "node:assert/strict";
import { test, before, beforeEach } from "node:test";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
const enabled = Boolean(url);
const run = promisify(execFile);
const quote = (v) => v === null || v === undefined ? "NULL"
  : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v)
  : "'" + (typeof v === "object" ? JSON.stringify(v) : String(v)).replaceAll("'", "''") + "'";
const query = (sql) => execFileSync("psql", [url,"-X","-qAt","-v","ON_ERROR_STOP=1","-c",sql], {encoding:"utf8"}).trim();
const queryAsync = async (sql) => (await run("psql",[url,"-X","-qAt","-v","ON_ERROR_STOP=1","-c",sql])).stdout.trim();
const fields = ["p_event_id","p_event_type","p_order_id","p_session_id","p_payment_intent_id","p_amount_total","p_currency","p_payment_status","p_session_status"];
const statement = (input) => "set role service_role; select public.process_stripe_checkout_event(" + fields.map(k=>quote(input[k])).join(",") + ");";
const processEvent = (input) => JSON.parse(query(statement(input)));
const processAsync = async (input) => JSON.parse(await queryAsync(statement(input)));
const user = "11111111-1111-4111-8111-111111111111";
let legacy;
before(() => {
 if (!enabled) return;
 const target = new URL(url);
 assert.ok(["127.0.0.1","localhost"].includes(target.hostname) && target.pathname === "/kuopio_test",
   "Refusing destructive database tests outside the dedicated local CI database");
 assert.equal(process.env.ALLOW_TEST_DATABASE_RESET,"1","Local reset must be explicitly enabled");
 query(readFileSync(new URL("./fixtures/stripe-checkout-schema.sql",import.meta.url),"utf8"));
 // Bootstrap the actual ordered application migrations against platform-owned schema stubs.
 query(readFileSync(new URL("./fixtures/hosted-schema-stubs.sql",import.meta.url),"utf8"));
 for (const file of readdirSync(new URL("../../supabase/migrations/",import.meta.url)).filter(f=>f.endsWith(".sql")).sort())
   query(readFileSync(new URL("../../supabase/migrations/"+file,import.meta.url),"utf8"));
 assert.equal(query("select has_table_privilege('authenticated','public.shop_settings','SELECT')"),"f");
 assert.equal(query("select has_table_privilege('anon','public.shop_settings','SELECT')"),"f");
 assert.equal(query("select has_table_privilege('authenticated','public.promotions','SELECT')"),"f");
 query("insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','fixture@example.invalid'); insert into public.staff_users(id,username,name,role) values ('11111111-1111-4111-8111-111111111111','fixture','fixture','kitchen'); insert into public.orders(id,customer_id,type,subtotal,vat,total,payment_status,contact_name) values ('role-test','11111111-1111-4111-8111-111111111111','pickup',10,0,10,'pending','fixture');");
 assert.throws(()=>query("set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; update public.orders set status='accepted' where id='role-test';"),/payment.notPaid/);
 query("update public.orders set payment_status='paid' where id='role-test'");
 query("set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; update public.orders set status='accepted' where id='role-test';");
 query("update public.orders set payment_status='refunded' where id='role-test'");
 assert.throws(()=>query("set role authenticated; set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; update public.orders set status='preparing' where id='role-test';"),/payment.notPaid/);
 for (const id of ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'])
   assert.throws(()=>query("set role authenticated; set request.jwt.claim.sub='"+id+"'; select extra from public.shop_settings"),/permission denied/);
 assert.throws(()=>query("set role anon; select extra from public.shop_settings"),/permission denied/);
 // Minimal payment-specific fixture tests historical upgrade/backfill and fault injection separately.
 query(readFileSync(new URL("./fixtures/stripe-checkout-schema.sql",import.meta.url),"utf8"));
 const base=readFileSync(new URL("../../supabase/migrations/20261005000000_kuopio_bites_schema.sql",import.meta.url),"utf8");
 query(base.slice(base.indexOf("create or replace function public.create_order"),base.indexOf("-- The backend (secret key")));
 query(readFileSync(new URL("../../supabase/migrations/20261126062645_stripe_checkout_integrity.sql",import.meta.url),"utf8"));
 query(readFileSync(new URL("../../supabase/migrations/20261126071000_bug002_payment_acceptance.sql",import.meta.url),"utf8"));
 query(readFileSync(new URL("../../supabase/migrations/20261126120000_audit_privacy_status.sql",import.meta.url),"utf8"));
 query(readFileSync(new URL("../../supabase/migrations/20261126130000_checkout_reliability.sql",import.meta.url),"utf8"));
 query(readFileSync(new URL("../../supabase/migrations/20261126140000_reward_redemption_threshold.sql",import.meta.url),"utf8"));
 legacy = JSON.parse(query("select jsonb_agg(to_jsonb(o)) from public.orders o"));
});
beforeEach(() => {
 if (!enabled) return;
 query("truncate public.order_refunds,public.reservations,public.stripe_events,public.cart_items,public.order_items,public.orders,public.promotions,public.shop_settings cascade; insert into public.shop_settings(id,extra) values(true,'{\"orderStreak\":{\"enabled\":true,\"target\":7},\"orderStreaks\":{}}');");
});
const dbTest = (name,fn) => test(name,{skip:!enabled},fn);
function order(over={}) {
 const row = {id:"KB-"+randomUUID(),customer_id:user,payment_ref:"cs_"+randomUUID(),...over};
 row.checkout_session_id ??= row.payment_ref?.startsWith("cs_") ? row.payment_ref : null;
 const keys = Object.keys(row);
 query("insert into public.orders("+keys.join(",")+") values("+keys.map(k=>quote(row[k])).join(",")+");");
 query("insert into public.order_items(order_id) values("+quote(row.id)+");");
 return row;
}
const cmd = (o,over={}) => ({p_event_id:"evt_"+randomUUID(),p_event_type:"checkout.session.completed",
 p_order_id:o.id,p_session_id:o.checkout_session_id,p_payment_intent_id:"pi_"+o.id,p_amount_total:1000,
 p_currency:"eur",p_payment_status:"paid",p_session_status:"complete",...over});
const row = (o) => JSON.parse(query("select to_jsonb(o) from public.orders o where id="+quote(o.id)));
const streak = () => JSON.parse(query("select coalesce(extra#>ARRAY['orderStreaks',"+quote(user)+"],'{}') from public.shop_settings where id=true"));
const count = (table) => Number(query("select count(*) from public."+table));
function failReceipt() {
 query("create function public.test_fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'injected after-effects interruption'; end $$; create trigger test_fail_receipt before insert or update on public.stripe_events for each row execute function public.test_fail_receipt();");
}
function resumeReceipt() { query("drop trigger test_fail_receipt on public.stripe_events; drop function public.test_fail_receipt();"); }

dbTest("migration backfills legacy identities without claiming old receipts completed", () => {
 assert.equal(legacy.find(o=>o.id==="legacy-paid").stripe_paid_processed,true);
 assert.equal(legacy.find(o=>o.id==="legacy-pending").checkout_session_id,"cs_legacy");
 assert.equal(query("select has_function_privilege('anon','public.process_stripe_checkout_event(text,text,text,text,text,bigint,text,text,text)','EXECUTE')"),"f");
 assert.equal(query("select has_function_privilege('authenticated','public.process_stripe_checkout_event(text,text,text,text,text,bigint,text,text,text)','EXECUTE')"),"f");
});
dbTest("valid payment atomically saves state, durable session, reward and receipt", async () => {
 const o=order();assert.equal(processEvent(cmd(o)).paidSaved,true);
 const stored=row(o);assert.equal(stored.payment_status,"paid");assert.equal(stored.checkout_session_id,o.checkout_session_id);
 assert.ok(stored.payment_ref.startsWith("pi_"));assert.equal(stored.stripe_paid_processed,true);assert.equal(streak().count,1);
 process.env.SUPABASE_URL="http://127.0.0.1:1";process.env.SUPABASE_SERVICE_ROLE_KEY="local-fixture-only";
 const {toApiOrder}=await import("../src/supabase-orders.ts");
 const mapped=toApiOrder({...stored,order_items:[]});
 assert.equal(mapped.checkoutSessionId,o.checkout_session_id);assert.equal(mapped.paymentId,stored.payment_ref);
 assert.equal(processEvent(cmd(o)).paidSaved,true);assert.equal(streak().count,1);
});
dbTest("wrong amount, currency, session and absent binding do not mutate payment", () => {
 const o=order();
 for(const over of [{p_amount_total:999},{p_currency:"usd"},{p_session_id:"cs_wrong"},{p_payment_intent_id:null}]) {
  assert.ok(processEvent(cmd(o,over)).ignored);assert.equal(row(o).payment_status,"pending");
 }
 const unbound=order({payment_ref:null,checkout_session_id:null});
 assert.throws(()=>processEvent(cmd(unbound,{p_session_id:"cs_untrusted"})),/sessionBindingUnavailable/);
 assert.equal(count("stripe_events"),0);
});
dbTest("unpaid completion cannot confirm payment; async paid success can", () => {
 const o=order();
 assert.equal(processEvent(cmd(o,{p_payment_status:"unpaid"})).ignored,"unpaidSession");
 assert.equal(row(o).payment_status,"pending");
 assert.equal(processEvent(cmd(o,{p_event_type:"checkout.session.async_payment_succeeded"})).paidSaved,true);
});
dbTest("refunded row is never marked paid and never runs paid side effects", () => {
 const o=order({payment_status:"refunded",payment_ref:"pi_original",checkout_session_id:"cs_original"});
 const r=processEvent(cmd(o));
 assert.equal(r.ignored,"alreadyFinal");assert.equal(r.paidSaved,undefined);
 assert.equal(row(o).payment_status,"refunded");assert.deepEqual(streak(),{});
});
dbTest("expiry retains order and lines; repeated distinct failures release a promotion once", () => {
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',2,5)");
 const o=order({offer_id:"promo"});const failure={p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired"};
 processEvent(cmd(o,failure));processEvent(cmd(o,{...failure,p_event_type:"checkout.session.async_payment_failed"}));
 assert.equal(row(o).status,"cancelled");assert.equal(count("order_items"),1);
 assert.equal(query("select used_count from public.promotions where id='promo'"),"1");
});
dbTest("paid/refunded rows survive failure events and wrong-session expiry cannot cancel", () => {
 for(const pay of ["paid","refunded"]) {
  const o=order({payment_status:pay});
  processEvent(cmd(o,{p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired"}));
  assert.equal(row(o).payment_status,pay);assert.equal(row(o).status,"placed");
 }
 const o=order();processEvent(cmd(o,{p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired",p_session_id:"cs_wrong"}));
 assert.equal(row(o).status,"placed");
});
dbTest("receipt failure preserves paid status, rolls back cleanup, then retries once", () => {
 const o=order();const e=cmd(o);failReceipt();
 try {assert.equal(processEvent(e).effectsPending,true);assert.equal(row(o).payment_status,"paid");assert.deepEqual(streak(),{});assert.equal(count("stripe_events"),0);assert.match(row(o).stripe_effects_error,/injected/);}
 finally {resumeReceipt();}
 processEvent(e);assert.equal(row(o).payment_status,"paid");assert.equal(streak().count,1);
 assert.equal(processEvent(e).duplicate,true);assert.equal(streak().count,1);
});
dbTest("failure after cancellation cleanup rolls back promotion and reward release", () => {
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',2,5)");
 const o=order({offer_id:"promo"});
 query("update public.shop_settings set extra=jsonb_set(extra,'{orderStreaks}',"+quote({[user]:{count:7,rewardReady:true,pendingRedeemOrderId:o.id}})+"::jsonb)");
 const e=cmd(o,{p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired"});
 failReceipt();try {assert.throws(()=>processEvent(e),/injected/);assert.equal(row(o).status,"placed");assert.equal(query("select used_count from public.promotions where id='promo'"),"2");assert.equal(streak().pendingRedeemOrderId,o.id);}
 finally {resumeReceipt();}
 processEvent(e);assert.equal(row(o).status,"cancelled");assert.equal(streak().pendingRedeemOrderId,undefined);
 assert.equal(query("select used_count from public.promotions where id='promo'"),"1");
});
dbTest("legacy receipt without completed transaction does not suppress recovery", () => {
 const o=order();const e=cmd(o);query("insert into public.stripe_events(event_id) values("+quote(e.p_event_id)+")");
 assert.equal(processEvent(e).paidSaved,true);assert.equal(streak().count,1);
 assert.equal(query("select processed_at is not null from public.stripe_events where event_id="+quote(e.p_event_id)),"t");
});
dbTest("only unchanged charged cart rows are removed; new and edited rows survive retries", () => {
 const old="2026-11-25T10:00:00Z",newer="2026-11-25T10:05:00Z",unchanged=randomUUID(),edited=randomUUID(),fresh=randomUUID();
 const o=order({checkout_cart_snapshot:[{id:unchanged,qty:1,updated_at:old},{id:edited,qty:1,updated_at:old}]});
 query("insert into public.cart_items(id,customer_id,line_key,qty,updated_at) values"+
  "("+[unchanged,user,"one",1,old].map(quote).join(",")+"),"+
  "("+[edited,user,"two",2,newer].map(quote).join(",")+"),"+
  "("+[fresh,user,"new",1,newer].map(quote).join(",")+");");
 processEvent(cmd(o));assert.equal(count("cart_items"),2);
 query("insert into public.cart_items(customer_id,line_key,qty) values("+quote(user)+",'later',1)");
 processEvent(cmd(o));assert.equal(count("cart_items"),3);
});
dbTest("concurrent duplicate success and distinct orders cannot double-credit or lose rewards", async () => {
 const same=order(),e=cmd(same);
 await Promise.all(Array.from({length:8},()=>processAsync(e)));assert.equal(streak().count,1);
 const others=Array.from({length:5},()=>order());
 await Promise.all(others.map(o=>processAsync(cmd(o))));assert.equal(streak().count,6);
 for(let i=0;i<20;i++){const o=order();processEvent(cmd(o));processEvent(cmd(o));}
 assert.equal(streak().count,7);assert.equal(streak().rewardReady,true);
 assert.equal(query("select count(*) from public.orders where payment_status='paid'"),"26");
});
dbTest("a concurrent refund wins safely without a false paid result", async () => {
 const o=order();let output="";
 const child=spawn("psql",[url,"-X","-qAt","-v","ON_ERROR_STOP=1"],{stdio:["pipe","pipe","pipe"]});
 const done=new Promise((resolve,reject)=>child.on("close",code=>code===0?resolve():reject(new Error("refund session failed"))));
 const locked=new Promise(resolve=>child.stdout.on("data",buf=>{output+=buf; if(output.includes("REFUND_LOCKED"))resolve();}));
 child.stdin.write("begin; update public.orders set payment_status='refunded' where id="+quote(o.id)+"; select 'REFUND_LOCKED';\n");
 await locked;
 const pending=processAsync(cmd(o));child.stdin.end("commit;\n");await done;
 const r=await pending;assert.equal(r.ignored,"alreadyFinal");assert.equal(r.paidSaved,undefined);assert.deepEqual(streak(),{});
});
dbTest("unbound creation failure cancels atomically but cannot cancel an existing Stripe session", () => {
 const o=order({payment_ref:null,checkout_session_id:null});
 processEvent(cmd(o,{p_event_type:"checkout.creation_failed",p_payment_status:"unpaid",p_session_status:"creation_failed",p_session_id:null}));
 assert.equal(row(o).status,"cancelled");assert.equal(count("order_items"),1);
 const bound=order();const r=processEvent(cmd(bound,{p_event_type:"checkout.creation_failed",p_payment_status:"unpaid"}));
 assert.equal(r.ignored,"alreadyBoundOrFinal");assert.equal(row(bound).status,"placed");
});

dbTest("reward redemption resets once and below-threshold payments do not stamp", () => {
 const o=order({checkout_redeems_reward:true});
 query("update public.shop_settings set extra=jsonb_set(extra,'{orderStreaks}',"+quote({[user]:{count:7,rewardReady:true,pendingRedeemOrderId:o.id}})+"::jsonb)");
 processEvent(cmd(o));processEvent(cmd(o));assert.equal(streak().count,1);assert.equal(streak().rewardReady,false);
 assert.equal(streak().pendingRedeemOrderId,undefined);
 const small=order({subtotal:9,total:9});processEvent(cmd(small,{p_amount_total:900}));assert.equal(streak().count,1);
});
dbTest("cart deletion rolls back with failed receipt and is retried safely", () => {
 const cartId=randomUUID(),time="2026-11-25T10:00:00Z";
 const o=order({checkout_cart_snapshot:[{id:cartId,qty:1,updated_at:time}]});
 query("insert into public.cart_items(id,customer_id,line_key,qty,updated_at) values("+[cartId,user,"charged",1,time].map(quote).join(",")+")");
 failReceipt();try {assert.equal(processEvent(cmd(o)).effectsPending,true);assert.equal(row(o).payment_status,"paid");assert.equal(count("cart_items"),1);}
 finally {resumeReceipt();}
 processEvent(cmd(o));assert.equal(count("cart_items"),0);
});

// BUG-002: use the same application recovery path and SQL transaction as status PATCH.
dbTest("BUG-002 missing webhook recovers canonical paid session and accepts despite cleanup failure", async () => {
 const {changePaidOrderStatus,reconcileOrderPayment}=await import("../src/order-payment.ts");
 const {toApiOrder}=await import("../src/supabase-orders.ts");
 const o=order();
 const get=async()=>toApiOrder({...row(o),order_items:[]});
 const canonical={id:o.checkout_session_id,metadata:{order_id:o.id},amount_total:1000,currency:"eur",payment_status:"paid",status:"complete",payment_intent:"pi_"+o.id};
 query("delete from public.shop_settings");
 const accepted=await changePaidOrderStatus(o.id,"accepted",{
  get,
  reconcile:order=>reconcileOrderPayment(order,{retrieveSession:async()=>canonical,process:async command=>processEvent(command)}),
  update:async(id,status)=>query("update public.orders set status="+quote(status)+" where id="+quote(id)+" and payment_status='paid' returning id")===id,
 });
 assert.equal(accepted.paymentStatus,"paid");assert.equal(accepted.statusOverride,"accepted");
 assert.equal(row(o).stripe_paid_processed,false);assert.match(row(o).stripe_effects_error,/settingsUnavailable/);
 // Late unpaid expiry cannot cancel or delete this accepted ticket.
 processEvent(cmd(o,{p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired"}));
 assert.equal(row(o).status,"accepted");assert.equal(count("order_items"),1);
 query("insert into public.shop_settings(id,extra) values(true,'{}')");
 processEvent(cmd(o));assert.equal(row(o).status,"accepted");assert.equal(row(o).stripe_effects_error,null);
});
dbTest("BUG-002 mismatched amount plus legacy duplicate receipt recovers on corrected retry",()=>{
 const o=order(),e=cmd(o);
 query("insert into public.stripe_events(event_id) values("+quote(e.p_event_id)+")");
 assert.equal(processEvent({...e,p_amount_total:999}).ignored,"invalidPayment");
 assert.equal(row(o).payment_status,"pending");
 assert.equal(processEvent(e).paidSaved,true);assert.equal(row(o).payment_status,"paid");
});
dbTest("BUG-002 reused promotion cap cannot roll back late paid confirmation",()=>{
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',1,1)");
 const o=order({offer_id:"promo",status:"cancelled",stripe_cancel_processed:true});
 const e=cmd(o);
 assert.equal(processEvent(e).effectsPending,true);assert.equal(row(o).payment_status,"paid");assert.equal(row(o).status,"placed");
 query("update public.orders set status='accepted' where id="+quote(o.id));
 processEvent(e);assert.equal(row(o).status,"accepted");
 query("update public.promotions set usage_limit=2 where id='promo'");
 processEvent(e);assert.equal(row(o).stripe_paid_processed,true);assert.equal(streak().count,1);
});

dbTest("BUG-002 completed expiry receipt cannot suppress later canonical payment on same event",()=>{
 const o=order(),e=cmd(o,{p_event_type:"checkout.session.expired",p_payment_status:"unpaid",p_session_status:"expired"});
 processEvent(e);assert.equal(row(o).status,"cancelled");
 assert.equal(processEvent({...e,p_payment_status:"paid",p_session_status:"complete"}).paidSaved,true);
 assert.equal(row(o).payment_status,"paid");assert.equal(row(o).status,"placed");assert.equal(streak().count,1);
 assert.equal(processEvent({...e,p_payment_status:"paid",p_session_status:"complete"}).duplicate,true);
});

const reserveStatement=(id,attempt,over={},itemsOver={})=>{
 const p={id,customer_id:user,type:'pickup',subtotal:10,delivery_fee:0,discount:0,vat:0,total:10,
  payment_status:'pending',contact_name:'Fixture',estimated_ready_at:new Date().toISOString(),...over};
 const items=[{line_key:'line',menu_item_id:'pizza',item_name_snapshot:'Pizza',variant_label:'Med',options:[],quantity:1,unit_price:10,line_price:10,is_preorder:false,...itemsOver}];
 return "set role service_role; select public.create_checkout_order("+[p,items,attempt,over.hash??'complete-request-hash',Boolean(over.redeem),over.capacity??null].map(quote).join(',')+");";
};
dbTest('simultaneous checkout retries reserve exactly one order, kitchen ticket and promotion use',async()=>{
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',0,1)");
 const attempt=randomUUID();
 const results=await Promise.all(Array.from({length:8},(_,i)=>queryAsync(reserveStatement('KB-race-'+i,attempt,{offer_id:'promo'}))));
 const ids=results.map(r=>JSON.parse(r).id);assert.equal(new Set(ids).size,1);
 assert.equal(count('orders'),1);assert.equal(count('order_items'),1);assert.equal(query("select used_count from public.promotions where id='promo'"),'1');
 assert.throws(()=>query(reserveStatement('KB-mismatch',attempt,{hash:'different-pizza'})),/attemptMismatch/);
});
dbTest('reward reservation is atomic, retryable and exclusive across attempts',async()=>{
 query("update public.shop_settings set extra=jsonb_set(extra,'{orderStreaks}',"+quote({[user]:{count:7,rewardReady:true}})+"::jsonb)");
 const a=randomUUID();query(reserveStatement('KB-reward',a,{redeem:true}));
 assert.equal(JSON.parse(query(reserveStatement('KB-ignored',a,{redeem:true}))).id,'KB-reward');
 assert.throws(()=>query(reserveStatement('KB-second',randomUUID(),{redeem:true})),/streak.reserved/);
 assert.equal(streak().pendingRedeemOrderId,'KB-reward');assert.equal(count('orders'),1);
});
dbTest('simultaneous preorder reservations cannot exceed the configured daily capacity',async()=>{
 const results=await Promise.allSettled([1,2].map(i=>queryAsync(reserveStatement('KB-cap-'+i,randomUUID(),{scheduled_for:'2030-01-06 12:00 Europe/Helsinki',capacity:1},{is_preorder:true}))));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(count('orders'),1);
});
dbTest('atomic checkout rollback retains no ticket or promotion use if reward/capacity validation fails',()=>{
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',0,1)");
 assert.throws(()=>query(reserveStatement('KB-fail',randomUUID(),{offer_id:'promo',redeem:true})),/notReady/);
 assert.equal(count('orders'),0);assert.equal(query("select used_count from public.promotions where id='promo'"),'0');
});
dbTest('stale configuration saves preserve paid rewards and private claims',()=>{
 const o=order();processEvent(cmd(o));
 query("update public.shop_settings set extra=extra||'{\"orderStreakClaims\":[{\"id\":\"claim\"}]}'");
 query("update public.shop_settings set extra='{\"deliveryEnabled\":true}'");
 assert.equal(streak().count,1);assert.equal(query("select extra#>>'{orderStreakClaims,0,id}' from public.shop_settings"),'claim');
});
dbTest('private-state compare-and-update rejects a stale writer after payment',()=>{
 const snapshot=query("select extra->'orderStreaks' from public.shop_settings");const o=order();processEvent(cmd(o));
 assert.throws(()=>query("set role service_role; select public.compare_private_settings('orderStreaks',"+quote(snapshot)+"::jsonb,'{}')"),/concurrentUpdate/);
 assert.equal(streak().count,1);
});
dbTest('status compare-and-update resolves conflicting accept/cancel without overwriting a winner',async()=>{
 const o=order({payment_status:'paid'});
 const results=await Promise.all(['accepted','cancelled'].map(status=>queryAsync("set role service_role; update public.orders set status="+quote(status)+" where id="+quote(o.id)+" and payment_status='paid' and status='placed' returning id")));
 assert.equal(results.filter(Boolean).length,1);assert.ok(['accepted','cancelled'].includes(row(o).status));
});
dbTest('terminal statuses cannot reopen and refunded tickets cannot be accepted',()=>{
 const o=order({payment_status:'paid',status:'completed'});
 assert.throws(()=>query("update public.orders set status='accepted' where id="+quote(o.id)),/badTransition/);
 const r=order({payment_status:'refunded'});
 assert.throws(()=>query("update public.orders set status='accepted' where id="+quote(r.id)),/notPaid/);
});
dbTest('atomic cart inserts and increments retain every simultaneous add',async()=>{
 const add=()=>queryAsync("set role service_role; select public.add_cart_line("+quote(user)+","+quote({key:'same-pizza',itemId:'pizza',qty:1,unitPrice:10,options:[]})+"::jsonb)");
 await Promise.all(Array.from({length:12},add));assert.equal(query("select qty from public.cart_items where line_key='same-pizza'"),'12');
 await Promise.all(Array.from({length:5},add));assert.equal(query("select qty from public.cart_items where line_key='same-pizza'"),'17');
});
dbTest('reservation slot contention admits one party and declined slots can be reused',async()=>{
 const reserve=i=>queryAsync("insert into public.reservations(id,date,time,status) values("+quote('R-'+i)+",'2030-01-06','18:00','pending')");
 const result=await Promise.allSettled([reserve(1),reserve(2)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 query("update public.reservations set status='declined'");await reserve(3);assert.equal(count('reservations'),2);
});
dbTest('refund pending, failure and success converge idempotently without false refund claims',()=>{
 const o=order({payment_status:'paid',payment_ref:'pi_refund'});
 const record=status=>query("set role service_role; select public.record_order_refund("+[o.id,'re_fixture',status,'pi_refund',1000,'eur'].map(quote).join(',')+")");
 for(const status of ['pending','failed']) {record(status);assert.equal(row(o).payment_status,'paid');}
 record('succeeded');record('succeeded');assert.equal(row(o).payment_status,'refunded');assert.equal(row(o).status,'completed');assert.equal(count('order_refunds'),1);
});
dbTest('refund mismatch never mutates order or operation state',()=>{
 const o=order({payment_status:'paid',payment_ref:'pi_refund'});
 assert.throws(()=>query("set role service_role; select public.record_order_refund("+[o.id,'re_wrong','succeeded','pi_wrong',1000,'eur'].map(quote).join(',')+")"),/refundMismatch/);
 assert.equal(row(o).payment_status,'paid');assert.equal(count('order_refunds'),0);
});
dbTest('simultaneous walk-in approvals award only one stamp',async()=>{
 const claim={id:'SC-fixture',userId:user,name:'Fixture',email:'fixture@example.invalid',createdAt:1,status:'pending'};
 query("set role service_role; select public.mutate_walkin_claim("+quote(claim)+",null,'create')");
 await Promise.all(Array.from({length:6},()=>queryAsync("set role service_role; select public.mutate_walkin_claim(null,'SC-fixture','approve')")));
 assert.equal(streak().count,1);assert.equal(query("select extra#>>'{orderStreakClaims,0,status}' from public.shop_settings"),'approved');
});
dbTest('customer erasure clears contacts, line notes, reward state and private claims',()=>{
 const o=order({contact_email:'fixture@example.invalid',note:'private',address:'private'});
 query("update public.order_items set note='private' where order_id="+quote(o.id));
 query("update public.shop_settings set extra=extra||"+quote({orderStreaks:{[user]:{count:2}},orderStreakClaims:[{id:'SC-private',userId:user,email:'fixture@example.invalid'},{id:'SC-other',userId:'other'}]})+"::jsonb");
 query("set role service_role; select public.erase_customer("+quote(user)+")");
 const saved=row(o);assert.equal(saved.contact_email,null);assert.equal(saved.customer_id,null);assert.equal(saved.note,null);assert.equal(saved.address,null);
 assert.equal(query("select note is null from public.order_items where order_id="+quote(o.id)),'t');
 assert.deepEqual(streak(),{});assert.equal(query("select jsonb_array_length(extra->'orderStreakClaims') from public.shop_settings"),'1');
});

dbTest('settings configuration transaction preserves counters and rolls back on a later error',()=>{
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',1,3)");
 const apply=changes=>query("set role service_role; select public.apply_settings_changes("+quote(changes)+"::jsonb)");
 apply([{table:'promotions',action:'upsert',payload:{id:'promo',active:false}}]);
 assert.equal(query("select used_count from public.promotions where id='promo'"),'1');
 const original=query("select extra from public.shop_settings");
 assert.throws(()=>apply([
  {table:'shop_settings',action:'update',id:true,payload:{extra:{newSetting:true}}},
  {table:'promotions',action:'update',id:'promo',payload:{used_count:0}}
 ]),/settings.persist.promotion/);
 assert.equal(query("select extra from public.shop_settings"),original);
 assert.equal(query("select used_count from public.promotions where id='promo'"),'1');
});


dbTest('a paid reward redemption below ten euros consumes the reward without awarding a stamp',()=>{
 const o=order({subtotal:2,total:2,checkout_redeems_reward:true});
 query("update public.shop_settings set extra=jsonb_set(extra,'{orderStreaks}',"+quote({[user]:{count:7,rewardReady:true,pendingRedeemOrderId:o.id}})+"::jsonb)");
 processEvent(cmd(o,{p_amount_total:200}));processEvent(cmd(o,{p_amount_total:200}));
 assert.equal(streak().count,0);assert.equal(streak().rewardReady,false);assert.equal(streak().pendingRedeemOrderId,undefined);
});
dbTest('configured targets above seven do not unlock rewards prematurely',()=>{
 query("update public.shop_settings set extra="+quote({orderStreak:{enabled:true,target:10},orderStreaks:{[user]:{count:7,rewardReady:false}}})+"::jsonb");
 const o=order();processEvent(cmd(o));assert.equal(streak().count,8);assert.equal(streak().rewardReady,false);
});


dbTest('expiry waits for the shared settings lock before taking promotion locks',async()=>{
 query("insert into public.promotions(id,used_count,usage_limit) values('promo',1,3)");
 const o=order({offer_id:'promo'});
 const child=spawn("psql",[url,"-X","-qAt","-v","ON_ERROR_STOP=1"],{stdio:["pipe","pipe","pipe"]});
 let output='';
 const done=new Promise((resolve,reject)=>child.on('close',code=>code===0?resolve():reject(Error('settings lock session failed'))));
 const locked=new Promise(resolve=>child.stdout.on('data',buf=>{output+=buf;if(output.includes('SETTINGS_LOCKED'))resolve()}));
 child.stdin.write("begin; select id from public.shop_settings where id=true for update; select 'SETTINGS_LOCKED';\n");
 await locked;
 let pending;
 try {
  pending=processAsync(cmd(o,{p_event_type:'checkout.session.expired',p_payment_status:'unpaid',p_session_status:'expired'}));
  let waiting=false;
  for(let i=0;i<100;i++) {
   waiting=query("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%process_stripe_checkout_event%' and query like "+quote('%'+o.id+'%'))!=='0';
   if(waiting)break;
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert.equal(waiting,true,'callback must be contending on the held settings row');
  // Before the lock-order fix, expiry already held this promotion while waiting,
  // making a settings-then-promotion checkout/config save deadlock against it.
  assert.equal(query("begin; select id from public.promotions where id='promo' for update nowait; rollback;"),'promo');
 } finally {
  child.stdin.end('commit;\n');await done;if(pending)await pending;
 }
 assert.equal(row(o).status,'cancelled');
});
