import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverCheckoutRetry } from '../src/checkout-retry.ts';
import { checkoutFingerprint } from '../src/checkout-attempt.ts';
const order={id:'KB-retry',checkoutSessionId:'cs_original',paymentStatus:'pending'};
const session={id:'cs_original',status:'complete',payment_status:'paid',url:null};
test('paid-session retry reconciles the existing ticket and returns it without another checkout',async()=>{
 let calls=0, result;
 await recoverCheckoutRetry(order,session,{reconcile:async()=>{calls++},get:async()=>({...order,paymentStatus:'paid'}),respond:r=>result=r});
 assert.equal(calls,1);assert.equal(result.order.id,order.id);assert.equal(result.url,undefined);
});
test('an open unpaid session reuses only its original URL',async()=>{
 let result;
 await recoverCheckoutRetry(order,{...session,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/original'}, {
  reconcile:async()=>assert.fail(),get:async()=>assert.fail(),respond:r=>result=r});
 assert.equal(result.sessionId,'cs_original');
});
test('asynchronous and unknown payment states never offer another charge',async()=>{
 for(const status of ['complete',null]) await assert.rejects(()=>recoverCheckoutRetry(order,{...session,status,payment_status:'unpaid'}, {
  reconcile:async()=>assert.fail(),get:async()=>assert.fail(),respond:()=>assert.fail()}),/processingPending/);
});
test('expired unpaid sessions require explicit new customer action',async()=>{
 await assert.rejects(()=>recoverCheckoutRetry(order,{...session,status:'expired',payment_status:'unpaid'}, {
  reconcile:async()=>assert.fail(),get:async()=>assert.fail(),respond:()=>assert.fail()}),/attemptExpired/);
});
test('payment reconciliation failure does not claim success',async()=>{
 await assert.rejects(()=>recoverCheckoutRetry(order,session,{
  reconcile:async()=>{},get:async()=>order,respond:()=>assert.fail()}),/processingFailed/);
});
test('same-priced pizza choices, instructions, contact and codes are distinct request snapshots',()=>{
 const a={type:'pickup',total:0,lines:[{itemId:'pizza',qty:1,unitPrice:12,pizza:{included:['ham'],extras:[]}}]};
 for(const b of [{...a,lines:[{...a.lines[0],pizza:{included:['tuna'],extras:[]}}]}, {...a,note:'No onions'}, {...a,code:'SECRET'}, {...a,redeemStreak:true}, {...a,customer:{name:'Fixture',phone:'0401234567',email:'fixture@example.invalid'}}])
  assert.notEqual(checkoutFingerprint(a),checkoutFingerprint(b));
 assert.equal(checkoutFingerprint(a),checkoutFingerprint({...a,address:'Restaurant address'}));
});
