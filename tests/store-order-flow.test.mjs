import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(join(root,path),"utf8");
const require=createRequire(import.meta.url);
const ts=require("typescript");
function load(path,stub=()=>({}),globals={}){
  const exp={};
  vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exp,require:id=>id.endsWith("/csa-units.ts")?load("src/lib/csa-units.ts"):stub(id),URL,URLSearchParams,crypto,structuredClone,...globals});
  return exp;
}
const product=(id,group,cost,price=45000,stock=10)=>({id,slug:id,sku:id,name:id,alternate_name:null,short_description:"",retail_price_vnd:price,available_quantity:stock,unit_size:"1.000",unit_label:"kg",category:{id:"11111111-1111-4111-8111-111111111111",slug:"veg",name:"Veg"},primary_image:null,csa_quota_group:group?{id:group,name:"Group",cost}:null,suppliers:[],requested_locale:"vi",content_locale:"vi",available_locales:["vi"],is_fallback:false});

test("quote allocates reservation-aware quota in checkout order and keeps integer VND",()=>{
  const quote=load("src/store/store-quote.ts");
  const rows=[product("a","g",2,45000),product("b","g",2,60000)];
  const result=quote.buildStoreQuote({products:rows,quantities:{a:3,b:2},useQuota:{a:true,b:true},quota:[{productId:"g",availableUnits:4}],shippingFeeVnd:30000,hasActiveCsa:true});
  assert.deepEqual(JSON.parse(JSON.stringify(result.lines.map(line=>({id:line.product.id,quota:line.quotaQuantity,cash:line.cashQuantity,subtotal:line.cashSubtotalVnd})))),[
    {id:"a",quota:2,cash:1,subtotal:45000},
    {id:"b",quota:0,cash:2,subtotal:120000},
  ]);
  assert.equal(result.shippingFeeVnd,undefined);
  assert.equal(result.totalVnd,undefined);
});

