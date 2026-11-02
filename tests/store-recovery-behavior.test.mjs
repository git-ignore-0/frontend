import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript");
const compile=path=>ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const nodes=t=>!t||typeof t!=="object"?[]:typeof t.type==="function"?nodes(t.type(t.props)):[t,...[t.props?.children].flat(Infinity).flatMap(nodes)];
const text=t=>nodes(t).flatMap(n=>[n.props?.children].flat(Infinity)).filter(v=>typeof v==="string").join(" ");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
const uiNames=["Button","DataState","FormInput","FormSelect","Icon","MoneyLine","Photo","Quantity","Tabs","Status"];
const primitives=Object.fromEntries(["StoreSection","StorePageHeading","StoreProductRow"].map(k=>[k,k]));
class ApiError extends Error{constructor(status,context){super("request_failed");this.status=status;this.context=context;this.code=status===409?"store_requote_required":"request_failed"}}
const guest={name:"Khách thử",phone:"0901234567",provinceCode:"66",wardCode:"1",address:"12 Đường thử"};
const PRODUCT_ID="11111111-1111-4111-8111-111111111111";
const product={id:PRODUCT_ID,slug:"rau",name:"Rau",unit_size:"1.000",unit_label:"kg",retail_price_vnd:40000,available_quantity:10,csa_quota_group:null};
const order=(id="A",overrides={})=>({id,referenceCode:id,status:"pending_review",paymentStatus:"not_required",locale:"vi",lines:[],shippingAddress:{provinceCode:"66",wardCode:"1",recipientName:"Khách thử",phoneNumber:"0901234567",address:"12 Đường thử"},subtotalVnd:0,shippingFeeVnd:0,totalVnd:0,payment:null,expiresAt:null,serverTime:"2026-11-01T00:00:00Z",createdAt:"2026-11-01T00:00:00Z",...overrides});

function runtime(path,{services={},context={},auth={status:"guest",session:null},mobileAccount=false,storage=new Map(),onNavigate=()=>{},fetcher=async()=>{throw Error("offline")}}={}){
 let cursor=0,states=[],deps=[],effects=[],cleanups=[],tree;const timers=new Map(),listeners=new Map(),document={visibilityState:"visible"};let timerId=0;
 const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return [states[i],v=>states[i]=typeof v==="function"?v(states[i]):v]},
  useRef(initial){const i=cursor++;return states[i]??={current:initial}},
  useMemo(fn){cursor++;return fn()},useCallback(fn,next){const i=cursor++;const saved=states[i];if(!saved||next.some((v,j)=>v!==saved.deps[j]))states[i]={fn,deps:next};return states[i].fn},
  useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push({i,fn})}},
 };
 react.useLayoutEffect=react.useEffect;
 const load=(file,extra={})=>{const exports={};vm.runInNewContext(compile(file),{exports,Date,crypto,URL,URLSearchParams,console,queueMicrotask,document,fetch:fetcher,window:{matchMedia:()=>({matches:mobileAccount}),addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),setInterval:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id},clearInterval:id=>timers.delete(id),sessionStorage:{get length(){return storage.size},key:index=>[...storage.keys()][index]??null,getItem:key=>storage.get(key)??(key==="nfv_store_checkout_guest_v1"?JSON.stringify(guest):null),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}},require:name=>{
  if(name in extra)return extra[name];
  if(name==="./store-limits"||name==="@/store/store-limits")return load("src/store/store-limits.ts");
  if(name==="@/store/cart-checkout")return load("src/store/cart-checkout.ts");
  if(name==="react")return react;if(name==="react/jsx-runtime")return jsx;
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/state/NFVContext")return {useNFV:()=>context};
  if(name==="next/navigation")return {useRouter:()=>({push:onNavigate})};
  if(name==="@/components/UI")return Object.fromEntries(uiNames.map(k=>[k,k]));
  if(name==="@/components/account/ListPaginationFooter")return load("src/components/account/ListPaginationFooter.tsx");
  if(name==="@/components/store/StorePrimitives")return {...load("src/components/store/StorePrimitives.tsx"),...primitives};
  if(name==="@/components/BankTransferPanel")return {BankTransferPanel:"BankTransferPanel",PaymentQr:"PaymentQr"};
  if(name==="@/store/use-store-session")return load("src/store/use-store-session.ts");
  if(name==="@/auth/site-auth")return load("src/auth/site-auth.ts");
  if(name==="@/auth/auth-service")return {isUnauthorized:error=>error?.status===401};
  if(name==="@/store/store-order-service")return services;
  if(name==="@/store/checkout-intent")return load("src/store/checkout-intent.ts");
  if(name.endsWith("/csa-units.ts"))return load("src/lib/csa-units.ts");
  if(name==="@/store/store-quote")return load("src/store/store-quote.ts");
  if(name==="@/store/store-order-presentation")return load("src/store/store-order-presentation.ts");
  if(name==="@/store/store-format")return {formatUnitSize:Number};
  if(name==="@/store/store-model")return {parseStoreProductDetail:v=>v};
  if(name==="@/account/shipping-service")return {getSupportedShippingAreas:services.getSupportedShippingAreas??(async()=>[{code:"66",wards:[{code:"1"}]}])};
  if(name==="@/account/administrative-units-service")return {resolveAdministrativeAddressNames:async()=>({provinceName:"Tỉnh thử",wardName:"Phường thử"})};
  if(name==="@/account/shipping-address-model")return load("src/account/shipping-address-model.ts");
  if(name==="@/components/account/GuestBuyerFields")return {GuestBuyerFields:"GuestBuyerFields"};
  if(name==="@/account/account-api")return {AccountApiError:ApiError};
  if(name==="@/hooks/useSiteSettings")return {useSiteSettings:()=>null};
  if(name==="@/lib/contact-settings")return {contactPresentation:()=>({})};
  if(name==="@/lib/format")return {money:String};
  return {};
 }});return exports};
 const exports=load(path,path.endsWith("AccountOrders.tsx")?{"@/screens/store/StoreOrderDetail":{StoreOrderDetail:"Detail",STORE_STATUS:Object.fromEntries(["payment_pending","pending_review","pending_delivery","delivered","cancelled"].map(s=>[s,{vi:s}])),PAYMENT_STATUS:{not_required:{vi:"Không cần thanh toán"}}}}:{});
 let component,props;
 const render=(name=component,next=props)=>{component=name;props=next;cursor=0;return tree=exports[name](next)};
 const flush=()=>{const pending=effects;effects=[];for(const {i,fn}of pending){cleanups[i]?.();cleanups[i]=fn()}};
 return {auth,context,render,flush,document,fireInterval:delay=>{for(const timer of [...timers.values()])if(timer.delay===delay)timer.fn()},focus:()=>{for(const fn of [...(listeners.get("focus")??[])])fn()},async settle(){for(let i=0;i<4;i++){flush();await tick();render()}},get tree(){return tree},dispose(){cleanups.forEach(fn=>fn?.())}};
}

