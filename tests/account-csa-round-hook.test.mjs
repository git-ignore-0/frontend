import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
const tick=()=>new Promise(r=>setImmediate(r));
function hooks(){let cursor=0;const state=[],deps=[],cleanup=[];let pending=[];return {
 react:{useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value}]},useRef(initial){const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i]},useCallback(fn,next){const i=cursor++;if(!deps[i]||next.some((d,n)=>!Object.is(d,deps[i][n]))){deps[i]=next;state[i]=fn}return state[i]},useLayoutEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((d,n)=>!Object.is(d,deps[i][n]))){deps[i]=next;pending.push({i,fn})}},useEffect(fn,next){const i=cursor++;if(!deps[i]||next.some((d,n)=>!Object.is(d,deps[i][n]))){deps[i]=next;pending.push({i,fn})}}},render(fn){cursor=0;return fn()},flush(){const effects=pending;pending=[];for(const {i,fn} of effects){cleanup[i]?.();cleanup[i]=fn()}},dispose(){cleanup.forEach(fn=>fn?.())}}}
function loader(stubs,globals={}){const cache=new Map();return function load(path){path=resolve(path);if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(source,{exports,console,Date,performance,URL,AbortController,queueMicrotask,setInterval,clearInterval,...globals,require(name){if(name in stubs)return stubs[name];if(name.startsWith('.')||name.startsWith('@/')){let target=name.startsWith('@/')?resolve(root,'src',name.slice(2)):resolve(dirname(path),name);if(!existsSync(target))target+=existsSync(target+'.ts')?'.ts':'.tsx';return load(target)}return require(name)}},{filename:path});return exports}}
const line={productId:'p',quantity:1,name:'Tomato',unitLabel:'kg',quotaGroupId:'g',quotaCost:1};
const selection={id:'s',roundId:'r',membershipId:'m',state:'selecting',revision:3,orderId:null,reopenUntil:null,serverTime:'2026-11-20T08:00:00Z',lines:[line]};
const bundle={round:{id:'r',sequence:1,name:'Round',opensAt:'2026-11-20T07:00:00Z',closesAt:'2026-11-21T08:00:00Z',deliveryDate:'2026-11-22',status:'open',serverTime:'2026-11-20T08:00:00Z',cancellationReason:null},selection,products:[{id:'p',name:'Tomato',quotaGroupId:'g',quotaGroupName:'Vegetables',quotaCost:1,availableQuantity:10,unitSize:'1.000',unitLabel:'kg',imageUrl:null}],quota:[{groupId:'g',availableUnits:4}]};
function selectionHarness(checkpoint){const h=hooks(),events={},auth={status:'authenticated',session:{subject:'member'},expire(){}},context={data:{csa:{active:{status:'active'}}},async refreshResource(){}},calls={get:0,save:[],confirm:[]};let latest=bundle;
 const services={async getRoundProducts(){calls.get++;return latest},async getRoundSelection(){return latest.selection},async getRoundsPage(){throw Error('unexpected fallback')},async saveRoundSelection(input){calls.save.push(input);const saved={...selection,revision:4,lines:input.lines.map(l=>({...line,...l}))};latest={...latest,selection:saved};return saved},async confirmRoundSelection(input){calls.confirm.push(input);return {...selection,revision:4,state:'confirmed'}}};
 const load=loader({react:h.react,'@/auth/AuthProvider':{useAuth:()=>auth},'@/state/NFVContext':{useNFV:()=>context},'@/account/csa-rounds-service':services,'../../account/csa-rounds-service.ts':services,'@/store/store-order-service':{},'./useCsaServerClock':{useCsaServerClock:()=>Date.parse(bundle.round.serverTime)}},{window:{addEventListener:(name,fn)=>{events[name]=fn},removeEventListener:name=>{delete events[name]}},document:{visibilityState:'visible',addEventListener:(name,fn)=>{events[name]=fn},removeEventListener:name=>{delete events[name]}}});
 services.isCsaMutationOutcomeUnknown=load(resolve(root,'src/account/csa-rounds-service.ts')).isCsaMutationOutcomeUnknown;
 const {useCsaRoundSelection}=load(resolve(root,'src/screens/account-csa/useCsaRoundSelection.ts'));let value;
 let route=['r','vi'];
 function render(){value=h.render(()=>useCsaRoundSelection(...route,checkpoint));h.flush();return value}
 async function settle(){for(let i=0;i<4;i++){render();await tick()}return value}
 return {h,calls,events,settle,render,services,auth,context,load,get value(){return value},latest(value){latest=value},route(roundId,locale){route=[roundId,locale]}};
}
test('returning to tab revalidates availability while retaining an editable unsaved draft',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();assert.equal(value.dirty,false);value.changeQuantity('p',2);value=await harness.settle();assert.equal(value.dirty,true);harness.events.focus();value=await harness.settle();assert.equal(value.draft.p,2);assert.equal(value.needsReload,false);assert.equal(harness.calls.get,2);await value.submit(false);await harness.settle();assert.equal(harness.calls.save[0].lines[0].quantity,2)}finally{harness.h.dispose()}
});
test('actual server revision change preserves draft but blocks silent overwrite',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();value.changeQuantity('p',2);await harness.settle();harness.latest({...bundle,selection:{...selection,revision:9}});harness.events.focus();value=await harness.settle();assert.equal(value.draft.p,2);assert.equal(value.needsReview,true);await value.submit(false);assert.equal(harness.calls.save.length,0)}finally{harness.h.dispose()}
});
test('server clock includes time a round spent inside a collapsed list',()=>{
 const h=hooks(),load=loader({react:h.react},{performance:{now:()=>2000000}}),clock=load(resolve(root,'src/screens/account-csa/useCsaServerClock.ts'));
 const now=h.render(()=>clock.useCsaServerClock('2026-11-20T08:00:00Z',800000));
 assert.ok(now>=Date.parse('2026-11-20T08:20:00Z'));h.dispose();
});
test('editing and saving do not register a native leave confirmation',async()=>{
 const harness=selectionHarness();try{let value=await harness.settle();assert.equal(harness.events.beforeunload,undefined);value.changeQuantity('p',2);value=await harness.settle();assert.equal(harness.events.beforeunload,undefined);await value.submit(false);await harness.settle();assert.equal(harness.events.beforeunload,undefined)}finally{harness.h.dispose()}
});

