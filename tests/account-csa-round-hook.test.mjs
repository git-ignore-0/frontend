import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
const tick=()=>new Promise(r=>setImmediate(r));
function hooks(){let cursor=0;const state=[],deps=[],cleanup=[];let pending=[];return {
 react:{useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value}]},useRef(initial){const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i]},useCallback(fn,next){const i=cursor++;if(!deps[i]||next.some((d,n)=>!Object.is(d,deps[i][n]))){deps[i]=next;state[i]=fn}return state[i]},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((d,n)=>!Object.is(d,deps[i][n]))){deps[i]=next;pending.push({i,fn})}}},render(fn){cursor=0;return fn()},flush(){const effects=pending;pending=[];for(const {i,fn} of effects){cleanup[i]?.();cleanup[i]=fn()}},dispose(){cleanup.forEach(fn=>fn?.())}}}
function loader(stubs,globals={}){const cache=new Map();return function load(path){path=resolve(path);if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(source,{exports,console,Date,URL,AbortController,queueMicrotask,setInterval,clearInterval,...globals,require(name){if(name in stubs)return stubs[name];if(name.startsWith('.')||name.startsWith('@/')){let target=name.startsWith('@/')?resolve(root,'src',name.slice(2)):resolve(dirname(path),name);if(!existsSync(target))target+=existsSync(target+'.ts')?'.ts':'.tsx';return load(target)}return require(name)}},{filename:path});return exports}}
const line={productId:'p',quantity:1,name:'Tomato',unitLabel:'kg',quotaGroupId:'g',quotaCost:1};
const selection={id:'s',roundId:'r',membershipId:'m',state:'selecting',revision:3,orderId:null,reopenUntil:null,serverTime:'2026-11-20T08:00:00Z',lines:[line]};
const bundle={round:{id:'r',sequence:1,name:'Round',opensAt:'2026-11-20T07:00:00Z',closesAt:'2026-11-21T08:00:00Z',deliveryAt:'2026-11-22T08:00:00Z',status:'open',serverTime:'2026-11-20T08:00:00Z',cancellationReason:null},selection,products:[{id:'p',name:'Tomato',quotaGroupId:'g',quotaGroupName:'Vegetables',quotaCost:1,availableQuantity:10,unitSize:'1.000',unitLabel:'kg',imageUrl:null}],quota:[{groupId:'g',availableUnits:4}]};
function selectionHarness(){const h=hooks(),events={},auth={status:'authenticated',session:{subject:'member'},expire(){}},context={data:{csa:{active:{status:'active'}}},async refreshResource(){}},calls={get:0,save:[],confirm:[]};let latest=bundle;
 const services={async getRoundProducts(){calls.get++;return latest},async getRoundSelection(){return latest.selection},async getRoundsPage(){throw Error('unexpected fallback')},async saveRoundSelection(input){calls.save.push(input);return {...selection,revision:4,lines:input.lines.map(l=>({...line,...l}))}},async confirmRoundSelection(input){calls.confirm.push(input);return {...selection,revision:4,state:'confirmed'}}};
 const load=loader({react:h.react,'@/auth/AuthProvider':{useAuth:()=>auth},'@/state/NFVContext':{useNFV:()=>context},'@/account/csa-rounds-service':services,'../../account/csa-rounds-service.ts':services,'@/store/store-order-service':{},'./useCsaServerClock':{useCsaServerClock:()=>Date.parse(bundle.round.serverTime)}},{window:{addEventListener:(name,fn)=>{events[name]=fn},removeEventListener:name=>{delete events[name]}},document:{visibilityState:'visible',addEventListener:(name,fn)=>{events[name]=fn},removeEventListener:name=>{delete events[name]}}});
 const {useCsaRoundSelection}=load(resolve(root,'src/screens/account-csa/useCsaRoundSelection.ts'));let value;
 async function settle(){for(let i=0;i<4;i++){value=h.render(()=>useCsaRoundSelection('r','vi'));h.flush();await tick()}return value}
 return {h,calls,events,settle,services,auth,context,load,get value(){return value},latest(value){latest=value}};
}
test('returning to tab revalidates availability while retaining an editable unsaved draft',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();assert.equal(value.dirty,false);value.setDraft({p:2});value=await harness.settle();assert.equal(value.dirty,true);harness.events.focus();value=await harness.settle();assert.equal(value.draft.p,2);assert.equal(value.needsReload,false);assert.equal(harness.calls.get,2);await value.submit(false);await harness.settle();assert.equal(harness.calls.save[0].lines[0].quantity,2)}finally{harness.h.dispose()}
});
test('actual server revision change preserves draft but blocks silent overwrite',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();value.setDraft({p:2});await harness.settle();harness.latest({...bundle,selection:{...selection,revision:9}});harness.events.focus();value=await harness.settle();assert.equal(value.draft.p,2);assert.equal(value.needsReload,true);await value.submit(false);assert.equal(harness.calls.save.length,0)}finally{harness.h.dispose()}
});
test('server clock includes time a round spent inside a collapsed list',()=>{
 const h=hooks(),load=loader({react:h.react}),clock=load(resolve(root,'src/screens/account-csa/useCsaServerClock.ts'));
 const now=h.render(()=>clock.useCsaServerClock('2026-11-20T08:00:00Z',Date.now()-20*60*1000));
 assert.ok(now>=Date.parse('2026-11-20T08:20:00Z'));h.dispose();
});
test('editing and saving do not register a native leave confirmation',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();assert.equal(harness.events.beforeunload,undefined);value.setDraft({p:2});value=await harness.settle();assert.equal(harness.events.beforeunload,undefined);await value.submit(false);await harness.settle();assert.equal(harness.events.beforeunload,undefined)}finally{harness.h.dispose()}
});

