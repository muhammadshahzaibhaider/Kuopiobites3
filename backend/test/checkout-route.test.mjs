// Actual HTTP handler; external boundaries contain synthetic data only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
Object.assign(process.env,{VERCEL:'1',NODE_ENV:'test',SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',STRIPE_SECRET_KEY:'sk_test_fixture'});
const { checkoutFingerprint }=require('../src/checkout-attempt.ts');
const { customerOrderSchema }=require('../src/schemas.ts');
let status='complete',payment='paid',createCalls=0,retrieveCalls=0,order,hash,origin,server;
const body={attemptId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',type:'pickup',customer:{name:'Fixture',email:'fixture@example.invalid',phone:'0401234567'},total:10,lines:[{key:'fixture',itemId:'pizza',variantLabel:'Med',qty:1,unitPrice:10,options:[]}]};
function replace(path,patch) {
 const name=require.resolve(path),real=require(path);
 require.cache[name]={id:name,filename:name,loaded:true,exports:{...real,...patch}};
}
replace('../src/auth.ts',{
 readAuth:(req,res,next)=>{if(req.headers['x-fixture-anonymous']) return next();req.auth={sub:'fixture-user',scope:req.headers['x-session-scope']==='staff'?'staff':'customer'};next()},
 requireCustomer:(req,res,next)=>{req.customer=body.customer;next()},ensureCsrfCookie:()=>{},staffById:async()=>({id:"fixture-staff",role:"manager",active:true}),
});
replace('../src/security.ts',{csrfMatches:()=>true});
replace('../src/logic.ts',{loadSettings:async()=>({offers:[{id:'public',active:true},{id:'coded',active:true,code:'SECRET'},{id:'draft',active:false}]})});
replace('../src/supabase-orders.ts',{getOrder:async(id)=>id===order?.id?{...order}:null});
replace('../src/supabase-menu.ts',{listCategories:async()=>[]});
replace('../src/supabase.ts',{db:{
 from:table=>{if(table==='categories') return { select:()=>({limit:async()=>({data:[],error:null})}) };assert.equal(table,'orders');const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:order.id,checkout_request_hash:hash},error:null})};return q;},
 rpc:async(name)=>{assert.equal(name,'process_stripe_checkout_event');if(payment==='paid') order.paymentStatus='paid';return {data:{received:true,paidSaved:payment==='paid'},error:null};}
}});
const stripeId=require.resolve('stripe');require('stripe');
require.cache[stripeId].exports=class {
 constructor(){this.checkout={sessions:{retrieve:async()=>(retrieveCalls++,{id:'cs_original',metadata:{order_id:order.id},status,payment_status:payment,amount_total:1000,currency:'eur',payment_intent:'pi_original',url:status==='open'?'https://checkout.stripe.com/original':null}),create:async()=>{createCalls++;throw Error('unexpected duplicate checkout')}}};}
};
before(async()=>{const app=require('../src/server.ts').default;server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));origin='http://127.0.0.1:'+server.address().port;});
after(async()=>{server?.closeAllConnections();if(server) await new Promise(resolve=>server.close(resolve));});
async function request(){
 order={id:'KB-fixture',checkoutSessionId:'cs_original',paymentStatus:'pending',createdAt:Date.now()};
 hash=checkoutFingerprint({...customerOrderSchema.parse(body),total:0});createCalls=0;
 const response=await fetch(origin+'/api/checkout/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 return {response,json:await response.json()};
}
test('HTTP paid retry returns reconciled original order without a second session',async()=>{
 status='complete';payment='paid';const {response,json}=await request();assert.equal(response.status,200);assert.equal(json.data.order.id,'KB-fixture');assert.equal(json.data.order.paymentStatus,'paid');assert.equal(createCalls,0);
});
test('HTTP lost-response retry returns the same open checkout',async()=>{
 status='open';payment='unpaid';const {response,json}=await request();assert.equal(response.status,200);assert.equal(json.data.sessionId,'cs_original');assert.equal(createCalls,0);
});
test('HTTP async payment stays pending and never opens another checkout',async()=>{
 status='complete';payment='unpaid';const {response,json}=await request();assert.equal(response.status,400);assert.equal(json.error,'payment.processingPending');assert.equal(createCalls,0);
});
test('HTTP expired attempt records canonical expiry and requires a new action',async()=>{
 status='expired';payment='unpaid';const {response,json}=await request();assert.equal(response.status,400);assert.equal(json.error,'payment.attemptExpired');assert.equal(createCalls,0);
});


test('public settings exclude coupon codes and drafts while staff retains its configuration',async()=>{
 let response=await fetch(origin+'/api/settings');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.deepEqual((await response.json()).data.offers.map(o=>o.id),['public']);
 response=await fetch(origin+'/api/settings',{headers:{'x-session-scope':'staff'}});
 assert.equal((await response.json()).data.offers.length,3);
 assert.match(response.headers.get('vary'),/X-Session-Scope/i);
});

async function confirm(sessionId, anonymous = true) {
  const headers = { "content-type": "application/json" };
  if (anonymous) headers["x-fixture-anonymous"] = "1";
  const response = await fetch(origin + "/api/orders/KB-fixture/confirm-return", {
    method: "POST", headers, body: JSON.stringify({ sessionId }),
  });
  return { response, json: await response.json() };
}
function seedReturn() {
  order = { id: "KB-fixture", checkoutSessionId: "cs_original", paymentStatus: "pending", userId: "fixture-user",
    customer: body.customer, address: "Private fixture address", note: "Private fixture note", lines: [], total: 10 };
  retrieveCalls = 0; status = "complete"; payment = "paid";
}
test("return before webhook reconciles a cookie-less customer through the stored Stripe session", async () => {
  seedReturn();
  const { response, json } = await confirm("cs_original");
  assert.equal(response.status, 200); assert.equal(json.data.paymentStatus, "paid");
  assert.equal(json.data.customer.email, ""); assert.equal(json.data.checkoutSessionId, undefined);
  assert.equal(json.data.note, undefined); assert.equal(retrieveCalls, 1);
  await confirm("cs_original"); assert.equal(retrieveCalls, 1);
});
test("unpaid Stripe return stays pending and does not disclose an order", async () => {
  seedReturn(); payment = "unpaid";
  const { response, json } = await confirm("cs_original");
  assert.equal(response.status, 202); assert.deepEqual(json.data, { pending: true }); assert.equal(order.paymentStatus, "pending");
});
test("old links work for the owner; an unrelated session never triggers provider work", async () => {
  seedReturn();
  for (const session of [undefined, "cs_other"]) assert.equal((await confirm(session)).response.status, 403);
  assert.equal(retrieveCalls, 0);
  const { response, json } = await confirm(undefined, false);
  assert.equal(response.status, 200); assert.equal(json.data.userId, "fixture-user");
});
test("health is fresh; shared catalogue sets no cookies; public promotions omit coded offers", async () => {
  let response = await fetch(origin + "/api/health");
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  response = await fetch(origin + "/api/categories");
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /^public,/);
  assert.equal(response.headers.get("set-cookie"), null);
  response = await fetch(origin + "/api/promotions");
  assert.deepEqual((await response.json()).data.map((offer) => offer.id), ["public"]);
});
test("CORS preflight accepts exactly the configured origin and credentials", async () => {
  const { CFG } = require("../src/config.ts");
  const response = await fetch(origin + "/api/orders", { method: "OPTIONS",
    headers: { origin: CFG.corsOrigins[0], "access-control-request-method": "PATCH" } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), CFG.corsOrigins[0]);
  assert.equal(response.headers.get("access-control-allow-credentials"), "true");
});

test("staff logout expires staff cookies while keeping an independent customer session", async () => {
  const response = await fetch(origin + "/api/auth/logout", { method: "POST", headers: { "x-session-scope": "staff" } });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie().join("\n");
  assert.match(cookies, /kb_staff_refresh=;/);
  assert.doesNotMatch(cookies, /kb_customer_refresh=;|kb_remember=;/);
});

test("return polling cannot consume the order-creation rate limit", async () => {
  seedReturn(); payment = "unpaid";
  for (let i = 0; i < 30; i++) assert.equal((await confirm("cs_original")).response.status, 202);
  status = "open";
  assert.equal((await request()).response.status, 200);
});
test("reward redemption computes included VAT from the amount actually charged", () => {
  const { includedVat } = require("../src/logic.ts");
  assert.equal(includedVat(12.5, 0.135), 1.49);
  assert.equal(includedVat(0, 0.135), 0);
});