const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];
test('unavailable unsaved products remain visible and removable after catalog refresh',async()=>{
 const h=selectionHarness();try{
  const beans={...bundle.products[0],id:'b',name:'Beans'};
  h.latest({...bundle,products:[...bundle.products,beans]});let v=await h.settle();v.changeQuantity('p',2);v.changeQuantity('b',1);await h.settle();
  h.latest(bundle);h.events.focus();v=await h.settle();
  const load=loader({'@/components/UI':{Button:'button'},'./csa-rounds.module.css':{default:{}}});
  const {CsaRoundSelectionSummary:Summary}=load(resolve(root,'src/screens/account-csa/CsaRoundSelectionSummary.tsx'));
  const {selectionProducts,usedPoints}=h.load(resolve(root,'src/screens/account-csa/csa-rounds-presentation.ts'));
  const products=selectionProducts(v.current,v.draftProducts);
  const tree=Summary({snapshot:v.current,draft:v.draft,products,used:usedPoints(v.draft,products),locale:'en',disabled:false,onRemove:id=>v.changeQuantity(id,0)});
  const remove=nodes(tree).find(n=>n.props?.['aria-label']==='Remove product: Beans');
  assert.ok(remove,'unsaved unavailable product needs a removal control');remove.props.onClick();v=await h.settle();
  assert.equal(v.draft.b,0);assert.equal(v.draft.p,2);await v.submit(false);assert.equal(h.calls.save[0].lines.length,1);assert.equal(h.calls.save[0].lines[0].quantity,2);
 }finally{h.h.dispose()}
});
test('stale unauthorized save after unmount cannot expire a replacement session',async()=>{
 const h=selectionHarness();try{
  const v=await h.settle();v.changeQuantity('p',2);let reject,expired=0;h.auth.expire=()=>{expired++};
  h.services.saveRoundSelection=()=>new Promise((_,r)=>{reject=r});const pending=v.submit(false);
  h.h.dispose();h.auth.session={subject:'replacement-member'};
  const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));reject(new AccountApiError('session_expired',401));await pending;
  assert.equal(expired,0);
 }finally{h.h.dispose()}
});
test('successful save after unmount does not start snapshot or account refresh',async()=>{
 const h=selectionHarness();try{
  const v=await h.settle();v.changeQuantity('p',2);let resolveSave,refreshes=0;h.context.refreshResource=async()=>{refreshes++};
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
test('permission denial during refresh clears private selection and prevents history fallback',async()=>{
 const h=selectionHarness();try{
  await h.settle();const {AccountApiError}=h.load(resolve(root,'src/account/account-api.ts'));
  h.services.getRoundProducts=async()=>{throw new AccountApiError('permission_denied',403)};
  h.events.focus();const v=await h.settle();assert.equal(v.current,null);assert.equal(Object.keys(v.draft).length,0);assert.equal(v.access.mode,'readonly');assert.equal(v.error.code,'permission_denied');
 }finally{h.h.dispose()}
});
test('hidden round clocks stop their interval and resume on activation',()=>{
 const h=hooks();let started=0,stopped=0;
 const load=loader({react:h.react},{setInterval(){return ++started},clearInterval(){stopped++}});
 const {useCsaServerClock}=load(resolve(root,'src/screens/account-csa/useCsaServerClock.ts'));
 try{
  h.render(()=>useCsaServerClock(bundle.round.serverTime,performance.now(),true));h.flush();assert.equal(started,1);
  h.render(()=>useCsaServerClock(bundle.round.serverTime,performance.now(),false));h.flush();assert.equal(started,1);assert.equal(stopped,1);
  h.render(()=>useCsaServerClock(bundle.round.serverTime,performance.now(),true));h.flush();assert.equal(started,2);
 }finally{h.dispose()}
});

for(const jump of [-3600000,3600000])test(`CSA editing eligibility ignores device wall-clock jump ${jump}`,async()=>{
 const h=hooks();let wall=Date.parse(bundle.round.serverTime),elapsed=1000,timer;
 class DeviceDate extends Date {static now(){return wall}}
 const load=loader({react:h.react},{Date:DeviceDate,performance:{now:()=>elapsed},setInterval(fn){timer=fn;return 1},clearInterval(){}});
 const {useCsaServerClock}=load(resolve(root,'src/screens/account-csa/useCsaServerClock.ts'));
 const {selectionAccess}=load(resolve(root,'src/account/csa-rounds-model.ts'));
 const round={...bundle.round,closesAt:'2026-11-20T08:01:00Z'};
 try{
  h.render(()=>useCsaServerClock(round.serverTime));h.flush();await tick();
  wall+=jump;elapsed+=1000;timer();
  let now=h.render(()=>useCsaServerClock(round.serverTime));
  assert.equal(now,Date.parse('2026-11-20T08:00:01Z'));
  assert.equal(selectionAccess({round,selection,eligible:true,serverNow:now}).mode,'edit');
  elapsed+=60000;timer();now=h.render(()=>useCsaServerClock(round.serverTime));
  assert.equal(selectionAccess({round,selection,eligible:true,serverNow:now}).mode,'readonly');
 }finally{h.dispose()}
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((success, failure) => {resolve = success; reject = failure;});
  return {promise, resolve, reject};
}
function apiError(harness, code, status) {
  const {AccountApiError} = harness.load(resolve(root, 'src/account/account-api.ts'));
  return new AccountApiError(code, status);
}
const heldSelection = {...selection, lines: [{...line, quantity: 3}]};
const heldProduct = {...bundle.products[0], heldOnly: true, availableQuantity: 3};
const heldBundle = {...bundle, selection: heldSelection, products: [heldProduct]};
function selectionWithQty(qty, changes = {}) {
  return {...heldSelection, revision: 4, lines: qty ? [{...line, quantity: qty}] : [], ...changes};
}

test('held-only draft can undo a reduction until saving, then cannot exceed the saved amount', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    v.changeQuantity('p', 3);
    assert.equal((await h.settle()).draft.p, 3);
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      const saved = selectionWithQty(2);
      h.latest({...heldBundle, selection: saved, products: [{...heldProduct, availableQuantity: 2}]});
      return saved;
    };
    await v.submit();
    v = await h.settle();
    v.changeQuantity('p', 3);
    assert.equal((await h.settle()).draft.p, 2);
    assert.equal(h.calls.save[0].lines[0].quantity, 2);
  } finally {h.h.dispose();}
});

test('a released held-only product cannot be added from saved or retained metadata', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 0);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      const saved = selectionWithQty(0);
      h.latest({...heldBundle, selection: saved, products: []});
      return saved;
    };
    await v.submit();
    v = await h.settle();
    v.changeQuantity('p', 1);
    assert.equal((await h.settle()).draft.p, undefined);
    assert.equal(h.calls.save[0].lines.length, 0);
  } finally {h.h.dispose();}
});

