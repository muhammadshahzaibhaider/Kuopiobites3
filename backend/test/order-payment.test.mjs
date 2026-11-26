import assert from "node:assert/strict";
import {test} from "node:test";
import {changePaidOrderStatus,reconcileOrderPayment} from "../src/order-payment.ts";
const pending={id:"KB-002",checkoutSessionId:"cs_002",paymentStatus:"pending"};

test("BUG-002 status never writes for unpaid Stripe session",async()=>{
 let updates=0;
 await assert.rejects(()=>changePaidOrderStatus(pending.id,"accepted",{
  get:async()=>pending,
  reconcile:order=>reconcileOrderPayment(order,{
   retrieveSession:async()=>({id:"cs_002",metadata:{order_id:"KB-002"},payment_status:"unpaid",status:"complete"}),
   process:async()=>assert.fail("unpaid must not reach payment write"),
  }),update:async()=>{updates++;return true;},
 }),/payment.notPaid/);
 assert.equal(updates,0);
});
test("BUG-002 recovery rejects Stripe/order identity mismatch",async()=>{
 await reconcileOrderPayment(pending,{
  retrieveSession:async()=>({id:"cs_002",metadata:{order_id:"another"},payment_status:"paid"}),
  process:async()=>assert.fail("mismatched order must not reach payment write"),
 });
});
test("BUG-002 refund race cannot update status after paid read",async()=>{
 await assert.rejects(()=>changePaidOrderStatus(pending.id,"accepted",{
  get:async()=>({...pending,paymentStatus:"paid"}),reconcile:async()=>assert.fail(),update:async()=>false,
 }),/payment.notPaid/);
});
test("BUG-002 Stripe outage does not become false payment.notPaid or success",async()=>{
 await assert.rejects(()=>changePaidOrderStatus(pending.id,"accepted",{
  get:async()=>pending,reconcile:async()=>{throw new Error("Stripe unavailable");},update:async()=>assert.fail(),
 }),/Stripe unavailable/);
});
test("BUG-002 missing order and refunded order cannot change status",async()=>{
 for(const order of [null,{...pending,paymentStatus:"refunded"}])
  await assert.rejects(()=>changePaidOrderStatus(pending.id,"accepted",{
   get:async()=>order,reconcile:async()=>assert.fail(),update:async()=>assert.fail(),
  }),order?/payment.notPaid/:/order.notFound/);
});
