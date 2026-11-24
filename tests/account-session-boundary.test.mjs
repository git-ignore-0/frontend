import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),jsx=require('react/jsx-runtime'),{renderToStaticMarkup}=require('react-dom/server'),ts=require('typescript');
const root=new URL('../',import.meta.url);
function loadModule(path, resolve, globals={}){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URLSearchParams,...globals,require:resolve});
 return exports;
}
function renderAccount(auth,owner,{locale='vi',tab='profile',email=`${owner}@example.com`,shippingAddress,data,onRetry,accountHooks,accountUI,onAddressEdit,onAddressFields}={}){
const ui=accountUI??{locale,accountTab:tab,accountHubOpen:false,accountFetchState:{}};
const context={accountSessionKey:owner,data:data??{profile:{name:`Name ${owner}`,phone:'+84901234567',email,dateOfBirth:null},shippingAddress},ui,patch(update){Object.assign(ui,update)},refreshResource:async()=>{}};
const cache=new Map();
function load(path){
 if(cache.has(path))return cache.get(path);
 const exports=loadModule(path,name=>{
  if(name==='react')return path==='src/screens/Account.tsx'&&accountHooks?accountHooks.react:React;if(name==='react/jsx-runtime')return jsx;
  if(name==='@/state/NFVContext')return {useNFV:()=>context};
  if(name==='@/auth/AuthProvider')return {useAuth:()=>auth};
  if(name==='@/data/account-navigation')return load('src/data/account-navigation.ts');
  if(name==='@/screens/AccountProfile')return load('src/screens/AccountProfile.tsx');
  if(name==='@/data/account-copy')return load('src/data/account-copy.ts');
  if(name==='@/auth/site-auth')return load('src/auth/site-auth.ts');
  if(name==='@/screens/profile-presentation')return {profileBirthDate:()=>''};
  if(name==='@/account/shipping-address-model')return {reviewShippingAddress:()=>({complete:false,missing:[]})};
  if(name==='@/hooks/useSupportedShippingAreas')return {useSupportedShippingAreas:()=>({areas:[],loading:false,error:false})};
  if(name==='@/components/account/ShippingAddressFields')return {ShippingAddressFields:props=>{
   onAddressFields?.(props);
   return React.createElement('input',{name:'address',defaultValue:props.value.address});
  }};
  if(name==='@/components/UI')return {Icon:()=>null,Button:({children,onClick,disabled})=>{
   if((Array.isArray(children)?children:[]).includes('Chỉnh sửa'))onAddressEdit?.(onClick);
   return React.createElement('button',{disabled},children);
  },ActionLink:({children,href})=>React.createElement('a',{href},children),DataState:({title,kind,action})=>{
   if(action)onRetry?.(action.onClick);
   return React.createElement('p',{'data-state':kind},title,action&&React.createElement('button',{onClick:action.onClick},action.label));
  },Section:({title,actions,children})=>React.createElement('section',null,React.createElement('h2',null,title),actions,children)};
  if(name==='@/components/store/StorePrimitives')return {StoreRecipientSummary:({name,phone,address})=>React.createElement('p',null,name,' ',phone,' ',address)};
  if(name==='@/lib/format')return {formatAddress:address=>address.detail};
  if(name==='@/screens/AccountOrders')return {GuestOrderLookup:()=>null};
  if(name==='@/components/auth/GuestAuthActions')return {GuestAuthActions:()=>null};
  if(name==='@/components/auth/LogoutButton')return {LogoutButton:()=>null};
  return {};
 });cache.set(path,exports);return exports;
}
const {Account}=load('src/screens/Account.tsx');
return renderToStaticMarkup(accountHooks?accountHooks.element(Account):React.createElement(Account));
}

const tick=()=>new Promise(resolve=>setImmediate(resolve));
const user=(sub,name,email)=>({sub,name,email,email_verified:true,login_phone_number:'+84901234567',phone_number:'+84901234567',date_of_birth:null,status:'active',locale:'vi',roles:['member']});
const userA=user('11111111-1111-4111-8111-111111111111','Account A','a@example.com');
const userB=user('22222222-2222-4222-8222-222222222222','Account B','b@example.com');
const sessionResponse=user=>Response.json({data:{user}});