test('an expired hold remains visible as history without granting editing rights', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    h.latest({
      ...heldBundle,
      round: {...heldBundle.round, status: 'closed'},
      selection: {...heldSelection, revision: 4, state: 'locked'},
      products: [],
    });
    await v.load();
    v = await h.settle();
    assert.equal(v.current.selection.lines[0].quantity, 3);
    assert.equal(v.access.mode, 'readonly');
    v.changeQuantity('p', 4);
    await v.submit();
    assert.equal((await h.settle()).draft.p, 3);
    assert.equal(h.calls.save.length, 0);
  } finally {h.h.dispose();}
});

test('failed refresh after save keeps the new revision and blocks further writes until GET succeeds', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  const get = h.services.getRoundProducts;
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      const saved = selectionWithQty(2);
      h.latest({...heldBundle, selection: saved, products: [{...heldProduct, availableQuantity: 2}]});
      h.services.getRoundProducts = async () => {throw apiError(h, 'network_error', 0);};
      return saved;
    };
    await v.submit();
    v = await h.settle();
    assert.equal(v.current.selection.revision, 4);
    assert.equal(v.current.products[0].availableQuantity, 2);
    assert.equal(v.needsReload, true);
    await v.submit();
    assert.equal(h.calls.save.length, 1);
    h.services.getRoundProducts = get;
    await v.load();
    v = await h.settle();
    assert.equal(v.needsReload, false);
    assert.equal(v.draft.p, 2);
    assert.equal(h.calls.save.length, 1);
  } finally {h.h.dispose();}
});

