import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
const compile=path=>ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail});return {promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function providerHarness({authenticated=false,initialResources=[]}={}){
 let cursor=0,states=[],memos=[],deps=[],effects=[];
 const jsx={jsx:(type,props)=>({type,props})};
 const react={createContext:()=>({Provider:"Provider"}),useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value}]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(fn){cursor++;effects.push(fn)},useMemo(fn,next){const i=cursor++;if(!deps[i]||next.some((value,j)=>value!==deps[i][j])){deps[i]=next;memos[i]=fn()}return memos[i]},useCallback(fn,next){return react.useMemo(()=>fn,next)}};
 const original={id:"p",slug:"rau",retail_price_vnd:40000,available_quantity:10};
 const responses=[],resourceRequests=[];
 const auth={status:authenticated?"authenticated":"guest",session:authenticated?{subject:"owner"}:null};
 const load=(path,stub)=>{const exports={};vm.runInNewContext(compile(path),{exports,AbortController,window:{NFV_BACKEND:{}},fetch:(_url,options)=>{const response=deferred();responses.push({...response,signal:options.signal});return response.promise},require:stub});return exports};
 const snapshots=load("src/store/store-product-snapshots.ts",()=>({}));
 const coordinator=load("src/store/cart-product-refresh.ts",()=>({parseStoreProductDetail:value=>value}));
 const initial={initialData:{authenticated,storeProducts:{p:original}},initialUI:{locale:"vi",cart:{p:1},cartProductState:{p:"ready"},cartProductNotice:{},accountFetchState:{},toastSequence:0,busyKeys:[],error:""},ACCOUNT_SERVICE_RESOURCES:initialResources};
 const provider=load("src/state/NFVContext.tsx",name=>{
  if(name==="@/store/store-limits")return load("src/store/store-limits.ts",()=>({}));
  if(name==="react")return react;
  if(name==="react/jsx-runtime")return jsx;
  if(name==="@/account/csa-service")return {getCSA:()=>{const response=deferred();resourceRequests.push(response);return response.promise}};
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/auth/auth-service")return {isUnauthorized:error=>error?.status===401};
  if(name==="@/account/shipping-service")return {getShippingAddress:async()=>null};
  if(name==="./initial-state")return initial;
  if(name==="@/store/store-product-snapshots")return snapshots;
  if(name==="@/store/cart-product-refresh")return coordinator;
  return {};
 });
 const render=()=>{cursor=0;effects=[];return provider.NFVProvider({children:null}).props.value};
 return {auth,render,responses,original,resourceRequests,startAccountLoad:()=>effects.at(-1)()};
}

test("Provider requote invalidates old coordinator network response and publishes a ready authoritative snapshot",async()=>{
 const h=providerHarness();let context=h.render();context.retryCartProduct("p");
 const old=h.responses[0];context=h.render();assert.equal(context.ui.cartProductState.p,"loading");
 const verified={...h.original,retail_price_vnd:60000,available_quantity:3};context.cacheStoreProducts([verified],"verified");
 assert.equal(old.signal.aborted,true);context=h.render();assert.equal(context.data.storeProducts.p.retail_price_vnd,60000);assert.equal(context.ui.cartProductState.p,"ready");
 old.resolve({ok:true,status:200,json:async()=>({...h.original,retail_price_vnd:50000})});await tick();context=h.render();
 assert.equal(context.data.storeProducts.p.retail_price_vnd,60000);assert.equal(context.ui.cartProductState.p,"ready");assert.equal(context.ui.cartProductNotice.p,undefined);
});

test("Provider requote also invalidates an old coordinator response while JSON decoding is pending",async()=>{
 const h=providerHarness(),body=deferred();let context=h.render();context.retryCartProduct("p");
 h.responses[0].resolve({ok:true,status:200,json:()=>body.promise});await tick();
 context=h.render();context.cacheStoreProducts([{...h.original,retail_price_vnd:60000}],"verified");
 body.resolve({...h.original,retail_price_vnd:50000});await tick();context=h.render();assert.equal(context.data.storeProducts.p.retail_price_vnd,60000);assert.equal(context.ui.cartProductState.p,"ready");
 // A later, explicitly started coordinator request still owns its own result.
 context.retryCartProduct("p");h.responses[1].resolve({ok:true,status:200,json:async()=>({...h.original,retail_price_vnd:70000})});await tick();context=h.render();assert.equal(context.data.storeProducts.p.retail_price_vnd,70000);
});


