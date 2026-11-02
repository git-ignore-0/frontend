import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),React=require("react"),jsx=require("react/jsx-runtime"),{renderToStaticMarkup}=require("react-dom/server"),ts=require("typescript");
const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const product={id:"p",name:"Rau cải",unit_size:"1.000",unit_label:"kg",retail_price_vnd:40000,available_quantity:10,primary_image:null,csa_quota_group:{id:"g",cost:1,name:"Rau"}};
export function renderStoreFixture({authenticated=false,active=false,useQuota=false,cart=false}={}){
 let hook=0;
 // Render the settled checkout, after quote, shipping and pending-intent ownership hydrate.
 const seeds=[[],{name:"Khách thử",phone:"0901234567",provinceCode:"66",wardCode:"1",address:"12 Đường thử"},{active,products:[{productId:"g",availableUnits:2}]},30000,true,false];
 const data={authenticated,storeProducts:{p:product},shippingAddress:authenticated?{name:"Khách thử",phone:"0901234567",detail:"12 Đường thử",ward:"Phường thử",city:"Tỉnh thử",provinceCode:"66",wardCode:"1",updatedAt:"2026-11-01"}:null};
 const ui={locale:"vi",cartOpen:true,cart:{p:3},applyCSA:{p:useQuota},cartProductState:{p:"ready"},cartProductNotice:{},accountFetchState:{address:"ready"}};
 const cache=new Map();
 function load(path){
  if(cache.has(path))return cache.get(path);
  const exports={};cache.set(path,exports);
  vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{
   if(name==="react")return {...React,useState:initial=>{const i=hook++;const value=i<seeds.length?seeds[i]:i===12?`${authenticated?"test-user":"guest"}:vi:0`:i===13?`${authenticated?"test-user":"guest"}:66:1:0`:i===18?(authenticated?"test-user":"guest"):initial;return React.useState(!cart&&path==="src/screens/Checkout.tsx"?value:initial)}};
   if(name==="react/jsx-runtime")return jsx;
   if(name==="@/store/use-store-session")return {useStoreSession:()=>task=>task()};
    if(name==="@/auth/AuthProvider")return {useAuth:()=>({status:authenticated?"authenticated":"guest",session:authenticated?{subject:"test-user"}:null})};
   if(name==="next/navigation")return {useRouter:()=>({push(){}})};
   if(name==="@/state/NFVContext")return {useNFV:()=>({data,ui,cartHydrated:true,accountSessionKey:authenticated?"test-user":"guest",patch(){},updateCart(){},acknowledgeCartProduct(){},retryCartProduct(){},beginCheckout(){}})};
   if(name==="@/components/overlays/OverlayPrimitives")return {SideDrawer:({title,children})=>React.createElement("div",{className:"side-drawer"},React.createElement("h2",{},title),children)};
   if(name==="@/components/store/StorePrimitives")return load("src/components/store/StorePrimitives.tsx");
   if(name==="@/components/account/GuestBuyerFields")return load("src/components/account/GuestBuyerFields.tsx");
   if(name==="@/components/account/ShippingAddressFields")return load("src/components/account/ShippingAddressFields.tsx");
   if(name==="@/data/account-copy")return load("src/data/account-copy.ts");
   if(name==="@/components/UI")return load("src/components/UI.tsx");
   if(name==="@/store/store-format")return load("src/store/store-format.ts");
   if(name==="@/store/store-quote")return load("src/store/store-quote.ts");
   if(name==="@/lib/format")return {money:value=>`${Number(value).toLocaleString("vi-VN")}đ`};
   if(name==="@/account/shipping-address-model")return load("src/account/shipping-address-model.ts");
   return {};
  }});return exports;
 }
 const screens=load("src/screens/Checkout.tsx");
 return renderToStaticMarkup(React.createElement(cart?screens.CartDrawer:screens.Checkout));
}

test("guest checkout hides CSA even with stale membership/quota state and uses existing responsive layout",()=>{
 const html=renderStoreFixture({active:true,useQuota:true});
 assert.doesNotMatch(html,/Quyền lợi CSA|Dùng quyền lợi CSA|phần dùng CSA|1\.000|chưa giữ tồn|kiểm tra giá, tồn, quota/);
 assert.match(html,/checkout-flow-layout store-checkout/);
 assert.match(html,/checkout-flow-main/);
 assert.match(html,/checkout-flow-actions store-checkout-actions/);
 assert.match(html,/3 × 1 kg/);
 assert.match(html,/150\.000đ/);
});

test("CSA member may select partial quota while a cash-only customer sees no unused benefit row",()=>{
 const member=renderStoreFixture({authenticated:true,active:true,useQuota:true});
 assert.doesNotMatch(member,/Dùng quyền lợi CSA/);
 assert.match(member,/Dùng 2 điểm CSA · còn trả 40\.000đ/);
 assert.doesNotMatch(member,/phần dùng CSA|phần trả tiền/);
 assert.match(member,/−80\.000đ/);
 const cash=renderStoreFixture({authenticated:true});
 assert.doesNotMatch(cash,/Quyền lợi CSA|Dùng quyền lợi CSA/);
});

test("cart uses the same compact selling unit as product list and detail",()=>{
 const html=renderStoreFixture({cart:true});
 assert.match(html,/1 kg/);
 assert.doesNotMatch(html,/1\.000/);
});

test("CSA summary reserves the same benefit row before and after applying points",()=>{
 const selected=renderStoreFixture({authenticated:true,active:true,useQuota:true});
 const unselected=renderStoreFixture({authenticated:true,active:true,useQuota:false});
 assert.match(selected,/class="store-summary-benefit" data-active="true" aria-hidden="false"/);
 assert.match(unselected,/class="store-summary-benefit" data-active="false" aria-hidden="true"/);
 assert.doesNotMatch(renderStoreFixture(),/class="store-summary-benefit"/);
});