test('a lost PUT response requires review of the newer revision even after a focus refresh', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      h.latest({...heldBundle, selection: selectionWithQty(2), products: [{...heldProduct, availableQuantity: 2}]});
      throw apiError(h, 'invalid_response', 502);
    };
    await v.submit();
    v = await h.settle();
    assert.equal(v.current.selection.revision, 4);
    assert.equal(v.draft.p, 2);
    assert.equal(v.needsReview, true);
    h.events.focus();
    v = await h.settle();
    assert.equal(v.needsReview, true);
    await v.submit();
    assert.equal(h.calls.save.length, 1);
    v.acceptReview();
    v = await h.settle();
    assert.equal(v.needsReview, false);
    await v.submit();
    assert.equal(h.calls.save.length, 1);
  } finally {h.h.dispose();}
});

test('a rejected PUT keeps the editable draft without verifying or reporting success', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    const v = await h.settle();
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      throw apiError(h, 'validation_error', 400);
    };
    await v.submit();
    const latest = await h.settle();
    assert.equal(latest.error.code, 'validation_error');
    assert.equal(latest.notice, null);
    assert.equal(latest.draft.p, 2);
    assert.equal(latest.needsReload, false);
    assert.equal(h.calls.get, 1);
    assert.equal(h.calls.save.length, 1);
  } finally {h.h.dispose();}
});

