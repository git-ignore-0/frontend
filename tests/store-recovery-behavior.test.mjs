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
const DELIVERY_DATE="2026-11-01";
const guest={name:"Khách thử",phone:"0901234567",provinceCode:"66",wardCode:"1",address:"12 Đường thử"};
const PRODUCT_ID="11111111-1111-4111-8111-111111111111";
const product={id:PRODUCT_ID,slug:"rau",name:"Rau",unit_size:"1.000",unit_label:"kg",retail_price_vnd:40000,available_quantity:10,csa_quota_group:null};
const order=(id="A",overrides={})=>({id,referenceCode:id,status:"pending_review",paymentStatus:"not_required",locale:"vi",lines:[],shippingAddress:{provinceCode:"66",wardCode:"1",recipientName:"Khách thử",phoneNumber:"0901234567",address:"12 Đường thử"},subtotalVnd:0,shippingFeeVnd:0,totalVnd:0,payment:null,expiresAt:null,serverTime:"2026-11-01T00:00:00Z",createdAt:"2026-11-01T00:00:00Z",...overrides});

function runtime(path,{services={},context={},auth={status:"guest",session:null},mobileAccount=false,storage=new Map(),onNavigate=()=>{},onReplace=onNavigate,search="",searchState={value:search},fetcher=async()=>{throw Error("offline")},clock=performance}={}){
 let cursor=0,states=[],deps=[],effects=[],cleanups=[],tree;const timers=new Map(),listeners=new Map(),document={visibilityState:"visible"};let timerId=0;
 const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return [states[i],v=>states[i]=typeof v==="function"?v(states[i]):v]},
  useRef(initial){const i=cursor++;return states[i]??={current:initial}},
  useMemo(fn,next){const i=cursor++,saved=states[i];if(!saved||next.some((v,j)=>v!==saved.deps[j]))states[i]={value:fn(),deps:next};return states[i].value},useCallback(fn,next){const i=cursor++;const saved=states[i];if(!saved||next.some((v,j)=>v!==saved.deps[j]))states[i]={fn,deps:next};return states[i].fn},
  useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push({i,fn})}},
 };
 react.useLayoutEffect=react.useEffect;
 context.ui??={locale:"vi"};
 const load=(file,extra={})=>{const exports={};vm.runInNewContext(compile(file),{exports,Date,Intl,performance:clock,crypto,URL,URLSearchParams,console,queueMicrotask,document,fetch:fetcher,window:{setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay,once:true,createdAt:clock.now()});return id},clearTimeout:id=>timers.delete(id),location:{search},matchMedia:()=>({matches:mobileAccount}),addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn)},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn),setInterval:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id},clearInterval:id=>timers.delete(id),sessionStorage:{get length(){return storage.size},key:index=>[...storage.keys()][index]??null,getItem:key=>storage.get(key)??(key==="nfv_store_checkout_guest_v1"?JSON.stringify(guest):null),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}},require:name=>{
  if(name in extra)return extra[name];
  if(name==="@/store/use-checkout-delivery")return load("src/store/use-checkout-delivery.ts");
  if(name==="@/components/store/StoreDeliveryDates")return load("src/components/store/StoreDeliveryDates.tsx");
  if(name==="@/store/store-delivery"||name==="./store-delivery.ts")return load("src/store/store-delivery.ts");
  if(name==="@/account/orders-view-state")return load("src/account/orders-view-state.ts");
  if(name==="@/components/DiscountCodeField")return load("src/components/DiscountCodeField.tsx");
  if(name==="@/lib/voucher-copy")return load("src/lib/voucher-copy.ts");
  if(name==="./store-limits"||name==="@/store/store-limits")return load("src/store/store-limits.ts");
  if(name==="@/store/use-buy-again")return load("src/store/use-buy-again.ts");
  if(name==="@/store/buy-again-session"||name==="./buy-again-session")return load("src/store/buy-again-session.ts");
  if(name==="./checkout-intent")return load("src/store/checkout-intent.ts");
  if(name==="./store-order-model")return load("src/store/store-order-model.ts");
  if(name==="./store-order-service")return services;
  if(name==="./use-store-session")return load("src/store/use-store-session.ts");
  if(name==="@/store/cart-checkout")return load("src/store/cart-checkout.ts");
  if(name==="react")return react;if(name==="react/jsx-runtime")return jsx;
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/state/NFVContext")return {useNFV:()=>context};
  if(name==="next/navigation")return {useRouter:()=>({push:onNavigate,replace:onReplace}),useSearchParams:()=>new URLSearchParams(searchState.value)};
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
 return {auth,context,render,flush,document,fireDueTimers:()=>{for(const [id,timer] of [...timers])if(timer.once&&timer.createdAt+timer.delay<=clock.now()){timers.delete(id);timer.fn()}},fireInterval:delay=>{for(const timer of [...timers.values()])if(timer.delay===delay){if(timer.once)timers.delete([...timers].find(([,v])=>v===timer)?.[0]);timer.fn()}},focus:()=>{for(const fn of [...(listeners.get("focus")??[])])fn()},async settle(){for(let i=0;i<8;i++){flush();await tick();render()}},get tree(){return tree},dispose(){cleanups.forEach(fn=>fn?.())}};
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
 let buyAgainProducts=[],serverFee=30000;
 const defaultQuote=async input=>{
  if(input.coupon_code&&options.services?.previewStoreVoucher)return {...await options.services.previewStoreVoucher(input),deliveryDate:input.delivery_date,shippingDiscountReason:null};
  const lines=input.lines.map(line=>{
   const p=buyAgainProducts.find(p=>p?.id===line.product_id)??context.data.storeProducts[line.product_id]??product;
   const quotaQuantity=line.use_quota&&p.csa_quota_group?Math.min(line.quantity,2):0;
   return {product_id:line.product_id,quantity:line.quantity,use_quota:line.use_quota,expected_unit_price_vnd:p.retail_price_vnd,expected_available_quantity:p.available_quantity,expected_quota_quantity:quotaQuantity};
  });
  const subtotal=lines.reduce((sum,line)=>sum+(line.quantity-line.expected_quota_quantity)*line.expected_unit_price_vnd,0);
  const fee=serverFee;
  return {deliveryDate:input.delivery_date,shippingDiscountReason:null,subtotalVnd:subtotal,eligibleSubtotalVnd:subtotal,discountAmountVnd:0,shippingFeeVnd:fee,totalVnd:subtotal+fee,coupon:null,voucherQuote:null,shippingAddressUpdatedAt:input.guest?null:context.data.shippingAddress?.updatedAt,lines};
 };
 const r=runtime("src/screens/Checkout.tsx",{...options,context,services:{getStoreDeliveryDates:async()=>({serverTime:"2026-11-01T00:00:00Z",dates:Array.from({length:8},(_,i)=>({date:`2026-11-0${i+1}`,freeShipping:false}))}),getStoreQuote:defaultQuote,getShippingQuote:async()=>({supported:true,shippingFeeVnd:30000}),getStoreQuota:async()=>({active:false,products:[]}),...options.services,getShippingQuote:async(...args)=>{const result=await (options.services?.getShippingQuote??(async()=>({supported:true,shippingFeeVnd:30000})))(...args);serverFee=result.shippingFeeVnd;return result},...(options.services?.prepareBuyAgain?{prepareBuyAgain:async(...args)=>{const rows=await options.services.prepareBuyAgain(...args);buyAgainProducts=rows.map(row=>row.product);return rows}}:{})}});
 const settle=r.settle;
 r.settle=async()=>{await settle();if(options.autoSelect!==false){const radio=nodes(r.tree).find(n=>n.type==="input"&&n.props.name==="store-delivery-date");if(radio&&!nodes(r.tree).some(n=>n.type==="input"&&n.props.name==="store-delivery-date"&&n.props.checked)){radio.props.onChange();r.render();await settle();}}};
 return r;
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
 r.render("Checkout");await r.settle();const button=confirm(r);button.props.onClick();button.props.onClick();await tick();assert.equal(payloads.length,1);
 pending.reject(Error("offline"));await tick();r.render();confirm(r).props.onClick();await tick();assert.equal(payloads.length,2);assert.equal(payloads[1].idempotency_key,payloads[0].idempotency_key);r.dispose();
});

test("checkout does not publish a previous session's completed order or clear its cart",async()=>{
 const pending=deferred(),auth={status:"guest",session:null};let sent=0;
 const r=checkout({auth,services:{createStoreCheckout:()=>{sent++;return pending.promise}}});
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();assert.equal(sent,1);auth.status="authenticated";auth.session={subject:"B"};r.render();r.flush();
 pending.resolve(order());await tick();r.render();assert.equal(r.context.ui.cart[PRODUCT_ID],1);r.dispose();
});