const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
test('unavailable unsaved products remain visible and removable after catalog refresh',async()=>{
 const h=selectionHarness();try{
  const beans={...bundle.products[0],id:'b',name:'Beans'};
  h.latest({...bundle,products:[...bundle.products,beans]});let v=await h.settle();v.setDraft({p:1,b:1});await h.settle();
  h.latest(bundle);h.events.focus();v=await h.settle();
  const load=loader({'@/components/UI':{Button:'button'},'./csa-rounds.module.css':{default:{}}});
  const {CsaRoundSelectionSummary:Summary}=load(resolve(root,'src/screens/account-csa/CsaRoundSelectionSummary.tsx'));
  const {selectionProducts,usedPoints}=h.load(resolve(root,'src/screens/account-csa/csa-rounds-presentation.ts'));
  const products=selectionProducts(v.current,v.draftProducts);
  const tree=Summary({snapshot:v.current,draft:v.draft,products,used:usedPoints(v.draft,products),locale:'en',disabled:false,onRemove:id=>v.setDraft(d=>({...d,[id]:0}))});
  const remove=nodes(tree).find(n=>n.props?.['aria-label']==='Remove product: Beans');
  assert.ok(remove,'unsaved unavailable product needs a removal control');remove.props.onClick();v=await h.settle();
  assert.equal(v.draft.b,0);assert.equal(v.draft.p,1);await v.submit(false);assert.equal(h.calls.save[0].lines.length,1);
 }finally{h.h.dispose()}
});
test('stale unauthorized save after unmount cannot expire a replacement session',async()=>{
 const h=selectionHarness();try{
  const v=await h.settle();let reject,expired=0;h.auth.expire=()=>{expired++};
  h.services.saveRoundSelection=()=>new Promise((_,r)=>{reject=r});const pending=v.submit(false);
  h.h.dispose();h.auth.session={subject:'replacement-member'};
  const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));reject(new AccountApiError('session_expired',401));await pending;
  assert.equal(expired,0);
 }finally{h.h.dispose()}
});
test('successful save after unmount does not start snapshot or account refresh',async()=>{
 const h=selectionHarness();try{
  const v=await h.settle();let resolveSave,refreshes=0;h.context.refreshResource=async()=>{refreshes++};
  h.services.saveRoundSelection=()=>new Promise(r=>{resolveSave=r});const pending=v.submit(false);h.h.dispose();
  resolveSave({...selection,revision:4});await pending;assert.equal(h.calls.get,1);assert.equal(refreshes,0);
 }finally{h.h.dispose()}
});
test('membership denial preserves saved history but disables editing and reports denial',async()=>{
 const h=selectionHarness();try{
  const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));
  h.context.data.csa.active=null;h.services.getRoundProducts=async()=>{throw new AccountApiError('csa_membership_unavailable',409)};
  h.services.getRoundsPage=async()=>({items:[bundle.round],total:1,pageSize:20});
  const v=await h.settle();assert.equal(v.current.selection.id,'s');assert.equal(v.access.mode,'readonly');assert.equal(v.error?.code,'csa_membership_unavailable');
  await v.submit(false);assert.equal(h.calls.save.length,0);
 }finally{h.h.dispose()}
});
test('valid frozen participation remains editable with a successful catalog response',async()=>{
 const h=selectionHarness();try{h.context.data.csa.active=null;const v=await h.settle();assert.equal(v.access.mode,'edit');assert.equal(v.error,null)}finally{h.h.dispose()}
});
test('history refresh reuses the located page instead of scanning all earlier pages again',async()=>{
 const h=selectionHarness();try{
  const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));const pages=[];
  h.services.getRoundProducts=async()=>{throw new AccountApiError('csa_selection_locked',409)};
  h.services.getRoundsPage=async(page)=>{pages.push(page);return {items:page===3?[bundle.round]:[],total:41,pageSize:20}};
  await h.settle();assert.deepEqual(pages,[1,2,3]);h.events.focus();await h.settle();assert.deepEqual(pages,[1,2,3,3]);
 }finally{h.h.dispose()}
});
test('permission denial during refresh closes editing on the previously loaded snapshot',async()=>{
 const h=selectionHarness();try{
  await h.settle();const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));
  h.services.getRoundProducts=async()=>{throw new AccountApiError('permission_denied',403)};
  h.events.focus();const v=await h.settle();assert.equal(v.current.selection.id,'s');assert.equal(v.access.mode,'readonly');assert.equal(v.error.code,'permission_denied');
 }finally{h.h.dispose()}
});
test('hidden round clocks stop their interval and resume on activation',()=>{
 const h=hooks();let started=0,stopped=0;
 const load=loader({react:h.react},{setInterval(){return ++started},clearInterval(){stopped++}});
 const {useCsaServerClock}=load(resolve(root,'src/screens/account-csa/useCsaServerClock.ts'));
 try{
  h.render(()=>useCsaServerClock(bundle.round.serverTime,Date.now(),true));h.flush();assert.equal(started,1);
  h.render(()=>useCsaServerClock(bundle.round.serverTime,Date.now(),false));h.flush();assert.equal(started,1);assert.equal(stopped,1);
  h.render(()=>useCsaServerClock(bundle.round.serverTime,Date.now(),true));h.flush();assert.equal(started,2);
 }finally{h.dispose()}
});
