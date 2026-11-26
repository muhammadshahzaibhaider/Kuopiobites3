import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteIdentity } from './quote-identity.ts';
const cart=[{key:'pizza',itemId:'pizza',variantLabel:'Med',qty:1,options:[],pizza:{included:['ham']}}];
test('quote is invalid immediately when address, delivery mode, language or promo changes',()=>{
 const key=quoteIdentity(cart,'pickup','','','en');
 for(const inputs of [['delivery','','A','en'],['pickup','PROMO','','en'],['pickup','','','fi']]) assert.notEqual(quoteIdentity(cart,...inputs),key);
 assert.notEqual(quoteIdentity(cart,'delivery','','A','en'),quoteIdentity(cart,'delivery','','B','en'));
});
test('changed cart selections and quantities invalidate an in-flight quote',()=>{
 const key=quoteIdentity(cart,'pickup');
 assert.notEqual(quoteIdentity([{...cart[0],qty:2}],'pickup'),key);
 assert.notEqual(quoteIdentity([{...cart[0],pizza:{included:['tuna']}}],'pickup'),key);
 assert.equal(quoteIdentity([{...cart[0],unitPrice:12}],'pickup'),key);
});
