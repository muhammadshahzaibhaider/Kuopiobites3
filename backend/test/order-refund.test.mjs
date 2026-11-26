import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestOrderRefund, reconcileRefundEvent } from '../src/order-refund.ts';
const order={id:'KB-refund',paymentId:'pi_original',total:10};
const refund={id:'re_original',payment_intent:'pi_original',amount:1000,currency:'eur',status:'pending'};
function deps(over={}) {return {reserve:async()=>({refund_id:null,created_at:new Date().toISOString()}), retrieve:async()=>refund,list:async()=>({data:[],has_more:false}),create:async()=>refund,record:async()=>{},...over};}
test('pending refunds persist provider identity before returning to the route',async()=>{
 let saved;
 const r=await requestOrderRefund(order,deps({record:async r=>saved=r}));
 assert.equal(r.status,'pending');assert.equal(saved.id,'re_original');
});
test('stored refund retry retrieves provider state and never creates another refund',async()=>{
 const r=await requestOrderRefund(order,deps({reserve:async()=>({refund_id:'re_original'}),retrieve:async()=>({...refund,status:'succeeded'}),create:async()=>assert.fail()}));
 assert.equal(r.status,'succeeded');
});
test('lost create response is repaired from existing provider refunds without another create',async()=>{
 const r=await requestOrderRefund(order,deps({list:async()=>({data:[refund],has_more:false}),create:async()=>assert.fail()}));
 assert.equal(r.id,refund.id);
});
test('old unbound operations fail closed after idempotency retention',async()=>{
 await assert.rejects(()=>requestOrderRefund(order,deps({reserve:async()=>({refund_id:null,created_at:'2020-01-01'}),create:async()=>assert.fail()})),/recoveryRequired/);
});
test('wrong intent, amount and currency cannot be recorded as this refund',async()=>{
 for(const bad of [{...refund,payment_intent:'pi_wrong'},{...refund,amount:999},{...refund,currency:'usd'}])
  await assert.rejects(()=>requestOrderRefund(order,deps({create:async()=>bad,record:async()=>assert.fail()})),/refundMismatch/);
});
test('database interruptions propagate so webhook/request retry can repair them',async()=>{
 await assert.rejects(()=>requestOrderRefund(order,deps({record:async()=>{throw Error('injected DB interruption')}})),/injected/);
});


test('refund webhook arriving before checkout recovers payment before recording the refund',async()=>{
 let paid=false,recorded=false;
 await reconcileRefundEvent({...refund,status:'succeeded'},{
  findOrder:async()=>paid?{...order,checkoutSessionId:'cs_original',paymentStatus:'paid'}:null,
  sessions:async()=>[{id:'cs_original',metadata:{order_id:order.id}}],
  knownOrder:async()=>({...order,checkoutSessionId:'cs_original',paymentStatus:'pending'}),
  recover:async()=>{paid=true},record:async()=>{assert.equal(paid,true);recorded=true},
 });assert.equal(recorded,true);
});
test('refund webhook cannot acknowledge a known order with unresolved session binding',async()=>{
 await assert.rejects(()=>reconcileRefundEvent(refund,{
  findOrder:async()=>null,sessions:async()=>[{id:'cs_original',metadata:{order_id:order.id}}],
  knownOrder:async()=>order,recover:async()=>assert.fail(),record:async()=>assert.fail(),
 }),/sessionBindingFailed/);
});