test("local membership and CSA products never waive delivery fees",()=>{
  const {buildStoreQuote}=load("src/store/store-quote.ts");
  const retail=product("retail",null,0),csa=product("csa","g",1);
  assert.equal(buildStoreQuote({products:[csa],quantities:{csa:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:true}).shippingFeeVnd,undefined);
  assert.equal(buildStoreQuote({products:[csa],quantities:{csa:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:false}).shippingFeeVnd,undefined);
  assert.equal(buildStoreQuote({products:[retail],quantities:{retail:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:true}).shippingFeeVnd,undefined);
});

test("checkout payload carries exact expected values and user address version only",()=>{
  const {checkoutPayload}=load("src/store/store-quote.ts");
  const quote={deliveryDate:"2026-11-14",coupon:null,voucherQuote:null,shippingAddressUpdatedAt:"2026-10-31T08:00:00Z",lines:[{product_id:"a",quantity:2,use_quota:false,expected_quota_quantity:0,expected_unit_price_vnd:45000,expected_available_quantity:7}],shippingFeeVnd:30000,totalVnd:120000};
  const common={quote,locale:"vi",idempotencyKey:"22222222-2222-4222-8222-222222222222"};
  const user=checkoutPayload({...common,shippingAddressUpdatedAt:"2026-10-31T08:00:00Z"});
  assert.equal(user.shipping_address_updated_at,"2026-10-31T08:00:00Z");
  assert.equal(user.guest,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(user.lines[0])),{product_id:"a",quantity:2,use_quota:false,expected_unit_price_vnd:45000,expected_available_quantity:7,expected_quota_quantity:0});
  const guest=checkoutPayload({...common,quote:{...quote,shippingAddressUpdatedAt:null},guest:{recipient_name:"An",phone_number:"0901234567",province_code:"66",ward_code:"22015",address:"12 Nguyen Hue"}});
  assert.equal(guest.shipping_address_updated_at,undefined);
  assert.equal(guest.guest.ward_code,"22015");
});

test("Store order BFF allowlist is exact",()=>{
  const {storeOrderTarget}=load("src/store/order-bff.ts");
  assert.deepEqual(JSON.parse(JSON.stringify(storeOrderTarget(["checkout"],"POST"))),{path:"/api/v1/public/store-checkouts",session:"optional",query:"none",guestOrder:true});
  assert.deepEqual(JSON.parse(JSON.stringify(storeOrderTarget(["orders","11111111-1111-4111-8111-111111111111","report-transfer"],"POST"))),{path:"/api/v1/public/store-orders/11111111-1111-4111-8111-111111111111/report-transfer",session:"optional",query:"none",guestOrder:true});
  assert.deepEqual(JSON.parse(JSON.stringify(storeOrderTarget(["user-orders"],"GET"))),{path:"/api/v1/store-orders",session:"required",query:"orders"});
  assert.deepEqual(JSON.parse(JSON.stringify(storeOrderTarget(["lookup"],"POST"))),{path:"/api/v1/public/store-order-lookups",session:"none",query:"none",lookupCookie:true});
  assert.equal(storeOrderTarget(["orders","../secret"],"GET"),null);
  assert.equal(storeOrderTarget(["checkout"],"GET"),null);
});

test("cart and order routes are URL-owned and global cart UI is mounted",()=>{
  assert.match(read("app/NFVClientApp.tsx"),/<CartDrawer\/>/);
  assert.match(read("src/components/navigation/SiteHeader.tsx"),/cartOpen/);
  assert.match(read("src/screens/store/ProductDetail.tsx"),/addCart\(product/);
  assert.match(read("src/data/main-navigation.ts"),/checkout/);
  assert.match(read("src/data/main-navigation.ts"),/order-detail/);
});

test("guest secrets are never persisted by client Store modules",()=>{
  for(const path of ["src/store/store-order-service.ts","src/screens/Checkout.tsx","src/screens/AccountOrders.tsx"]){
    const source=read(path);
    assert.doesNotMatch(source,/guest_access_token|access_token/);
    assert.doesNotMatch(source,/(?:localStorage|sessionStorage).*token|token.*(?:localStorage|sessionStorage)/i);
  }
});

test("cart revalidation preserves buyer quantity and requires acknowledgement for changed snapshots",()=>{
  const context=read("src/state/NFVContext.tsx");
  const refresh=read("src/store/cart-product-refresh.ts");
  const checkout=read("src/screens/Checkout.tsx");
  assert.doesNotMatch(context,/cart:\{\.\.\.state\.cart,\[id\]:Math\.min/);
  assert.match(refresh,/price_changed/);
  assert.match(refresh,/stock_changed/);
  assert.match(checkout,/acknowledgeCartProduct/);
  assert.match(checkout,/cartProductNotice/);
});

test("order detail distinguishes zero-total review and exposes refund, free-shipping and configured contact details",()=>{
  const detail=read("src/screens/store/StoreOrderDetail.tsx");
  assert.match(detail,/zeroReview/);
  assert.match(detail,/refundAmountVnd/);
  assert.match(detail,/totals\.shippingFeeVnd===0/);
  assert.match(detail,/useSiteSettings/);
  assert.match(detail,/contactPresentation/);
});

test("Store API errors retain backend business context for specific re-quote messages",()=>{
  const service=read("src/store/store-order-service.ts");
  const checkout=read("src/screens/Checkout.tsx");
  assert.match(service,/first\?\.context/);
  const {checkoutRequoteReason}=load("src/store/checkout-intent.ts");
  assert.equal(checkoutRequoteReason({status:409,code:"store_requote_required",context:{reason:"price_changed"}}),"price_changed");
  assert.match(checkout,/price_changed/);
  assert.match(checkout,/shipping_address_changed/);
});

test("Store BFF keeps guest secrets server-side and enforces same-origin mutation conventions",()=>{
  const route=read("app/api/store-orders/[...path]/route.ts");
  assert.match(route,/request\.headers\.get\("origin"\)!==publicSiteOrigin\(\)/);
  assert.match(route,/request\.headers\.get\("x-nfv-public-request"\)!=="1"/);
  assert.match(route,/delete payload\?\.data\?\.guest_access_token/);
  assert.match(route,/httpOnly:true/);
  assert.match(route,/sameSite:"lax"/);
  assert.match(route,/rewriteLookupCookie/);
  assert.match(route,/Path=\/api\/store-orders\/lookup/);
});

test("order reads use sequence guards so stale responses cannot replace newer state",()=>{
  const detail=read("src/screens/store/StoreOrderDetail.tsx");
  const list=read("src/screens/AccountOrders.tsx");
  assert.match(detail,/requestSeq/);
  assert.match(detail,/seq===requestSeq\.current/);
  assert.match(list,/const current=\+\+seq\.current/);
  assert.match(list,/current===seq\.current/);
});


test("fractional quota uses exact hundredths across a shared group and mixed cash",()=>{
 const {buildStoreQuote}=load("src/store/store-quote.ts");
 const rows=Array.from({length:10},(_,i)=>product(String(i),"g",.1));
 const result=buildStoreQuote({products:rows,quantities:Object.fromEntries(rows.map(p=>[p.id,1])),useQuota:Object.fromEntries(rows.map(p=>[p.id,true])),quota:[{productId:"g",availableUnits:.3}],shippingFeeVnd:30000,hasActiveCsa:true});
 assert.equal(result.lines.reduce((n,l)=>n+l.quotaQuantity,0),3);
 assert.equal(result.lines[0].quotaUnits,.1);assert.equal(result.lines[3].quotaUnits,0);
 const quarter=buildStoreQuote({products:[product("a","g",.25),product("b","g",9.75)],quantities:{a:1,b:1},useQuota:{a:true,b:true},quota:[{productId:"g",availableUnits:10}],shippingFeeVnd:0,hasActiveCsa:true});
 assert.equal(quarter.lines[0].quotaQuantity,1);assert.equal(quarter.lines[1].quotaQuantity,1);
 const four=buildStoreQuote({products:[product("a","g",.25)],quantities:{a:4},useQuota:{a:true},quota:[{productId:"g",availableUnits:1}],shippingFeeVnd:0,hasActiveCsa:true});
 assert.equal(four.lines[0].quotaQuantity,4);assert.equal(four.lines[0].quotaUnits,1);
 const mixed=buildStoreQuote({products:[product("a","g",.25),product("b","g",.5)],quantities:{a:3,b:2},useQuota:{a:true,b:true},quota:[{productId:"g",availableUnits:1.25}],shippingFeeVnd:30000,hasActiveCsa:true});
 assert.equal(mixed.lines[0].quotaUnits,.75);assert.equal(mixed.lines[1].quotaUnits,.5);
 assert.equal(mixed.lines[0].quotaQuantity,3);assert.equal(mixed.lines[1].quotaQuantity,1);assert.equal(mixed.lines[1].cashQuantity,1);assert.equal(mixed.cashSubtotalVnd,45000);
 for(const cost of [.001,NaN,Infinity,"0.25",0,-.25]) assert.throws(()=>buildStoreQuote({products:[product("a","g",cost)],quantities:{a:1},useQuota:{a:true},quota:[{productId:"g",availableUnits:1}],shippingFeeVnd:0,hasActiveCsa:true}));
});

test("Store order keeps fractional quota snapshots and integer item counts",()=>{
 const {parseStoreOrder}=load("src/store/store-order-model.ts");
 const line={id:"line",product_id:"p",sku:"p",name:"Produce",unit_size:"1.000",unit_label:"kg",unit_price_vnd:45000,quantity:4,quota_group_id:"g",quota_cost:.25,quota_quantity:4,quota_units:1,cash_quantity:0,cash_subtotal_vnd:0};
 const raw={id:"o",reference_code:"S1",status:"pending_review",payment_status:"not_required",locale:"en",lines:[line],shipping_address:{recipient_name:"An",phone_number:"0901234567",province_code:"66",ward_code:"1",address:"12 Street"},subtotal_vnd:0,shipping_fee_vnd:0,shipping_discount_reason:null,total_vnd:0,payment:null,expires_at:null,server_time:"now",transfer_reported_at:null,approved_at:null,delivered_at:null,cancelled_at:null,cancellation_reason:null,reconciliation_note:"",created_at:"now",updated_at:"now"};
 assert.equal(parseStoreOrder(raw).lines[0].quotaCost,.25);
 assert.equal(parseStoreOrder({...raw,lines:[{...line,quantity:1,quota_quantity:1,quota_units:.25}]}).lines[0].quotaUnits,.25);
 for(const field of ["quota_cost","quota_units"])for(const value of [".25",.001,NaN,Infinity,-.25])assert.throws(()=>parseStoreOrder({...raw,lines:[{...line,[field]:value}]}));
 for(const field of ["quantity","quota_quantity","cash_quantity","unit_price_vnd"])assert.throws(()=>parseStoreOrder({...raw,lines:[{...line,[field]:.25}]}));
});

test("checkout quota parser accepts numeric hundredths and rejects malformed balances",async()=>{
 class AccountApiError extends Error{constructor(code,status){super(code);this.status=status}}
 let value=.25;
 const service=load("src/store/store-order-service.ts",name=>name==="@/account/account-api"?{AccountApiError}:name==="./store-order-model"?load("src/store/store-order-model.ts"):{} ,{fetch:async()=>new Response(JSON.stringify({data:{products:[{product_id:"g",available_units:value,available_units_for_order:value}]}})),Response});
 assert.equal((await service.getStoreQuota("en")).products[0].availableUnits,.25);
 assert.equal((await service.getStoreQuota("en","o")).products[0].availableUnits,.25);
 for(value of ["0.25",null,.001,-.25])await assert.rejects(()=>service.getStoreQuota("en"));
});

test("quota boundary preserves decimal hundredths without changing integer fields",()=>{
 const {csaUnits,csaHundredths}=load("src/lib/csa-units.ts");
 for(const value of [.01,.1,.25,.29,.5,9.75,10])assert.equal(csaUnits(value),value);
 assert.equal(csaHundredths(.29),29);
 for(const value of [null,undefined,"0.25",NaN,Infinity,-.25,.001,.1+.2,Number.MAX_SAFE_INTEGER])assert.throws(()=>csaUnits(value));
});