test("an older CSA refresh cannot overwrite the newer quota snapshot",async()=>{
 const h=providerHarness({authenticated:true});let context=h.render();
 const old=context.refreshResource("csa"),fresh=context.refreshResource("csa");
 h.resourceRequests[1].resolve({active:{quotas:[{remaining:8,used:2}]}});await fresh;
 h.resourceRequests[0].resolve({active:{quotas:[{remaining:9,used:1}]}});await old;context=h.render();
 assert.equal(context.data.csa.active.quotas[0].remaining,8);
 assert.equal(context.ui.accountFetchState.csa,"ready");
});


test("the initial CSA load cannot overwrite a later explicit refresh",async()=>{
 const h=providerHarness({authenticated:true,initialResources:["csa"]});let context=h.render();h.startAccountLoad();context=h.render();
 const fresh=context.refreshResource("csa");
 h.resourceRequests[1].resolve({active:{quotas:[{remaining:8}]}});await fresh;
 h.resourceRequests[0].resolve({active:{quotas:[{remaining:9}]}});await tick();context=h.render();
 assert.equal(context.data.csa.active.quotas[0].remaining,8);
});

test("an older failed CSA request cannot replace the newer ready state",async()=>{
 const h=providerHarness({authenticated:true});let context=h.render();
 const old=context.refreshResource("csa"),fresh=context.refreshResource("csa");
 h.resourceRequests[1].resolve({active:{quotas:[{remaining:8}]}});await fresh;
 h.resourceRequests[0].reject(Error("offline"));await old;context=h.render();
 assert.equal(context.ui.accountFetchState.csa,"ready");assert.equal(context.data.csa.active.quotas[0].remaining,8);
});


test("an old account action cannot publish its result or unlock the new owner's matching action",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();let context=h.render();
 const oldResult=deferred(),newResult=deferred();
 const old=context.act("save:address",()=>oldResult.promise,"Old save succeeded");
 h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();context=h.render();
 const current=context.act("save:address",()=>newResult.promise);
 oldResult.resolve({name:"Old private address"});assert.equal(await old,undefined);context=h.render();
 assert.ok(context.ui.busyKeys.includes("save:address"));assert.notEqual(context.ui.toast,"Old save succeeded");
 newResult.resolve({name:"Current address"});assert.equal((await current).name,"Current address");context=h.render();
 assert.equal(context.ui.busyKeys.includes("save:address"),false);
});

test("an old failed action cannot place its error in the new account",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();let context=h.render();
 const result=deferred(),old=context.act("save:address",()=>result.promise);
 h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();context=h.render();
 result.reject(Error("Old account error"));await old;context=h.render();
 assert.equal(context.ui.error,"");
});


test("AddressView ignores a save response after its account owner changes",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();let context=h.render();
 const addressA={name:"Private recipient A",phone:"+84901111111",detail:"Address A"},addressB={name:"Recipient B",phone:"+84902222222",detail:"Address B"};
 context.setData(state=>({...state,shippingAddress:addressA}));context.patch({addressEditing:true});context=h.render();
 const result=deferred(),exports={};
 const jsx=(type,props)=>({type,props});
 vm.runInNewContext(compile("src/screens/AccountProfile.tsx"),{exports,require:name=>{
  if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
  if(name==="@/state/NFVContext")return {useNFV:()=>({...context,call:()=>result.promise})};
  if(name==="@/components/UI")return {Section:"Section",Button:"Button",Icon:"Icon"};
  return {};
 }});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 const editor=all(exports.AddressView()).find(node=>typeof node.props?.save==="function"),save=editor.props.save(addressA);
 h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();context=h.render();
 context.setData(state=>({...state,shippingAddress:addressB}));context.patch({addressEditing:true});
 result.resolve(addressA);await save;context=h.render();
 assert.equal(context.data.shippingAddress.name,"Recipient B");assert.equal(context.ui.addressEditing,true);
 assert.notEqual(context.ui.toast,"Đã cập nhật địa chỉ giao hàng");
});