test("changing authenticated owner hides old orders immediately and loads the new owner's list",async()=>{
 const auth={status:"authenticated",session:{subject:"A"}},pending=deferred();let count=0;
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async()=>++count===1?{items:[order()],meta:{total:1}}:pending.promise}});
 r.render("OrdersView");await r.settle();assert.ok(text(r.tree).includes("A"));
 auth.session={subject:"B"};r.render();assert.ok(!nodes(r.tree).some(n=>n.type==="article"));
 r.flush();pending.resolve({items:[order("B")],meta:{total:1}});await r.settle();
 assert.ok(text(r.tree).includes("B"));assert.ok(!nodes(r.tree).some(n=>n.props?.children==="A"));r.dispose();
});

test("guest lookup ignores a slow restore after a newer lookup succeeds",async()=>{
 const old=deferred(),r=runtime("src/screens/AccountOrders.tsx",{context:{ui:{locale:"vi"}},services:{currentLookupStoreOrder:()=>old.promise,lookupStoreOrder:async()=>order("NEW")}});
 r.render("GuestOrderLookup");r.flush();const inputs=nodes(r.tree).filter(n=>n.type==="FormInput");
 inputs[0].props.onChange({target:{value:"NEW"}});inputs[1].props.onChange({target:{value:guest.phone}});r.render();
 await nodes(r.tree).find(n=>n.type==="form").props.onSubmit({preventDefault(){}});r.render();
 old.resolve(order("OLD"));await tick();r.render();assert.equal(nodes(r.tree).find(n=>n.type==="Detail").props.id,"NEW");r.dispose();
});

function checkout(options={}){
 const context={data:{authenticated:false,storeProducts:{[PRODUCT_ID]:{...product}}},ui:{locale:"vi",cart:{[PRODUCT_ID]:1},applyCSA:{},cartProductState:{[PRODUCT_ID]:"ready"},cartProductNotice:{},accountFetchState:{}},cartHydrated:true,accountSessionKey:"guest",refreshResource:async()=>{},retryCartProduct(){},acknowledgeCartProduct(){},updateCart(){},...options.context};
 context.markCartProductsUnavailable=ids=>{for(const id of ids)if(context.ui.cart[id])context.ui.cartProductState[id]="unavailable"};context.patch=update=>Object.assign(context.ui,update);context.setUI=update=>Object.assign(context.ui,typeof update==="function"?update(context.ui):update);context.cacheStoreProducts=ps=>ps.forEach(p=>context.data.storeProducts[p.id]=p);
 return runtime("src/screens/Checkout.tsx",{...options,context,services:{getShippingQuote:async()=>({supported:true,shippingFeeVnd:30000}),getStoreQuota:async()=>({active:false,products:[]}),...options.services}});
}
const confirm=r=>nodes(r.tree).find(n=>n.type==="Button"&&/Tiếp tục|Kiểm tra lại đơn/.test(text(n)));

test("checkout waits for cart hydration before deciding that the cart is empty",()=>{
 const r=checkout({context:{cartHydrated:false,ui:{locale:"vi",cart:{},applyCSA:{},cartProductState:{},cartProductNotice:{},accountFetchState:{}}}});
 r.render("Checkout");const state=nodes(r.tree).find(n=>n.type==="DataState");assert.equal(state.props.kind,"loading");r.dispose();
});

test("checkout hides the transfer total while shipping is unresolved",()=>{
 const r=checkout();r.render("Checkout");assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&n.props.kind==="loading"));r.flush();r.render();assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"—");r.dispose();
});

test("checkout exposes product refresh failure with a working retry",async()=>{
 let retried=false;const r=checkout();r.context.ui.cartProductState[PRODUCT_ID]="error";r.context.retryCartProduct=()=>{retried=true};
 r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,true);
 const retry=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.kind==="error");assert.ok(retry);retry.props.action.onClick();assert.ok(retried);r.dispose();
});

test("retry after a failed requote reloads product data before allowing confirmation",async()=>{
 let requests=0;const r=checkout({fetcher:async()=>{if(++requests===1)throw Error("offline");return {ok:true,json:async()=>({...product,retail_price_vnd:50000})}},services:{createStoreCheckout:async()=>{throw new ApiError(409,{reason:"price_changed"})}}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();r.render();
 const retry=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.kind==="error");assert.ok(retry);retry.props.action.onClick();await r.settle();
 assert.equal(r.context.data.storeProducts[PRODUCT_ID].retail_price_vnd,50000);
 const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();assert.equal(confirm(r).props.disabled,false);r.dispose();
});

test("an unsupported shipping result is explained and cannot be submitted",async()=>{
 const r=checkout({services:{getShippingQuote:async()=>({supported:false,shippingFeeVnd:null})}});
 r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/chưa được hỗ trợ giao hàng/);r.dispose();
});

test("a delayed order-list response from the previous owner cannot replace the new list",async()=>{
 const old=deferred(),fresh=deferred(),auth={status:"authenticated",session:{subject:"A"}};let calls=0;
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:()=>++calls===1?old.promise:fresh.promise}});
 r.render("OrdersView");r.flush();auth.session={subject:"B"};r.render();r.flush();fresh.resolve({items:[order("NEW")],meta:{total:1}});await r.settle();
 old.resolve({items:[order("OLD")],meta:{total:1}});await r.settle();assert.ok(nodes(r.tree).some(n=>n.props?.children==="NEW"));assert.ok(!nodes(r.tree).some(n=>n.props?.children==="OLD"));r.dispose();
});

test("checkout rejects duplicate clicks synchronously and retains its key for a network retry",async()=>{
 const pending=deferred(),payloads=[];const r=checkout({services:{createStoreCheckout:payload=>{payloads.push(payload);return pending.promise}}});
 r.render("Checkout");await r.settle();const button=confirm(r);button.props.onClick();button.props.onClick();assert.equal(payloads.length,1);
 pending.reject(Error("offline"));await tick();r.render();confirm(r).props.onClick();await tick();assert.equal(payloads.length,2);assert.equal(payloads[1].idempotency_key,payloads[0].idempotency_key);r.dispose();
});

