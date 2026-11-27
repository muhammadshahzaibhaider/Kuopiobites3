import {test} from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import { offerCards } from "../../frontend/src/lib/offer-cards.ts";
import { SOCIAL_LINKS, RESTAURANT } from "../../frontend/src/lib/menu.ts";
import { DEFAULT_SETTINGS } from "../src/lib/hours.ts";

const item = (id, price, fields={}) => ({ id, name:id, cat:"kebab", prices:[{label:"",value:price}], ...fields });
test("BUG-009/015 cards price only eligible sellable dishes and omit expired offers", () => {
  const offer = { id:"live",type:"percent",value:20,scope:{categories:["kebab"]},active:true,priority:0,titleFi:"Testi",titleEn:"Test" };
  const settings = { ...DEFAULT_SETTINGS, offItems:{pork:{off:true}}, offers:[offer,{...offer,id:"expired",end:"2001-10-31"}] };
  const cards = offerCards(settings, [item("pork",1),item("archive",2,{archived:true}),item("excluded",3,{excludeFromCategoryOffers:true}),item("shami",10)], "en", (key)=>key, (id)=>id);
  assert.deepEqual(cards.map(c=>[c.id,c.priceWas,c.priceNow]), [["live",10,8]]);
});
test("BUG-010 public social links use the restaurant account; retired platforms have no fallback", () => {
  assert.equal(SOCIAL_LINKS.find(link=>link.id==="instagram").href, "https://www.instagram.com/kuopiobites.fi");
  assert.deepEqual([RESTAURANT.wolt, RESTAURANT.uberEats, DEFAULT_SETTINGS.platforms.wolt, DEFAULT_SETTINGS.platforms.uberEats], ["","","",""]);
});
test("BUG-005/012 root Vercel build fails before publishing the retired frontend", () => {
  const script = fileURLToPath(new URL("../../next.config.mjs", import.meta.url));
  const result = spawnSync(process.execPath,[script],{env:{...process.env,VERCEL:"1"},encoding:"utf8"});
  assert.equal(result.status,1); assert.match(result.stderr,/frontend\//);
});