test("an unauthorized response from an earlier account cannot expire the new session",async()=>{
 const h=providerHarness({authenticated:true,initialResources:["csa"]});let expired=0;h.auth.expire=()=>{expired++};
 h.render();h.startAccountLoad();
 h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();
 h.resourceRequests[1].resolve({active:null,upcoming:[]});await tick();
 h.resourceRequests[0].reject(Object.assign(Error("unauthorized"),{status:401}));await tick();
 assert.equal(expired,0);
});

test("an unauthorized response for the current account still expires its session",async()=>{
 const h=providerHarness({authenticated:true});let expired=0;h.auth.expire=()=>{expired++};
 const context=h.render(),request=context.refreshResource("csa");
 h.resourceRequests[0].reject(Object.assign(Error("unauthorized"),{status:401}));await request;
 assert.equal(expired,1);
});


test("duplicate account actions are still blocked within the same session",async()=>{
 const h=providerHarness({authenticated:true}),context=h.render(),result=deferred();let calls=0;
 const first=context.act("save:address",()=>{calls++;return result.promise});
 assert.equal(await context.act("save:address",()=>{calls++;return result.promise}),undefined);
 assert.equal(calls,1);result.resolve({name:"Saved address"});assert.equal((await first).name,"Saved address");
});

function giftHarness(h){
 let context=h.render();
 const requests=[],intent={giftId:"gift-1",idempotencyKey:"11111111-1111-4111-8111-111111111111",phase:"confirm"};
 const rewards=balance=>({balance,gifts:[{id:"gift-1",name:"Gift",points:10}],redemptions:[]});
 context.setData(state=>({...state,rewards:rewards(100)}));context.patch({giftIntent:intent,accountFetchState:{rewards:"ready"}});context=h.render();
 const exports={},jsx=(type,props)=>typeof type==="function"?type(props):({type,props});
 vm.runInNewContext(compile("src/screens/AccountBenefits.tsx"),{exports,require:name=>{
  if(name==="react")return {useRef:initial=>({current:initial}),useState:initial=>[initial,()=>{}],useEffect(){}};
  if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
  if(name==="@/state/NFVContext")return {useNFV:()=>({...context,call:(method,arg)=>{const response=deferred();requests.push({...response,method,arg});return response.promise}})};
  if(name==="@/components/UI")return {Button:"Button",Section:"Section",localized:(value,key)=>value[key]};
  if(name==="@/components/account/PagedList")return {PagedList:()=>null};
  if(name==="@/components/overlays/useOverlayDialog")return {useOverlayDialog(){}};
  if(name==="@/account/redemption-intent")return {redemptionRequest:value=>({giftId:value.giftId,idempotencyKey:value.idempotencyKey})};
  if(name==="@/account/redemption-presentation")return {redemptionErrorCopyKey:()=>"rewards.error"};
  if(name==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  return {};
 }});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 const read=()=>context=h.render();
 const render=()=>{read();return exports.BenefitsView({kind:"redeem"})};
 const confirm=()=>all(render()).find(node=>node.type==="Button"&&["common.confirm","rewards.retry"].includes(node.props.children));
 return {requests,intent,rewards,read,render,confirm,async switchOwner(){h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();context=h.render();context.setData(state=>({...state,rewards:rewards(200)}));context.patch({accountFetchState:{rewards:"ready"}});return read()}};
}

test("late gift success or failure cannot restore an old intent in a new account",async()=>{
 for(const fail of [false,true]){
  const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const gift=giftHarness(h);
  gift.confirm().props.onClick();await gift.switchOwner();
  assert.equal(gift.read().ui.giftIntent,null);
  if(fail)gift.requests[0].reject(Error("old failure"));else gift.requests[0].resolve({accepted:true,rewards:gift.rewards(90)});
  await tick();const context=gift.read();
  assert.equal(context.ui.giftIntent,null);assert.equal(context.data.rewards.balance,200);assert.equal(context.ui.error,"");
 }
});

test("an old gift callback cannot replace a new owner's in-flight intent",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const gift=giftHarness(h);
 gift.confirm().props.onClick();await gift.switchOwner();
 const nextIntent={...gift.intent,idempotencyKey:"22222222-2222-4222-8222-222222222222"};
 gift.read().patch({giftIntent:nextIntent});gift.confirm().props.onClick();
 gift.requests[0].resolve({accepted:true,rewards:gift.rewards(90)});await tick();let context=gift.read();
 assert.equal(context.ui.giftIntent.idempotencyKey,nextIntent.idempotencyKey);assert.equal(context.ui.giftIntent.phase,"confirm");assert.equal(context.data.rewards.balance,200);assert.ok(context.ui.busyKeys.includes("gift:redeem"));
 gift.requests[1].resolve({accepted:true,rewards:gift.rewards(190)});await tick();context=gift.read();
 assert.equal(context.ui.giftIntent.phase,"success");assert.equal(context.data.rewards.balance,190);
});

