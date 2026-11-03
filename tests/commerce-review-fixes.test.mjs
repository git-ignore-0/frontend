import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function module(path,stub=()=>({})){const exports={};vm.runInNewContext(compile(path),{exports,require:name=>name==="./store-limits"?module("src/store/store-limits.ts"):stub(name)});return exports}
const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
const nodes=tree=>!tree||typeof tree!=="object"?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function csaRuntime(voucher={ready:true,loading:false,code:"",change:()=>{},clear:()=>{},apply:async()=>{}}){
 const quoteInputs=[];
 let cursor=0,states=[],deps=[],effects=[],cleanups=[],saved=0,tree;
 const quoteRequest=deferred(),confirmRequest=deferred(),auth={status:"authenticated",session:{subject:"A"}};
 const context={accountSessionKey:"A",ui:{locale:"vi",accountFetchState:{}},data:{profile:{name:"A",phone:"0901234567",email:"a@example.test"}},refreshResource(){}};
 const react={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value}]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;effects.push({i,fn})}},useCallback(fn){cursor++;return fn},useSyncExternalStore(_subscribe,get){cursor++;return get()}};
 const doc={version:"v1",hash:"h",content:{sections:[]}},selection={packageId:"p"};
 const exports=module("src/screens/account-csa/AccountCsaPackageSelection.tsx",name=>{
  if(name==="react")return react;
  if(name==="react/jsx-runtime")return jsx;
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/state/NFVContext")return {useNFV:()=>context};
  if(name==="@/components/UI")return {DataState:"DataState"};
  if(name==="@/lib/voucher-copy")return {VOUCHER_COPY:{vi:{changed:"changed"}},couponErrorMessage:code=>code};
  if(name==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  if(name==="@/screens/csa/useCsaPackages")return {useCsaPackages:()=>({status:"ready",page:{data:[{id:"p"}]}})};
  if(name==="@/hooks/useSupportedShippingAreas")return {useSupportedShippingAreas:()=>({areas:[],loading:false,error:false})};
  if(name==="./useCsaVoucher")return {useCsaVoucher:()=>voucher};
  if(name==="./useCsaTerms")return {useCsaTerms:()=>({document:doc,status:"ready"})};
  if(name==="./csa-terms-model")return {csaTermsAcceptanceKey:()=>"terms"};
  if(name==="./csa-guest-buyer")return {EMPTY_CSA_GUEST_BUYER:{},csaGuestBuyerReview:()=>({complete:false}),normalizeVietnamPhone:x=>x};
  if(name==="./csa-account-review")return {csaAuthenticatedPendingOwner:profile=>({email:profile.email,phone:profile.phone})};
  if(name==="./csa-pending-storage")return {csaPendingStorage:()=>({}),parseCsaPending:()=>null,csaPendingMemberPhone:()=>"",saveCsaPending:()=>{saved++}};
  if(name==="./csa-selection-model")return {csaSelectionSummary:()=>null,createCsaSelection:()=>selection};
  if(name==="@/account/csa-service")return {createCsaPaymentQuote:input=>{quoteInputs.push(input);return quoteRequest.promise;},confirmCsaTransfer:()=>confirmRequest.promise};
  return {};
 });
 // pendingStorageSnapshot only reads storage when a browser exists; no browser/global window here.
 const render=(component="CsaPurchaseSession")=>{cursor=0;return tree=exports[component]({})};
 const flush=()=>{for(const {i,fn} of effects.splice(0)){cleanups[i]?.();cleanups[i]=fn()}};
 return {auth,context,quoteInputs,quoteRequest,confirmRequest,get tree(){return tree},get saved(){return saved},render,flush,dispose(){cleanups.forEach(fn=>fn?.())},async toTerms(){render();flush();nodes(tree).find(n=>n.props?.onContinue)?.props.onContinue();render();tree.props.onContinue();render()}};
}