function providerHooks(){
 const slots=[],effects=[];
 let cursor=0;
 const changed=(old,deps)=>!old||deps.some((value,index)=>!Object.is(value,old[index]));
 const react={
  createContext:()=>({Provider:'provider'}),
  useState(initial){
   const index=cursor++;
   if(!(index in slots))slots[index]=typeof initial==='function'?initial():initial;
   return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value}];
  },
  useRef(current){return slots[cursor++]??={current}},
  useEffect(effect,deps){
   const index=cursor++;
   const old=slots[index];
   if(changed(old?.deps,deps))effects.push(()=>{old?.cleanup?.();slots[index]={deps,cleanup:effect()}});
  },
  useMemo(compute,deps){
   const index=cursor++;
   if(changed(slots[index]?.deps,deps))slots[index]={deps,value:compute()};
   return slots[index].value;
  },
  useCallback(callback,deps){return react.useMemo(()=>callback,deps)},
 };
 react.useLayoutEffect=react.useEffect;
 return {react,element(component){cursor=0;return component({children:null})},render(component){return this.element(component).props.value},commit(){for(const effect of effects.splice(0))effect()}};
}

function tabHarness({getShippingAddress=async()=>null}={}){
 const sessionRequests=[];
 const window=new EventTarget(),document=new EventTarget();
 document.visibilityState='visible';
 const load=(path,resolve)=>loadModule(path,resolve,{window,document,queueMicrotask,Error});
 const service=loadModule('src/auth/auth-service.ts',()=>load('src/auth/core-user.ts'),{
  fetch:path=>{assert.equal(path,'/api/auth/session');return new Promise(resolve=>sessionRequests.push(resolve))},
 });
 const authHooks=providerHooks(),nfvHooks=providerHooks();
 const providerImports=(hooks,name)=>name==='react'?hooks.react:name==='react/jsx-runtime'?jsx:undefined;
 const {AuthProvider}=load('src/auth/AuthProvider.tsx',name=>providerImports(authHooks,name)??({
  './auth-service':service,
  './session-equality':load('src/auth/session-equality.ts'),
  '@/store/buy-again-session':{retainBuyAgainOwner(){}},
 })[name]);
 let auth;
 const initial=load('src/state/initial-state.ts');
 const {NFVProvider}=load('src/state/NFVContext.tsx',name=>providerImports(nfvHooks,name)??({
  '@/auth/AuthProvider':{useAuth:()=>auth},
  '@/auth/auth-service':service,
  './initial-state':initial,
  '@/store/cart-product-refresh':{createCartProductRefreshCoordinator:()=>({})},
  './cart-persistence':{loadCart:()=>({}),loadCartProducts:()=>({}),saveCart(){},saveCartProducts(){}},
  '@/account/shipping-service':{getShippingAddress},
  '@/account/csa-service':{getCSA:async()=>null},
  '@/account/rewards-service':{getRewards:async()=>null},
  '@/account/referrals-service':{getReferrals:async()=>null},
 })[name]??{});
 const commit=()=>{authHooks.commit();nfvHooks.commit()};
 const render=()=>{
  auth=authHooks.render(AuthProvider);
  const {accountSessionKey,data,ui}=nfvHooks.render(NFVProvider);
  let retry;
  const html=renderAccount(auth,accountSessionKey,{data,onRetry:action=>{retry=action}});
  return {auth,html,retry,addressState:ui.accountFetchState.address,shippingAddress:data.shippingAddress};
 };
 const event=(target,type,details)=>target.dispatchEvent(Object.assign(new Event(type),details));
 render();commit();
 return {render,commit,restore:()=>event(window,'pageshow',{persisted:true}),
  returnToTab:()=>event(document,'visibilitychange'),
  async respond(response){assert.ok(sessionRequests.length,'expected a pending session check');sessionRequests.shift()(response);await tick()},
  takeRequest(){assert.ok(sessionRequests.length,'expected a pending session check');return sessionRequests.shift()},
 };
}