test("checkout does not publish a previous session's completed order or clear its cart",async()=>{
 const pending=deferred(),auth={status:"guest",session:null};const r=checkout({auth,services:{createStoreCheckout:()=>pending.promise}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();auth.status="authenticated";auth.session={subject:"B"};r.render();r.flush();
 pending.resolve(order());await tick();r.render();assert.equal(r.context.ui.cart[PRODUCT_ID],1);r.dispose();
});

test("changing checkout owner hides the old address and waits for the new owner's quota",async()=>{
 const pending=deferred(),auth={status:"authenticated",session:{subject:"A"}};let requests=0;
 const address={name:"Owner A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true};
 const r=checkout({auth,context:{accountSessionKey:"A",data:{authenticated:true,shippingAddress:address,storeProducts:{[PRODUCT_ID]:{...product,csa_quota_group:{id:"g",cost:1}}}}},services:{getStoreQuota:()=>++requests===1?Promise.resolve({active:true,products:[{productId:"g",availableUnits:1}]}):pending.promise}});
 r.context.ui.accountFetchState.address="ready";r.context.ui.applyCSA={[PRODUCT_ID]:true};r.render("Checkout");await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"0");
 auth.session={subject:"B"};r.render();assert.ok(!text(r.tree).includes("Owner A"));r.flush();assert.equal(r.context.ui.applyCSA[PRODUCT_ID],undefined);
 r.context.accountSessionKey="B";r.context.data.shippingAddress={...address,name:"Owner B"};r.render();
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"—");
 pending.resolve({active:false,products:[]});await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"70000");r.dispose();
});

function addressCheckout(options={}){
 const auth={status:"authenticated",session:{subject:"A"}};
 const r=checkout({...options,auth,context:{accountSessionKey:"A",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:{...product}},shippingAddress:{name:"Khách thử",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true}}}});
 r.context.ui.accountFetchState.address="ready";return r;
}

test("a slow requote cannot overwrite shipping resolved for the updated saved address",async()=>{
 const products=deferred();const r=addressCheckout({fetcher:()=>products.promise,services:{createStoreCheckout:async()=>{throw new ApiError(409,{reason:"shipping_address_changed"})},getShippingQuote:async province=>({supported:true,shippingFeeVnd:province==="77"?50000:30000})}});
 r.context.refreshResource=async()=>{r.context.data.shippingAddress={...r.context.data.shippingAddress,provinceCode:"77",wardCode:"2",updatedAt:"2026-11-02T00:00:00Z"}};
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();await r.settle();
 products.resolve({ok:true,json:async()=>product});await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"90000");
 assert.equal(nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới")).props.disabled,false);r.dispose();
});

test("a failed saved-address refresh cannot publish or accept a final requote",async()=>{
 const r=addressCheckout({fetcher:async()=>({ok:true,json:async()=>product}),services:{createStoreCheckout:async()=>{throw new ApiError(409,{reason:"shipping_address_changed"})}}});
 r.context.refreshResource=async()=>{r.context.ui.accountFetchState.address="error"};
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"—");
 assert.equal(nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới")).props.disabled,true);r.dispose();
});

test("order detail hides a private snapshot immediately when the session changes",async()=>{
 const auth={status:"authenticated",session:{subject:"A"}},pending=deferred();
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{auth,services:{getStoreOrder:()=>pending.promise}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:order()});await r.settle();
 auth.status="guest";auth.session=null;r.render();assert.equal(r.tree.type,"DataState");assert.equal(r.tree.props.kind,"loading");
 r.flush();pending.reject(Error("not found"));await r.settle();assert.equal(r.tree.props.kind,"error");r.dispose();
});

test("a failed expiry refresh preserves the loaded order and exposes retry",async()=>{
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:async()=>{throw Error("offline")}}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:order("A",{expiresAt:"2026-11-01T00:00:00Z"})});await r.settle();
 assert.ok(nodes(r.tree).some(n=>n.type==="StorePageHeading"));assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&n.props.action));r.dispose();
});


test("guest Store continue uses the shared validation and reveals missing fields without creating an order",async()=>{
 let submitted=0;
 const r=checkout({services:{createStoreCheckout:async()=>{submitted++;return order()}}});
 r.render("Checkout");await r.settle();
 let fields=nodes(r.tree).find(n=>n.type==="GuestBuyerFields");
 assert.equal(fields.props.submitted,false);
 fields.props.onChange({...guest,phone:"123",wardCode:"999"});r.render();await r.settle();
 assert.equal(confirm(r).props.disabled,false);
 await confirm(r).props.onClick();r.render();
 fields=nodes(r.tree).find(n=>n.type==="GuestBuyerFields");
 assert.equal(fields.props.submitted,true);
 assert.equal(submitted,0);
 r.dispose();
});

test("valid guest Store submit sends the same normalized address review used by CSA",async()=>{
 let sent;
 const r=checkout({services:{createStoreCheckout:async payload=>{sent=payload;return order()}}});
 r.render("Checkout");await r.settle();
 nodes(r.tree).find(n=>n.type==="GuestBuyerFields").props.onChange({...guest,name:"  Khách thử  ",phone:"0901234567",address:"  12 Đường thử  "});
 r.render();await r.settle();await confirm(r).props.onClick();
 assert.equal(sent.guest.recipient_name,"Khách thử");
 assert.equal(sent.guest.phone_number,"+84901234567");
 assert.equal(sent.guest.address,"12 Đường thử");
 assert.equal(sent.guest.province_code,"66");
 assert.equal(sent.guest.ward_code,"1");
 r.dispose();
});

test("an unknown checkout result survives remount and replays its original payload even after cart/address changes",async()=>{
 const storage=new Map(),payloads=[],navigated=[];
 const first=checkout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();await tick();first.render();
 assert.match(text(first.tree),/Chưa xác định/);
 first.dispose();
 const next=checkout({storage,onNavigate:href=>navigated.push(href),services:{createStoreCheckout:async payload=>{payloads.push(payload);return order("original",{locale:"vi"})},storeOrderHref:value=>`/store/orders/${value.id}/${value.locale}`}});
 next.context.data.storeProducts[PRODUCT_ID]={...product,retail_price_vnd:90000};next.context.ui.cart[PRODUCT_ID]=2;
 next.render("Checkout");await next.settle();
 assert.match(text(next.tree),/Chưa xác định/);
 assert.equal(nodes(next.tree).find(n=>n.type==="MoneyLine").props.value,"70000");
 await confirm(next).props.onClick();await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(payloads[1])),JSON.parse(JSON.stringify(payloads[0])));
 assert.deepEqual(navigated,["/store/orders/original/vi"]);
 assert.ok(![...storage.keys()].some(key=>key.startsWith("nfv_store_checkout_intent")));
 next.dispose();
});

