import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,resolve} from "node:path";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Intl,require:name=>load(resolve(dirname(path),name).replace(`${process.cwd()}/`,"").replace(/\.ts$/,"")+".ts")});return exports}
const {checkoutPayload}=load("src/store/store-quote.ts");
const intent=load("src/store/checkout-intent.ts");
const plain=value=>JSON.parse(JSON.stringify(value));
const productId="11111111-1111-1111-1111-111111111111",idempotencyKey="22222222-2222-2222-2222-222222222222";
const address="2026-11-03T08:00:00Z";
const line={product_id:productId,quantity:2,use_quota:true,expected_unit_price_vnd:40000,expected_available_quantity:8,expected_quota_quantity:1};
const preview=()=>({deliveryDate:"2026-11-14",shippingDiscountReason:"csa_companion_delivery",subtotalVnd:40000,eligibleSubtotalVnd:40000,discountAmountVnd:10000,shippingFeeVnd:0,totalVnd:30000,voucherQuote:"a".repeat(40),shippingAddressUpdatedAt:address,coupon:{id:productId,code:"SAVE_10"},lines:[{...line}]});
const live=()=>({deliveryDate:"2026-11-14",shippingAddressUpdatedAt:address,coupon:null,voucherQuote:null,lines:[{product_id:productId,quantity:3,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:20,expected_quota_quantity:0}],shippingFeeVnd:15000,totalVnd:165000});
const legacy=()=>({delivery_date:"2026-11-14",idempotency_key:idempotencyKey,locale:"vi",lines:[{product_id:productId,quantity:3,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:20,expected_quota_quantity:0}],expected_shipping_fee_vnd:15000,expected_total_vnd:165000,shipping_address_updated_at:address});
const guest={recipient_name:"An",phone_number:"+84901234567",province_code:"66",ward_code:"22015",address:"12 Nguyen Hue"};
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),key:index=>[...data.keys()][index],get length(){return data.size}}}

test("voucher payload uses one backend snapshot even when live quote and address differ",()=>{
 const result=checkoutPayload({quote:preview(),locale:"en",idempotencyKey,shippingAddressUpdatedAt:"2026-11-04T09:00:00Z"});
 assert.deepEqual(plain(result),{delivery_date:"2026-11-14",idempotency_key:idempotencyKey,locale:"en",lines:[line],expected_shipping_fee_vnd:0,expected_total_vnd:30000,shipping_address_updated_at:address,coupon_code:"SAVE_10",expected_voucher_quote:"a".repeat(40)});
 assert.throws(()=>checkoutPayload({quote:preview(),locale:"vi",idempotencyKey,guest}),/invalid_checkout/);
});

test("legacy payloads and guest checkout retain their original shape",()=>{
 const result=checkoutPayload({quote:live(),locale:"vi",idempotencyKey,shippingAddressUpdatedAt:address});
 assert.deepEqual(plain(result),legacy());assert.equal(intent.isCheckoutPayload(result,false),true);
 const guestResult=checkoutPayload({quote:{...live(),shippingAddressUpdatedAt:null},locale:"vi",idempotencyKey,guest});
 assert.equal(intent.isCheckoutPayload(guestResult,true),true);assert.equal("coupon_code" in guestResult,false);
 const store=storage();intent.saveCheckoutIntent(store,{owner:"A",payload:result});assert.deepEqual(plain(intent.readCheckoutIntent(store,"A").payload),legacy());
});

test("persisted voucher retry preserves payload and key across locale, voucher and live data changes",()=>{
 const store=storage(),voucher=preview();
 const payload=checkoutPayload({quote:voucher,locale:"vi",idempotencyKey});
 intent.saveCheckoutIntent(store,{owner:"A",payload});
 voucher.coupon.code="NEW";voucher.lines[0].quantity=5;voucher.totalVnd=0;
 const retry=intent.readCheckoutIntent(store,"A");
 assert.deepEqual(plain(retry.payload),{delivery_date:"2026-11-14",idempotency_key:idempotencyKey,locale:"vi",lines:[line],expected_shipping_fee_vnd:0,expected_total_vnd:30000,shipping_address_updated_at:address,coupon_code:"SAVE_10",expected_voucher_quote:"a".repeat(40)});
 assert.equal(intent.pendingCheckoutOwner(store,"B"),"A");
 assert.throws(()=>intent.saveCheckoutIntent(store,{owner:"A",payload:checkoutPayload({quote:voucher,locale:"en",idempotencyKey})}),/conflicting_checkout_intents/);
});

test("strict persisted voucher validation accepts only paired canonical code and actual HMAC",()=>{
 const valid={...legacy(),coupon_code:"SAVE_10",expected_voucher_quote:"a".repeat(40)};
 assert.equal(intent.isCheckoutPayload(valid,false),true);
 for(const change of [{coupon_code:undefined},{expected_voucher_quote:undefined},{coupon_code:"save"},{coupon_code:" SAVE"},{coupon_code:"-SAVE"},{coupon_code:"X".repeat(65)},{coupon_code:"MÃ"},{expected_voucher_quote:"a".repeat(64)},{expected_voucher_quote:"A".repeat(40)},{expected_voucher_quote:"g".repeat(40)},{expected_voucher_quote:""},{unexpected:true}])assert.equal(intent.isCheckoutPayload({...valid,...change},false),false,JSON.stringify(change));
 assert.equal(intent.isCheckoutPayload({...valid,shipping_address_updated_at:undefined,guest},true),false);
});

test("only post-idempotency CouponError 400 responses authorize voucher recovery",()=>{
 const codes=["coupon_invalid","coupon_invalid_value","coupon_scope_mismatch","coupon_inactive","coupon_not_started","coupon_expired","coupon_usage_exhausted","coupon_authentication_required","coupon_already_used","coupon_minimum_amount_not_met"];
 for(const code of codes){assert.equal(intent.checkoutDefinitelyRejected({status:400,code}),true,code);assert.equal(intent.checkoutRequoteReason({status:400,code}),"voucher_changed",code);for(const status of [0,401,403,409,429,500,502,503])assert.equal(intent.checkoutDefinitelyRejected({status,code}),false,`${status}:${code}`);}
 for(const code of ["coupon_not_found","coupon_limit_exceeded","coupon_not_applicable","request_failed","invalid_response","network_error"])assert.equal(intent.checkoutDefinitelyRejected({status:400,code}),false,code);
 assert.equal(intent.checkoutRequoteReason({status:409,code:"store_requote_required",context:{reason:"voucher_changed"}}),"voucher_changed");
 assert.equal(intent.checkoutDefinitelyRejected({status:409,code:"store_idempotency_conflict"}),false);
});
