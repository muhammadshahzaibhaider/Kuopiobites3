// Actual HTTP handler; external boundaries contain synthetic data only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
Object.assign(process.env,{VERCEL:'1',NODE_ENV:'test',SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',STRIPE_SECRET_KEY:'sk_test_fixture'});
const { checkoutFingerprint }=require('../src/checkout-attempt.ts');
const { customerOrderSchema }=require('../src/schemas.ts');
let status='complete',payment='paid',createCalls=0,order,hash,origin,server;
const body={attemptId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',type:'pickup',customer:{name:'Fixture',email:'fixture@example.invalid',phone:'0401234567'},total:10,lines:[{key:'fixture',itemId:'pizza',variantLabel:'Med',qty:1,unitPrice:10,options:[]}]};
function replace(path,patch) {
 const name=require.resolve(path),real=require(path);
 require.cache[name]={id:name,filename:name,loaded:true,exports:{...real,...patch}};
}
replace('../src/auth.ts',{
 readAuth:(req,res,next)=>{req.auth={sub:'fixture-user',scope:req.headers['x-session-scope']==='staff'?'staff':'customer'};next()},
 requireCustomer:(req,res,next)=>{req.customer=body.customer;next()},ensureCsrfCookie:()=>{},staffById:async()=>({id:"fixture-staff",role:"manager",active:true}),
});
replace('../src/security.ts',{csrfMatches:()=>true});
replace('../src/logic.ts',{loadSettings:async()=>({offers:[{id:'public',active:true},{id:'coded',active:true,code:'SECRET'},{id:'draft',active:false}]})});
replace('../src/supabase-orders.ts',{getOrder:async()=>({...order})});
replace('../src/supabase.ts',{db:{
 from:table=>{assert.equal(table,'orders');const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:order.id,checkout_request_hash:hash},error:null})};return q;},
 rpc:async(name)=>{assert.equal(name,'process_stripe_checkout_event');if(payment==='paid') order.paymentStatus='paid';return {data:{received:true,paidSaved:payment==='paid'},error:null};}
}});
const stripeId=require.resolve('stripe');require('stripe');
require.cache[stripeId].exports=class {
 constructor(){this.checkout={sessions:{retrieve:async()=>({id:'cs_original',metadata:{order_id:order.id},status,payment_status:payment,amount_total:1000,currency:'eur',payment_intent:'pi_original',url:status==='open'?'https://checkout.stripe.com/original':null}),create:async()=>{createCalls++;throw Error('unexpected duplicate checkout')}}};}
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