test("public CSA owner boundary changes key and hides all content until account resources belong to the new subject",()=>{
 const r=csaRuntime();
 const first=r.render("AccountCsaPackageSelection");assert.equal(first.key,"authenticated:A");
 r.auth.session={subject:"B"};assert.equal(r.render("AccountCsaPackageSelection").type,"DataState");
 r.context.accountSessionKey="B";const next=r.render("AccountCsaPackageSelection");assert.equal(next.key,"authenticated:B");
 r.auth.status="guest";r.auth.session=null;assert.equal(r.render("AccountCsaPackageSelection").key,"guest:guest");
});

test("late CSA quote response cannot recreate payment state after owner unmount",async()=>{
 const r=csaRuntime();await r.toTerms();r.tree.props.onCreatePayment();r.dispose();
 r.quoteRequest.resolve({quoteToken:"A",expiresAt:"2099-01-01"});await tick();
 const tree=r.render();assert.ok(tree.props.onCreatePayment);assert.equal(tree.props.quote,undefined);
});

test("late CSA confirmation cannot write pending storage after owner unmount",async()=>{
 const r=csaRuntime();await r.toTerms();r.tree.props.onCreatePayment();r.quoteRequest.resolve({quoteToken:"A",expiresAt:"2099-01-01"});await tick();r.render();
 const confirming=r.tree.props.onConfirm();r.dispose();r.confirmRequest.resolve({requestCode:"CSA-A"});await confirming;
 assert.equal(r.saved,0);
 const tree=r.render();assert.equal(tree.props.confirmation,undefined);
});

test("catalog merge preserves cart price/stock while verified refresh is allowed to replace it",()=>{
 const {mergeStoreProductSnapshots}=module("src/store/store-product-snapshots.ts");
 const fresh={id:"p",retail_price_vnd:50000,available_quantity:2},old={...fresh,retail_price_vnd:40000,available_quantity:8};
 assert.equal(mergeStoreProductSnapshots({p:fresh},[old],{p:1}).p,fresh);
 assert.equal(mergeStoreProductSnapshots({p:fresh},[old],{p:1},"verified").p,old);
 assert.equal(mergeStoreProductSnapshots({p:fresh},[old],{}).p,old);
 assert.match(read("src/state/NFVContext.tsx"),/mergeStoreProductSnapshots\(state.storeProducts,products,ui.cart,source\)/);
 assert.match(read("src/screens/Checkout.tsx"),/cacheStoreProducts\([\s\S]*?,"verified"\)/);
});

test("guest validator rejects names beyond the shared CSA-compatible limit",()=>{
 const {reviewShippingAddress,reviewGuestBuyer,GUEST_BUYER_NAME_MAX_LENGTH}=module("src/account/shipping-address-model.ts");
 const address={name:"a".repeat(150),phone:"0901234567",provinceCode:"66",wardCode:"1",address:"Số 12"},areas=[{code:"66",wards:[{code:"1"}]}];
 assert.equal(GUEST_BUYER_NAME_MAX_LENGTH,150);
 assert.equal(reviewGuestBuyer(address,areas).complete,true);
 assert.equal(reviewGuestBuyer({...address,name:"a".repeat(151)},areas).complete,false);
 assert.ok(reviewGuestBuyer({...address,name:"a".repeat(151)},areas).missing.includes("name"));
 assert.equal(reviewShippingAddress({...address,name:"a".repeat(180)},areas).complete,true);
 assert.equal(reviewShippingAddress({...address,name:"a".repeat(201)},areas).complete,false);
});

