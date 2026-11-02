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
  vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exp,require:stub,URL,URLSearchParams,crypto,structuredClone,...globals});
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
  assert.equal(result.shippingFeeVnd,0);
  assert.equal(result.totalVnd,165000);
});

test("free shipping requires both active CSA and at least one CSA product",()=>{
  const {buildStoreQuote}=load("src/store/store-quote.ts");
  const retail=product("retail",null,0),csa=product("csa","g",1);
  assert.equal(buildStoreQuote({products:[csa],quantities:{csa:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:true}).shippingFeeVnd,0);
  assert.equal(buildStoreQuote({products:[csa],quantities:{csa:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:false}).shippingFeeVnd,30000);
  assert.equal(buildStoreQuote({products:[retail],quantities:{retail:1},useQuota:{},quota:[],shippingFeeVnd:30000,hasActiveCsa:true}).shippingFeeVnd,30000);
});

test("checkout payload carries exact expected values and user address version only",()=>{
  const {checkoutPayload}=load("src/store/store-quote.ts");
  const quote={lines:[{product:product("a",null,0,45000,7),quantity:2,useQuota:false,quotaQuantity:0,cashQuantity:2,cashSubtotalVnd:90000}],shippingFeeVnd:30000,totalVnd:120000};
  const common={quote,locale:"vi",idempotencyKey:"22222222-2222-4222-8222-222222222222"};
  const user=checkoutPayload({...common,shippingAddressUpdatedAt:"2026-10-31T08:00:00Z"});
  assert.equal(user.shipping_address_updated_at,"2026-10-31T08:00:00Z");
  assert.equal(user.guest,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(user.lines[0])),{product_id:"a",quantity:2,use_quota:false,expected_unit_price_vnd:45000,expected_available_quantity:7,expected_quota_quantity:0});
  const guest=checkoutPayload({...common,guest:{recipient_name:"An",phone_number:"0901234567",province_code:"66",ward_code:"22015",address:"12 Nguyen Hue"}});
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
