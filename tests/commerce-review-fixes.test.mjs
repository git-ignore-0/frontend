import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function module(path,stub=()=>({}),globals={}){
 const exports={};
 vm.runInNewContext(compile(path),{exports,require:name=>{
  if(name==="@/lib/phone-number"||name.endsWith("/phone-number.ts"))return module("src/lib/phone-number.ts");
  if(name==="./store-delivery.ts")return module("src/store/store-delivery.ts");
  if(name==="./store-limits")return module("src/store/store-limits.ts");
  return stub(name);
 },...globals});
 return exports;
}
const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})};
const nodes=tree=>!tree||typeof tree!=="object"?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

const defaultCsaVoucher={ready:true,loading:false,code:"",change:()=>{},clear:()=>{},apply:async()=>{}};
const shippingAddress={name:"Recipient",phone:"+84901234567",provinceCode:"66",wardCode:"22015",detail:"12 Láng",city:"Hà Nội",ward:"Phường Láng",isSupported:true,updatedAt:"2026-11-21T01:23:45.123456+00:00",shippingAddressVersion:"a".repeat(64)};
const memberQuote={quoteToken:"A",expiresAt:"2099-01-01",shippingAddressUpdatedAt:shippingAddress.updatedAt,shippingAddressVersion:shippingAddress.shippingAddressVersion};
const shippingAddressModel=module("src/account/shipping-address-model.ts");
const csaAccountReview=module("src/screens/account-csa/csa-account-review.ts",()=>shippingAddressModel);
const csaNavigation=module("src/lib/csa-navigation.ts",undefined,{URLSearchParams});
const pendingStorage=module("src/screens/account-csa/csa-pending-storage.ts",()=>shippingAddressModel);