test('a stale PUT needs explicit review before a new save can use the verified revision', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      if (input.expectedRevision === 3) {
        h.latest({...heldBundle, selection: {...heldSelection, revision: 4}});
        throw apiError(h, 'csa_selection_stale', 409);
      }
      const saved = selectionWithQty(2, {revision: 5});
      h.latest({...heldBundle, selection: saved, products: [{...heldProduct, availableQuantity: 2}]});
      return saved;
    };
    await v.submit();
    v = await h.settle();
    assert.equal(v.draft.p, 2);
    assert.equal(v.needsReview, true);
    await v.submit();
    assert.equal(h.calls.save.length, 1);
    v.acceptReview();
    v = await h.settle();
    await v.submit();
    assert.deepEqual(h.calls.save.map(call => call.expectedRevision), [3, 4]);
    assert.equal((await h.settle()).current.selection.revision, 5);
  } finally {h.h.dispose();}
});

const reselecting = {...heldSelection, state: 'reselecting', reopenUntil: bundle.round.closesAt};
test('save then declined confirmation preserves the saved revision through a failed refresh', async () => {
  const h = selectionHarness(); h.latest({...heldBundle, selection: reselecting});
  const get = h.services.getRoundProducts;
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    const saved = selectionWithQty(2, {state: 'reselecting', reopenUntil: reselecting.reopenUntil});
    h.services.saveRoundSelection = async input => {h.calls.save.push(input); return saved;};
    h.services.confirmRoundSelection = async input => {
      h.calls.confirm.push(input);
      h.latest({...heldBundle, selection: saved, products: [{...heldProduct, availableQuantity: 2}]});
      h.services.getRoundProducts = async () => {throw apiError(h, 'network_error', 0);};
      throw apiError(h, 'store_shipping_address_required', 400);
    };
    await v.submit(true);
    v = await h.settle();
    assert.equal(v.notice, 'confirmFailed');
    assert.equal(v.current.selection.revision, 4);
    assert.equal(v.current.products[0].availableQuantity, 2);
    assert.equal(v.needsReload, true);
    await v.submit(true);
    h.services.getRoundProducts = get;
    await v.load();
    v = await h.settle();
    assert.equal(v.needsReload, false);
    assert.equal(v.draft.p, 2);
    assert.equal(h.calls.save.length, 1);
    assert.equal(h.calls.confirm.length, 1);
  } finally {h.h.dispose();}
});

test('a lost POST response reads the confirmed order without replaying PUT or POST', async () => {
  const h = selectionHarness(); h.latest({...heldBundle, selection: reselecting});
  try {
    const v = await h.settle();
    h.services.confirmRoundSelection = async input => {
      h.calls.confirm.push(input);
      h.latest({...heldBundle, selection: {...reselecting, revision: 4, state: 'confirmed', orderId: 'order'}, products: []});
      throw apiError(h, 'upstream_timeout', 504);
    };
    await v.submit(true);
    const latest = await h.settle();
    assert.equal(latest.current.selection.state, 'confirmed');
    assert.equal(latest.current.selection.orderId, 'order');
    assert.equal(latest.access.mode, 'readonly');
    assert.equal(h.calls.get, 2);
    assert.equal(h.calls.save.length, 0);
    assert.equal(h.calls.confirm.length, 1);
  } finally {h.h.dispose();}
});

test('an earlier account cannot start confirmation after its pending PUT resolves', async () => {
  const h = selectionHarness(); h.latest({...heldBundle, selection: reselecting});
  try {
    const v = await h.settle();
    v.changeQuantity('p', 2);
    const put = deferred();
    h.services.saveRoundSelection = () => put.promise;
    const pending = v.submit(true);
    h.auth.session = {subject: 'other-member'};
    h.latest({...bundle, selection: null});
    await h.settle();
    put.resolve(selectionWithQty(2));
    await pending;
    const latest = await h.settle();
    assert.equal(h.calls.confirm.length, 0);
    assert.equal(latest.current.selection, null);
  } finally {h.h.dispose();}
});

test('an earlier route and locale read cannot replace a newer snapshot', async () => {
  const h = selectionHarness();
  try {
    const read = deferred();
    h.services.getRoundProducts = async (id, locale) => id === 'r' ? read.promise : {
      ...bundle, round: {...bundle.round, id, name: locale}, selection: null,
    };
    await h.settle();
    h.route('new-round', 'en');
    await h.settle();
    read.resolve(bundle);
    const latest = await h.settle();
    assert.equal(latest.current.round.id, 'new-round');
    assert.equal(latest.current.round.name, 'en');
    assert.equal(latest.current.selection, null);
  } finally {h.h.dispose();}
});

