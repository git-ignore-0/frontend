import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
const compile=path=>ts.transpileModule(readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const deferred=()=>{let resolve,reject;const promise=new Promise((done,fail)=>{resolve=done;reject=fail});return {promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function providerHarness({authenticated=false,initialResources=[],initialPage="home",storage}={}){
 let cursor=0,states=[],memos=[],deps=[],effects=[],layoutEffects=[];
 const jsx={jsx:(type,props)=>({type,props})};
 const react={createContext:()=>({Provider:"Provider"}),useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==="function"?initial():initial;return [states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value}]},useRef(initial){const i=cursor++;return states[i]??={current:initial}},useEffect(fn){cursor++;effects.push(fn)},useMemo(fn,next){const i=cursor++;if(!deps[i]||next.some((value,j)=>value!==deps[i][j])){deps[i]=next;memos[i]=fn()}return memos[i]},useCallback(fn,next){return react.useMemo(()=>fn,next)}};
 react.useLayoutEffect=(fn,next)=>{const i=cursor++;if(!deps[i]||next.some((value,j)=>value!==deps[i][j])){deps[i]=next;layoutEffects.push(()=>{memos[i]?.();memos[i]=fn()})}};
 const original={id:"p",slug:"rau",retail_price_vnd:40000,available_quantity:10};
 const responses=[],resourceRequests=[],redemptions=[];
 const auth={status:authenticated?"authenticated":"guest",session:authenticated?{subject:"owner"}:null};
 const sessionStorage=storage?{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}:{};
 const load=(path,stub)=>{const exports={};vm.runInNewContext(compile(path),{exports,AbortController,window:{NFV_BACKEND:{},sessionStorage},fetch:(url,options)=>{const response=deferred();responses.push({...response,url,signal:options.signal});return response.promise},require:stub});return exports};
 const snapshots=load("src/store/store-product-snapshots.ts",()=>({}));
 const coordinator=load("src/store/cart-product-refresh.ts",()=>({parseStoreProductDetail:value=>value}));
 const persistence=storage?load("src/state/cart-persistence.ts",()=>load("src/store/store-limits.ts",()=>({}))):null;
 const initial={initialData:{authenticated,storeProducts:{p:original}},initialUI:{locale:"vi",cart:{p:1},cartProductState:{p:"ready"},cartProductNotice:{},accountFetchState:{},toastSequence:0,busyKeys:[],error:""},ACCOUNT_SERVICE_RESOURCES:initialResources};
 const provider=load("src/state/NFVContext.tsx",name=>{
  if(name==="@/store/store-limits")return load("src/store/store-limits.ts",()=>({}));
  if(name==="react")return react;
  if(name==="react/jsx-runtime")return jsx;
  if(name==="@/account/rewards-service")return {redeemGift:input=>{const response=deferred();redemptions.push({...response,input});return response.promise}};
  if(name==="@/account/csa-service")return {getCSA:()=>{const response=deferred();resourceRequests.push(response);return response.promise}};
  if(name==="@/auth/AuthProvider")return {useAuth:()=>auth};
  if(name==="@/auth/auth-service")return {isUnauthorized:error=>error?.status===401};
  if(name==="@/account/shipping-service")return {getShippingAddress:async()=>null};
  if(name==="./initial-state")return initial;
  if(name==="./cart-persistence")return persistence??{loadCart:()=>initial.initialUI.cart,loadCartProducts:()=>initial.initialData.storeProducts,loadBlockedStoreProducts:()=>({})};
  if(name==="@/store/store-product-snapshots")return snapshots;
  if(name==="@/store/cart-product-refresh")return coordinator;
  return {};
 });
 const render=()=>{cursor=0;effects=[];const value=provider.NFVProvider({children:null,initialPage}).props.value;for(const effect of layoutEffects.splice(0))effect();return value};
 return {auth,render,responses,original,resourceRequests,redemptions,hydrateCart:()=>effects[0](),validateCart:()=>effects[3](),persistAvailability:()=>effects[5](),startAccountLoad:()=>effects.at(-1)()};
}

test("closed cart adds no detail requests and opening immediately marks rows as loading",async()=>{
 const h=providerHarness(),second={...h.original,id:"second",slug:"second"};
 h.render();h.hydrateCart();
 const closed=h.render();closed.addCart(second,1,{openCart:false});
 h.render();h.validateCart();
 assert.equal(h.responses.length,0);
 h.render().patch({cartOpen:true});
 const loading=h.render();
 assert.equal(loading.ui.cartProductState.p,"loading");
 assert.equal(loading.ui.cartProductState.second,"loading");
 h.validateCart();
 assert.equal(h.responses.length,2);
 h.responses[0].resolve({ok:true,status:200,json:async()=>h.original});
 h.responses[1].resolve({ok:false,status:404});
 await tick();
 const checked=h.render();
 assert.equal(checked.ui.cartProductState.p,"ready");
 assert.equal(checked.ui.cartProductState.second,"unavailable");
 checked.updateCart("second",-1);
 h.render();h.validateCart();
 assert.equal(h.responses.length,2);
 h.render().patch({cartOpen:false});h.render();h.validateCart();
 h.render().patch({cartOpen:true});h.render();h.validateCart();
 assert.equal(h.responses.length,3);
});

test("opening checkout directly validates the persisted cart",()=>{
 const h=providerHarness({initialPage:"checkout"});
 h.render();h.hydrateCart();
 assert.equal(h.render().ui.cartProductState.p,"loading");
 h.validateCart();
 assert.equal(h.responses.length,1);
});

test("cart uses the latest catalog path for the same product while keeping the price to acknowledge",async()=>{
 const h=providerHarness(),renamed={...h.original,slug:"rau-moi",retail_price_vnd:50000,available_quantity:6};
 h.render();h.hydrateCart();
 h.render().cacheStoreProducts([renamed]);
 const cached=h.render().data.storeProducts.p;
 assert.equal(cached.slug,"rau");
 assert.equal(cached.retail_price_vnd,40000);
 assert.equal(cached.available_quantity,10);
 assert.equal(h.responses.length,0);
 h.render().patch({cartOpen:true});h.render();h.validateCart();
 assert.match(h.responses[0].url,/\/api\/store\/products\/rau-moi\?/);
 h.responses[0].resolve({ok:true,status:200,json:async()=>renamed});
 await tick();
 const context=h.render();
 assert.equal(context.data.storeProducts.p.slug,"rau-moi");
 assert.equal(context.ui.cartProductState.p,"ready");
 assert.equal(context.ui.cartProductNotice.p,"price_changed");
 assert.equal(context.ui.cart.p,1);
});

test("a stale catalog path cannot undo the verified path after reopening the cart",async()=>{
 const h=providerHarness(),renamed={...h.original,slug:"rau-moi"};
 h.render();h.hydrateCart();
 h.render().cacheStoreProducts([renamed],"verified");
 h.render().cacheStoreProducts([h.original]);
 assert.equal(h.render().data.storeProducts.p.slug,"rau-moi");
 assert.equal(h.responses.length,0);
 h.render().patch({cartOpen:true});h.render();h.validateCart();
 assert.match(h.responses[0].url,/\/api\/store\/products\/rau\?/);
 h.responses[0].resolve({ok:false,status:404});
 await tick();
 assert.match(h.responses[1].url,/\/api\/store\/products\/rau-moi\?/);
 assert.equal(h.render().ui.cartProductState.p,"loading");
 h.responses[1].resolve({ok:true,status:200,json:async()=>renamed});
 await tick();
 const context=h.render();h.validateCart();
 assert.equal(context.ui.cartProductState.p,"ready");
 assert.equal(context.data.storeProducts.p.slug,"rau-moi");
 assert.equal(h.responses.length,2);
});

test("a catalog path change during a cart check supersedes the old request for that product",async()=>{
 const h=providerHarness(),second={...h.original,id:"second",slug:"second"};
 h.render();h.hydrateCart();
 h.render().addCart(second,1,{openCart:false});
 h.render().patch({cartOpen:true});h.render();h.validateCart();
 assert.equal(h.responses.length,2);
 const old=h.responses.find(response=>response.url.includes("/rau?"));
 const renamed={...h.original,slug:"rau-moi"};
 h.render().cacheStoreProducts([renamed]);
 assert.equal(old.signal.aborted,true);
 h.render();h.validateCart();
 assert.equal(h.responses.length,3);
 const current=h.responses[2];
 assert.match(current.url,/\/api\/store\/products\/rau-moi\?/);
 old.resolve({ok:false,status:404});
 await tick();
 assert.equal(h.render().ui.cartProductState.p,"loading");
 current.resolve({ok:true,status:200,json:async()=>renamed});
 await tick();
 assert.equal(h.render().ui.cartProductState.p,"ready");
 assert.equal(h.render().data.storeProducts.p.slug,"rau-moi");
});

test("removing a cart row cancels its pending check before it can replace a newly added price",async()=>{
 const h=providerHarness();
 h.render();h.hydrateCart();
 h.render().patch({cartOpen:true});h.render();h.validateCart();
 const old=h.responses[0];
 h.render().updateCart("p",-1);
 assert.equal(old.signal.aborted,true);
 h.render().patch({cartOpen:false});h.render();h.validateCart();
 h.render().addCart({...h.original,retail_price_vnd:30000},1,{openCart:false});
 old.resolve({ok:true,status:200,json:async()=>h.original});
 await tick();
 assert.equal(h.render().data.storeProducts.p.retail_price_vnd,30000);
 assert.equal(h.render().ui.cart.p,1);
});

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
 context.setData(state=>({...state,shippingAddress:addressA}));context=h.render();
 const result=deferred(),exports={};
 const jsx=(type,props)=>({type,props});
 const phoneNumber={};vm.runInNewContext(compile("src/lib/phone-number.ts"),{exports:phoneNumber});
 vm.runInNewContext(compile("src/screens/AccountProfile.tsx"),{exports,require:name=>{
  if(name==="@/lib/phone-number")return phoneNumber;
  if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
  if(name==="@/state/NFVContext")return {useNFV:()=>({...context,call:()=>result.promise})};
  if(name==="@/components/UI")return {Section:"Section",Button:"Button",Icon:"Icon"};
  return {};
 }});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 const onDraftChange=()=>assert.fail("The previous owner's response cannot clear the active draft");
 const editor=all(exports.AddressView({draft:{name:addressA.name,phone:addressA.phone,provinceCode:"66",wardCode:"22015",address:addressA.detail},onDraftChange})).find(node=>typeof node.props?.save==="function"),save=editor.props.save(addressA);
 h.auth.session={subject:"new-owner"};h.render();h.startAccountLoad();await tick();context=h.render();
 context.setData(state=>({...state,shippingAddress:addressB}));
 result.resolve(addressA);await save;context=h.render();
 assert.equal(context.data.shippingAddress.name,"Recipient B");
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
 assert.equal(context.ui.giftIntent.idempotencyKey,nextIntent.idempotencyKey);assert.equal(context.ui.giftIntent.phase,"pending");assert.equal(context.data.rewards.balance,200);assert.ok(context.ui.busyKeys.includes("gift:redeem"));
 gift.requests[1].resolve({accepted:true,rewards:gift.rewards(190)});await tick();context=gift.read();
 assert.equal(context.ui.giftIntent.phase,"success");assert.equal(context.data.rewards.balance,190);
});