test("changing checkout owner hides the old address and waits for the new owner's quota",async()=>{
 const pending=deferred(),auth={status:"authenticated",session:{subject:"A"}};let requests=0;
 const address={name:"Owner A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true};
 const r=checkout({auth,context:{accountSessionKey:"A",data:{authenticated:true,shippingAddress:address,storeProducts:{[PRODUCT_ID]:{...product,csa_quota_group:{id:"g",cost:1}}}}},services:{getStoreQuota:()=>++requests===1?Promise.resolve({active:true,products:[{productId:"g",availableUnits:1}]}):pending.promise}});
 r.context.ui.accountFetchState.address="ready";r.context.ui.applyCSA={[PRODUCT_ID]:true};r.render("Checkout");await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"30000");
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
 assert.equal(confirm(r).props.disabled,true);
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
 r.render("Checkout");await r.settle();confirm(r).props.onClick();await tick();assert.equal(payloads[0].lines[0].quantity,1);
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
 delete r.context.ui.cart[products[50].id];r.render();await r.settle();assert.equal(confirm(r).props.disabled,false);await confirm(r).props.onClick();assert.equal(calls,1);r.dispose();
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
 nodes(r.tree).find(n=>n.type==="DataState"&&n.props.title==="Sản phẩm không còn bán").props.action.onClick();r.render();await r.settle();
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
 r.context.ui.cart[PRODUCT_ID]=2;r.render();await r.settle();confirm(r).props.onClick();await tick();await r.settle();
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


const SOURCE_ORDER="22222222-2222-4222-8222-222222222222",SOURCE_SESSION="33333333-3333-4333-8333-333333333333";
function buyAgainCheckout(options={}){
 const storage=options.storage??new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]);
 return checkout({...options,storage,search:"?source=buy-again",auth:options.auth??{status:"authenticated",session:{subject:"A"}},context:{accountSessionKey:"A",data:{shippingAddress:{...guest,detail:guest.address,updatedAt:"2026-11-01T00:00:00Z"},storeProducts:{[PRODUCT_ID]:product}},ui:{locale:"vi",cart:{[PRODUCT_ID]:7},applyCSA:{[PRODUCT_ID]:true},cartProductState:{[PRODUCT_ID]:"ready"},cartProductNotice:{},accountFetchState:{address:"ready"}},...options.context},services:{prepareBuyAgain:async()=>[{productId:PRODUCT_ID,quantity:2,name:"Old name",reason:null,product:{...product,name:"Fresh name",retail_price_vnd:50000}}],...options.services}});
}

test("buy again reload prepares current data; completion leaves cart and CSA choices untouched",async()=>{
 let sent;const storage=new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]);
 const r=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{sent=payload;return order("new")},storeOrderHref:()=>"/new"}});
 r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,false);
 assert.ok(nodes(r.tree).some(n=>n.type==="StoreProductRow"&&n.props.name==="Fresh name"));
 await confirm(r).props.onClick();await tick();
 assert.equal(sent.lines[0].quantity,2);assert.equal(sent.lines[0].expected_unit_price_vnd,50000);assert.equal(sent.lines[0].use_quota,false);
 assert.equal(r.context.ui.cart[PRODUCT_ID],7);assert.equal(r.context.ui.applyCSA[PRODUCT_ID],true);
 assert.equal(storage.has("nfv_store_buy_again_v1"),false);r.dispose();
});

test("buy again unknown result survives reload and replays same key without clearing cart",async()=>{
 const storage=new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]),payloads=[];
 const first=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw Error("offline")}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();
 const next=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);return order("new")},storeOrderHref:()=>"/new"}});
 next.render("Checkout");await next.settle();assert.match(text(next.tree),/Chưa xác định/);
 await confirm(next).props.onClick();await tick();assert.equal(JSON.stringify(payloads[0]),JSON.stringify(payloads[1]));assert.equal(next.context.ui.cart[PRODUCT_ID],7);next.dispose();
});

test("buy again unavailable and technical errors block checkout without reducing quantities",async()=>{
 for(const technical of [false,true]){
  const r=buyAgainCheckout({services:{prepareBuyAgain:async()=>{if(technical)throw Error("offline");return [{productId:PRODUCT_ID,quantity:10,name:"Rau",reason:"insufficient_stock",product:{...product,available_quantity:6}}]}}});
  r.render("Checkout");await r.settle();assert.equal(confirm(r).props.disabled,true);
  assert.ok(nodes(r.tree).some(n=>n.type==="DataState"&&(technical?/Chưa thể kiểm tra sản phẩm/:/chỉ còn 6, đơn cũ cần 10/).test(n.props.title)));
  assert.equal(r.context.ui.cart[PRODUCT_ID],7);r.dispose();
 }
});

test("buy again owner switch hides the previous source immediately and ignores late prepare",async()=>{
 const late=deferred(),auth={status:"authenticated",session:{subject:"A"}},r=buyAgainCheckout({auth,services:{prepareBuyAgain:()=>late.promise}});
 r.render("Checkout");r.flush();auth.session={subject:"B"};r.context.accountSessionKey="B";r.render();r.flush();
 late.resolve([{productId:PRODUCT_ID,quantity:2,name:"Private old",reason:null,product:{...product,name:"Private old"}}]);await r.settle();
 assert.doesNotMatch(text(r.tree),/Private old/);assert.equal(confirm(r),undefined);r.dispose();
});

test("shared buy again prepare keeps a valid source on all-line failures and distinguishes network errors",async()=>{
 for(const technical of [false,true]){
  const raw=JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION}),storage=new Map([["nfv_store_buy_again_v1",raw]]),nav=[];
  const r=runtime("src/store/use-buy-again.ts",{storage,auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi",page:"account"}},onNavigate:href=>nav.push(href),services:{prepareBuyAgain:async()=>{if(technical)throw Error("offline");return [{productId:PRODUCT_ID,quantity:10,name:"Rau",reason:"insufficient_stock",product:{...product,available_quantity:6}},{productId:"other",quantity:1,name:"Chuối",reason:"unavailable",product:null}]}}});
  r.render("useBuyAgain","vi");r.flush();await r.tree.start(SOURCE_ORDER);r.render();
  assert.match(r.tree.error,technical?/Chưa thể kiểm tra/:/chỉ còn 6, đơn cũ cần 10.*Chuối không còn được bán/);
  assert.equal(storage.get("nfv_store_buy_again_v1"),raw);assert.equal(nav.length,0);r.dispose();
 }
});