test("a saved checkout intent from another owner is never replayed",async()=>{
 const storage=new Map();
 const first=checkout({storage,services:{createStoreCheckout:async()=>{throw new ApiError(0)}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();await tick();first.dispose();
 const auth={status:"authenticated",session:{subject:"B"}},second=checkout({storage,auth,context:{accountSessionKey:"B",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:product}}}});
 second.render("Checkout");await second.settle();assert.doesNotMatch(text(second.tree),/Chưa xác định/);second.dispose();
});

test("failed verification preserves payment snapshot but blocks both handler and buttons until GET succeeds",async()=>{
 let reports=0,gets=0;
 const paid=order("A",{status:"payment_pending",paymentStatus:"unconfirmed",totalVnd:40000,payment:{bankBin:"970436",bankName:"Bank",accountNumber:"123",accountName:"NFV",transferContent:"A",qrPayload:{acqId:"970436",accountNo:"123",accountName:"NFV",amount:40000,addInfo:"A"}},expiresAt:"2099-11-01T00:00:00Z"});
 const pending=deferred();
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:async()=>++gets===1?Promise.reject(Error("offline")):pending.promise,reportStoreTransfer:async()=>{reports++;throw Error("offline")}}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:paid});await r.settle();
 const report=()=>nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Tôi đã chuyển khoản"));
 await report().props.onClick();await r.settle();
 assert.ok(nodes(r.tree).some(n=>n.type==="StorePageHeading"));assert.equal(report().props.disabled,true);
 await report().props.onClick();assert.equal(reports,1);
 const retry=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.kind==="error");retry.props.action.onClick();r.render();assert.equal(report().props.disabled,true);
 pending.resolve(paid);await r.settle();assert.equal(report().props.disabled,false);r.dispose();
});

test("checkout does not send an order when durable attempt storage is unavailable",async()=>{
 let calls=0;
 const storage=new Map();storage.set=()=>{throw Error("blocked")};
 const r=checkout({storage,services:{createStoreCheckout:async()=>{calls++;return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.render("Checkout");await r.settle();await confirm(r).props.onClick();await tick();r.render();
 assert.equal(calls,0);assert.equal(confirm(r).props.disabled,true);
 assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&n.props.action));r.dispose();
});

test("guest auth errors block checkout without changing the outstanding guest attempt",async()=>{
 const storage=new Map(),payloads=[],auth={status:"guest",session:null};
 const r=checkout({storage,auth,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 r.render("Checkout");await r.settle();await confirm(r).props.onClick();await tick();r.render();
 auth.status="error";r.context.accountSessionKey="error";r.render();r.flush();
 assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&n.props.kind==="error"));
 assert.equal(confirm(r),undefined);assert.equal(payloads.length,1);
 auth.status="guest";r.context.accountSessionKey="guest";r.render();await r.settle();
 assert.match(text(r.tree),/Chưa xác định/);await confirm(r).props.onClick();await tick();
 assert.equal(payloads.length,2);assert.deepEqual(JSON.parse(JSON.stringify(payloads[1])),JSON.parse(JSON.stringify(payloads[0])));r.dispose();
});

test("legacy error-state guest attempts are found under stable guest ownership",async()=>{
 const storage=new Map(),payloads=[];
 const first=checkout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();await tick();first.dispose();
 const key="nfv_store_checkout_intent_v1:guest",legacy=JSON.parse(storage.get(key));legacy.owner="error";
 storage.set("nfv_store_checkout_intent_v1:error",JSON.stringify(legacy));storage.delete(key);
 const next=checkout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 next.render("Checkout");await next.settle();assert.match(text(next.tree),/Chưa xác định/);
 await confirm(next).props.onClick();await tick();assert.deepEqual(JSON.parse(JSON.stringify(payloads[1])),JSON.parse(JSON.stringify(payloads[0])));next.dispose();
});

test("corrupt intents are not sent or discarded and offer safe order lookup",async()=>{
 const storage=new Map();
 const first=checkout({storage,services:{createStoreCheckout:async()=>{throw new ApiError(0)}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();await tick();first.dispose();
 const key="nfv_store_checkout_intent_v1:guest",missing=JSON.parse(storage.get(key));delete missing.payload.expected_total_vnd;
 for(const raw of [JSON.stringify(missing),"{broken"]){
  storage.set(key,raw);let calls=0;
  const r=checkout({storage,services:{createStoreCheckout:async()=>{calls++;throw new ApiError(400)}}});
  r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,true);
  await confirm(r).props.onClick();assert.equal(calls,0);assert.equal(storage.get(key),raw);
  assert.ok(nodes(r.tree).some(n=>n.type==="a"&&n.props.href==="/account/vi?tab=orders"));
  nodes(r.tree).find(n=>n.type==="DataState"&&n.props.action).props.action.onClick();await r.settle();
  assert.equal(confirm(r).props.disabled,true);assert.equal(storage.get(key),raw);r.dispose();
 }
});

test("generic serializer HTTP 400 during replay cannot release an unknown attempt",async()=>{
 const storage=new Map(),payloads=[];
 const first=checkout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();await tick();first.dispose();
 const next=checkout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(400)}}});
 next.render("Checkout");await next.settle();await confirm(next).props.onClick();await tick();next.render();
 assert.match(text(next.tree),/Chưa xác định/);
 assert.deepEqual(JSON.parse(JSON.stringify(payloads[1])),JSON.parse(JSON.stringify(payloads[0])));assert.ok(storage.has("nfv_store_checkout_intent_v1:guest"));next.dispose();
});


test("order status revalidates in the background and on focus without hiding the snapshot",async()=>{
 let calls=0;const pending=deferred();let current=order();
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:async()=>{calls++;return calls===2?pending.promise:current}}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi"});await r.settle();
 r.fireInterval(30000);r.render();assert.equal(calls,2);
 assert.ok(nodes(r.tree).some(n=>n.type==="StorePageHeading"));
 current=order("A",{status:"pending_delivery"});pending.resolve(current);await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"Chờ giao");
 current=order("A",{status:"delivered"});r.focus();await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"Đã giao");
 const before=calls;r.fireInterval(30000);await r.settle();assert.equal(calls,before);
 r.dispose();r.focus();assert.equal(calls,before);
});


test("a background order read cannot overwrite a transfer mutation and hidden tabs do not poll",async()=>{
 const old=deferred();let gets=0;
 const paid=order("A",{status:"payment_pending",paymentStatus:"unconfirmed",totalVnd:40000,payment:{bankBin:"970436",bankName:"Bank",accountNumber:"123",accountName:"NFV",transferContent:"A",qrPayload:{acqId:"970436",accountNo:"123",accountName:"NFV",amount:40000,addInfo:"A"}},expiresAt:"2099-11-01T00:00:00Z"});
 const accepted={...paid,status:"pending_review",transferReportedAt:"2026-11-01T00:01:00Z"};
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:async()=>{gets++;return old.promise},reportStoreTransfer:async()=>accepted}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:paid});await r.settle();
 r.document.visibilityState="hidden";r.fireInterval(30000);assert.equal(gets,0);
 r.document.visibilityState="visible";r.fireInterval(30000);r.focus();assert.equal(gets,1);
 const report=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Tôi đã chuyển khoản"));
 report.props.onClick();await r.settle();old.resolve(paid);await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"Chờ duyệt");
 assert.ok(!nodes(r.tree).some(n=>n.type==="Button"&&text(n).includes("Tôi đã chuyển khoản")));
 r.dispose();
});