function csaRuntime(voucher=defaultCsaVoucher,localValues=new Map()){
 const quoteInputs=[],lookups=[];
 const storage=values=>({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
 const window={localStorage:storage(localValues),sessionStorage:storage(new Map())};
 let cursor=0,states=[],deps=[],layoutEffects=[],effects=[],layoutCleanups=[],cleanups=[],tree,mountedKey=null;
 const quoteRequest=deferred(),nextQuoteRequest=deferred(),confirmRequest=deferred(),auth={status:"authenticated",session:{subject:"A"},lastConfirmedSubject:"A"};
 const context={accountSessionKey:"A",ui:{locale:"vi",accountFetchState:{address:"ready"}},data:{profile:{name:"A",phone:"0911111111",email:"a@example.test"},shippingAddress},refreshResource(){}};
 const queueEffect=(queue,fn,next)=>{const i=cursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;queue.push({i,fn})}};
 const react={
  useState(initial){const i=cursor++,slots=states;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return [slots[i],value=>{slots[i]=typeof value==="function"?value(slots[i]):value}]},
  useRef(initial){const i=cursor++;return states[i]??={current:initial}},
  useLayoutEffect(fn,next){queueEffect(layoutEffects,fn,next)},
  useEffect(fn,next){queueEffect(effects,fn,next)},
  useCallback(fn){cursor++;return fn},useSyncExternalStore(_subscribe,get){cursor++;return get()},
 };
 const doc={version:"v1",hash:"h",content:{sections:[]}},selection={packageId:"p"};
 const exports=module("src/screens/account-csa/AccountCsaPackageSelection.tsx",name=>{
  if(name==="react")return react;
  if(name==="react/jsx-runtime")return jsx;
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/state/NFVContext")return {useNFV:()=>context};
  if(name==="@/components/UI")return {DataState:"DataState"};
  if(name==="@/lib/voucher-copy")return {VOUCHER_COPY:{vi:{changed:"changed"}},couponErrorMessage:code=>code};
  if(name==="@/lib/csa-navigation")return csaNavigation;
  if(name==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  if(name==="@/screens/csa/useCsaPackages")return {useCsaPackages:()=>({status:"ready",page:{data:[{id:"p"}]}})};
  if(name==="@/hooks/useSupportedShippingAreas")return {useSupportedShippingAreas:()=>({areas:[],loading:false,error:false})};
  if(name==="./useCsaVoucher")return {useCsaVoucher:()=>voucher};
  if(name==="./useCsaTerms")return {useCsaTerms:()=>({document:doc,status:"ready"})};
  if(name==="./csa-terms-model")return {csaTermsAcceptanceKey:()=>"terms"};
  if(name==="./csa-guest-buyer")return {EMPTY_CSA_GUEST_BUYER:{},csaGuestBuyerReview:()=>({complete:false})};
  if(name==="./csa-account-review")return csaAccountReview;
  if(name==="./csa-pending-storage")return pendingStorage;
  if(name==="./csa-selection-model")return {csaSelectionSummary:()=>null,createCsaSelection:()=>selection};
  if(name==="@/account/csa-service")return {createCsaPaymentQuote:input=>{quoteInputs.push(input);return (quoteInputs.length===1?quoteRequest:nextQuoteRequest).promise;},confirmCsaTransfer:()=>confirmRequest.promise,getCsaPurchaseStatus:input=>{lookups.push(input);return Promise.resolve({...input,status:"payment_confirmed"});}};
  return {};
 },{window});
 const selectionElement=()=>exports.AccountCsaPackageSelection();
 const dispose=()=>{layoutCleanups.forEach(fn=>fn?.());cleanups.forEach(fn=>fn?.())};
 const render=()=>{
  const element=selectionElement();
  const key=element.type===exports.CsaPurchaseSession?element.key:null;
  if(key!==mountedKey){
   dispose();
   states=[];deps=[];layoutEffects=[];effects=[];layoutCleanups=[];cleanups=[];
   mountedKey=key;
  }
  cursor=0;
  return tree=key===null?element:element.type(element.props);
 };
 const runEffects=(queue,callbacks)=>{for(const {i,fn} of queue.splice(0)){callbacks[i]?.();callbacks[i]=fn()}};
 const flush=()=>{runEffects(layoutEffects,layoutCleanups);runEffects(effects,cleanups)};
 return {auth,context,quoteInputs,quoteRequest,nextQuoteRequest,confirmRequest,lookups,localValues,get tree(){return tree},selectionElement,render,flush,dispose,async toTerms(){render();flush();nodes(tree).find(n=>n.props?.onContinue)?.props.onContinue();render();tree.props.onContinue();render()}};
}

test("public CSA owner boundary changes key and hides all content until account resources belong to the new subject",()=>{
 const r=csaRuntime();
 const first=r.selectionElement();
 r.render();r.flush();nodes(r.tree).find(node=>node.props?.onContinue).props.onContinue();
 assert.equal(r.render().props.profile.email,"a@example.test");

 Object.assign(r.auth,{status:"checking",session:null});
 assert.equal(r.selectionElement().key,first.key);
 const checking=r.render();
 assert.equal(checking.type,"DataState");assert.equal(checking.props.kind,"loading");
 assert.equal(checking.props.profile,undefined);assert.equal(checking.props.onContinue,undefined);

 Object.assign(r.auth,{status:"authenticated",session:{subject:"B"},lastConfirmedSubject:"B"});
 const next=r.selectionElement();
 assert.notEqual(next.key,first.key);assert.equal(next.props.subject,"B");
 const waitingForB=r.render();r.flush();
 assert.equal(waitingForB.type,"DataState");assert.equal(waitingForB.props.kind,"loading");
 assert.equal(waitingForB.props.profile,undefined);assert.equal(waitingForB.props.onContinue,undefined);
 assert.deepEqual(r.lookups,[]);

 r.context.accountSessionKey="B";
 r.context.data.profile={...r.context.data.profile,email:"b@example.test"};
 r.render();nodes(r.tree).find(node=>node.props?.onContinue).props.onContinue();
 assert.equal(r.render().props.profile.email,"b@example.test");

 Object.assign(r.auth,{status:"guest",session:null,lastConfirmedSubject:null});
 assert.notEqual(r.selectionElement().key,next.key);
 assert.equal(r.selectionElement().props.subject,"");
 r.dispose();
});

test("late CSA quote response cannot recreate payment state after owner unmount",async()=>{
 const r=csaRuntime();await r.toTerms();r.tree.props.onCreatePayment();r.dispose();
 r.quoteRequest.resolve(memberQuote);await tick();
 const tree=r.render();assert.ok(tree.props.onCreatePayment);assert.equal(tree.props.quote,undefined);
});

test("late CSA confirmation cannot write pending storage after owner unmount",async()=>{
 const r=csaRuntime();await r.toTerms();r.tree.props.onCreatePayment();r.quoteRequest.resolve(memberQuote);await tick();r.render();
 const confirming=r.tree.props.onConfirm();r.dispose();r.confirmRequest.resolve({...csaConfirmation,recipientPhone:confirmedRecipientPhone});await confirming;
 assert.equal(r.localValues.size,0);
 const tree=r.render();assert.equal(tree.props.confirmation,undefined);
});

const csaConfirmation={id:"request-1",requestCode:"CSA-A",status:"payment_confirmed",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"500000",expiresAt:"2099-01-01"};
const confirmedRecipientPhone="+84922222222";

test("member purchase reload uses the confirmed order phone instead of the displayed address phone",async()=>{
 const r=csaRuntime();
 r.context.data.profile={...r.context.data.profile,email:null};
 await r.toTerms();
 r.tree.props.onCreatePayment();
 assert.equal(r.quoteInputs[0].guestIdentity,null);
 r.quoteRequest.resolve(memberQuote);await tick();
 const confirming=r.render().props.onConfirm();
 r.confirmRequest.resolve({...csaConfirmation,recipientPhone:confirmedRecipientPhone});await confirming;
 r.dispose();
 const reloaded=csaRuntime(undefined,r.localValues);
 reloaded.context.data.profile={...reloaded.context.data.profile,email:"added@example.test"};
 reloaded.context.data.shippingAddress={...shippingAddress,phone:"+84933333333"};
 reloaded.render();reloaded.flush();await tick();
 assert.deepEqual(JSON.parse(JSON.stringify(reloaded.lookups)),[{requestCode:"CSA-A",phone:confirmedRecipientPhone}]);
 assert.equal(reloaded.render().props.confirmation.requestCode,"CSA-A");
 reloaded.dispose();
 const other=csaRuntime(undefined,r.localValues);
 other.auth.session={subject:"B"};
 other.context.accountSessionKey="B";
 other.context.data.shippingAddress={...shippingAddress,phone:confirmedRecipientPhone};
 other.render();other.flush();
 assert.deepEqual(other.lookups,[]);
 other.dispose();
});

test("member confirmation without a recipient phone succeeds without saving a pending reference",async()=>{
 const r=csaRuntime();
 await r.toTerms();
 r.tree.props.onCreatePayment();
 r.quoteRequest.resolve(memberQuote);await tick();
 const confirming=r.render().props.onConfirm();
 r.confirmRequest.resolve(csaConfirmation);await confirming;
 assert.equal(r.render().props.confirmation.requestCode,"CSA-A");
 assert.equal(r.localValues.size,0);
 r.dispose();
});

test("CSA hides the transfer until the verified owner's address matches the quote",async()=>{
 const r=csaRuntime();
 await r.toTerms();r.tree.props.onCreatePayment();r.quoteRequest.resolve(memberQuote);await tick();
 assert.equal(r.render().props.quote.quoteToken,"A");
 Object.assign(r.auth,{status:"checking",session:null});
 assert.equal(r.render().props.quote,undefined);
 r.auth.status="error";assert.equal(r.render().props.kind,"error");

 Object.assign(r.auth,{status:"authenticated",session:{subject:"A"}});
 r.context.ui.accountFetchState.address="loading";
 assert.equal(r.render().props.quote,undefined);
 assert.equal(r.tree.props.onConfirm,undefined);
 r.context.ui.accountFetchState.address="ready";
 r.context.data.shippingAddress={...shippingAddress};
 assert.equal(r.render().props.quote.quoteToken,"A");

 r.context.data.shippingAddress={...shippingAddress,phone:"+84933333333",updatedAt:"2026-11-21T01:23:45.123457+00:00",shippingAddressVersion:"b".repeat(64)};
 assert.equal(r.render().props.quote,undefined);
 assert.equal(r.tree.props.onConfirm,undefined);
 nodes(r.tree).find(node=>typeof node.props?.action?.onClick==="function").props.action.onClick();
 assert.equal(r.render().props.address.phone,"+84933333333");
 assert.equal(r.quoteInputs.length,1);
 r.tree.props.onContinue();r.render().props.onCreatePayment();
 r.nextQuoteRequest.resolve({...memberQuote,quoteToken:"new-quote",shippingAddressUpdatedAt:r.context.data.shippingAddress.updatedAt,shippingAddressVersion:r.context.data.shippingAddress.shippingAddressVersion});await tick();
 assert.equal(r.quoteInputs.length,2);
 assert.equal(r.render().props.quote.quoteToken,"new-quote");
 r.dispose();
});

test("CSA never shows transfer details for a quote without a verified address binding",async()=>{
 const r=csaRuntime();
 await r.toTerms();r.tree.props.onCreatePayment();
 r.quoteRequest.resolve({...memberQuote,shippingAddressVersion:undefined});await tick();
 assert.equal(r.render().props.quote,undefined);
 assert.equal(r.tree.props.onConfirm,undefined);
 r.dispose();
});

test("two members can confirm and later recover their own CSA orders on the same browser",async()=>{
 const localValues=new Map();
 const open=(subject)=>{
  const r=csaRuntime(undefined,localValues);
  Object.assign(r.auth,{session:{subject},lastConfirmedSubject:subject});
  r.context.accountSessionKey=subject;
  return r;
 };
 for(const [subject,recipientPhone] of [["A",confirmedRecipientPhone],["B","+84933333333"]]){
  const buyer=open(subject);
  await buyer.toTerms();buyer.tree.props.onCreatePayment();buyer.quoteRequest.resolve(memberQuote);await tick();
  const confirming=buyer.render().props.onConfirm();
  buyer.confirmRequest.resolve({...csaConfirmation,requestCode:`CSA-${subject}`,recipientPhone});
  await confirming;buyer.dispose();
 }
 for(const [subject,phone] of [["A",confirmedRecipientPhone],["B","+84933333333"]]){
  const buyer=open(subject);
  buyer.render();buyer.flush();await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(buyer.lookups)),[{requestCode:`CSA-${subject}`,phone}]);
  assert.equal(buyer.render().props.confirmation.requestCode,`CSA-${subject}`);
  buyer.dispose();
 }
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
 const attempt={owner:"A",payload:{delivery_date:"2026-11-14",idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",shipping_address_updated_at:"2026-11-01T00:00:00Z",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:2,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:5,expected_quota_quantity:0}],expected_shipping_fee_vnd:23000,expected_total_vnd:123000}};
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
 const payload={delivery_date:"2026-11-14",idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:1,use_quota:false,expected_unit_price_vnd:40000,expected_available_quantity:10,expected_quota_quantity:0}],expected_shipping_fee_vnd:30000,expected_total_vnd:70000,guest:{recipient_name:"An",phone_number:"+84901234567",province_code:"66",ward_code:"22015",address:"Số 12"}};
 assert.equal(isCheckoutPayload(payload,true),true);
 for(const field of ["idempotency_key","locale","lines","expected_shipping_fee_vnd","expected_total_vnd","guest"]){const bad=structuredClone(payload);delete bad[field];assert.equal(isCheckoutPayload(bad,true),false,field)}
 for(const field of Object.keys(payload.lines[0])){const bad=structuredClone(payload);delete bad.lines[0][field];assert.equal(isCheckoutPayload(bad,true),false,field)}
 assert.equal(isCheckoutPayload({...payload,delivery_date:"2026-11-14",idempotency_key:"same-key"},true),false);
 assert.equal(isCheckoutPayload({...payload,expected_total_vnd:NaN},true),false);
 assert.equal(isCheckoutPayload({...payload,unexpected:"field"},true),false);
 assert.equal(isCheckoutPayload({...payload,lines:[{...payload.lines[0],quantity:1000}]},true),false);
 assert.equal(isCheckoutPayload(payload,false),false);
 assert.equal(checkoutDefinitelyRejected({status:400,code:"request_failed"}),false);
 assert.equal(checkoutDefinitelyRejected({status:422}),false);
});