test("shared buy again rejects duplicate clicks and late results after unmount",async()=>{
 const wait=deferred(),storage=new Map(),nav=[];let calls=0;
 const r=runtime("src/store/use-buy-again.ts",{storage,auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"}},onNavigate:href=>nav.push(href),services:{prepareBuyAgain:()=>{calls++;return wait.promise}}});
 r.render("useBuyAgain","vi");r.flush();const first=r.tree.start(SOURCE_ORDER);void r.tree.start(SOURCE_ORDER);assert.equal(calls,1);r.dispose();
 wait.resolve([{productId:PRODUCT_ID,quantity:2,name:"Rau",reason:null,product}]);await first;
 assert.equal(storage.size,0);assert.equal(nav.length,0);
});

test("shared buy again refuses a new prepare when a checkout result is unresolved",async()=>{
 const storage=new Map();const first=checkout({storage,services:{createStoreCheckout:async()=>{throw Error("offline")}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();let calls=0;
 const r=runtime("src/store/use-buy-again.ts",{storage,auth:{status:"authenticated",session:{subject:"A"}},context:{ui:{locale:"vi"}},services:{prepareBuyAgain:async()=>{calls++;return []}}});
 r.render("useBuyAgain","vi");r.flush();await r.tree.start(SOURCE_ORDER);r.render();assert.equal(calls,0);assert.match(r.tree.error,/chưa rõ kết quả/);assert.equal(storage.has("nfv_store_buy_again_v1"),false);r.dispose();
});


test("clicking an order card opens detail without preparing buy again and preserves modified link clicks",async()=>{
 const nav=[],context={ui:{locale:"vi",accountTab:"orders",accountHubOpen:false},navigate:(...args)=>nav.push(args)};
 const r=runtime("src/screens/AccountOrders.tsx",{context,auth:{status:"authenticated",session:{subject:"A"}},services:{getStoreOrders:async()=>({items:[order(SOURCE_ORDER,{status:"delivered"})],meta:{total:1}}),prepareBuyAgain:async()=>{throw Error("must_not_prepare")}}});
 r.render("OrdersView");await r.settle();const link=nodes(r.tree).find(n=>n.type==="a"&&n.props.className==="store-order-card-link");
 assert.equal(link.props.href,`/store/orders/${SOURCE_ORDER}/vi`);assert.ok(!nodes(r.tree).some(n=>n.type==="Button"&&/Mua lại|Xem chi tiết/.test(text(n))));
 let prevented=false;link.props.onClick({button:0,ctrlKey:true,preventDefault(){prevented=true}});assert.equal(nav.length,0);assert.equal(prevented,false);
 link.props.onClick({button:0,preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(nav[0][0],"order-detail");assert.equal(nav[0][1].productId,SOURCE_ORDER);r.dispose();
});

test("changing checkout source marker returns to the untouched regular cart",async()=>{
 const searchState={value:"?source=buy-again"},r=buyAgainCheckout({searchState});
 r.render("Checkout");await r.settle();assert.equal(nodes(r.tree).find(n=>n.type==="StoreProductRow").props.name,"Fresh name");
 searchState.value="";r.render();await r.settle();
 assert.equal(nodes(r.tree).find(n=>n.type==="StoreProductRow").props.name,"Rau");
 assert.equal(r.context.ui.cart[PRODUCT_ID],7);assert.equal(r.context.ui.applyCSA[PRODUCT_ID],true);r.dispose();
});


test("an unresolved cart intent owns recovery source even with a buy again query marker",async()=>{
 const storage=new Map();
 const first=buyAgainCheckout({storage,searchState:{value:""},services:{createStoreCheckout:async()=>{throw Error("offline")}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();
 let prepares=0;
 const r=buyAgainCheckout({storage,fetcher:async()=>({ok:true,json:async()=>({...product,retail_price_vnd:50000})}),services:{prepareBuyAgain:async()=>{prepares++;throw Error("wrong_source")},createStoreCheckout:async()=>{throw new ApiError(409,{reason:"price_changed"})}}});
 r.render("Checkout");await r.settle();assert.match(text(r.tree),/Chưa xác định/);
 await confirm(r).props.onClick();await r.settle();assert.equal(prepares,0);
 assert.equal(nodes(r.tree).find(n=>n.type==="StoreProductRow").props.name,"Rau");
 assert.equal(nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới")).props.disabled,false);
 assert.equal(r.context.ui.cart[PRODUCT_ID],7);r.dispose();
});

test("detail buy again button requires backend ownership eligibility and an authenticated viewer",async()=>{
 for(const [authenticated,eligible,status,expected] of [[true,true,"delivered",true],[true,true,"cancelled",true],[true,true,"pending_delivery",true],[true,true,"payment_pending",true],[true,false,"delivered",false],[false,true,"delivered",false]]){
  const snapshot=order(SOURCE_ORDER,{status,canBuyAgain:eligible});
  const r=runtime("src/screens/store/StoreOrderDetail.tsx",{auth:authenticated?{status:"authenticated",session:{subject:"A"}}:{status:"guest",session:null},services:{getStoreOrder:async()=>snapshot}});
  r.render("StoreOrderDetail",{id:SOURCE_ORDER,locale:"vi",initialOrder:snapshot});await r.settle();
  assert.equal(nodes(r.tree).some(n=>n.type==="Button"&&text(n)==="Mua lại"),expected);r.dispose();
 }
});


test("successful buy again replaces checkout history entry so Back returns to the source page",async()=>{
 const pushed=[],replaced=[],r=buyAgainCheckout({onNavigate:href=>pushed.push(href),onReplace:href=>replaced.push(href),services:{createStoreCheckout:async()=>order("new"),storeOrderHref:()=>"/store/orders/new/vi"}});
 r.render("Checkout");await r.settle();await confirm(r).props.onClick();await tick();
 assert.deepEqual(replaced,["/store/orders/new/vi"]);assert.deepEqual(pushed,[]);
 assert.equal(r.context.ui.cart[PRODUCT_ID],7);r.dispose();
});

test("returning to an already completed buy again URL shows an ended session without retries or cart checkout",async()=>{
 const storage=new Map();let prepares=0,creates=0;
 const r=buyAgainCheckout({storage,services:{prepareBuyAgain:async()=>{prepares++;throw Error("must_not_prepare")},createStoreCheckout:async()=>{creates++;return order("duplicate")}}});
 r.render("Checkout");await r.settle();
 const state=nodes(r.tree).find(n=>n.type==="DataState"&&/Phiên mua lại/.test(n.props.title));
 assert.ok(state);assert.equal(state.props.kind,"empty");
 assert.equal(state.props.action.label,"Đơn hàng của tôi");assert.equal(confirm(r),undefined);
 assert.ok(!nodes(r.tree).some(n=>n.type==="DataState"&&/Chưa thể kiểm tra sản phẩm/.test(n.props.title)));
 assert.equal(prepares,0);assert.equal(creates,0);assert.equal(r.context.ui.cart[PRODUCT_ID],7);r.dispose();
});

test("buy again unknown intent still recovers when its prepared session was removed",async()=>{
 const storage=new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]),payloads=[];
 const first=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw Error("offline")}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();storage.delete("nfv_store_buy_again_v1");
 const next=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);return order("new")},storeOrderHref:()=>"/new"}});
 next.render("Checkout");await next.settle();assert.match(text(next.tree),/Chưa xác định/);
 await confirm(next).props.onClick();await tick();assert.equal(JSON.stringify(payloads[0]),JSON.stringify(payloads[1]));assert.equal(next.context.ui.cart[PRODUCT_ID],7);next.dispose();
});


test("same-owner profile refresh does not strand buy again preparation",async()=>{
 const wait=deferred(),nav=[],auth={status:"authenticated",session:{subject:"A",profile:{name:"Old"}}};
 const r=runtime("src/store/use-buy-again.ts",{auth,context:{ui:{locale:"vi"}},onNavigate:href=>nav.push(href),services:{prepareBuyAgain:()=>wait.promise}});
 r.render("useBuyAgain","vi");r.flush();const pending=r.tree.start(SOURCE_ORDER);r.render();
 assert.equal(r.tree.busy,SOURCE_ORDER);
 auth.session={subject:"A",profile:{name:"Updated"}};r.render();r.flush();
 wait.resolve([{productId:PRODUCT_ID,quantity:2,name:"Rau",reason:null,product}]);await pending;r.render();
 assert.equal(r.tree.busy,null);assert.deepEqual(nav,["/store/checkout/vi?source=buy-again"]);r.dispose();
});

test("buy again sign-in preserves checkout source before any order was submitted",async()=>{
 const storage=new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]);
 const expired=buyAgainCheckout({storage,auth:{status:"expired",session:null},context:{accountSessionKey:"guest"}});
 expired.render("Checkout");await expired.settle();
 const login=nodes(expired.tree).find(n=>n.type==="a"&&n.props.href?.startsWith("/api/auth/login"));
 assert.ok(login);
 const returnTo=new URL(login.props.href,"https://example.test").searchParams.get("returnTo");
 assert.equal(returnTo,"/store/checkout/vi?source=buy-again");expired.dispose();
 const resumed=buyAgainCheckout({storage,searchState:{value:new URL(returnTo,"https://example.test").search},services:{createStoreCheckout:async()=>order("new")}});
 resumed.render("Checkout");await resumed.settle();
 assert.ok(nodes(resumed.tree).some(n=>n.type==="StoreProductRow"&&n.props.name==="Fresh name"));
 assert.equal(resumed.context.ui.cart[PRODUCT_ID],7);resumed.dispose();
});


test("successful buy again stays locked while order navigation is pending",async()=>{
 const payloads=[],navigated=[];
 const r=buyAgainCheckout({onReplace:href=>navigated.push(href),services:{createStoreCheckout:async payload=>{payloads.push(payload);return order("new")},storeOrderHref:()=>"/new"}});
 r.render("Checkout");await r.settle();
 const originalSubmit=confirm(r).props.onClick;
 await originalSubmit();await r.settle();
 // Next navigation may not unmount checkout immediately after the API succeeds.
 assert.equal(confirm(r).props.disabled,true);
 await originalSubmit();await r.settle();
 assert.equal(payloads.length,1);assert.deepEqual(navigated,["/new"]);
 assert.equal(r.context.ui.cart[PRODUCT_ID],7);
 r.context.ui.locale="en";r.render();await r.settle();
 if(confirm(r))assert.equal(confirm(r).props.disabled,true);
 await originalSubmit();assert.equal(payloads.length,1);r.dispose();
});

test("successful buy again recovery cannot submit a new order before navigation",async()=>{
 const storage=new Map([["nfv_store_buy_again_v1",JSON.stringify({owner:"A",orderId:SOURCE_ORDER,sessionId:SOURCE_SESSION})]]),payloads=[];
 const first=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);throw Error("offline")}}});
 first.render("Checkout");await first.settle();await confirm(first).props.onClick();first.dispose();
 const next=buyAgainCheckout({storage,services:{createStoreCheckout:async payload=>{payloads.push(payload);return order("new")},storeOrderHref:()=>"/new"}});
 next.render("Checkout");await next.settle();
 const replay=confirm(next).props.onClick;await replay();await next.settle();
 assert.equal(confirm(next).props.disabled,true);await replay();
 assert.equal(payloads.length,2);assert.equal(JSON.stringify(payloads[0]),JSON.stringify(payloads[1]));next.dispose();
});

