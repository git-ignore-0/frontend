import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,Intl,require:name=>name==='./store-delivery.ts'?load('src/store/store-delivery.ts'):name.includes('csa-units')?load('src/lib/csa-units.ts'):name.includes('csa-rounds-model')?{}:{}});return exports;}
const plain=v=>JSON.parse(JSON.stringify(v));
const days=['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04','2027-01-05'];
const calendar=()=>({server_time:'2026-12-28T17:00:00Z',dates:days.map((delivery_date,i)=>({delivery_date,free_shipping:i===3}))});
test('calendar preserves all eight BE dates across year and timezone boundaries',()=>{
 const {parseStoreDeliveryCalendar,deliveryDayLabel}=load('src/store/store-delivery.ts');
 const value=parseStoreDeliveryCalendar(calendar());assert.deepEqual(plain(value.dates),calendar().dates.map(d=>({date:d.delivery_date,freeShipping:d.free_shipping})));
 assert.match(deliveryDayLabel('2027-01-01','vi'),/01\/01/);assert.match(deliveryDayLabel('2027-01-01','en'),/01\/01/);
 for(const bad of [null,{...calendar(),dates:calendar().dates.slice(1)},{...calendar(),server_time:'bad'},{...calendar(),dates:calendar().dates.map(d=>({...d,free_shipping:'false'}))},{...calendar(),dates:calendar().dates.map(d=>({...d,delivery_date:'2026-02-31'}))}])assert.throws(()=>parseStoreDeliveryCalendar(bad));
});
test('delivery date format is strict but independent of current replay date',()=>{
 const {isStoreDeliveryDate}=load('src/store/store-delivery.ts');for(const d of ['2026-11-13','2024-02-29'])assert.equal(isStoreDeliveryDate(d),true);
 for(const d of ['2026-02-29','2026-1-1','2026-02-31','2026-11-13T00:00:00Z',null])assert.equal(isStoreDeliveryDate(d),false);
});

test('shared quote parses cash and voucher snapshots and rejects malformed or inconsistent money',()=>{
 const {parseStoreCheckoutQuote}=load('src/store/store-order-model.ts');
 const data={delivery_date:'2026-12-29',shipping_discount_reason:null,subtotal_vnd:'40000',eligible_subtotal_vnd:'40000',discount_amount_vnd:'0',shipping_fee_vnd:'30000',total_vnd:'70000',coupon:null,voucher_quote:null,shipping_address_updated_at:null,lines:[{product_id:'11111111-1111-4111-8111-111111111111',quantity:1,use_quota:false,expected_unit_price_vnd:40000,expected_available_quantity:10,expected_quota_quantity:0}]};
 const q=parseStoreCheckoutQuote(data);assert.equal(q.shippingFeeVnd,30000);assert.equal(q.totalVnd,70000);assert.equal(q.coupon,null);
 const free=parseStoreCheckoutQuote({...data,shipping_discount_reason:'csa_companion_delivery',shipping_fee_vnd:'0',total_vnd:'40000'});assert.equal(free.shippingFeeVnd,0);
 for(const change of [{total_vnd:70000},{total_vnd:'9007199254740992'},{shipping_fee_vnd:null},{shipping_fee_vnd:'-1'},{shipping_fee_vnd:'1.5'},{subtotal_vnd:'0',total_vnd:'30000'},{delivery_date:'2026-02-31'},{shipping_discount_reason:'active_csa_with_csa_product'},{voucher_quote:'a'.repeat(40)},{lines:[{...data.lines[0],quantity:2}]}])assert.throws(()=>parseStoreCheckoutQuote({...data,...change}),JSON.stringify(change));
});

test('quote equality includes delivery date and voucher token even when the visible total is unchanged',()=>{
 const {sameStoreCheckoutQuote}=load('src/store/store-order-model.ts');
 const value={deliveryDate:'2026-11-14',shippingFeeVnd:0,totalVnd:40000,voucherQuote:'a'.repeat(40),lines:[{product_id:'p',quantity:1,expected_available_quantity:10}]};
 assert.equal(sameStoreCheckoutQuote(value,plain(value)),true);
 for(const change of [{deliveryDate:'2026-11-15'},{voucherQuote:'b'.repeat(40)},{shippingFeeVnd:1000},{lines:[{...value.lines[0],expected_available_quantity:9}]}])assert.equal(sameStoreCheckoutQuote(value,{...value,...change}),false);
});
