import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
class AccountApiError extends Error{constructor(code,status,context){super(code);this.code=code;this.status=status;this.context=context;}}
function load(path,globals={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,URLSearchParams,...globals,require:id=>id==='@/account/account-api'?{AccountApiError}:id==='./store-order-model'?load('src/store/store-order-model.ts'):id==='./store-delivery.ts'?load('src/store/store-delivery.ts'):id.endsWith('/csa-units.ts')?load('src/lib/csa-units.ts'):{}});return exports;}
const plain=value=>JSON.parse(JSON.stringify(value));
const coupon={id:'11111111-1111-4111-8111-111111111111',code:'STORE30',discount_type:'fixed',discount_value:'30000.00',maximum_discount_amount:null,subtotal_vnd:90000,eligible_subtotal_vnd:90000,discount_amount_vnd:30000,total_vnd:90000};
const line={product_id:'22222222-2222-4222-8222-222222222222',quantity:2,use_quota:false,expected_unit_price_vnd:45000,expected_available_quantity:10,expected_quota_quantity:0};
const preview=()=>({delivery_date:'2026-11-14',shipping_discount_reason:null,subtotal_vnd:'90000',eligible_subtotal_vnd:'90000',discount_amount_vnd:'30000',shipping_fee_vnd:'30000',total_vnd:'90000',coupon:{...coupon},voucher_quote:'a'.repeat(40),shipping_address_updated_at:'2026-11-03T00:00:00Z',lines:[{...line}]});
const order=()=>({id:'order',reference_code:'S1',status:'pending_review',payment_status:'not_required',locale:'vi',lines:[],shipping_address:{recipient_name:'A',phone_number:'1',province_code:'66',ward_code:'1',address:'Street'},subtotal_vnd:'90000',shipping_fee_vnd:'30000',shipping_discount_reason:null,total_vnd:'90000',payment:null,expires_at:null,server_time:'now',transfer_reported_at:null,approved_at:null,delivered_at:null,cancelled_at:null,cancellation_reason:null,reconciliation_note:'',created_at:'now',updated_at:'now'});
test('voucher preview posts through existing same-origin API and parses BE snapshot and expected lines',async()=>{
 let request;const service=load('src/store/store-order-service.ts',{fetch:async(path,init)=>{request={path,init};return new Response(JSON.stringify({data:preview()}));}});
 const input={delivery_date:'2026-11-14',locale:'vi',coupon_code:'STORE30',lines:[{product_id:'22222222-2222-4222-8222-222222222222',quantity:2,use_quota:false}]};
 const result=await service.getStoreQuote(input);
 assert.equal(request.path,'/api/store-orders/quote');assert.equal(request.init.method,'POST');assert.equal(request.init.credentials,'same-origin');assert.equal(request.init.headers['X-NFV-Public-Request'],'1');assert.deepEqual(JSON.parse(request.init.body),input);
 assert.equal(result.discountAmountVnd,30000);assert.equal(result.totalVnd,90000);assert.equal(result.coupon.code,'STORE30');assert.equal(result.coupon.discountValue,'30000.00');assert.equal(result.shippingAddressUpdatedAt,'2026-11-03T00:00:00Z');assert.deepEqual(plain(result.lines),[line]);
});
test('preview rejects malformed money, snapshots, quote, and line expected fields as contract errors',async()=>{
 const malformed=[null,[],{...preview(),discount_amount_vnd:'1.5'},{...preview(),total_vnd:'9007199254740992'},{...preview(),voucher_quote:''},{...preview(),coupon:null},{...preview(),coupon:{...coupon,discount_type:'other'}},{...preview(),coupon:{...coupon,discount_value:30000}},{...preview(),coupon:{...coupon,discount_amount_vnd:'30000'}},{...preview(),lines:[]},{...preview(),lines:[{...line,use_quota:'false'}]},{...preview(),lines:[{...line,expected_unit_price_vnd:'45000'}]},{...preview(),lines:[{...line,quantity:0}]},{...preview(),lines:[{...line,expected_quota_quantity:3}]}];
 for(const data of malformed){const service=load('src/store/store-order-service.ts',{fetch:async()=>new Response(JSON.stringify({data}))});await assert.rejects(()=>service.getStoreQuote({locale:'vi',coupon_code:'X',lines:[]}),e=>e.code==='invalid_response'&&e.status===502);}
});
test('preview preserves business error context, auth errors, and network uncertainty',async()=>{
 for(const [code,status] of [['coupon_invalid',400],['coupon_expired',400],['coupon_usage_exhausted',400],['coupon_scope_mismatch',400],['coupon_minimum_amount_not_met',400],['unauthorized',401]]){
 const service=load('src/store/store-order-service.ts',{fetch:async()=>new Response(JSON.stringify({errors:[{code,context:{reason:'test'}}]}),{status})});await assert.rejects(()=>service.getStoreQuote({}),e=>e.code===code&&e.status===status&&e.context.reason==='test');}
 const service=load('src/store/store-order-service.ts',{fetch:async()=>{throw Error('offline');}});await assert.rejects(()=>service.getStoreQuote({}),e=>e.code==='network_error'&&e.status===0);
});
test('order parser defaults legacy orders and preserves coupon snapshot without consulting live voucher',()=>{
 const {parseStoreOrder}=load('src/store/store-order-model.ts');assert.equal(parseStoreOrder(order()).discountAmountVnd,0);assert.equal(parseStoreOrder(order()).coupon,null);
 const result=parseStoreOrder({...order(),discount_amount_vnd:'30000',coupon});assert.equal(result.discountAmountVnd,30000);assert.equal(result.coupon.code,'STORE30');assert.equal(result.coupon.discountType,'fixed');
 for(const value of [null,-1,'1.5',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>parseStoreOrder({...order(),discount_amount_vnd:value}));
 for(const value of [false,{}, {...coupon,discount_amount_vnd:'30000'}])assert.throws(()=>parseStoreOrder({...order(),coupon:value}));
});
test('voucher BFF only allows POST, requires session, rejects query or extra path',()=>{
 const {storeOrderTarget,storeOrderQueryAllowed}=load('src/store/order-bff.ts');assert.deepEqual(plain(storeOrderTarget(['quote'],'POST')),{path:'/api/v1/public/store-quotes',session:'optional',query:'none'});assert.equal(storeOrderTarget(['quote'],'GET'),null);assert.equal(storeOrderTarget(['quote','extra'],'POST'),null);assert.equal(storeOrderQueryAllowed(new URL('https://nfv.test/api/store-orders/quote?locale=vi'),'none'),false);
});

test('preview rejects invalid HMAC, address timestamps, UUIDs, duplicate lines and out-of-contract stock bounds',()=>{
 const {parseStoreCheckoutQuote}=load('src/store/store-order-model.ts');
 const malformed=[
  ...['opaque','A'.repeat(40),'a'.repeat(39)].map(voucher_quote=>({...preview(),voucher_quote})),
  ...[null,'today','2026-99-03T00:00:00Z'].map(shipping_address_updated_at=>({...preview(),shipping_address_updated_at})),
  {...preview(),coupon:{...coupon,id:'invalid'}},
  ...['x'.repeat(65),'store30','BAD SPACE'].map(code=>({...preview(),coupon:{...coupon,code}})),
  {...preview(),lines:[{...line,product_id:'invalid'}]},
  {...preview(),lines:[{...line},{...line}]},
  {...preview(),lines:[{...line,expected_available_quantity:2147483648}]},
 ];
 for(const value of malformed)assert.throws(()=>parseStoreCheckoutQuote(value));
 assert.equal(parseStoreCheckoutQuote({...preview(),lines:[{...line,expected_available_quantity:2147483647}]}).lines[0].expected_available_quantity,2147483647);
});