function voucherCheckout(options={}){
 const auth=options.auth??{status:"authenticated",session:{subject:"A"}};
 return checkout({...options,auth,context:{accountSessionKey:auth.session?.subject??"guest",ui:{locale:"vi",cart:{[PRODUCT_ID]:1},applyCSA:{},cartProductState:{[PRODUCT_ID]:"ready"},cartProductNotice:{},accountFetchState:{address:"ready"}},data:{authenticated:true,storeProducts:{[PRODUCT_ID]:product},shippingAddress:{name:"A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z",isSupported:true}},...options.context}});
}
const voucherResponse=(code="SAVE",overrides={})=>({subtotalVnd:42000,eligibleSubtotalVnd:42000,discountAmountVnd:12000,shippingFeeVnd:30000,totalVnd:60000,voucherQuote:"a".repeat(40),shippingAddressUpdatedAt:"2026-11-01T00:00:00Z",coupon:{id:SOURCE_ORDER,code},lines:[{product_id:PRODUCT_ID,quantity:1,use_quota:false,expected_unit_price_vnd:42000,expected_available_quantity:8,expected_quota_quantity:0}],...overrides});
const voucherInput=r=>nodes(r.tree).find(n=>n.type==="FormInput"&&n.props.id==="storeDiscountCode");
const applyVoucher=r=>nodes(r.tree).find(n=>n.type==="Button"&&/^(Áp dụng|Apply)$/.test(text(n).trim()));
async function applyCode(r,code="SAVE"){
 voucherInput(r).props.onChange({target:{value:code}});r.render();r.flush();await applyVoucher(r).props.onClick();await r.settle();
}
test("voucher apply uses backend price, stock, totals and exact payload; remove restores ordinary quote",async()=>{
 const sent=[],previews=[];const r=voucherCheckout({services:{previewStoreVoucher:async input=>{previews.push(input);return voucherResponse()},createStoreCheckout:async input=>{sent.push(input);return order()},storeOrderHref:()=>"/done"}});
 r.render("Checkout");await r.settle();await applyCode(r);
 assert.equal(previews.length,1);assert.equal(previews[0].coupon_code,"SAVE");
 assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"60000");
 assert.ok(nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label==="Voucher · SAVE"));
 await confirm(r).props.onClick();
 assert.equal(sent[0].coupon_code,"SAVE");assert.equal(sent[0].expected_voucher_quote,"a".repeat(40));assert.equal(sent[0].expected_total_vnd,60000);
 assert.equal(sent[0].lines[0].expected_unit_price_vnd,42000);assert.equal(sent[0].lines[0].expected_available_quantity,8);
 r.render();assert.equal(r.context.ui.cart[PRODUCT_ID],undefined);r.dispose();
 const remove=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse()}});remove.render("Checkout");await remove.settle();await applyCode(remove);
 nodes(remove.tree).find(n=>n.type==="button"&&n.props["aria-label"]==="Bỏ mã").props.onClick();remove.render();await remove.settle();
 assert.equal(voucherInput(remove).props.value,"");assert.ok(!nodes(remove.tree).some(n=>n.type==="button"&&n.props["aria-label"]==="Bỏ mã"));assert.ok(!text(remove.tree).includes("Thông tin đã thay đổi"));assert.equal(nodes(remove.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"70000");remove.dispose();
});
test("guest voucher controls never invoke authenticated preview",async()=>{
 let called=0;const r=checkout({services:{previewStoreVoucher:async()=>{called++;return voucherResponse()}}});r.render("Checkout");await r.settle();
 assert.equal(voucherInput(r).props.disabled,true);assert.equal(applyVoucher(r).props.disabled,true);assert.match(text(r.tree),/Đăng nhập/);assert.equal(called,0);r.dispose();
});
test("changing code invalidates totals immediately and a late response cannot apply it",async()=>{
 let called=0;const late=deferred();const r=voucherCheckout({services:{previewStoreVoucher:()=>{called++;return late.promise}}});r.render("Checkout");await r.settle();
 voucherInput(r).props.onChange({target:{value:"OLD"}});r.render();r.flush();applyVoucher(r).props.onClick();r.render();r.flush();await tick();
 assert.equal(called,1);voucherInput(r).props.onChange({target:{value:"NEW"}});r.render();late.resolve(voucherResponse("OLD"));await tick();r.render();
 assert.equal(confirm(r).props.disabled,true);assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&n.props.label==="Tổng chuyển khoản").props.value,"—");assert.equal(voucherInput(r).props.value,"NEW");r.dispose();
});
for(const change of ["quantity","quota","address","locale","account"]){
 test(`voucher context ${change} invalidates the old result before effects`,async()=>{
  const r=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse()}});r.render("Checkout");await r.settle();await applyCode(r);
  assert.equal(confirm(r).props.disabled,false);
  if(change==="quantity")r.context.ui.cart[PRODUCT_ID]=2;
  if(change==="quota")r.context.ui.applyCSA[PRODUCT_ID]=true;
  if(change==="address")r.context.data.shippingAddress={...r.context.data.shippingAddress,updatedAt:"2026-11-02T00:00:00Z"};
  if(change==="locale")r.context.ui.locale="en";
  if(change==="account"){r.auth.session={subject:"B"};r.context.accountSessionKey="B";}
  r.render();assert.equal(nodes(r.tree).find(n=>n.type==="MoneyLine"&&/Tổng chuyển khoản|Transfer total/.test(n.props.label))?.props.value??"—","—");
  assert.equal(nodes(r.tree).find(n=>n.type==="Button"&&/Tiếp tục|Continue/.test(text(n)))?.props.disabled??true,true);r.dispose();
 });
}

for(const code of ["coupon_invalid","coupon_expired","coupon_usage_exhausted","coupon_scope_mismatch","coupon_minimum_amount_not_met"]){
 test(`voucher ${code} is shown without a checkout or silent fallback`,async()=>{
  let submitted=0;const failure=new ApiError(400);failure.code=code;
  const r=voucherCheckout({services:{previewStoreVoucher:async()=>{throw failure},createStoreCheckout:async()=>{submitted++;return order()}}});
  r.render("Checkout");await r.settle();await applyCode(r);
  assert.ok(nodes(r.tree).some(n=>n.props?.role==="alert"));assert.equal(confirm(r).props.disabled,true);assert.equal(submitted,0);assert.ok(!text(r.tree).includes(code));r.dispose();
 });
}
test("definite voucher rejection clears intent and requires a fresh apply, with a new key only afterwards",async()=>{
 const payloads=[],failure=new ApiError(400);failure.code="coupon_usage_exhausted";
 const r=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse(),createStoreCheckout:async payload=>{payloads.push(payload);if(payloads.length===1)throw failure;return order()},storeOrderHref:()=>"/done"}});
 r.render("Checkout");await r.settle();await applyCode(r);await confirm(r).props.onClick();await tick();r.render();
 assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/hết lượt/);
 await applyCode(r);const accepted=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));if(accepted){assert.equal(accepted.props.disabled,false);accepted.props.onClick();r.render();}assert.equal(confirm(r).props.disabled,false);await confirm(r).props.onClick();await tick();r.render();
 assert.equal(payloads.length,2);assert.notEqual(payloads[0].idempotency_key,payloads[1].idempotency_key);assert.equal(payloads[1].coupon_code,"SAVE");r.dispose();
});
test("voucher_changed requote invalidates applied amounts and waits for explicit reapply",async()=>{
 const failure=new ApiError(409,{reason:"voucher_changed"});const r=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse(),createStoreCheckout:async()=>{throw failure}}});
 r.render("Checkout");await r.settle();await applyCode(r);await confirm(r).props.onClick();await tick();r.render();
 assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/áp dụng lại/);assert.equal(voucherInput(r).props.value,"SAVE");r.dispose();
});
test("unknown voucher checkout survives reload and locale/live changes with identical payload and key",async()=>{
 const storage=new Map(),payloads=[];
 const first=voucherCheckout({storage,services:{previewStoreVoucher:async()=>voucherResponse(),createStoreCheckout:async payload=>{payloads.push(payload);throw Error("timeout")}}});
 first.render("Checkout");await first.settle();await applyCode(first);await confirm(first).props.onClick();await tick();first.render();assert.match(text(first.tree),/Chưa xác định/);first.dispose();
 const next=voucherCheckout({storage,services:{previewStoreVoucher:async()=>{throw Error("must not preview pending")},createStoreCheckout:async payload=>{payloads.push(payload);return order()},storeOrderHref:()=>"/done"}});
 next.context.ui.locale="en";next.context.ui.cart[PRODUCT_ID]=4;next.context.data.shippingAddress.updatedAt="2026-11-02T00:00:00Z";
 next.render("Checkout");await next.settle();
 const retry=nodes(next.tree).find(n=>n.type==="Button"&&text(n).includes("Check previous order"));await retry.props.onClick();
 assert.equal(JSON.stringify(payloads[0]),JSON.stringify(payloads[1]));assert.equal(payloads[1].expected_total_vnd,60000);next.dispose();
});
test("buy-again applies its own voucher and never changes the regular cart on remove or success",async()=>{
 let sent;const result=voucherResponse("SAVE",{subtotalVnd:100000,discountAmountVnd:30000,totalVnd:100000,lines:[{product_id:PRODUCT_ID,quantity:2,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:10,expected_quota_quantity:0}]});
 const r=buyAgainCheckout({services:{previewStoreVoucher:async()=>result,createStoreCheckout:async payload=>{sent=payload;return order()},storeOrderHref:()=>"/done"}});
 r.render("Checkout");await r.settle();assert.equal(voucherInput(r).props.value,"");await applyCode(r);
 nodes(r.tree).find(n=>n.type==="button"&&n.props["aria-label"]==="Bỏ mã").props.onClick();r.render();r.flush();assert.equal(r.context.ui.cart[PRODUCT_ID],7);await applyCode(r);
 await confirm(r).props.onClick();assert.equal(sent.coupon_code,"SAVE");assert.equal(sent.lines[0].quantity,2);assert.equal(r.context.ui.cart[PRODUCT_ID],7);assert.equal(r.context.ui.applyCSA[PRODUCT_ID],true);r.dispose();
});
test("a replacement session for the same UUID cannot reuse an earlier applied quote",async()=>{
 const r=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse()}});r.render("Checkout");await r.settle();await applyCode(r);assert.equal(confirm(r).props.disabled,false);
 r.auth.session={subject:"A"};r.render();assert.equal(confirm(r).props.disabled,true);r.dispose();
});