test('an old account catalog denial cannot start a history request in the new account', async () => {
  const h = selectionHarness();
  try {
    const first = deferred();
    let reads = 0, history = 0;
    h.services.getRoundProducts = async () => ++reads === 1 ? first.promise : {...bundle, selection: null};
    h.services.getRoundSelection = async () => {history++; return selection;};
    await h.settle();
    h.auth.session = {subject: 'new-member'};
    await h.settle();
    first.reject(apiError(h, 'csa_membership_unavailable', 409));
    const latest = await h.settle();
    assert.equal(history, 0);
    assert.equal(latest.current.selection, null);
    assert.equal(latest.error, null);
  } finally {h.h.dispose();}
});

test('consecutive edits share decimal quota and enforce the distinct-line cap before rerender', async () => {
  const h = selectionHarness();
  try {
    const products = Array.from({length: 101}, (_, id) => ({
      ...bundle.products[0], id: String(id), availableQuantity: 10, quotaCost: .25,
    }));
    h.latest({...bundle, selection: null, products, quota: [{groupId: 'g', availableUnits: 25.25}]});
    let v = await h.settle();
    for (const product of products) v.changeQuantity(product.id, 1);
    v = await h.settle();
    assert.equal(Object.values(v.draft).filter(Boolean).length, 100);
    assert.equal(v.draft['100'], undefined);
    v.changeQuantity('0', 0);
    v.changeQuantity('1', 3);
    v.changeQuantity('100', 1);
    v = await h.settle();
    assert.equal(v.draft['1'], 3);
    assert.equal(v.draft['100'], undefined);
    v.changeQuantity('1', 1);
    v.changeQuantity('100', 1);
    assert.equal((await h.settle()).draft['100'], 1);
  } finally {h.h.dispose();}
});

test('a lost PUT keeps the draft during verification and focus cannot start a competing GET', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  const get = h.services.getRoundProducts;
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    const save = deferred();
    h.services.saveRoundSelection = input => {h.calls.save.push(input); return save.promise;};
    const pending = v.submit();
    h.events.focus();
    h.events.visibilitychange();
    assert.equal(h.calls.get, 1);
    h.services.getRoundProducts = async () => {throw apiError(h, 'network_error', 0);};
    save.reject(apiError(h, 'network_error', 0));
    await pending;
    v = await h.settle();
    assert.equal(v.notice, 'saveUncertain');
    assert.equal(v.needsReload, true);
    assert.equal(v.draft.p, 2);
    await v.submit();
    h.services.getRoundProducts = get;
    await v.load();
    v = await h.settle();
    assert.equal(v.needsReload, false);
    assert.equal(v.current.selection.revision, 3);
    assert.equal(v.draft.p, 2);
    assert.equal(h.calls.save.length, 1);
  } finally {h.h.dispose();}
});

test('a product stopped during editing allows corrections above the saved hold without allowing a write', async () => {
  const h = selectionHarness();
  const active = {...heldBundle, products: bundle.products, quota: [{groupId: 'g', availableUnits: 10}]};
  h.latest(active);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 5);
    h.latest({...active, products: [heldProduct]});
    await v.load();
    v = await h.settle();
    assert.equal(v.draft.p, 5);
    v.changeQuantity('p', 4);
    await v.submit();
    assert.equal(h.calls.save.length, 0);
    assert.equal((await h.settle()).draft.p, 4);
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      const saved = selectionWithQty(2);
      h.latest({...active, selection: saved, products: [{...heldProduct, availableQuantity: 2}]});
      return saved;
    };
    await v.submit();
    assert.equal(h.calls.save[0].lines[0].quantity, 2);
  } finally {h.h.dispose();}
});