test("duplicate gift clicks do not create an error and a real failure retries the same key",async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();const gift=giftHarness(h),button=gift.confirm();
 button.props.onClick();button.props.onClick();await tick();
 assert.equal(gift.requests.length,1);assert.equal(gift.read().ui.giftIntent.phase,"pending");
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

test("refresh keeps the requested quantity through partial, zero and reduced restored supply",async()=>{
 const h=providerHarness();
 h.render();h.hydrateCart();
 h.render().updateCart("p",4);
 h.render().patch({cartOpen:true});
 h.render();h.validateCart();
 for(const [index,stock] of [7,0,3].entries()){
  if(index)h.render().retryCartProduct("p");
  assert.equal(h.responses.length,index+1);
  assert.equal(h.responses[index].url,"/api/store/products/rau?locale=vi&retry=1");
  h.responses[index].resolve({ok:true,status:200,json:async()=>({...h.original,available_quantity:stock})});
  await tick();
  const context=h.render();h.validateCart();
  assert.equal(context.ui.cart.p,5);
  assert.equal(context.ui.cartProductState.p,"ready");
  assert.equal(context.ui.cartProductNotice.p,"stock_changed");
  assert.equal(context.storeAvailability.p,stock);
  assert.equal(context.data.storeProducts.p.id,h.original.id);
  assert.equal(h.responses.length,index+1);
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

function catalogCardHarness(options){
 const provider=providerHarness(options),jsx=(type,props)=>({type,props});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 function load(path,resolve=()=>({})){
  const exports={};
  vm.runInNewContext(compile(path),{exports,require:name=>{
   if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
   if(name==="react")return {memo:fn=>fn,useState:initial=>[initial,()=>{}],useEffect:effect=>effect(),useRef:current=>({current})};
   return resolve(name);
  }});
  return exports;
 }
 const ui=load("src/components/UI.tsx");
 const copy=load("src/data/store-copy.ts");
 const limits=load("src/store/store-limits.ts");
 const resolve=name=>({
  "@/components/UI":ui,
  "@/data/store-copy":copy,
  "@/state/NFVContext":{useNFV:provider.render},
  "@/store/store-limits":limits,
  "@/store/store-format":{formatUnitSize:String},
  "@/lib/format":{money:String}
 })[name]??{};
 const {ProductCard}=load("src/screens/Store.tsx",resolve);
 const {ProductDetail}=load("src/screens/store/ProductDetail.tsx",resolve);
 const render=product=>all(ProductCard({product,locale:"vi"}));
 const renderDetail=product=>all(ProductDetail({product,locale:"vi"}));
 return {context:provider.render,responses:provider.responses,hydrateCart:provider.hydrateCart,persistAvailability:provider.persistAvailability,render,renderDetail,ui,buttons:tree=>all(tree).filter(node=>node.type==="button")};
}

test("catalog quick-add keeps the shared add button and adds one unit per click",()=>{
 const h=catalogCardHarness();
 const product={id:"new",slug:"cai-ngot",name:"Cải ngọt",available_quantity:2,retail_price_vnd:25000,unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 const addButton=()=>{
  const card=h.render(product),add=card.find(node=>node.type===h.ui.Button);
  assert.ok(add,"the catalog card keeps its add button");
  assert.ok(!card.some(node=>node.type===h.ui.Quantity));
  return h.buttons(h.ui.Button(add.props))[0];
 };
 const button=addButton();
 assert.equal(button.props.className,h.ui.Button({small:true,variant:"outline"}).props.className);
 button.props.onClick();
 assert.equal(h.context().ui.cart.new,1);
 assert.equal(Boolean(h.context().ui.cartOpen),false);
 h.context().setData(state=>({...state,storeProducts:{...state.storeProducts,new:{...product,available_quantity:1}}}));
 assert.equal(addButton().props.disabled,false);
 addButton().props.onClick();
 assert.equal(h.context().ui.cart.new,2);
 assert.equal(addButton().props.disabled,true);
 assert.equal(Boolean(h.context().ui.cartOpen),false);
});

test("catalog card displays sold-out status when the latest cart stock is zero",()=>{
 const h=catalogCardHarness(),context=h.context();
 const product={...context.data.storeProducts.p,name:"Cải ngọt",unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 context.cacheStoreProducts([{...product,available_quantity:0}],"verified");
 const card=h.render(product);
 assert.ok(card.some(node=>node.props.children==="Hết hàng"));
 assert.ok(!card.some(node=>node.type===h.ui.Button||node.type===h.ui.Quantity));
 assert.equal(h.context().ui.cart.p,1);
});

test("a cached zero-stock product stays viewable with disabled detail purchase controls",()=>{
 const h=catalogCardHarness();
 const product={id:"sold-out",slug:"cai-ngot",name:"Cải ngọt",category:{id:"c",slug:"rau",name:"Rau"},available_quantity:0,retail_price_vnd:25000,unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 const card=h.render(product);
 assert.ok(card.some(node=>node.props.href==="/store/cai-ngot/vi"));
 assert.ok(card.some(node=>node.props.children==="Hết hàng"));
 assert.equal(card.some(node=>node.type===h.ui.Button),false);
 const detail=h.renderDetail(product);
 assert.ok(detail.some(node=>node.type==="h1"&&node.props.children===product.name));
 for(const control of [h.ui.Button,h.ui.Quantity])assert.equal(detail.find(node=>node.type===control).props.disabled,true);
 assert.equal(h.responses.length,0);
});

test("catalog blocks a confirmed unavailable product even after removal from the cart",async()=>{
 const h=catalogCardHarness(),context=h.context();
 const product={...context.data.storeProducts.p,name:"Cải ngọt",unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 context.retryCartProduct("p");
 h.responses[0].resolve({ok:false,status:404});
 await tick();
 assert.ok(h.render(product).some(node=>node.props.children==="Ngừng bán"));
 h.context().updateCart("p",-1);
 assert.ok(h.render(product).some(node=>node.props.children==="Ngừng bán"));
 h.context().addCart(product,1,{openCart:false});
 assert.equal(h.context().ui.cart.p,undefined);
 assert.equal(h.context().ui.toastTone,"error");
});

test("an unavailable product stays blocked after reload even when the catalog and detail cache still show stock",async()=>{
 const stale={id:"p",slug:"rau",name:"Cải ngọt",category:{id:"c",slug:"rau",name:"Rau"},available_quantity:10,retail_price_vnd:40000,unit_size:"1.000",unit_label:"kg",primary_image:null,csa_quota_group:null};
 const storage=new Map([["nfv-cart-v1",JSON.stringify({p:1})],["nfv-cart-products-v1",JSON.stringify({p:stale})]]);
 const initial=catalogCardHarness({storage});
 initial.context();initial.hydrateCart();initial.context().retryCartProduct("p");
 initial.responses[0].resolve({ok:false,status:404});
 await tick();
 assert.equal(initial.context().storeAvailability.p,null);
 initial.persistAvailability();

 const restored=catalogCardHarness({storage});
 restored.context();restored.hydrateCart();restored.context().cacheStoreProducts([stale]);
 const checkBlocked=()=>{
  const card=restored.render(stale),detail=restored.renderDetail(stale);
  assert.ok(card.some(node=>node.props.children==="Ngừng bán"));
  assert.equal(card.some(node=>node.type===restored.ui.Button),false);
  assert.equal(detail.find(node=>node.type===restored.ui.Button).props.disabled,true);
  restored.context().addCart(stale,1,{openCart:false});
  assert.equal(restored.context().ui.cart.p,1);
 };
 checkBlocked();
 assert.equal(restored.responses.length,1);
 assert.equal(restored.responses[0].url,"/api/store/products/rau?locale=vi&retry=1");
 restored.responses[0].resolve({ok:false,status:404});
 await tick();
 checkBlocked();
});

test("a restock is verified once before the catalog enables a previously sold-out product",async()=>{
 const h=catalogCardHarness(),context=h.context();
 const product={...context.data.storeProducts.p,name:"Cải ngọt",unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 context.cacheStoreProducts([{...product,available_quantity:0}],"verified");
 h.context().updateCart("p",-1);
 assert.ok(h.render(product).some(node=>node.props.children==="Hết hàng"));
 h.context().cacheStoreProducts([product]);
 h.context().cacheStoreProducts([product]);
 assert.equal(h.responses.length,1);
 assert.ok(h.render(product).some(node=>node.props.children==="Hết hàng"));
 h.responses[0].resolve({ok:true,status:200,json:async()=>({...product,available_quantity:5})});
 await tick();
 const card=h.render({...product,available_quantity:0});
 const add=card.find(node=>node.type===h.ui.Button);
 assert.ok(add);
 assert.equal(h.ui.Button(add.props).props.disabled,false);
});

test("the catalog rechecks known positive stock when a newer result reports zero",async()=>{
 const h=catalogCardHarness(),context=h.context();
 const product={...context.data.storeProducts.p,name:"Cải ngọt",unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 context.cacheStoreProducts([product],"verified");
 h.context().cacheStoreProducts([{...product,available_quantity:0}]);
 assert.equal(h.responses.length,1);
 h.responses[0].resolve({ok:true,status:200,json:async()=>({...product,available_quantity:0})});
 await tick();
 assert.ok(h.render(product).some(node=>node.props.children==="Hết hàng"));
});

test("opening a previously sold-out product detail rechecks it before enabling Add",async()=>{
 const h=catalogCardHarness();h.context();h.hydrateCart();
 const context=h.context();
 const product={...context.data.storeProducts.p,name:"Cải ngọt",category:{id:"c",slug:"rau",name:"Rau"},unit_size:"500.000",unit_label:"g",primary_image:null,csa_quota_group:null};
 context.cacheStoreProducts([{...product,available_quantity:0}],"verified");
 const add=()=>h.renderDetail(product).find(node=>node.type===h.ui.Button);
 assert.equal(add().props.disabled,true);
 assert.equal(h.responses.length,1);
 h.responses[0].resolve({ok:true,status:200,json:async()=>product});
 await tick();
 assert.equal(add().props.disabled,false);
 add().props.onClick();
 assert.equal(h.context().ui.cartOpen,true);
});

test("catalog add at the cart line limit keeps the cart closed and reports the limit",()=>{
 const h=providerHarness(),context=h.render();
 context.patch({cartOpen:false,cart:Object.fromEntries(Array.from({length:50},(_,index)=>[`p${index}`,1]))});
 h.render().addCart(h.original,1,{openCart:false});
 const {ui}=h.render();
 assert.equal(ui.cartOpen,false);
 assert.equal(ui.cart.p,undefined);
 assert.equal(ui.toastTone,"error");
});

test("Store detail and cart pass their real stock/line limits to the shared Quantity control",()=>{
 const jsx=(type,props)=>({type,props}),ui={};
 vm.runInNewContext(compile("src/components/UI.tsx"),{exports:ui,require:name=>name==="react/jsx-runtime"?{jsx,jsxs:jsx}:{}});
 const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=="object"?[]:[tree,...all(tree.props?.children)];
 for(const stock of [150,2000]){
  const product={id:"p",slug:"p",name:"Rau",category:{id:"c",name:"Rau"},available_quantity:stock,retail_price_vnd:10000,unit_size:"1.000",unit_label:"kg",primary_image:null,csa_quota_group:null};
  const exports={},context={data:{storeProducts:{p:product}},ui:{locale:"vi",cartOpen:true,cart:{p:99},cartProductState:{p:"ready"},cartProductNotice:{}},storeAvailability:{},cartHydrated:true,recheckStoreProducts(){},addCart(){}};
  const requireModule=name=>{
   if(name==="react/jsx-runtime")return {jsx,jsxs:jsx};
   if(name==="react")return {useState:()=>[99,()=>{}],useEffect:effect=>effect(),useRef:current=>({current})};
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


test('account owner changes clear private UI drafts but same-owner revalidation preserves them',async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();let ctx=h.render();
 ctx.patch({referrerDraft:'ZXCVBN2345',referrerError:'old error',addressEditing:true,visible:{referrals:14}});
 h.startAccountLoad();await tick();ctx=h.render();assert.equal(ctx.ui.referrerDraft,'ZXCVBN2345');
 h.auth.session={subject:'new-owner'};h.render();h.startAccountLoad();await tick();ctx=h.render();
 assert.equal(ctx.ui.referrerDraft,'');assert.equal(ctx.ui.referrerError,'');assert.equal(ctx.ui.addressEditing,false);assert.equal(Object.keys(ctx.ui.visible).length,0);
});


// Exercise the real confirmation task and real provider epoch changes together.
function giftComponent(ctx,name,props={}){
 const exports={},source=readFileSync(new URL('../src/screens/AccountBenefits.tsx',import.meta.url),'utf8')+'\nexport {GiftModal,RewardsGifts};';
 const jsx=(type,props)=>({type,props});
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(module){
  if(module==='react')return {useRef:current=>({current}),useState:v=>[v,()=>{}],useEffect:fn=>fn()};
  if(module==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(module==='@/state/NFVContext')return {useNFV:()=>ctx};
  if(module==='@/components/UI')return {Button:'Button',localized:x=>x.name};
  if(module==='@/components/overlays/useOverlayDialog')return {useOverlayDialog(){}};
  if(module==='@/account/redemption-intent')return {redemptionRequest:intent=>({giftId:intent.giftId,idempotencyKey:intent.idempotencyKey})};
  if(module==='@/data/account-copy')return {copyText:(_,key)=>key};
  return {};
 }});
 return exports[name](props);
}
const giftNodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(giftNodes)];
test('submitted redemption retains its key through same-owner auth reload and retries idempotently',async()=>{
 const h=providerHarness({authenticated:true});h.render();h.startAccountLoad();await tick();let ctx=h.render();
 const rewards={balance:1000,gifts:[{id:'gift',name:'Gift',points:100}],redemptions:[]};
 ctx.setData(s=>({...s,rewards}));ctx.patch({giftIntent:{giftId:'gift',idempotencyKey:'original-key',phase:'confirm'}});ctx=h.render();
 const confirm=()=>giftNodes(giftComponent(ctx,'GiftModal')).find(n=>n.type==='Button'&&n.props.loading!==undefined).props.onClick();
 confirm();ctx=h.render();assert.equal(ctx.ui.giftIntent.phase,'pending');assert.equal(h.redemptions.length,1);
 h.auth.session={subject:'owner',profile:{name:'Updated elsewhere'}};h.render();h.startAccountLoad();await tick();ctx=h.render();
 assert.equal(ctx.ui.busyKeys.includes('gift:redeem'),false);
 giftComponent(ctx,'RewardsGifts',{active:false});ctx=h.render();assert.equal(ctx.ui.giftIntent.idempotencyKey,'original-key');
 ctx.setData(s=>({...s,rewards}));ctx=h.render();confirm();ctx=h.render();assert.equal(h.redemptions.length,2);
 assert.equal(h.redemptions[0].input.idempotencyKey,h.redemptions[1].input.idempotencyKey);
 h.redemptions[0].resolve({accepted:true,balance:900});await tick();ctx=h.render();assert.equal(ctx.ui.giftIntent.phase,'pending','obsolete epoch must not publish success');
 h.redemptions[1].resolve({accepted:true,balance:900});await tick();ctx=h.render();assert.equal(ctx.ui.giftIntent.phase,'success');
 giftComponent(ctx,'RewardsGifts',{active:false});assert.equal(h.render().ui.giftIntent,null);
});