test("checkout intent persists exact payload by owner, and only definite rejection can release it",()=>{
 const {readCheckoutIntent,saveCheckoutIntent,clearCheckoutIntent,checkoutDefinitelyRejected}=module("src/store/checkout-intent.ts");
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
 const attempt={owner:"A",payload:{idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",shipping_address_updated_at:"2026-11-01T00:00:00Z",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:2,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:5,expected_quota_quantity:0}],expected_shipping_fee_vnd:23000,expected_total_vnd:123000}};
 saveCheckoutIntent(storage,attempt);
 assert.deepEqual(JSON.parse(JSON.stringify(readCheckoutIntent(storage,"A"))),attempt);
 assert.equal(readCheckoutIntent(storage,"B"),null);
 for(const status of [0,401,403,429,500,502])assert.equal(checkoutDefinitelyRejected({status}),false);
 assert.equal(checkoutDefinitelyRejected({status:409,code:"store_idempotency_conflict"}),false);
 assert.equal(checkoutDefinitelyRejected({status:409,code:"store_requote_required"}),true);
 clearCheckoutIntent(storage,"A");assert.equal(readCheckoutIntent(storage,"A"),null);
});

test("stored checkout validation rejects incomplete or malformed strict contract payloads",()=>{
 const {isCheckoutPayload,checkoutDefinitelyRejected}=module("src/store/checkout-intent.ts");
 const payload={idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:1,use_quota:false,expected_unit_price_vnd:40000,expected_available_quantity:10,expected_quota_quantity:0}],expected_shipping_fee_vnd:30000,expected_total_vnd:70000,guest:{recipient_name:"An",phone_number:"+84901234567",province_code:"66",ward_code:"22015",address:"Số 12"}};
 assert.equal(isCheckoutPayload(payload,true),true);
 for(const field of ["idempotency_key","locale","lines","expected_shipping_fee_vnd","expected_total_vnd","guest"]){const bad=structuredClone(payload);delete bad[field];assert.equal(isCheckoutPayload(bad,true),false,field)}
 for(const field of Object.keys(payload.lines[0])){const bad=structuredClone(payload);delete bad.lines[0][field];assert.equal(isCheckoutPayload(bad,true),false,field)}
 assert.equal(isCheckoutPayload({...payload,idempotency_key:"same-key"},true),false);
 assert.equal(isCheckoutPayload({...payload,expected_total_vnd:NaN},true),false);
 assert.equal(isCheckoutPayload({...payload,unexpected:"field"},true),false);
 assert.equal(isCheckoutPayload({...payload,lines:[{...payload.lines[0],quantity:1000}]},true),false);
 assert.equal(isCheckoutPayload(payload,false),false);
 assert.equal(checkoutDefinitelyRejected({status:400,code:"request_failed"}),false);
 assert.equal(checkoutDefinitelyRejected({status:422}),false);
});

test("Account recipient controls keep 200 characters while guest controls use 150",()=>{
 const model=module("src/account/shipping-address-model.ts");
 const fields=module("src/components/account/ShippingAddressFields.tsx",name=>name==="react/jsx-runtime"?jsx:name==="@/account/shipping-address-model"?model:{FormField:"FormField",FormInput:"FormInput",FormSelect:"FormSelect"});
 const shared=module("src/components/account/GuestBuyerFields.tsx",name=>name==="react/jsx-runtime"?jsx:name==="@/account/shipping-address-model"?model:name==="@/components/account/ShippingAddressFields"?fields:{copyText:(_locale,key)=>key});
 const props={locale:"vi",value:{name:"a".repeat(180),phone:"0901234567",provinceCode:"66",wardCode:"1",address:"Số 12"},areas:[{code:"66",name:"Tỉnh",wards:[{code:"1",name:"Phường",shippingFeeVnd:"0"}]}],loading:false,error:false,copy:{},onChange(){},onRetry(){}};
 const account=fields.ShippingAddressFields(props);
 assert.equal(nodes(account).find(n=>n.type==="FormInput"&&n.props.name==="name").props.maxLength,200);
 assert.equal(model.reviewShippingAddress(props.value,props.areas).complete,true);
 const guest=shared.GuestBuyerFields({...props,submitted:true});
 const nested=nodes(guest).find(n=>n.type===fields.ShippingAddressFields);
 assert.equal(nested.props.nameMaxLength,150);assert.ok(nested.props.missing.includes("name"));
});


