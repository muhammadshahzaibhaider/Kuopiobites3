import assert from "node:assert/strict";
import {test} from "node:test";
import {acceptOrderWithEstimate} from "./accept-order.ts";

test("BUG-002 resolves acceptance before ready-time request and survives failure",async()=>{
 for(const failure of [async()=>null,async()=>{throw new Error("ready-time 400");}]){
  const calls=[];
  assert.equal(await acceptOrderWithEstimate({
   accept:async()=>{calls.push("accepted");return true;},
   onAccepted:()=>calls.push("resolved"),
   saveEstimate:async()=>{calls.push("estimate");return failure();},
  }),true);
  assert.deepEqual(calls,["accepted","resolved","estimate"]);
 }
});
test("BUG-002 rejected acceptance neither resolves ticket nor saves estimate",async()=>{
 assert.equal(await acceptOrderWithEstimate({accept:async()=>false,onAccepted:()=>assert.fail(),saveEstimate:async()=>assert.fail()}),false);
});