test("checkout success removes only purchased quantities and preserves later cart additions",async()=>{
 const pending=deferred(),other="22222222-2222-4222-8222-222222222222",payloads=[];
 const r=checkout({services:{createStoreCheckout:payload=>{payloads.push(payload);return pending.promise},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();assert.equal(payloads[0].lines[0].quantity,1);
 r.context.ui.cart={[PRODUCT_ID]:3,[other]:2};r.context.ui.applyCSA={[PRODUCT_ID]:true,[other]:true};r.context.ui.cartProductNotice={[other]:"price_changed"};r.render();
 pending.resolve(order());await tick();r.render();
 assert.deepEqual({...r.context.ui.cart},{[PRODUCT_ID]:2,[other]:2});assert.equal(r.context.ui.applyCSA[other],true);assert.equal(r.context.ui.cartProductNotice[other],"price_changed");r.dispose();
});

test("resuming an unknown checkout keeps items added after the saved request",async()=>{
 const storage=new Map(),other="22222222-2222-4222-8222-222222222222";
 const first=checkout({storage,services:{createStoreCheckout:async()=>{throw new ApiError(0)}}});first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();
 const next=checkout({storage,services:{createStoreCheckout:async()=>order(),storeOrderHref:()=>"/store/orders/A/vi"}});next.context.ui.cart={[PRODUCT_ID]:1,[other]:2};next.render("Checkout");await next.settle();await confirm(next).props.onClick();await tick();next.render();
 assert.deepEqual({...next.context.ui.cart},{[other]:2});assert.ok(!storage.has("nfv_store_checkout_intent_v1:guest"));next.dispose();
});

test("CSA unavailable rejection requotes and allows a new cash request",async()=>{
 const payloads=[],failure=new ApiError(400);failure.code="store_quota_unavailable";let quotaCalls=0;
 const auth={status:"authenticated",session:{subject:"A"}};
 const r=checkout({auth,fetcher:async()=>({ok:true,json:async()=>({...product,csa_quota_group:{id:"g",cost:1}})}),context:{accountSessionKey:"A",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:{...product,csa_quota_group:{id:"g",cost:1}}},shippingAddress:{name:"A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true}}},services:{getStoreQuota:async()=>++quotaCalls===1?{active:true,products:[{productId:"g",availableUnits:1}]}:{active:false,products:[]},createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw failure;return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.context.ui.accountFetchState.address="ready";r.context.ui.applyCSA={[PRODUCT_ID]:true};r.render("Checkout");await r.settle();confirm(r).props.onClick();await r.settle();
 assert.equal(payloads[0].lines[0].use_quota,true);assert.ok(!text(r.tree).includes("Chưa xác định được kết quả"));
 const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.ok(accept);assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();await confirm(r).props.onClick();
 assert.equal(payloads.length,2);assert.equal(payloads[1].lines[0].use_quota,false);assert.equal(payloads[1].expected_total_vnd,70000);assert.notEqual(payloads[1].idempotency_key,payloads[0].idempotency_key);r.dispose();
});

test("legacy carts over 50 products show a cart limit and can recover by removing extras",async()=>{
 let calls=0;const r=checkout({services:{createStoreCheckout:async()=>{calls++;return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 const products=Array.from({length:51},(_,i)=>({...product,id:`${String(i+1).padStart(8,"0")}-1111-4111-8111-111111111111`,slug:`p-${i}`}));
 r.context.data.storeProducts=Object.fromEntries(products.map(p=>[p.id,p]));r.context.ui.cart=Object.fromEntries(products.map(p=>[p.id,1]));r.context.ui.cartProductState=Object.fromEntries(products.map(p=>[p.id,"ready"]));
 r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/50/);assert.ok(!nodes(r.tree).some(n=>n.type==="DataState"&&/khôi phục/.test(n.props.title)));assert.equal(calls,0);
 delete r.context.ui.cart[products[50].id];r.render();assert.equal(confirm(r).props.disabled,false);await confirm(r).props.onClick();assert.equal(calls,1);r.dispose();
});

test("orders revalidate on tab re-entry and focus without hiding the snapshot",async()=>{
 let calls=0,current=order("A",{status:"pending_review"});const pending=deferred();
 const r=runtime("src/screens/AccountOrders.tsx",{auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async()=>{calls++;return calls===2?pending.promise:{items:[current],meta:{total:1}}}}});
 r.render("OrdersView",{active:true});await r.settle();assert.equal(calls,1);
 r.render(undefined,{active:false});await r.settle();r.focus();assert.equal(calls,1);
 r.render(undefined,{active:true});r.flush();assert.equal(calls,2);r.render();assert.ok(nodes(r.tree).some(n=>n.type==="article"));
 current=order("A",{status:"pending_delivery"});pending.resolve({items:[current],meta:{total:1}});await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"pending_delivery");
 current=order("A",{status:"delivered"});r.focus();await r.settle();assert.equal(calls,3);assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"delivered");r.dispose();
});

test("failed order-list refresh preserves its snapshot and exposes a working retry",async()=>{
 let fail=false,calls=0;
 const r=runtime("src/screens/AccountOrders.tsx",{auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async()=>{calls++;if(fail)throw Error("offline");return {items:[order("A",{status:calls===1?"pending_review":"pending_delivery"})],meta:{total:1}}}}});
 r.render("OrdersView");await r.settle();fail=true;r.focus();await r.settle();
 assert.ok(nodes(r.tree).some(n=>n.type==="article"));assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"pending_review");
 const warning=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.kind==="error");assert.ok(warning);assert.ok(warning.props.action);
 fail=false;warning.props.action.onClick();await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"pending_delivery");assert.ok(!nodes(r.tree).some(n=>n.type==="DataState"&&n.props.kind==="error"));r.dispose();
});

test("order-list refresh reloads all loaded pages and publishes them together",async()=>{
 const calls=[],second=deferred();let refresh=false;
 const result=page=>({items:Array.from({length:20},(_,i)=>order(`order-${(page-1)*20+i}`,{status:refresh?"pending_delivery":"pending_review"})),meta:{total:40}});
 const r=runtime("src/screens/AccountOrders.tsx",{auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async input=>{calls.push(input.page);return refresh&&input.page===2?second.promise:result(input.page)}}});
 r.render("OrdersView");await r.settle();nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xem thêm")).props.onClick();await r.settle();assert.equal(nodes(r.tree).filter(n=>n.type==="article").length,40);
 refresh=true;r.focus();await tick();r.render();assert.equal(nodes(r.tree).filter(n=>n.type==="article").length,40);assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"pending_review");
 second.resolve(result(2));await r.settle();assert.equal(nodes(r.tree).filter(n=>n.type==="article").length,40);assert.ok(nodes(r.tree).filter(n=>n.type==="Status").every(n=>n.props.label==="pending_delivery"));assert.deepEqual(calls,[1,2,1,2]);r.dispose();
});

