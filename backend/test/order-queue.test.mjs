import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
process.env.SUPABASE_URL='http://127.0.0.1:1';process.env.SUPABASE_SERVICE_ROLE_KEY='fixture-only';
const source=require.resolve('../src/supabase.ts'),real=require(source);
const ticket=(id,status='placed')=>({id,type:'pickup',status,created_at:'2026-11-26T00:00:00Z',contact_name:'Fixture',payment_status:'paid',payment_ref:'pi_fixture',subtotal:10,delivery_fee:0,total:10,vat:0,order_items:[]});
const active=Array.from({length:501},(_,i)=>ticket('KB-'+String(i).padStart(4,'0')));
let pages=0;
require.cache[source]={id:source,filename:source,loaded:true,exports:{...real,db:{from:()=>{
 let onlyActive=false,cursor='';const q={select:()=>q,order:()=>q,limit:()=>q,in:()=>{onlyActive=true;return q},or:()=>q,gt:(_,id)=>{cursor=id;return q},then:resolve=>{
  if(onlyActive)pages++;
  return Promise.resolve(resolve({data:onlyActive?active.filter(o=>o.id>cursor).slice(0,500):[ticket('KB-recent-history','completed')],error:null}));
 }};return q;
}}}};
const {listOrders}=require('../src/supabase-orders.ts');
test('active kitchen orders remain visible beyond history limits and the first database page',async()=>{
 const orders=await listOrders(300,true);assert.equal(orders.length,502);assert.equal(pages,2);assert.ok(orders.find(o=>o.id==='KB-0500'));
});