test('CSA stock conflict and later availability changes retain the Product and require a valid draft', async () => {
  const h = selectionHarness();
  const product = bundle.products[0];
  const save = h.services.saveRoundSelection;
  try {
    let view = await h.settle();
    view.changeQuantity(product.id, 4);
    h.services.saveRoundSelection = async input => {
      h.calls.save.push(input);
      h.latest({...bundle, products: [{...product, availableQuantity: 2}]});
      throw apiError(h, 'csa_stock_insufficient', 409);
    };
    await view.submit();
    view = await h.settle();
    assert.equal(view.error.code, 'csa_stock_insufficient');
    assert.equal(view.current.selection.revision, selection.revision);
    assert.equal(view.current.products[0].id, product.id);
    assert.equal(view.current.products[0].availableQuantity, 2);
    assert.equal(view.draft[product.id], 4);
    assert.equal(h.calls.get, 2);
    await view.submit();
    assert.equal(h.calls.save.length, 1);

    h.latest({...bundle, products: [{...product, availableQuantity: 3}]});
    h.events.focus();
    view = await h.settle();
    assert.equal(h.calls.get, 3);
    assert.equal(view.current.products[0].availableQuantity, 3);
    assert.equal(view.draft[product.id], 4);
    await view.submit();
    assert.equal(h.calls.save.length, 1);

    view.changeQuantity(product.id, 3);
    h.services.saveRoundSelection = save;
    await view.submit();
    view = await h.settle();
    assert.equal(h.calls.save.length, 2);
    assert.equal(h.calls.save[1].expectedRevision, selection.revision);
    assert.equal(h.calls.save[1].lines[0].productId, product.id);
    assert.equal(h.calls.save[1].lines[0].quantity, 3);
    assert.equal(view.current.selection.revision, selection.revision + 1);
  } finally {h.h.dispose();}
});

test('a forbidden mutation immediately clears private round data without history requests', async () => {
  const h = selectionHarness(); h.latest(heldBundle);
  try {
    let v = await h.settle();
    v.changeQuantity('p', 2);
    h.services.saveRoundSelection = async () => {throw apiError(h, 'permission_denied', 403);};
    await v.submit();
    v = await h.settle();
    assert.equal(v.current, null);
    assert.equal(Object.keys(v.draft).length, 0);
    assert.equal(v.access.mode, 'readonly');
    assert.equal(v.error.status, 403);
    assert.equal(h.calls.get, 1);
  } finally {h.h.dispose();}
});


test('same-account AuthGate remount restores only unsent CSA edits after fresh stock and revision checks',async()=>{
 const checkpoint={current:null},first=selectionHarness(checkpoint);
 try{
  let value=await first.settle();
  value.changeQuantity('p',3);
  await first.settle();
 }finally{first.h.dispose()}

 const next=selectionHarness(checkpoint);
 try{
  next.latest({...bundle,selection:{...selection,revision:4},products:[{...bundle.products[0],availableQuantity:1}]});
  let value=await next.settle();
  assert.equal(next.calls.get,1);
  assert.equal(value.draft.p,3);
  assert.equal(value.needsReview,true);
  await value.submit(false);
  assert.equal(next.calls.save.length,0);
  value.acceptReview();
  value=await next.settle();
  await value.submit(false);
  assert.equal(next.calls.save.length,0,'current stock still caps the restored draft');
  value.changeQuantity('p',1);
  value=await next.settle();
  assert.equal(value.dirty,false);
 }finally{next.h.dispose()}
});

test('AuthGate remount does not restore an in-flight CSA intent or a draft belonging to another account',async()=>{
 const checkpoint={current:null},first=selectionHarness(checkpoint);
 let pending,attempt;
 try{
  const value=await first.settle();
  value.changeQuantity('p',3);
  pending=deferred();
  first.services.saveRoundSelection=input=>{first.calls.save.push(input);return pending.promise};
  attempt=value.submit(false);
  assert.equal(first.calls.save.length,1);
 }finally{first.h.dispose()}
 try{
  const replacement=selectionHarness(checkpoint);
  try{
   let value=await replacement.settle();
   assert.equal(value.draft.p,1);
   value.changeQuantity('p',4);
   await replacement.settle();
  }finally{replacement.h.dispose()}
  const other=selectionHarness(checkpoint);
  try{
   other.auth.session={subject:'other-member'};
   const value=await other.settle();
   assert.equal(value.draft.p,1);
   assert.equal(other.calls.save.length,0);
  }finally{other.h.dispose()}
 }finally{
  pending.resolve({...selection,revision:4});
  await attempt;
 }
});