test("an old background list refresh cannot overwrite a newer filter result",async()=>{
 const old=deferred();let calls=0;
 const r=runtime("src/screens/AccountOrders.tsx",{auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async input=>{calls++;if(calls===2)return old.promise;return {items:[order(input.status?"fresh":"initial",{status:input.status??"pending_review"})],meta:{total:40}}}}});
 r.render("OrdersView");await r.settle();r.focus();assert.equal(calls,2);
 nodes(r.tree).find(n=>n.type==="Tabs").props.onChange("pending_delivery");await r.settle();assert.equal(calls,3);
 old.resolve({items:[order("stale")],meta:{total:1}});await r.settle();assert.ok(text(r.tree).includes("fresh"));assert.ok(!text(r.tree).includes("stale"));r.dispose();
});

test("focus refresh also updates a filter derived from complete All data",async()=>{
 const calls=[];let refreshed=false;
 const r=runtime("src/screens/AccountOrders.tsx",{auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async input=>{calls.push({...input});return refreshed?{items:[],meta:{total:0}}:{items:[order("pending",{status:"pending_review"}),order("done",{status:"delivered"})],meta:{total:2}}}}});
 r.render("OrdersView");await r.settle();nodes(r.tree).find(n=>n.type==="Tabs").props.onChange("pending_review");await r.settle();assert.equal(calls.length,1);assert.equal(nodes(r.tree).filter(n=>n.type==="article").length,1);
 refreshed=true;r.focus();await r.settle();assert.equal(calls.length,2);assert.equal(calls[1].status,"pending_review");assert.equal(nodes(r.tree).filter(n=>n.type==="article").length,0);r.dispose();
});


test("mobile Account hub re-entry refreshes orders while the hidden hub does not fetch on focus",async()=>{
 let calls=0;
 const context={ui:{locale:"vi",accountHubOpen:false},navigate(){}};
 const r=runtime("src/screens/AccountOrders.tsx",{mobileAccount:true,auth:{status:"authenticated",session:{subject:"A"}},context,services:{getStoreOrders:async()=>{calls++;return {items:[order("A",{status:calls===1?"pending_review":"pending_delivery"})],meta:{total:1}}}}});
 r.render("OrdersView",{active:true});await r.settle();assert.equal(calls,1);
 context.ui.accountHubOpen=true;r.render();r.flush();r.focus();await r.settle();assert.equal(calls,1);
 context.ui.accountHubOpen=false;r.render();await r.settle();assert.equal(calls,2);assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"pending_delivery");r.dispose();
});


test("product rejection refreshes every line, keeps removed products visible and allows checkout after removal",async()=>{
 const other="22222222-2222-4222-8222-222222222222",payloads=[],fetched=[];const failure=new ApiError(400);failure.code="store_product_changed";
 const r=checkout({fetcher:async url=>{fetched.push(url);return url.includes("/rau?")?{ok:false,status:404}:{ok:true,json:async()=>({...product,id:other,slug:"other",retail_price_vnd:50000})}},services:{createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw failure;return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.context.data.storeProducts[other]={...product,id:other,slug:"other"};r.context.ui.cart[other]=1;r.context.ui.cartProductState[other]="ready";
 r.context.updateCart=(id,delta)=>{r.context.ui.cart[id]+=delta;if(r.context.ui.cart[id]<=0)delete r.context.ui.cart[id]};
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await r.settle();
 assert.equal(fetched.length,2);assert.equal(r.context.ui.cartProductState[PRODUCT_ID],"unavailable");assert.equal(r.context.ui.cart[PRODUCT_ID],1);assert.equal(r.context.data.storeProducts[other].retail_price_vnd,50000);assert.equal(confirm(r).props.disabled,true);
 nodes(r.tree).find(n=>n.type==="DataState"&&n.props.title==="Sản phẩm không còn bán").props.action.onClick();r.render();
 const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();confirm(r).props.onClick();await tick();
 assert.equal(payloads.length,2);assert.equal(payloads[1].lines.length,1);assert.equal(payloads[1].lines[0].product_id,other);assert.equal(payloads[1].expected_total_vnd,80000);assert.notEqual(payloads[0].idempotency_key,payloads[1].idempotency_key);r.dispose();
});

test("unsupported area rejection refreshes guest choices and permits a supported replacement address",async()=>{
 let areasCalls=0;const payloads=[],shippingCalls=[],failure=new ApiError(400);failure.code="store_shipping_area_unsupported";
 const r=checkout({fetcher:async()=>({ok:true,json:async()=>product}),services:{getSupportedShippingAreas:async()=>[{code:"66",name:"Province",wards:[{code:++areasCalls===1?"1":"2",name:"Ward",shippingFeeVnd:"40000"}]}],getShippingQuote:async(_province,ward)=>{shippingCalls.push(ward);return ward==="2"?{supported:true,shippingFeeVnd:40000}:shippingCalls.length===1?{supported:true,shippingFeeVnd:30000}:{supported:false,shippingFeeVnd:null}},createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw failure;return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await r.settle();assert.equal(areasCalls,2);assert.equal(shippingCalls.length,2);assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/Khu vực này chưa được hỗ trợ/);
 const fields=nodes(r.tree).find(n=>n.type==="GuestBuyerFields");assert.equal(fields.props.areas[0].wards[0].code,"2");fields.props.onChange({...guest,wardCode:"2"});await r.settle();
 const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();confirm(r).props.onClick();await tick();
 assert.equal(payloads.length,2);assert.equal(payloads[1].guest.ward_code,"2");assert.equal(payloads[1].expected_shipping_fee_vnd,40000);assert.notEqual(payloads[1].idempotency_key,payloads[0].idempotency_key);r.dispose();
});

test("address rejection reloads the member address and does not replay its obsolete timestamp",async()=>{
 for(const code of ["store_shipping_address_invalid","store_shipping_address_required"]){
  const failure=new ApiError(400);failure.code=code;let refreshes=0;
  const r=addressCheckout({fetcher:async()=>({ok:true,json:async()=>product}),services:{createStoreCheckout:async()=>{throw failure}}});
  r.context.refreshResource=async resource=>{assert.equal(resource,"address");refreshes++;r.context.data.shippingAddress=null};
  r.render("Checkout");await r.settle();confirm(r).props.onClick();await r.settle();assert.equal(refreshes,1);assert.equal(confirm(r).props.disabled,true);assert.ok(!text(r.tree).includes("Chưa xác định được kết quả"));
  assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&n.props.title.includes("bổ sung địa chỉ")));r.dispose();
 }
});

test("expired payment hides QR and transfer copying even when status refresh fails, and retry resolves status",async()=>{
 let fail=true;const snapshot=order("A",{status:"payment_pending",paymentStatus:"unconfirmed",totalVnd:40000,payment:{bankBin:"970436",bankName:"Bank",accountNumber:"123",accountName:"NFV",transferContent:"A",qrPayload:{acqId:"970436",accountNo:"123",accountName:"NFV",amount:40000,addInfo:"A"}},serverTime:"2026-11-01T00:06:00Z",expiresAt:"2026-11-01T00:05:00Z"});
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:async()=>{if(fail)throw Error("offline");return {...snapshot,status:"cancelled",expiresAt:null}}}});
 r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:snapshot});await r.settle();assert.ok(!nodes(r.tree).some(n=>n.type==="BankTransferPanel"));assert.ok(!nodes(r.tree).some(n=>n.type==="Button"&&text(n).includes("Tôi đã chuyển khoản")));
 const expired=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.title==="Đã hết thời hạn");assert.ok(expired);assert.ok(expired.props.action);assert.equal(nodes(r.tree).filter(n=>n.type==="DataState"&&n.props.kind==="error").length,1);
 fail=false;expired.props.action.onClick();await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"Đã hủy");assert.ok(!nodes(r.tree).some(n=>n.type==="BankTransferPanel"));r.dispose();
});