test("guest recipient fields enforce the required phone and name limit and validate raw pastes",()=>{
 const model=module("src/account/shipping-address-model.ts");
 let phoneTouched=false;
 const fields=module("src/components/account/ShippingAddressFields.tsx",name=>{
  if(name==="react")return {useState:()=>[phoneTouched,value=>{phoneTouched=value}]};
  if(name==="react/jsx-runtime")return jsx;
  if(name==="@/account/shipping-address-model")return model;
  if(name==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  return {FormField:"FormField",FormInput:"FormInput",FormSelect:"FormSelect"};
 });
 const shared=module("src/components/account/GuestBuyerFields.tsx",name=>name==="react/jsx-runtime"?jsx:name==="@/account/shipping-address-model"?model:name==="@/components/account/ShippingAddressFields"?fields:{copyText:(_locale,key)=>key});
 const props={locale:"vi",value:{name:"a".repeat(180),phone:"0901234567",provinceCode:"66",wardCode:"1",address:"Số 12"},areas:[{code:"66",name:"Tỉnh",wards:[{code:"1",name:"Phường",shippingFeeVnd:"0"}]}],loading:false,error:false,onChange(){},onRetry(){}};
 const guest=shared.GuestBuyerFields({...props,submitted:true});
 const nested=nodes(guest).find(n=>n.type===fields.ShippingAddressFields);
 const inputs=nodes(fields.ShippingAddressFields(nested.props));
 const name=inputs.find(n=>n.type==="FormInput"&&n.props.name==="name");
 assert.equal(name.props.maxLength,150);
 assert.equal(name.props["aria-invalid"],true);
 assert.equal(inputs.find(n=>n.type==="FormInput"&&n.props.name==="phone").props.required,true);

 let draft={...props.value,name:"An"};
 const phone=()=>{
  const form=shared.GuestBuyerFields({...props,value:draft,submitted:false,onChange:value=>{draft=value}});
  const shipping=nodes(form).find(n=>n.type===fields.ShippingAddressFields);
  return nodes(fields.ShippingAddressFields(shipping.props)).find(n=>n.type==="FormInput"&&n.props.name==="phone").props;
 };
 const paste=value=>{
  const input=phone();
  let prevented=false;
  input.onPaste({clipboardData:{getData:()=>value},currentTarget:{value:draft.phone,selectionStart:0,selectionEnd:draft.phone.length},preventDefault(){prevented=true}});
  if(!prevented)input.onChange({target:{value:value.replace(/[\r\n]/g,"")}});
 };
 assert.equal(phone().maxLength,undefined);
 for(const value of ["84901234567","+84901234567","090 1234567","090-1234567","090\n1234567","０901234567","090123456789"]){
  paste("02412345678");
  assert.equal(model.reviewGuestBuyer(draft,props.areas).value.phone,"+842412345678");
  paste(value);
  assert.equal(draft.phone,value.replace("\n"," "));
  assert.equal(model.reviewGuestBuyer(draft,props.areas).complete,false);
  phone().onBlur();
  assert.equal(phone()["aria-invalid"],true);
 }
});


test("pending owner blocks replacing another account's unresolved request without exposing its payload",()=>{
 const {saveCheckoutIntent,readCheckoutIntent,pendingCheckoutOwner,clearCheckoutIntent}=module("src/store/checkout-intent.ts");
 const values=new Map(),storage={get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const payload={delivery_date:"2026-11-14",idempotency_key:"22222222-2222-4222-8222-222222222222",locale:"vi",shipping_address_updated_at:"2026-11-01T00:00:00Z",lines:[{product_id:"11111111-1111-4111-8111-111111111111",quantity:1,use_quota:false,expected_unit_price_vnd:50000,expected_available_quantity:5,expected_quota_quantity:0}],expected_shipping_fee_vnd:0,expected_total_vnd:50000};
 saveCheckoutIntent(storage,{owner:"A",payload});
 assert.equal(pendingCheckoutOwner(storage,"B"),"A");assert.equal(readCheckoutIntent(storage,"B"),null);
 assert.throws(()=>saveCheckoutIntent(storage,{owner:"B",payload:{...payload,delivery_date:"2026-11-14",idempotency_key:"33333333-3333-4333-8333-333333333333"}}),/conflicting_checkout_intents/);
 assert.equal(readCheckoutIntent(storage,"A").payload.idempotency_key,payload.idempotency_key);
 clearCheckoutIntent(storage,"A");assert.equal(pendingCheckoutOwner(storage,"B"),null);
});


test("CSA voucher input belongs to package selection and applied code reaches quote only after terms",async()=>{
 const summary={paymentType:"full",totalAmount:"500000",initialPaymentAmount:"400000",installmentCount:1,installments:[{sequence:1,amount:"400000",cycleCount:1}]};
 const voucher={ready:true,loading:false,code:"SAVE",applied:{coupon:{code:"SAVE",discountAmount:"100000",customerPayableTotal:"400000"},summary},invalidate:()=>{throw Error("Unexpected invalidation");}};
 const r=csaRuntime(voucher);r.render();r.flush();const choose=nodes(r.tree).find(n=>n.props?.discounts);
 assert.ok(choose);assert.equal(choose.props.discounts.props.id,"csaDiscountCode");assert.equal(r.quoteInputs.length,0);
 await r.toTerms();r.tree.props.onCreatePayment();assert.equal(r.quoteInputs.length,1);assert.equal(r.quoteInputs[0].couponCode,"SAVE");assert.equal(r.quoteInputs[0].termsVersion,"v1");
 r.quoteRequest.resolve({...memberQuote,quoteToken:"discounted",coupon:voucher.applied.coupon,summary});await tick();const payment=r.render();assert.equal(payment.props.quote.quoteToken,"discounted");assert.equal(payment.props.discounts,undefined);assert.equal(payment.props.selection,undefined);r.dispose();
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