test("duplicate gift clicks do not create an error and a real failure retries the same key",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const gift=giftHarness(h),button=gift.confirm();
 button.props.onClick();button.props.onClick();await tick();
 assert.equal(gift.requests.length,1);assert.equal(gift.read().ui.giftIntent.phase,"confirm");
 gift.requests[0].reject(Error("offline"));await tick();assert.equal(gift.read().ui.giftIntent.phase,"error");
 gift.confirm().props.onClick();assert.equal(gift.requests[1].arg.idempotencyKey,gift.requests[0].arg.idempotencyKey);
 gift.requests[1].resolve({accepted:true,rewards:gift.rewards(90)});await tick();assert.equal(gift.read().ui.giftIntent.phase,"success");
});

test("gift completion does not reopen a closed modal or replace a newer intent in the same account",async()=>{
 for(const replace of [false,true]){
  const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const gift=giftHarness(h);
  gift.confirm().props.onClick();
  const nextIntent=replace?{...gift.intent,idempotencyKey:"33333333-3333-4333-8333-333333333333"}:null;
  gift.read().patch({giftIntent:nextIntent});gift.requests[0].resolve({accepted:true,rewards:gift.rewards(90)});await tick();
  const context=gift.read();assert.equal(context.data.rewards.balance,90);
  if(replace){assert.equal(context.ui.giftIntent.idempotencyKey,nextIntent.idempotencyKey);assert.equal(context.ui.giftIntent.phase,"confirm")}else assert.equal(context.ui.giftIntent,null);
 }
});

function referralHarness(h){
 let context=h.render();
 const requests=[],exports={},jsx=(type,props)=>typeof type==="function"?type(props):({type,props});
 const modules={};
 for(const name of ["referral-presentation","referral-state"]){const value={};vm.runInNewContext(compile(`src/account/${name}.ts`),{exports:value});modules[`@/account/${name}`]=value}
 const seed=()=>{context=h.render();context.setData(state=>({...state,referrals:{code:"OWNER23456",canEnterReferrer:true}}));context.patch({referrerDraft:"ABCDEFGHJK",referrerError:"",accountFetchState:{referrals:"ready"}});context=h.render()};
 seed();
 vm.runInNewContext(compile("src/screens/AccountBenefits.tsx"),{exports,Error,require:name=>{
  if(name==="react")return {useState:initial=>[initial,()=>{}]};
  if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
  if(name==="@/state/NFVContext")return {useNFV:()=>({...context,call:(method,arg)=>{const response=deferred();requests.push({...response,method,arg});return response.promise}})};
  if(name==="@/components/UI")return {Section:"section",Button:"button",Icon:"i"};
  if(name==="@/components/account/PagedList")return {PagedList:()=>null};
  if(name==="@/components/account/ReferralShareDialog")return {ReferralShareDialog:()=>null};
  if(name==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  return modules[name]??{};
 }});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 const read=()=>context=h.render();
 const submit=()=>{read();const form=all(exports.BenefitsView({kind:"referrals"})).find(node=>node.type==="form");return form.props.onSubmit({preventDefault(){}})};
 return {requests,read,submit,async switchOwner(){h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();seed();return read()}};
}

test("late referral success or failure cannot publish errors into a new account",async()=>{
 for(const fail of [false,true]){
  const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const referral=referralHarness(h);
  const pending=referral.submit();await referral.switchOwner();
  if(fail)referral.requests[0].reject(Error("self_referral"));else referral.requests[0].resolve({referrer:{code:"ABCDEFGHJK"}});
  await pending;const context=referral.read();
  assert.equal(context.ui.referrerError,"");assert.equal(context.ui.referrerDraft,"ABCDEFGHJK");assert.equal(context.data.referrals.referrer,undefined);assert.notEqual(context.ui.toast,"ref.attachSuccess");
 }
});

test("old referral completion cannot overwrite or unlock the new owner's submission",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const referral=referralHarness(h);
 const old=referral.submit();await referral.switchOwner();const fresh=referral.submit();
 referral.requests[0].resolve({referrer:{code:"OLD2345678"}});await old;let context=referral.read();
 assert.equal(context.ui.referrerError,"");assert.ok(context.ui.busyKeys.includes("referral:apply"));assert.equal(context.data.referrals.referrer,undefined);
 referral.requests[1].resolve({referrer:{code:"ABCDEFGHJK"}});await fresh;context=referral.read();
 assert.equal(context.data.referrals.referrer.code,"ABCDEFGHJK");assert.equal(context.ui.referrerDraft,"");assert.equal(context.ui.referrerError,"");assert.equal(context.ui.toast,"ref.attachSuccess");
});