test("voucher checkout mixed quota uses BE quantities once and allows a zero total",async()=>{
 const p={...product,csa_quota_group:{id:"g",cost:.75}},preview=voucherResponse("SAVE",{subtotalVnd:84000,eligibleSubtotalVnd:84000,discountAmountVnd:84000,shippingFeeVnd:0,totalVnd:0,lines:[{product_id:PRODUCT_ID,quantity:3,use_quota:true,expected_unit_price_vnd:42000,expected_available_quantity:8,expected_quota_quantity:1}]});
 const r=voucherCheckout({services:{getStoreQuota:async()=>({active:true,products:[{productId:"g",availableUnits:2}]}),previewStoreVoucher:async()=>preview},context:{accountSessionKey:"A",data:{storeProducts:{[PRODUCT_ID]:p},shippingAddress:{name:"A",phone:guest.phone,provinceCode:"66",wardCode:"1",detail:guest.address,updatedAt:"2026-11-01T00:00:00Z"}},ui:{locale:"vi",cart:{[PRODUCT_ID]:3},applyCSA:{[PRODUCT_ID]:true},cartProductState:{[PRODUCT_ID]:"ready"},cartProductNotice:{},accountFetchState:{address:"ready"}}}});
 r.render("Checkout");await r.settle();await applyCode(r);
 const values=nodes(r.tree).filter(n=>n.type==="MoneyLine");
 assert.equal(values.find(n=>n.props.label==="Tiền hàng").props.value,"126000");
 assert.equal(values.find(n=>n.props.label==="CSA thanh toán").props.value,"−42000");
 assert.equal(values.find(n=>n.props.label.includes("SAVE")).props.value,"−84000");
 assert.equal(values.find(n=>n.props.label==="Tổng chuyển khoản").props.value,"0");
 assert.equal(confirm(r).props.disabled,false);r.dispose();
});
test("preview double clicks are locked and a newer code wins over a delayed previous response",async()=>{
 const old=deferred();let calls=0;
 const r=voucherCheckout({services:{previewStoreVoucher:input=>{calls++;return input.coupon_code==="OLD"?old.promise:Promise.resolve(voucherResponse("NEW"))}}});
 r.render("Checkout");await r.settle();voucherInput(r).props.onChange({target:{value:"OLD"}});r.render();r.flush();const button=applyVoucher(r);button.props.onClick();button.props.onClick();r.render();r.flush();await tick();assert.equal(calls,1);r.render();assert.equal(applyVoucher(r).props.disabled,true);assert.equal(applyVoucher(r).props.loading,true);
 voucherInput(r).props.onChange({target:{value:"NEW"}});r.render();r.flush();await applyVoucher(r).props.onClick();await r.settle();assert.ok(nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label==="Voucher · NEW"));
 old.resolve(voucherResponse("OLD"));await tick();r.render();assert.ok(nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label==="Voucher · NEW"));assert.equal(calls,2);assert.equal(applyVoucher(r).props.loading,false);assert.equal(applyVoucher(r).props.disabled,false);r.dispose();
});
test("logout while previewing prevents the old member quote from appearing for a guest",async()=>{
 const late=deferred();const r=voucherCheckout({services:{previewStoreVoucher:()=>late.promise}});r.render("Checkout");await r.settle();
 voucherInput(r).props.onChange({target:{value:"SAVE"}});r.render();r.flush();applyVoucher(r).props.onClick();r.auth.status="guest";r.auth.session=null;r.context.accountSessionKey="guest";r.render();r.flush();late.resolve(voucherResponse());await r.settle();
 assert.equal(voucherInput(r).props.value,"");assert.equal(voucherInput(r).props.disabled,true);assert.ok(!nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label?.startsWith("Voucher ·")));r.dispose();
});

test("preview cannot silently submit to a newer server address than the recipient being displayed",async()=>{
 let sent=0,refreshed=0;const r=voucherCheckout({fetcher:async()=>({ok:true,json:async()=>product}),services:{previewStoreVoucher:async()=>voucherResponse("SAVE",{shippingAddressUpdatedAt:"2026-11-02T00:00:00Z"}),createStoreCheckout:async()=>{sent++;return order()}}});
 r.context.refreshResource=async resource=>{if(resource==="address"){refreshed++;r.context.data.shippingAddress={...r.context.data.shippingAddress,name:"New recipient",updatedAt:"2026-11-02T00:00:00Z"}}};
 r.render("Checkout");await r.settle();await applyCode(r);await r.settle();
 assert.equal(refreshed,1);assert.equal(sent,0);assert.ok(!nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label?.startsWith("Voucher ·")));assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/địa chỉ|Địa chỉ/);r.dispose();
});

test("rechecking an applied code invalidates the old discount if the server now rejects it",async()=>{
 let calls=0;const expired=new ApiError(400);expired.code="coupon_expired";
 const r=voucherCheckout({services:{previewStoreVoucher:async()=>{if(++calls===1)return voucherResponse();throw expired}}});
 r.render("Checkout");await r.settle();await applyCode(r);assert.equal(confirm(r).props.disabled,false);
 await applyVoucher(r).props.onClick();await r.settle();
 assert.match(text(r.tree),/hết hạn/);assert.ok(!nodes(r.tree).some(n=>n.type==="MoneyLine"&&n.props.label?.startsWith("Voucher ·")));assert.equal(confirm(r).props.disabled,true);r.dispose();
});

for(const [timestamp,mismatch] of [["2026-11-01T00:00:00+00:00",false],["2026-11-01T00:00:00.000001Z",true]]){
 test(`preview address compares normalized instants while preserving microseconds: ${timestamp}`,async()=>{
  let refreshed=0;const r=voucherCheckout({fetcher:async()=>({ok:true,json:async()=>product}),services:{previewStoreVoucher:async()=>voucherResponse("SAVE",{shippingAddressUpdatedAt:timestamp})}});
  r.context.refreshResource=async()=>{refreshed++};r.render("Checkout");await r.settle();await applyCode(r);await r.settle();
  assert.equal(refreshed,mismatch?1:0);assert.equal(confirm(r).props.disabled,mismatch);r.dispose();
 });
}