test("a failed resource refresh after product rejection stays blocked until retry succeeds",async()=>{
 let fail=true,gets=0;const failure=new ApiError(400);failure.code="store_product_changed";
 const r=checkout({fetcher:async()=>{gets++;if(fail)throw Error("offline");return {ok:true,json:async()=>({...product,retail_price_vnd:50000})}},services:{createStoreCheckout:async()=>{throw failure}}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await r.settle();assert.equal(confirm(r).props.disabled,true);
 const retry=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.kind==="error"&&n.props.title.includes("checkout"));assert.ok(retry);fail=false;retry.props.action.onClick();await r.settle();
 assert.equal(gets,2);assert.equal(r.context.data.storeProducts[PRODUCT_ID].retail_price_vnd,50000);const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.equal(accept.props.disabled,false);r.dispose();
});

test("expired QR is hidden while the expiry verification request is still pending",async()=>{
 const pending=deferred();const snapshot=order("A",{status:"payment_pending",paymentStatus:"unconfirmed",totalVnd:40000,payment:{bankBin:"970436",bankName:"Bank",accountNumber:"123",accountName:"NFV",transferContent:"A",qrPayload:{acqId:"970436",accountNo:"123",accountName:"NFV",amount:40000,addInfo:"A"}},serverTime:"2026-11-01T00:06:00Z",expiresAt:"2026-11-01T00:05:00Z"});
 const r=runtime("src/screens/store/StoreOrderDetail.tsx",{services:{getStoreOrder:()=>pending.promise}});r.render("StoreOrderDetail",{id:"A",locale:"vi",initialOrder:snapshot});await r.settle();
 assert.ok(!nodes(r.tree).some(n=>n.type==="BankTransferPanel"));const state=nodes(r.tree).find(n=>n.type==="DataState"&&n.props.title==="Đã hết thời hạn");assert.equal(state.props.kind,"loading");assert.equal(state.props.action,undefined);
 pending.resolve({...snapshot,status:"cancelled",expiresAt:null});await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="Status").props.label,"Đã hủy");r.dispose();
});


test("Store checkout expires the current session on 401 and preserves its owner-scoped intent for sign-in",async()=>{
 const storage=new Map();let expired=0;
 const auth={status:"authenticated",session:{subject:"A"},expire(){expired++;auth.status="expired";auth.session=null;r.render();r.flush()}};
 const r=checkout({storage,auth,context:{accountSessionKey:"A",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:product},shippingAddress:{name:"A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true}}},services:{createStoreCheckout:async()=>{throw new ApiError(401)}}});
 r.context.ui.accountFetchState.address="ready";
 r.render("Checkout");await r.settle();await confirm(r).props.onClick();await r.settle();
 assert.equal(expired,1);assert.ok(storage.has("nfv_store_checkout_intent_v1:A"));
 const login=nodes(r.tree).find(n=>n.type==="a"&&n.props.href?.startsWith("/api/auth/login"));assert.ok(login);
 assert.equal(new URL(login.props.href,"https://site.test").searchParams.get("returnTo"),"/store/checkout/vi");
 auth.status="authenticated";auth.session={subject:"A"};r.context.accountSessionKey="A";r.render();await r.settle();
 assert.match(text(r.tree),/Chưa xác định/);r.dispose();
});

test("a Store quota 401 expires the current session",async()=>{
 let expired=0;const auth={status:"authenticated",session:{subject:"A"},expire(){expired++}};
 const r=checkout({auth,context:{accountSessionKey:"A"},services:{getStoreQuota:async()=>{throw new ApiError(401)}}});
 r.render("Checkout");await r.settle();assert.equal(expired,1);r.dispose();
});

test("a Store order-list 401 from an older owner cannot expire the replacement session",async()=>{
 const pending=deferred();let expired=0,calls=0;
 const auth={status:"authenticated",session:{subject:"A"},expire(){expired++}};
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:()=>++calls===1?pending.promise:Promise.resolve({items:[],meta:{total:0}})}});
 r.render("OrdersView");r.flush();auth.session={subject:"B"};r.render();await r.settle();
 pending.reject(new ApiError(401));await r.settle();assert.equal(expired,0);r.dispose();
});

test("a current Store order-list 401 expires its owner",async()=>{
 let expired=0;const auth={status:"authenticated",session:{subject:"A"},expire(){expired++}};
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:async()=>{throw new ApiError(401)}}});
 r.render("OrdersView");await r.settle();assert.equal(expired,1);r.dispose();
});