test("duplicate referral submits do not create an error and real failures allow retry",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const referral=referralHarness(h);
 const pending=referral.submit();await referral.submit();
 assert.equal(referral.requests.length,1);assert.equal(referral.read().ui.referrerError,"");
 referral.requests[0].reject(Error("invalid_referral_code"));await pending;
 assert.equal(referral.read().ui.referrerError,"ref.invalidCode");assert.equal(referral.read().ui.referrerDraft,"ABCDEFGHJK");
 const retry=referral.submit();referral.requests[1].resolve({referrer:{code:"ABCDEFGHJK"}});await retry;
 assert.equal(referral.read().ui.referrerError,"");assert.equal(referral.read().data.referrals.referrer.code,"ABCDEFGHJK");
});

function cartStorageModule(){
 const exports={};vm.runInNewContext(compile("src/state/cart-persistence.ts"),{exports,require:()=>{const limits={};vm.runInNewContext(compile("src/store/store-limits.ts"),{exports:limits});return limits}});return exports;
}

test("cart quantities above 99 survive persistence before checkout",()=>{
 const h=providerHarness();let context=h.render();const product={...h.original,available_quantity:150};
 context.setData(state=>({...state,storeProducts:{p:product}}));context=h.render();context.addCart(product,119);context=h.render();
 assert.equal(context.ui.cart.p,120);
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const persistence=cartStorageModule();persistence.saveCart(storage,context.ui.cart);
 assert.equal(persistence.loadCart(storage).p,120);
});

test("add and quantity updates respect the backend line limit and current stock",()=>{
 const h=providerHarness();let context=h.render();const product={...h.original,available_quantity:1500};
 context.setData(state=>({...state,storeProducts:{p:product}}));context=h.render();context.addCart(product,1499);context=h.render();
 assert.equal(context.ui.cart.p,999);context.updateCart("p",1);context=h.render();assert.equal(context.ui.cart.p,999);
 context.updateCart("p",-1);context=h.render();assert.equal(context.ui.cart.p,998);
 context.setData(state=>({...state,storeProducts:{p:{...product,available_quantity:120}}}));context=h.render();context.updateCart("p",1);context=h.render();assert.equal(context.ui.cart.p,120);
});

test("repeat refreshes retain price and stock notices until buyer acknowledgement",async()=>{
 for(const change of [{retail_price_vnd:50000},{available_quantity:5}]){
  const h=providerHarness(),next={...h.original,...change};let context=h.render();
  context.retryCartProduct("p");h.responses[0].resolve({ok:true,status:200,json:async()=>next});await tick();context=h.render();
  const notice=context.ui.cartProductNotice.p;assert.ok(notice);
  context.retryCartProduct("p");h.responses[1].resolve({ok:true,status:200,json:async()=>next});await tick();context=h.render();
  assert.equal(context.ui.cartProductNotice.p,notice);assert.equal(context.ui.cartProductState.p,"ready");
  context.acknowledgeCartProduct("p");context=h.render();assert.equal(context.ui.cartProductNotice.p,undefined);
  context.retryCartProduct("p");h.responses[2].resolve({ok:true,status:200,json:async()=>next});await tick();context=h.render();assert.equal(context.ui.cartProductNotice.p,undefined);
  context.retryCartProduct("p");h.responses[3].resolve({ok:true,status:200,json:async()=>({...next,retail_price_vnd:60000})});await tick();context=h.render();assert.equal(context.ui.cartProductNotice.p,"price_changed");
  context.updateCart("p",-context.ui.cart.p);context=h.render();assert.equal(context.ui.cartProductNotice.p,undefined);
 }
});