for(const code of ["store_stock_changed","store_product_changed","store_quota_unavailable"]){
 test(`voucher preview ${code} refreshes checkout data and retains the typed code`,async()=>{
  let reads=0,previews=0,submits=0;const failure=new ApiError(400);failure.code=code;
  const r=voucherCheckout({fetcher:async()=>{reads++;return {ok:true,json:async()=>product};},services:{previewStoreVoucher:async()=>{if(++previews===1)throw failure;return voucherResponse();},createStoreCheckout:async()=>{submits++;return order();}}});
  r.render("Checkout");await r.settle();const before=reads;await applyCode(r);await r.settle();
  assert.ok(reads>before);assert.equal(voucherInput(r).props.value,"SAVE");assert.equal(confirm(r).props.disabled,true);assert.equal(submits,0);
  const accept=nodes(r.tree).find(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới"));assert.ok(accept);assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();r.flush();
  await applyVoucher(r).props.onClick();await r.settle();assert.equal(previews,2);assert.equal(confirm(r).props.disabled,false);assert.equal(submits,0);r.dispose();
 });
}

test("failed voucher preview recovery offers a retry without losing the code",async()=>{
 let failRefresh=true;const failure=new ApiError(400);failure.code="store_stock_changed";
 const r=voucherCheckout({fetcher:async()=>{if(failRefresh)throw Error("offline");return {ok:true,json:async()=>product};},services:{previewStoreVoucher:async()=>{throw failure;}}});
 r.render("Checkout");await r.settle();await applyCode(r);await r.settle();
 const retry=nodes(r.tree).find(n=>n.type==="DataState"&&n.props?.action?.label==="Thử lại");assert.ok(retry);assert.equal(voucherInput(r).props.value,"SAVE");assert.equal(confirm(r).props.disabled,true);
 failRefresh=false;retry.props.action.onClick();await r.settle();assert.equal(voucherInput(r).props.value,"SAVE");assert.ok(nodes(r.tree).some(n=>n.type==="Button"&&text(n).includes("Xác nhận thông tin mới")));r.dispose();
});


for(const field of ["quantity","quota"]){
 test(`Store voucher never returns automatically after restoring ${field}`,async()=>{
  let calls=0;const r=voucherCheckout({services:{previewStoreVoucher:async()=>{calls++;return voucherResponse();}}});r.render("Checkout");await r.settle();await applyCode(r);assert.equal(confirm(r).props.disabled,false);
  if(field==="quantity")r.context.ui.cart[PRODUCT_ID]=2;else r.context.ui.applyCSA[PRODUCT_ID]=true;r.render();r.flush();assert.equal(confirm(r).props.disabled,true);
  if(field==="quantity")r.context.ui.cart[PRODUCT_ID]=1;else delete r.context.ui.applyCSA[PRODUCT_ID];r.render();r.flush();assert.equal(confirm(r).props.disabled,true);assert.equal(calls,1);
  await applyVoucher(r).props.onClick();await r.settle();assert.equal(calls,2);assert.equal(confirm(r).props.disabled,false);r.dispose();
 });
}

test('frozen checkout is a definite rejection and leaves no pending order recovery',async()=>{
 const storage=new Map();let calls=0;
 const r=addressCheckout({storage,services:{createStoreCheckout:async()=>{calls++;const error=new ApiError(409);error.code='store_membership_frozen';throw error}}});
 try{r.render('Checkout');await r.settle();await confirm(r).props.onClick();await tick();r.render();
  assert.match(text(r.tree),/đóng băng/);assert.doesNotMatch(text(r.tree),/Chưa xác định được kết quả/);
  assert.equal(storage.has('nfv_store_checkout_intent_v1:A'),false);assert.equal(storage.has('nfv_store_checkout_pending_owner_v1'),false);assert.equal(calls,1);
 }finally{r.dispose()}
});

const dateInputs=r=>nodes(r.tree).filter(n=>n.type==='input'&&n.props.name==='store-delivery-date');
const chooseDate=async(r,index)=>{dateInputs(r)[index].props.onChange();r.render();await r.settle();};
const checkoutTotal=r=>nodes(r.tree).find(n=>n.type==='MoneyLine'&&n.props.label==='Tổng chuyển khoản')?.props.value;
function authoritativeQuote(input,{fee=17000,token=null,code=null,subtotal=40000}={}){
 return {deliveryDate:input.delivery_date,shippingDiscountReason:fee===0?'csa_companion_delivery':null,subtotalVnd:subtotal,eligibleSubtotalVnd:subtotal,discountAmountVnd:code?1000:0,shippingFeeVnd:fee,totalVnd:subtotal+fee-(code?1000:0),coupon:code?{id:SOURCE_ORDER,code}:null,voucherQuote:token,shippingAddressUpdatedAt:input.guest?null:'2026-11-01T00:00:00Z',lines:input.lines.map(line=>({product_id:line.product_id,quantity:line.quantity,use_quota:line.use_quota,expected_unit_price_vnd:40000,expected_available_quantity:10,expected_quota_quantity:0}))};
}
test('new checkout selects days locally and only Continue quotes the chosen day',async()=>{
 const requests=[],sent=[];const r=checkout({autoSelect:false,services:{
  getStoreDeliveryDates:async()=>({serverTime:'2026-11-01T00:00:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-0${i+1}`,freeShipping:i===3}))}),
  getStoreQuote:async input=>{requests.push(input);return authoritativeQuote(input,{fee:input.delivery_date==='2026-11-04'?0:30000})},createStoreCheckout:async payload=>{sent.push(payload);return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();assert.equal(dateInputs(r).length,8);assert.ok(dateInputs(r).every(n=>!n.props.checked));assert.equal(confirm(r).props.disabled,true);assert.equal(checkoutTotal(r),'—');
  await chooseDate(r,3);assert.equal(checkoutTotal(r),'40000');assert.equal(nodes(r.tree).find(n=>n.type==='MoneyLine'&&n.props.label==='Phí giao').props.value,'Miễn phí giao kèm CSA');
  await chooseDate(r,4);assert.equal(checkoutTotal(r),'70000');assert.equal(requests.length,0);assert.equal(confirm(r).props.loading,false);
  await confirm(r).props.onClick();assert.equal(requests.length,1);assert.equal(sent[0].delivery_date,'2026-11-05');assert.equal(sent[0].expected_shipping_fee_vnd,30000);assert.equal(sent[0].expected_total_vnd,70000);
 }finally{r.dispose()}
});
test('applied voucher changes delivery day locally and receives a fresh token only on Continue',async()=>{
 const calls=[],sent=[];const r=voucherCheckout({autoSelect:false,services:{getStoreQuote:async input=>{calls.push(input);return authoritativeQuote(input,{fee:30000,code:input.coupon_code??null,token:input.coupon_code?(input.delivery_date==='2026-11-01'?'a':'b').repeat(40):null})},createStoreCheckout:async payload=>{sent.push(payload);return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();await chooseDate(r,0);await applyCode(r);assert.equal(calls.length,1);const total=checkoutTotal(r);
  await chooseDate(r,1);assert.equal(calls.length,1);assert.equal(checkoutTotal(r),total);assert.equal(confirm(r).props.disabled,false);
  await confirm(r).props.onClick();assert.equal(calls.length,2);assert.equal(calls[1].delivery_date,'2026-11-02');assert.equal(calls[1].coupon_code,'SAVE');assert.equal(sent[0].expected_voucher_quote,'b'.repeat(40));assert.equal(sent[0].delivery_date,'2026-11-02');
 }finally{r.dispose()}
});
test('date edits recompute shipping while retaining verified voucher and product amounts',async()=>{
 const pending=deferred(),calls=[],sent=[];
 const makeQuote=input=>{const q=authoritativeQuote(input,{fee:input.delivery_date==='2026-11-02'?0:30000,code:input.coupon_code,token:'a'.repeat(40),subtotal:42000});q.lines[0].expected_unit_price_vnd=42000;return q};
 const r=voucherCheckout({autoSelect:false,services:{
  getStoreDeliveryDates:async()=>({serverTime:'2026-11-01T00:00:00Z',dates:[{date:'2026-11-01',freeShipping:false},{date:'2026-11-02',freeShipping:true}]}),
  getStoreQuote:input=>{calls.push(input);return input.delivery_date==='2026-11-02'?pending.promise:Promise.resolve(makeQuote(input))},createStoreCheckout:async p=>{sent.push(p);return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();await chooseDate(r,0);await applyCode(r);assert.equal(checkoutTotal(r),'71000');
  await chooseDate(r,1);assert.equal(checkoutTotal(r),'41000');assert.equal(calls.length,1);assert.equal(confirm(r).props.loading,false);
  const action=confirm(r).props.onClick();r.render();assert.equal(confirm(r).props.disabled,true);assert.equal(confirm(r).props.loading,true);assert.equal(checkoutTotal(r),'41000');
  assert.equal(nodes(r.tree).find(n=>n.type==='StoreProductRow').props.amount,'42000');assert.equal(nodes(r.tree).find(n=>n.type==='MoneyLine'&&n.props.label==='Voucher · SAVE').props.value,'−1000');
  assert.doesNotMatch(text(r.tree),/Đang tính phí giao|Calculating delivery/);assert.equal(calls.length,2);
  pending.resolve(makeQuote(calls[1]));await action;assert.equal(sent.length,1);assert.equal(sent[0].expected_total_vnd,41000);
 }finally{r.dispose()}
});
test('rapid delivery choices remain local including reselecting the current day',async()=>{
 const calls=[];const r=voucherCheckout({autoSelect:false,services:{getStoreQuote:async input=>{calls.push(input);return authoritativeQuote(input,{fee:30000})}}});
 try{
  r.render('Checkout');await r.settle();
  for(const index of [0,1,2,2])await chooseDate(r,index);
  assert.equal(dateInputs(r)[2].props.checked,true);assert.equal(calls.length,0);assert.equal(confirm(r).props.disabled,false);assert.equal(confirm(r).props.loading,false);assert.equal(checkoutTotal(r),'70000');
 }finally{r.dispose()}
});
test('quote failure on Continue keeps the local estimate and retries without an uncertain order intent',async()=>{
 const storage=new Map(),sent=[];let reads=0;
 const r=checkout({storage,services:{getStoreQuote:async input=>{if(++reads===1)throw Error('offline');return authoritativeQuote(input,{fee:30000})},createStoreCheckout:async p=>{sent.push(p);return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();assert.equal(reads,0);assert.equal(checkoutTotal(r),'70000');await confirm(r).props.onClick();r.render();
  assert.equal(checkoutTotal(r),'70000');assert.equal(sent.length,0);assert.equal(storage.has('nfv_store_checkout_intent_v1:guest'),false);assert.equal(confirm(r).props.disabled,false);assert.ok(nodes(r.tree).some(n=>n.type==='DataState'&&n.props.title.includes('Chưa thể tính đơn hàng')));
  await confirm(r).props.onClick();assert.equal(sent.length,1);assert.equal(reads,2);
 }finally{r.dispose()}
});
test('midnight calendar refresh preserves invalid selection and requires explicit reselection',async()=>{
 let reads=0;const r=checkout({clock:{now:()=>0},autoSelect:false,services:{getStoreDeliveryDates:async()=>{const start=++reads===1?1:2;return {serverTime:start===1?'2026-11-01T16:59:59Z':'2026-11-01T17:00:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-${String(start+i).padStart(2,'0')}`,freeShipping:false}))}}}});
 r.render('Checkout');await r.settle();await chooseDate(r,0);assert.equal(confirm(r).props.disabled,false);r.fireInterval(1000);await r.settle();assert.equal(reads,2);assert.ok(dateInputs(r).every(n=>!n.props.checked));assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/không còn hợp lệ/);await chooseDate(r,0);assert.equal(confirm(r).props.disabled,false);r.dispose();
});
test('legacy missing-date intent is retained and cannot silently create another order',async()=>{
 const storage=new Map(),sent=[];const first=checkout({storage,services:{createStoreCheckout:async payload=>{sent.push(payload);throw Error('offline')}}});first.render('Checkout');await first.settle();await confirm(first).props.onClick();first.dispose();
 const key=[...storage.keys()].find(key=>key.startsWith('nfv_store_checkout_intent_v1:')),legacy=JSON.parse(storage.get(key));delete legacy.payload.delivery_date;storage.set(key,JSON.stringify(legacy));const before=storage.get(key);
 const resumed=checkout({storage,services:{getStoreQuote:async()=>{throw Error('must not quote legacy')},createStoreCheckout:async()=>{throw Error('must not submit legacy')}}});resumed.render('Checkout');await resumed.settle();assert.ok(nodes(resumed.tree).some(n=>n.type==='DataState'&&n.props.title.includes('Không thể khôi phục')));assert.equal(storage.get(key),before);assert.equal(sent.length,1);assert.equal(confirm(resumed).props.disabled,true);resumed.dispose();
});
test('stored dated request replays unchanged after its day is outside the current calendar',async()=>{
 const storage=new Map(),sent=[];const first=checkout({storage,services:{createStoreCheckout:async payload=>{sent.push(payload);throw Error('offline')}}});first.render('Checkout');await first.settle();await confirm(first).props.onClick();first.dispose();
 let calendarReads=0;const resumed=checkout({storage,services:{getStoreDeliveryDates:async()=>{calendarReads++;throw Error('offline')},getStoreQuote:async()=>{throw Error('must not requote replay')},createStoreCheckout:async payload=>{sent.push(payload);return order()},storeOrderHref:()=>'/done'}});resumed.render('Checkout');await resumed.settle();assert.equal(calendarReads,0);await confirm(resumed).props.onClick();assert.equal(JSON.stringify(sent[0]),JSON.stringify(sent[1]));assert.equal(sent[1].delivery_date,'2026-11-01');resumed.dispose();
});
test('a replacement session cannot submit a quote requested by the previous session',async()=>{
 const old=deferred(),sent=[];let reads=0;
 const r=voucherCheckout({services:{getStoreQuote:input=>++reads===1?old.promise:Promise.resolve(authoritativeQuote(input,{fee:30000})),createStoreCheckout:async p=>{sent.push(p);return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();const action=confirm(r).props.onClick();r.render();r.auth.session={...r.auth.session};r.render();r.flush();
  old.resolve(authoritativeQuote({delivery_date:DELIVERY_DATE,lines:[{product_id:PRODUCT_ID,quantity:1,use_quota:false}]},{fee:0}));await action;await r.settle();assert.equal(sent.length,0);assert.equal(reads,1);
  await confirm(r).props.onClick();assert.equal(reads,2);assert.equal(sent.length,1);assert.equal(sent[0].expected_shipping_fee_vnd,30000);
 }finally{r.dispose()}
});
test('invalid delivery day is a definite service rejection but schema validation is still uncertain',async()=>{
 const exports={};vm.runInNewContext(compile('src/store/checkout-intent.ts'),{exports,Date,require:name=>name==='./store-delivery.ts'?(()=>{const exp={};vm.runInNewContext(compile('src/store/store-delivery.ts'),{exports:exp,Date,Intl});return exp})():{}});
 assert.equal(exports.checkoutDefinitelyRejected({status:400,code:'store_delivery_date_invalid'}),true);assert.equal(exports.checkoutRequoteReason({status:400,code:'store_delivery_date_invalid'}),'delivery_date_invalid');assert.equal(exports.checkoutDefinitelyRejected({status:400,code:'validation_error'}),false);
});

test('calendar badges follow BE and missing or failed calendar blocks submission without inventing dates',async()=>{
 let reads=0;const r=checkout({autoSelect:false,services:{getStoreDeliveryDates:async()=>{if(++reads===1)throw Error('offline');return {serverTime:'2026-11-01T00:00:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-0${i+1}`,freeShipping:i===6}))}}}});
 r.render('Checkout');await r.settle();assert.equal(dateInputs(r).length,0);assert.equal(confirm(r).props.disabled,true);
 const failed=nodes(r.tree).find(n=>n.type==='DataState'&&n.props.title==='Chưa thể tải ngày giao.');assert.ok(failed);failed.props.action.onClick();await r.settle();assert.equal(dateInputs(r).length,8);assert.equal(nodes(r.tree).filter(n=>n.type==='small'&&text(n)==='Miễn phí').length,1);assert.equal(dateInputs(r)[6].props.checked,false);r.dispose();
});
test('guest address edits stay local and unmount discards an in-flight Continue quote',async()=>{
 let calls=0,submits=0;const late=deferred();const r=checkout({autoSelect:false,services:{getStoreQuote:()=>{calls++;return late.promise},createStoreCheckout:async()=>{submits++;return order()}}});
 r.render('Checkout');await r.settle();nodes(r.tree).find(n=>n.type==='GuestBuyerFields').props.onChange({...guest,phone:''});r.render();await chooseDate(r,0);assert.equal(calls,0);assert.equal(confirm(r).props.disabled,true);
 nodes(r.tree).find(n=>n.type==='GuestBuyerFields').props.onChange(guest);r.render();await r.settle();assert.equal(calls,0);
 const action=confirm(r).props.onClick();assert.equal(calls,1);r.dispose();late.resolve(authoritativeQuote({delivery_date:DELIVERY_DATE,guest:{},lines:[{product_id:PRODUCT_ID,quantity:1,use_quota:false}]}));await action;assert.equal(submits,0);
});
test('BE rejects an outdated day on Continue and refreshes the calendar without a retry loop',async()=>{
 let calendars=0,quotes=0,submits=0;const failure=new ApiError(400);failure.code='store_delivery_date_invalid';
 const r=checkout({autoSelect:false,services:{getStoreDeliveryDates:async()=>{calendars++;return {serverTime:'2026-11-01T00:00:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-0${i+1}`,freeShipping:false}))}},getStoreQuote:async input=>{if(++quotes===1)throw failure;return authoritativeQuote(input,{fee:30000})},createStoreCheckout:async()=>{submits++;return order()},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();await chooseDate(r,0);assert.equal(quotes,0);await confirm(r).props.onClick();await r.settle();assert.equal(calendars,2);assert.equal(quotes,1);assert.match(text(r.tree),/không còn hợp lệ/);assert.equal(confirm(r).props.disabled,true);
  await chooseDate(r,1);assert.equal(quotes,1);assert.equal(confirm(r).props.disabled,false);await confirm(r).props.onClick();assert.equal(quotes,2);assert.equal(submits,1);
 }finally{r.dispose()}
});
test('date selection, recipient and global cart controls are locked while the checkout is unresolved',async()=>{
 const late=deferred();const r=checkout({services:{createStoreCheckout:()=>late.promise}});r.render('Checkout');await r.settle();const submit=confirm(r).props.onClick();r.render();r.flush();assert.equal(r.context.ui.checkoutLocked,true);assert.ok(nodes(r.tree).some(n=>n.type==='fieldset'&&n.props.disabled===true));assert.equal(dateInputs(r)[0].props.checked,true);late.reject(Error('offline'));await submit;r.render();await r.settle();assert.equal(r.context.ui.checkoutLocked,true);r.dispose();assert.equal(r.context.ui.checkoutLocked,false);
});

test('member address editing is disabled during checkout and restored after definite rejection',async()=>{
 const late=deferred(),failure=new ApiError(503);failure.code='store_payment_unavailable';
 const r=voucherCheckout({services:{createStoreCheckout:()=>late.promise}});
 const addressLink=()=>nodes(r.tree).find(n=>n.type==='a'&&n.props.href==='/account/vi?tab=address');
 let submission;
 try{
  r.render('Checkout');await r.settle();assert.ok(addressLink());assert.equal(confirm(r).props.disabled,false);
  submission=confirm(r).props.onClick();r.render();r.flush();
  assert.equal(addressLink(),undefined);
  const edit=nodes(r.tree).find(n=>n.type==='Button'&&text(n).trim()==='Sửa địa chỉ');
  assert.ok(edit);assert.equal(edit.props.disabled,true);
  late.reject(failure);await submission;await r.settle();assert.ok(addressLink());
 }finally{late.reject(failure);await submission;r.dispose()}
});

test('local date and CSA edits update the estimate without any quote until Continue',async()=>{
 const quotes=[],sent=[],pending=deferred();
 const r=voucherCheckout({autoSelect:false,services:{
  getStoreDeliveryDates:async()=>({serverTime:'2026-11-01T00:00:00Z',dates:[{date:'2026-11-01',freeShipping:false},{date:'2026-11-02',freeShipping:true}]}),
  getStoreQuota:async()=>({active:true,products:[{productId:'g',availableUnits:1}]}),
  getStoreQuote:input=>{quotes.push(input);return pending.promise},createStoreCheckout:async payload=>{sent.push(payload);return order()},storeOrderHref:()=>'/done',
 }});
 r.context.data.storeProducts[PRODUCT_ID]={...product,csa_quota_group:{id:'g',cost:1}};
 const checkbox=()=>nodes(nodes(r.tree).find(n=>n.type==='StoreProductRow')?.props.actions).find(n=>n.type==='input');
 try{
  r.render('Checkout');await r.settle();await chooseDate(r,0);assert.equal(checkoutTotal(r),'70000');
  await chooseDate(r,1);assert.equal(checkoutTotal(r),'40000');
  checkbox().props.onChange({target:{checked:true}});r.render();await r.settle();assert.equal(checkoutTotal(r),'0');
  assert.equal(quotes.length,0);assert.equal(confirm(r).props.disabled,false);assert.equal(confirm(r).props.loading,false);
  confirm(r).props.onClick();confirm(r).props.onClick();r.render();assert.equal(quotes.length,1);assert.equal(sent.length,0);assert.equal(confirm(r).props.loading,true);
  assert.equal(checkbox().props.disabled,true);assert.ok(nodes(r.tree).some(n=>n.type==='fieldset'&&n.props.disabled));
  const response=authoritativeQuote(quotes[0],{fee:0,subtotal:0});response.lines[0].expected_quota_quantity=1;
  pending.resolve(response);await r.settle();assert.equal(sent.length,1);assert.equal(sent[0].delivery_date,'2026-11-02');assert.equal(sent[0].lines[0].expected_quota_quantity,1);
 }finally{r.dispose()}
});

test('Continue detects changed CSA allocation even when total and shipping stay equal',async()=>{
 const second='22222222-2222-4222-8222-222222222222',sent=[];let reads=0;
 const r=voucherCheckout({services:{getStoreQuota:async()=>({active:true,products:[{productId:'g',availableUnits:1}]}),getStoreQuote:async input=>{
  reads++;const result=authoritativeQuote(input,{fee:30000,subtotal:40000});
  result.lines=result.lines.map((line,index)=>({...line,expected_quota_quantity:index===1?1:0}));return result;
 },createStoreCheckout:async payload=>{sent.push(payload);return order()},storeOrderHref:()=>'/done'}});
 r.context.data.storeProducts[PRODUCT_ID]={...product,csa_quota_group:{id:'g',cost:1}};
 r.context.data.storeProducts[second]={...product,id:second,csa_quota_group:{id:'g',cost:1}};
 Object.assign(r.context.ui.cart,{[second]:1});Object.assign(r.context.ui.applyCSA,{[PRODUCT_ID]:true,[second]:true});r.context.ui.cartProductState[second]='ready';
 try{
  r.render('Checkout');await r.settle();assert.equal(checkoutTotal(r),'70000');await confirm(r).props.onClick();await r.settle();
  assert.equal(reads,1);assert.equal(sent.length,0);assert.equal(checkoutTotal(r),'70000');assert.equal(confirm(r).props.disabled,true);
  const accept=nodes(r.tree).find(n=>n.type==='Button'&&text(n).includes('Xác nhận thông tin mới'));assert.ok(accept);accept.props.onClick();r.render();
  await confirm(r).props.onClick();await r.settle();assert.equal(sent.length,1);assert.equal(sent[0].lines[1].expected_quota_quantity,1);
 }finally{r.dispose()}
});

test('refreshing the calendar during voucher preview permits an explicit retry after the stale response',async()=>{
 const old=deferred();let reads=0;
 const r=voucherCheckout({services:{previewStoreVoucher:async()=>++reads===1?old.promise:voucherResponse()}});
 try{
  r.render('Checkout');await r.settle();await applyCode(r);assert.equal(reads,1);r.focus();await r.settle();
  old.resolve(voucherResponse());await r.settle();assert.equal(confirm(r).props.disabled,true);
  applyVoucher(r).props.onClick();await r.settle();assert.equal(reads,2);assert.equal(confirm(r).props.disabled,false);
 }finally{r.dispose()}
});

test('accepted voucher amounts remain visible while the checkout request is pending',async()=>{
 const pending=deferred();let sent=0;
 const r=voucherCheckout({services:{previewStoreVoucher:async()=>voucherResponse(),createStoreCheckout:()=>{sent++;return pending.promise},storeOrderHref:()=>'/done'}});
 try{
  r.render('Checkout');await r.settle();await applyCode(r);const action=confirm(r).props.onClick();await tick();r.render();await r.settle();
  assert.equal(sent,1);assert.equal(checkoutTotal(r),'60000');assert.equal(nodes(r.tree).find(n=>n.type==='StoreProductRow').props.amount,'42000');assert.ok(nodes(r.tree).some(n=>n.type==='MoneyLine'&&n.props.label==='Voucher · SAVE'));
  pending.resolve(order());await action;
 }finally{pending.resolve(order());r.dispose()}
});

for(const change of ['price','shipping','stock']){
 test(`Continue shows changed ${change} before allowing a new confirmed checkout`,async()=>{
  const sent=[];let reads=0;
  const r=checkout({services:{getStoreDeliveryDates:async()=>({serverTime:'2026-11-01T00:00:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-0${i+1}`,freeShipping:change==='shipping'&&i===0}))}),getStoreQuote:async input=>{
   reads++;const q=authoritativeQuote(input,{fee:30000,subtotal:change==='price'?50000:40000});
   if(change==='price')q.lines[0].expected_unit_price_vnd=50000;
   if(change==='stock')q.lines[0].expected_available_quantity=9;
   return q;
  },createStoreCheckout:async p=>{sent.push(p);return order()},storeOrderHref:()=>'/done'}});
  try{
   r.render('Checkout');await r.settle();assert.equal(reads,0);assert.equal(checkoutTotal(r),change==='shipping'?'40000':'70000');
   await confirm(r).props.onClick();await r.settle();assert.equal(sent.length,0);assert.equal(reads,1);assert.equal(confirm(r).props.disabled,true);assert.equal(checkoutTotal(r),change==='price'?'80000':'70000');
   const accept=nodes(r.tree).find(n=>n.type==='Button'&&text(n).includes('Xác nhận thông tin mới'));assert.equal(accept.props.disabled,false);accept.props.onClick();r.render();
   await confirm(r).props.onClick();assert.equal(reads,2);assert.equal(sent.length,1);assert.equal(sent[0].expected_total_vnd,change==='price'?80000:70000);
  }finally{r.dispose()}
 });
}


for(const change of ['stock','price']){
 test(`voucher must be applied again after restoring changed product ${change}`,async()=>{
  let reads=0;const r=voucherCheckout({services:{previewStoreVoucher:async()=>{reads++;return voucherResponse()}}});
  try{
   r.render('Checkout');await r.settle();await applyCode(r);assert.equal(reads,1);assert.equal(checkoutTotal(r),'60000');
   const original=r.context.data.storeProducts[PRODUCT_ID];
   r.context.data.storeProducts[PRODUCT_ID]={...original,...(change==='stock'?{available_quantity:7}:{retail_price_vnd:50000})};r.render();await r.settle();
   assert.equal(confirm(r).props.disabled,true);assert.equal(checkoutTotal(r),'—');
   r.context.data.storeProducts[PRODUCT_ID]=original;r.render();await r.settle();
   assert.equal(reads,1);assert.equal(voucherInput(r).props.value,'SAVE');assert.equal(confirm(r).props.disabled,true);assert.equal(checkoutTotal(r),'—');
   assert.ok(!nodes(r.tree).some(n=>n.type==='MoneyLine'&&n.props.label==='Voucher · SAVE'));
   await applyVoucher(r).props.onClick();await r.settle();assert.equal(reads,2);assert.equal(checkoutTotal(r),'60000');assert.equal(confirm(r).props.disabled,false);
  }finally{r.dispose()}
 });
}

for(const unlockAt of [30000,70000]){
 test(`calendar keeps its midnight deadline when checkout unlocks at ${unlockAt}ms`,async()=>{
  const pending=deferred();let elapsed=0,reads=0;
  const r=checkout({autoSelect:false,clock:{now:()=>elapsed},services:{getStoreDeliveryDates:async()=>{
   reads++;const rolled=elapsed>=60000,start=rolled?2:1;
   return {serverTime:rolled?'2026-11-01T17:00:10Z':'2026-11-01T16:59:00Z',dates:Array.from({length:8},(_,i)=>({date:`2026-11-${String(start+i).padStart(2,'0')}`,freeShipping:false}))};
  },getStoreQuote:()=>pending.promise}});
  try{
   r.render('Checkout');await r.settle();await chooseDate(r,0);assert.equal(reads,1);assert.equal(dateInputs(r)[0].props.checked,true);
   elapsed=20000;const action=confirm(r).props.onClick();r.render();r.flush();
   elapsed=unlockAt;pending.reject(Error('offline'));await action;await r.settle();
   elapsed=unlockAt<60000?60000:unlockAt+1;r.fireDueTimers();await r.settle();
   assert.equal(reads,2);assert.ok(dateInputs(r).every(n=>!n.props.checked));assert.equal(confirm(r).props.disabled,true);assert.match(text(r.tree),/không còn hợp lệ/);
  }finally{pending.reject(Error('offline'));r.dispose()}
 });
}