test("pending owner blocks replacing another account's unresolved request without exposing its payload",()=>{
 const {saveCheckoutIntent,readCheckoutIntent,pendingCheckoutOwner,clearCheckoutIntent}=module("src/store/checkout-intent.ts");
 const values=new Map(),storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const payload={idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",shipping_address_updated_at:"2026-11-01T00:00:00Z",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:1,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:5,expected_quota_quantity:0}],expected_shipping_fee_vnd:0,expected_total_vnd:50000};
 saveCheckoutIntent(storage,{owner:"A",payload});
 assert.equal(pendingCheckoutOwner(storage,"B"),"A");assert.equal(readCheckoutIntent(storage,"B"),null);
 assert.throws(()=>saveCheckoutIntent(storage,{owner:"B",payload:{...payload,idempotency_key:"33333333-3333-4333-8333-333333333333"}}),/conflicting_checkout_intents/);
 assert.equal(readCheckoutIntent(storage,"A").payload.idempotency_key,payload.idempotency_key);
 clearCheckoutIntent(storage,"A");assert.equal(pendingCheckoutOwner(storage,"B"),null);
});


test("CSA voucher input belongs to package selection and applied code reaches quote only after terms",async()=>{
 const summary={paymentType:"full",totalAmount:"500000",initialPaymentAmount:"400000",installmentCount:1,installments:[{sequence:1,amount:"400000",cycleCount:1}]};
 const voucher={ready:true,loading:false,code:"SAVE",applied:{coupon:{code:"SAVE",discountAmount:"100000",customerPayableTotal:"400000"},summary},invalidate:()=>{throw Error("Unexpected invalidation");}};
 const r=csaRuntime(voucher);r.render();r.flush();const choose=nodes(r.tree).find(n=>n.props?.discounts);
 assert.ok(choose);assert.equal(choose.props.discounts.props.id,"csaDiscountCode");assert.equal(r.quoteInputs.length,0);
 await r.toTerms();r.tree.props.onCreatePayment();assert.equal(r.quoteInputs.length,1);assert.equal(r.quoteInputs[0].couponCode,"SAVE");assert.equal(r.quoteInputs[0].termsVersion,"v1");
 r.quoteRequest.resolve({quoteToken:"discounted",expiresAt:"2099-01-01",coupon:voucher.applied.coupon,summary});await tick();const payment=r.render();assert.equal(payment.props.quote.quoteToken,"discounted");assert.equal(payment.props.discounts,undefined);assert.equal(payment.props.selection,undefined);r.dispose();
});

test("a changed CSA voucher total returns to selection instead of showing the payment quote",async()=>{
 let invalidated=0;const voucher={ready:true,loading:false,code:"SAVE",applied:{coupon:{code:"SAVE",discountAmount:"100000",customerPayableTotal:"400000"},summary:{initialPaymentAmount:"400000"}},invalidate:()=>{invalidated++;}};
 const r=csaRuntime(voucher);await r.toTerms();r.tree.props.onCreatePayment();r.quoteRequest.resolve({quoteToken:"changed",coupon:{code:"SAVE",discountAmount:"50000",customerPayableTotal:"450000"},summary:{initialPaymentAmount:"450000"}});await tick();const tree=r.render();assert.equal(invalidated,1);assert.ok(nodes(tree).some(n=>n.props?.discounts));assert.equal(tree.props.quote,undefined);r.dispose();
});

test("invalidated CSA preview at terms returns to selection instead of silently stopping",async()=>{
 const voucher={ready:true,loading:false,code:"SAVE",change(){},clear(){},apply(){}};
 const r=csaRuntime(voucher);await r.toTerms();voucher.ready=false;r.context.ui.locale="en";r.render();r.tree.props.onCreatePayment();await tick();const next=r.render();
 assert.equal(r.quoteInputs.length,0);assert.ok(nodes(next).some(node=>node.props?.discounts));r.dispose();
});