test("an expired checkout stays blocked after guest reload and resumes only for its original account",async()=>{
 const storage=new Map();const auth={status:"authenticated",session:{subject:"A"},expire(){auth.status="expired";auth.session=null}};
 const r=checkout({storage,auth,context:{accountSessionKey:"A",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:product},shippingAddress:{name:"A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true}}},services:{createStoreCheckout:async()=>{throw new ApiError(401)}}});
 r.context.ui.accountFetchState.address="ready";r.render("Checkout");await r.settle();await confirm(r).props.onClick();await r.settle();r.dispose();
 let calls=0;const restored=checkout({storage,services:{createStoreCheckout:async()=>{calls++;return order()}}});
 restored.render("Checkout");await restored.settle();assert.ok(!confirm(restored));assert.ok(nodes(restored.tree).some(n=>n.type==="a"&&n.props.href?.startsWith("/api/auth/login")));
 restored.auth.status="authenticated";restored.auth.session={subject:"B"};restored.context.accountSessionKey="B";restored.render();await restored.settle();assert.ok(!confirm(restored));assert.equal(calls,0);
 restored.auth.session={subject:"A"};restored.context.accountSessionKey="A";restored.render();await restored.settle();assert.ok(confirm(restored));assert.equal(calls,0);await confirm(restored).props.onClick();await restored.settle();assert.equal(calls,1);assert.equal(storage.has("nfv_store_checkout_intent_v1:A"),false);assert.equal(storage.has("nfv_store_checkout_reauth_v1"),false);restored.dispose();
});

test("a reauthenticated session for the same owner ignores a 401 from the older session",async()=>{
 const pending=deferred();let expired=0,calls=0;const auth={status:"authenticated",session:{subject:"A"},expire(){expired++}};
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:()=>++calls===1?pending.promise:Promise.resolve({items:[],meta:{total:0}})}});
 r.render("OrdersView");r.flush();auth.session={subject:"A"};r.render();pending.reject(new ApiError(401));await r.settle();assert.equal(expired,0);r.dispose();
});


test("Store detail expires only OAuth owners on 401, never a guest authority",async()=>{
 for(const authenticated of [false,true]){
  let expired=0;const auth={status:authenticated?"authenticated":"guest",session:authenticated?{subject:"A"}:null,expire(){expired++}};
  const r=runtime("src/screens/store/StoreOrderDetail.tsx",{auth,context:{copyToClipboard:async()=>true},services:{getStoreOrder:async()=>{throw new ApiError(401)}}});
  r.render("StoreOrderDetail",{id:"A",locale:"vi"});await r.settle();assert.equal(expired,authenticated?1:0);r.dispose();
 }
});


test("an unmounted Store screen cannot expire a later session with a late 401",async()=>{
 const pending=deferred();let expired=0;const auth={status:"authenticated",session:{subject:"A"},expire(){expired++}};
 const r=runtime("src/screens/AccountOrders.tsx",{auth,context:{ui:{locale:"vi"},navigate(){}},services:{getStoreOrders:()=>pending.promise}});
 r.render("OrdersView");r.flush();r.dispose();pending.reject(new ApiError(401));await tick();assert.equal(expired,0);
});


test("payment-disabled rejection returns to editable checkout and creates a fresh request",async()=>{
 const payloads=[];
 const r=checkout({services:{createStoreCheckout:async payload=>{
  payloads.push(payload);
  if(payloads.length===1){const error=new ApiError(503);error.code="store_payment_unavailable";throw error;}
  return order();
 }}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();await r.settle();
 assert.ok(!text(r.tree).includes("Chưa xác định được kết quả"));
 assert.ok(nodes(r.tree).some(n=>n.type==="GuestBuyerFields"));
 r.context.ui.cart[PRODUCT_ID]=2;r.render();confirm(r).props.onClick();await tick();await r.settle();
 assert.equal(payloads[1].lines[0].quantity,2);
 assert.notEqual(payloads[1].idempotency_key,payloads[0].idempotency_key);
 r.dispose();
});


test("unresolved guest checkout blocks a fresh member checkout across login and reload",async()=>{
 const storage=new Map(),payloads=[],auth={status:"guest",session:null};
 const services={createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw new ApiError(0);return order()},storeOrderHref:()=>"/store/orders/A/vi"};
 const first=checkout({storage,auth,services});first.render("Checkout");await first.settle();await confirm(first).props.onClick();await first.settle();
 auth.status="authenticated";auth.session={subject:"A"};first.context.accountSessionKey="A";first.render();await first.settle();
 assert.equal(confirm(first),undefined);assert.ok(nodes(first.tree).some(n=>n.type==="form"&&n.props.action==="/api/auth/logout?locale=vi"));first.dispose();
 const restored=checkout({storage,auth,services,context:{accountSessionKey:"A"}});restored.render("Checkout");await restored.settle();assert.equal(confirm(restored),undefined);assert.equal(payloads.length,1);
 auth.status="guest";auth.session=null;restored.context.accountSessionKey="guest";restored.render();await restored.settle();await confirm(restored).props.onClick();await restored.settle();
 assert.equal(payloads.length,2);assert.equal(payloads[1].idempotency_key,payloads[0].idempotency_key);assert.equal(storage.has("nfv_store_checkout_intent_v1:guest"),false);restored.dispose();
});

test("unresolved member checkout survives logout and account switching without a 401",async()=>{
 const storage=new Map(),payloads=[],auth={status:"authenticated",session:{subject:"A"}};
 const address={name:"Owner A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true};
 const r=checkout({storage,auth,context:{accountSessionKey:"A",data:{authenticated:true,storeProducts:{[PRODUCT_ID]:product},shippingAddress:address}},services:{createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw new ApiError(0);return order()},storeOrderHref:()=>"/store/orders/A/vi"}});
 r.context.ui.accountFetchState.address="ready";r.render("Checkout");await r.settle();await confirm(r).props.onClick();await r.settle();
 for(const next of [null,"B"]){auth.status=next?"authenticated":"guest";auth.session=next?{subject:next}:null;r.context.accountSessionKey=next??"guest";r.render();await r.settle();assert.equal(confirm(r),undefined);assert.ok(!text(r.tree).includes("Owner A"));}
 auth.status="authenticated";auth.session={subject:"A"};r.context.accountSessionKey="A";r.render();await r.settle();await confirm(r).props.onClick();await r.settle();
 assert.equal(payloads.length,2);assert.equal(payloads[1].idempotency_key,payloads[0].idempotency_key);r.dispose();
});

test("legacy unresolved member attempt is discovered after reload under another account",async()=>{
 const storage=new Map(),payloads=[];
 const original=addressCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw new ApiError(0)}}});
 original.render("Checkout");await original.settle();await confirm(original).props.onClick();await original.settle();original.dispose();
 storage.delete("nfv_store_checkout_pending_owner_v1");
 const next=checkout({storage,auth:{status:"authenticated",session:{subject:"B"}},context:{accountSessionKey:"B"}});next.render("Checkout");await next.settle();
 assert.equal(confirm(next),undefined);assert.equal(payloads.length,1);next.dispose();
});