test('same-owner session restoration marks the address loading before account effects run',async()=>{
 const reads=[];
 const tab=tabHarness({getShippingAddress:()=>new Promise(resolve=>reads.push(resolve))});
 await tick();await tab.respond(sessionResponse(userA));
 tab.render();tab.commit();
 reads.shift()({name:'Previous recipient'});await tick();
 assert.equal(tab.render().addressState,'ready');
 tab.restore();tab.render();tab.commit();
 await tab.respond(sessionResponse(userA));
 assert.equal(tab.render().addressState,'loading');
 tab.commit();
 assert.equal(tab.render().addressState,'loading');
 reads.shift()({name:'Current recipient'});await tick();
 const confirmed=tab.render();
 assert.equal(confirmed.addressState,'ready');
 assert.equal(confirmed.shippingAddress.name,'Current recipient');
});

test('restoring an authenticated tab hides the profile and its edit action through a failed check and retry',async()=>{
 const tab=tabHarness();
 await tick();await tab.respond(sessionResponse(userA));
 tab.render();tab.commit();
 const accountA=tab.render();
 assert.match(accountA.html,/a@example.com/);
 assert.match(accountA.html,/href="\/api\/auth\/account/);

 tab.restore();
 const checking=tab.render();tab.commit();
 assert.equal(checking.auth.session,null);
 assert.equal(checking.auth.lastConfirmedSubject,userA.sub);
 assert.doesNotMatch(checking.html,/a@example.com|href="\/api\/auth\/account/);
 assert.match(checking.html,/data-state="loading"/);
 await tab.respond(new Response(null,{status:502}));
 const failed=tab.render();tab.commit();
 assert.equal(failed.auth.session,null);
 assert.equal(failed.auth.lastConfirmedSubject,userA.sub);
 assert.doesNotMatch(failed.html,/a@example.com|href="\/api\/auth\/account/);
 assert.match(failed.html,/data-state="error"/);
 assert.equal(typeof failed.retry,'function');

 failed.retry();
 assert.match(tab.render().html,/data-state="loading"/);tab.commit();
 await tab.respond(sessionResponse(userB));
 const beforeResources=tab.render();
 assert.equal(beforeResources.auth.lastConfirmedSubject,userB.sub);
 assert.doesNotMatch(beforeResources.html,/[ab]@example.com/);
 assert.match(beforeResources.html,/data-state="loading"/);
 tab.commit();
 const recovered=tab.render().html;
 assert.match(recovered,/b@example.com/);
 assert.doesNotMatch(recovered,/a@example.com/);
});

test('a newer visible-tab check wins when an older Back restore returns account A later',async()=>{
 const tab=tabHarness();
 await tick();await tab.respond(sessionResponse(userA));
 tab.render();tab.commit();
 assert.match(tab.render().html,/a@example.com/);

 tab.restore();
 const stale=tab.takeRequest();
 tab.returnToTab();
 const checking=tab.render();tab.commit();
 await tab.respond(sessionResponse(userB));
 tab.render();tab.commit();
 assert.match(tab.render().html,/b@example.com/);
 stale(sessionResponse(userA));await tick();
 const afterStale=tab.render().html;
 assert.match(afterStale,/b@example.com/);
 assert.doesNotMatch(afterStale,/a@example.com/);
 assert.match(checking.html,/data-state="loading"/);
});

test('an old account request cannot expire the session check that replaces its owner',async()=>{
 const tab=tabHarness();
 await tick();await tab.respond(sessionResponse(userA));
 tab.render();tab.commit();
 const accountA=tab.render();

 tab.restore();
 accountA.auth.expire();
 await tab.respond(sessionResponse(userB));
 tab.render();tab.commit();
 assert.match(tab.render().html,/b@example.com/);
});

test('a background check preserves the guest flow on 502 and handles an expired session on 401',async()=>{
 const tab=tabHarness();
 await tick();await tab.respond(sessionResponse(null));
 assert.equal(tab.render().auth.status,'guest');tab.commit();

 tab.returnToTab();
 assert.equal(tab.render().auth.status,'guest');tab.commit();
 await tab.respond(new Response(null,{status:502}));
 assert.equal(tab.render().auth.status,'guest');tab.commit();

 tab.restore();await tab.respond(new Response(null,{status:401}));
 const expired=tab.render();
 assert.equal(expired.auth.status,'expired');
 assert.equal(expired.auth.session,null);
 assert.equal(expired.auth.lastConfirmedSubject,null);
});

test('Account hides old private data until its context owner matches the authenticated subject',()=>{
 const html=renderAccount({status:'authenticated',session:{subject:'user-B'}},'user-A');
 assert.doesNotMatch(html,/user-A@example.com/);assert.match(html,/data-state="loading"/);
});

test('Account displays private data for the matching subject',()=>{
 const html=renderAccount({status:'authenticated',session:{subject:'user-B'}},'user-B');
 assert.match(html,/user-B@example.com/);assert.doesNotMatch(html,/data-state="loading"/);
});

test('checking and guest states do not render the previous profile',()=>{
 for(const status of ['checking','guest'])assert.doesNotMatch(renderAccount({status,session:null},'user-A'),/user-A@example.com/);
});

test('a phone-only profile localizes missing email and opens Core edit with the profile tab return path',()=>{
 const auth={status:'authenticated',session:{subject:'user-B'}};
 for(const [locale,missing,edit] of [['vi','Chưa có email','Chỉnh sửa'],['en','No email address','Edit']]){
  const html=renderAccount(auth,'user-B',{locale,email:null});
  assert.ok(html.includes(missing));
  assert.ok(html.includes('+84901234567'));
  const returnTo=`/account/${locale}?tab=profile`;
  assert.ok(html.includes(`href="/api/auth/account?returnTo=${encodeURIComponent(returnTo)}"`));
  assert.ok(html.includes(` ${edit}</a>`));
 }
});

test('saved delivery details use the recipient in ShippingAddress independently of the profile phone',()=>{
 const auth={status:'authenticated',session:{subject:'user-B'}};
 const shippingAddress={name:'Delivery Recipient',phone:'+84987654321',detail:'Delivery address details'};
 const html=renderAccount(auth,'user-B',{tab:'address',email:null,shippingAddress});
 assert.ok(html.includes('Delivery Recipient +84987654321 Delivery address details'));
 const addressCard=html.match(/<section><h2>Địa chỉ<\/h2>[\s\S]*?<\/section>/)?.[0];
 assert.ok(addressCard);
 assert.doesNotMatch(addressCard,/\+84901234567/);
});

test('same-owner confirmation restores an address draft but never shows it while checking or to another owner',()=>{
 const accountHooks=providerHooks();
 const accountUI={locale:'vi',accountTab:'address',accountHubOpen:false,accountFetchState:{address:'ready'},busyKeys:[]};
 const auth={status:'authenticated',session:{subject:'A'},lastConfirmedSubject:'A'};
 let edit,fields;
 const render=(owner,recipient)=>renderAccount(auth,owner,{
  accountHooks,accountUI,shippingAddress:{name:recipient,phone:'+84987654321',detail:'Saved address'},
  onAddressEdit:action=>{edit=action},onAddressFields:props=>{fields=props},
 });
 render('A','Saved A');
 edit();
 render('A','Saved A');
 fields.onChange({...fields.value,address:'Unsaved A'});
 Object.assign(auth,{status:'checking',session:null});
 assert.doesNotMatch(render('A','Saved A'),/Unsaved A|Saved A|name="address"/);
 auth.status='error';
 assert.doesNotMatch(render('error','Saved A'),/Unsaved A|Saved A|name="address"/);
 Object.assign(auth,{status:'authenticated',session:{subject:'A'}});
 accountUI.accountFetchState.address='loading';
 assert.doesNotMatch(render('A','Saved A'),/Unsaved A|Saved A|name="address"/);
 accountUI.accountFetchState.address='ready';
 assert.match(render('A','Saved A'),/value="Unsaved A"/);
 Object.assign(auth,{session:{subject:'B'},lastConfirmedSubject:'B'});
 assert.doesNotMatch(render('A','Saved A'),/Unsaved A|Saved A|name="address"/);
 assert.match(render('B','Saved B'),/Saved B/);
 Object.assign(auth,{session:{subject:'A'},lastConfirmedSubject:'A'});
 assert.doesNotMatch(render('A','Saved A'),/Unsaved A|name="address"/);
});