test("a cart with 50 products rejects a new product, allows existing quantities and accepts a replacement",()=>{
 const h=providerHarness();let context=h.render();
 const cart=Object.fromEntries(Array.from({length:50},(_,i)=>[i?`p${i}`:"p",1]));context.patch({cart});context=h.render();
 const extra={...h.original,id:"extra",slug:"extra"};context.addCart(extra);context=h.render();
 assert.equal(Object.keys(context.ui.cart).length,50);assert.equal(context.ui.cart.extra,undefined);assert.equal(context.ui.toastTone,"error");assert.match(context.ui.toast,/50/);
 context.addCart(h.original,2);context=h.render();assert.equal(context.ui.cart.p,3);
 context.updateCart("p49",-1);context=h.render();context.addCart(extra);context=h.render();assert.equal(context.ui.cart.extra,1);assert.equal(Object.keys(context.ui.cart).length,50);
});

test("Store detail and cart pass their real stock/line limits to the shared Quantity control",()=>{
 const jsx=(type,props)=>({type,props}),ui={};
 vm.runInNewContext(compile("src/components/UI.tsx"),{exports:ui,require:name=>name==="react/jsx-runtime"?{jsx,jsxs:jsx}:{}});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 for(const stock of [150,2000]){
  const product={id:"p",slug:"p",name:"Rau",category:{id:"c",name:"Rau"},available_quantity:stock,retail_price_vnd:10000,unit_size:"1.000",unit_label:"kg",primary_image:null,csa_quota_group:null};
  const exports={},context={data:{storeProducts:{p:product}},ui:{locale:"vi",cartOpen:true,cart:{p:99},cartProductState:{p:"ready"},cartProductNotice:{}},addCart(){}};
  const requireModule=name=>{
   if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
   if(name==="react")return {useState:()=>[99,()=>{}]};
   if(name==="@/components/UI")return ui;
   if(name==="@/state/NFVContext")return {useNFV:()=>context};
   if(name==="@/store/store-limits"){const value={};vm.runInNewContext(compile("src/store/store-limits.ts"),{exports:value});return value}
   if(name==="@/store/store-format")return {formatUnitSize:String};
   if(name==="@/lib/format")return {money:String};return {};
  };
  for(const [file,component,props] of [["src/screens/store/ProductDetail.tsx","ProductDetail",{product,locale:"vi"}],["src/screens/Checkout.tsx","CartDrawer",undefined]]){
   vm.runInNewContext(compile(file),{exports,require:requireModule});
   const quantity=all(exports[component](props)).find(node=>node.type===ui.Quantity);assert.ok(quantity);assert.equal(quantity.props.max,Math.min(999,stock));
   const plus=all(ui.Quantity(quantity.props)).find(node=>node.type==="button"&&node.props["aria-label"].includes("Tăng"));assert.equal(plus.props.disabled,false);
   const full=all(ui.Quantity({...quantity.props,count:Math.min(999,stock)})).find(node=>node.type==="button"&&node.props["aria-label"].includes("Tăng"));assert.equal(full.props.disabled,true);
  }
 }
});

test("authoritative unavailable state cancels an older product refresh without deleting cart quantity",async()=>{
 const h=providerHarness();let context=h.render();context.retryCartProduct("p");const old=h.responses[0];
 context.markCartProductsUnavailable(["p"]);context=h.render();assert.equal(old.signal.aborted,true);assert.equal(context.ui.cartProductState.p,"unavailable");assert.equal(context.ui.cart.p,1);
 old.resolve({ok:true,status:200,json:async()=>({...h.original,retail_price_vnd:99000})});await tick();context=h.render();assert.equal(context.ui.cartProductState.p,"unavailable");assert.equal(context.data.storeProducts.p.retail_price_vnd,40000);
});
