import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function hooks(){let index=0;const states=[],deps=[],cleanups=[];let effects=[];return {react:{useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useRef(initial){const i=index++;if(!(i in states))states[i]={current:initial};return states[i]},useId(){index++;return 'round-list'},useCallback(fn,next){const i=index++;if(!deps[i]||next.some((v,n)=>v!==deps[i][n])){deps[i]=next;states[i]=fn}return states[i]},useEffect(fn,next){const i=index++;if(!deps[i]||next.some((v,n)=>v!==deps[i][n])){deps[i]=next;effects.push({i,fn})}}},render(fn){index=0;return fn()},flush(){const pending=effects;effects=[];for(const {i,fn} of pending){cleanups[i]?.();cleanups[i]=fn()}},dispose(){cleanups.forEach(fn=>fn?.())}}}
function moduleAt(file,imports,events={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,Date,queueMicrotask,window:{addEventListener:(name,fn)=>events[name]=fn,removeEventListener:name=>delete events[name],matchMedia:()=>({matches:false})},document:{visibilityState:'visible'},require:name=>{if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.css'))return {default:{}};if(name in imports)return imports[name];throw Error('Unexpected import '+name)}});return exports}
const treeNodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children,tree.props?.actions].flat(Infinity).flatMap(treeNodes)];
const copy={title:'Rounds',rounds:'rounds',show:'Expand',hide:'Collapse',loading:'Loading',previous:'Previous',next:'Next',retry:'Retry'};
const round={id:'r',name:'Round',serverTime:'2026-11-20T08:00:00Z'};
function listHarness(total,hasMembership=true,selectionRequest=async()=>null,listRequest=null){const h=hooks(),calls={list:0,selection:0},owner='member',events={},ui={locale:'vi',page:'account',accountTab:'csa',accountHubOpen:false};
 const imports={react:h.react,'@/components/UI':{Button:'Button',DataState:'DataState',Icon:'Icon',Section:'Section'},'@/state/NFVContext':{useNFV:()=>({ui,data:{csa:{active:hasMembership?{status:'active'}:null}},accountSessionKey:owner})},'@/auth/AuthProvider':{useAuth:()=>({status:'authenticated',session:{subject:owner}})},'@/account/csa-rounds-service':{async getRoundsPage(){calls.list++;if(listRequest)return listRequest();return {items:total?[round,...(total>1?[{...round,id:'s'}]:[])]:[],total,pageSize:20}},async getRoundSelection(id){calls.selection++;return selectionRequest(id)}},'@/data/csa-rounds-copy':{csaRoundsCopy:()=>copy,csaRoundError:()=> 'Failed'},'./csa-rounds-presentation':{roundsExpanded:(n,open)=>n===1||n>1&&open},'./CsaRoundItem':{CsaRoundItem:'RoundItem'}};
 const {AccountCsaRounds}=moduleAt('src/screens/account-csa/AccountCsaRounds.tsx',imports,events);let tree;async function settle(){for(let i=0;i<5;i++){tree=h.render(AccountCsaRounds);h.flush();await new Promise(r=>setImmediate(r))}return tree};return {h,calls,settle,events,ui};}
test('one round renders directly and fetches only its selection',async()=>{const v=listHarness(1);try{const tree=await v.settle();assert.equal(treeNodes(tree).filter(n=>n.type==='RoundItem').length,1);assert.equal(v.calls.selection,1);assert.equal(treeNodes(tree).filter(n=>n.type==='Button'&&n.props['aria-expanded']!==undefined).length,0)}finally{v.h.dispose()}});
test('multiple rounds start collapsed, then expand without fetching catalog',async()=>{const v=listHarness(2);try{let tree=await v.settle();assert.equal(v.calls.selection,0);assert.equal(treeNodes(tree).filter(n=>n.type==='RoundItem').length,0);const expand=treeNodes(tree).find(n=>n.type==='button'&&n.props['aria-controls']);assert.equal(expand.props['aria-expanded'],false);assert.ok(JSON.stringify(expand).includes('Rounds'));assert.equal(treeNodes(tree).filter(n=>n.type==='Button').length,0);expand.props.onClick();tree=await v.settle();assert.equal(v.calls.selection,2);assert.equal(treeNodes(tree).filter(n=>n.type==='RoundItem').length,2);assert.equal(treeNodes(tree).find(n=>n.type==='button'&&n.props['aria-controls']).props['aria-expanded'],true)}finally{v.h.dispose()}});
test('no membership and no rounds does not add an empty section',async()=>{const v=listHarness(0,false);try{const tree=await v.settle();assert.equal(tree,null);assert.equal(v.calls.selection,0)}finally{v.h.dispose()}});

test('reopening an already loaded list retains selections without duplicate GETs',async()=>{
 const v=listHarness(2);try{let tree=await v.settle();const toggle=()=>treeNodes(tree).find(n=>n.type==='button'&&n.props['aria-controls']).props.onClick();
 toggle();tree=await v.settle();toggle();tree=await v.settle();toggle();await v.settle();assert.equal(v.calls.selection,2);
 }finally{v.h.dispose()}
});
test('older same-round responses cannot overwrite a newer retry response',async()=>{
 const pending=[],v=listHarness(1,true,()=>new Promise(resolve=>pending.push(resolve)));try{
 let tree=await v.settle();treeNodes(tree).find(n=>n.type==='RoundItem').props.onRetry();await v.settle();
 pending[1]({revision:2,state:'locked',lines:[]});tree=await v.settle();assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.selection.revision,2);
 pending[0]({revision:1,state:'selecting',lines:[]});tree=await v.settle();assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.selection.revision,2);
 }finally{v.h.dispose()}
});
test('refresh failure retains the last successful selection snapshot',async()=>{
 let reject;const saved={revision:2,state:'locked',lines:[]};let requests=0;
 const v=listHarness(1,true,()=>++requests===1?Promise.resolve(saved):new Promise((_,r)=>{reject=r}));try{
 let tree=await v.settle();treeNodes(tree).find(n=>n.type==='RoundItem').props.onRetry();tree=await v.settle();
 assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.selection?.state,'locked');reject(Error('network'));tree=await v.settle();
 assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.selection?.state,'locked');assert.ok(treeNodes(tree).find(n=>n.type==='RoundItem').props.error);
 }finally{v.h.dispose()}
});
test('unknown selections never display an unselected status or editing links',()=>{
 const h=hooks(),imports={react:h.react,'@/components/UI':{Status:'Status',ActionLink:'Link',Button:'Button'},'@/data/csa-rounds-copy':{csaRoundsCopy:()=>({...copy,states:{unselected:'Not selected',closed:'Locked',unknown:'Unknown'}}),csaRoundError:()=> 'Failed'},'@/lib/date-format':{formatDateTime:v=>v},'@/lib/csa-navigation':{csaRoundHref:()=>'/round'},'@/account/csa-rounds-model':{selectionAccess:()=>({mode:'select'})},'./useCsaServerClock':{useCsaServerClock:()=>Date.parse(round.serverTime)}};
 const {CsaRoundItem}=moduleAt('src/screens/account-csa/CsaRoundItem.tsx',imports);
 for(const state of [{loading:true},{loading:false,error:Error('network')}]){
 const tree=h.render(()=>CsaRoundItem({round:{...round,opensAt:'2026-11-19T00:00:00Z',closesAt:'2026-11-21T00:00:00Z'},selection:undefined,eligible:true,locale:'en',onRetry(){},...state}));
 assert.notEqual(treeNodes(tree).find(n=>n.type==='Status')?.props.label,'Not selected');assert.equal(treeNodes(tree).filter(n=>n.type==='Link'||n.type==='a').length,0);
 }h.dispose();
});

test('round items keep dates and action while omitting repeated closing dates and instructions',()=>{
 const h=hooks(),imports={react:h.react,'@/components/UI':{Status:'Status',ActionLink:'Link',Button:'Button'},'@/data/csa-rounds-copy':{csaRoundsCopy:()=>({...copy,delivery:'Delivery',window:'Choose',closes:'Close separately',autoClose:'Long automatic instructions',none:'No selection paragraph',select:'Choose produce',states:{unselected:'Not selected'}}),csaRoundError:()=> 'Failed'},'@/lib/date-format':{formatDateTime:v=>v},'@/lib/csa-navigation':{csaRoundHref:()=>'/round'},'@/account/csa-rounds-model':{selectionAccess:()=>({mode:'select'})},'./useCsaServerClock':{useCsaServerClock:()=>Date.parse(round.serverTime)}};
 const {CsaRoundItem}=moduleAt('src/screens/account-csa/CsaRoundItem.tsx',imports);
 const tree=h.render(()=>CsaRoundItem({round:{...round,opensAt:'2026-11-19T00:00:00Z',closesAt:'2026-11-21T00:00:00Z',deliveryAt:'2026-11-22T00:00:00Z'},selection:null,eligible:true,loading:false,locale:'en',onRetry(){}}));
 const text=JSON.stringify(tree);assert.equal(text.includes('Close separately'),false);assert.equal(text.includes('Long automatic instructions'),false);assert.equal(text.includes('No selection paragraph'),false);
 assert.equal(treeNodes(tree).filter(n=>n.type==='Link'||n.type==='a').length,1);h.dispose();
});

test('a hidden CSA pane does not refresh when the browser regains focus',async()=>{
 const v=listHarness(1);try{
  await v.settle();v.ui.accountTab='profile';await v.settle();const before={...v.calls};v.events.focus?.();await v.settle();assert.deepEqual(v.calls,before);
  v.ui.accountTab='csa';await v.settle();assert.ok(v.calls.list>before.list);
 }finally{v.h.dispose()}
});

test('focus refresh keeps the round and its saved selection visible while requests are pending',async()=>{
 let listCalls=0,selectionCalls=0,resolveList,resolveSelection;
 const initial={items:[round],total:1,pageSize:20};
 const saved={revision:1,state:'locked',lines:[{productId:'p',quantity:1}]};
 const v=listHarness(1,true,()=>++selectionCalls===1?Promise.resolve(saved):new Promise(r=>resolveSelection=r),()=>++listCalls===1?Promise.resolve(initial):new Promise(r=>resolveList=r));
 try{
  await v.settle();v.events.focus();let tree=await v.settle();
  let item=treeNodes(tree).find(n=>n.type==='RoundItem');assert.ok(item,'round stays visible during list refresh');assert.equal(item.props.selection?.revision,1);assert.equal(item.props.loading,false);
  resolveList(initial);tree=await v.settle();item=treeNodes(tree).find(n=>n.type==='RoundItem');assert.equal(item.props.selection?.revision,1);assert.equal(item.props.loading,false,'saved preview is not replaced with a loading paragraph');
  resolveSelection({...saved,revision:2});tree=await v.settle();assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.selection?.revision,2);
 }finally{v.h.dispose()}
});
test('a failed background list refresh retains the current round snapshot',async()=>{
 let calls=0;const v=listHarness(1,true,async()=>null,async()=>{if(++calls>1)throw Error('offline');return {items:[round],total:1,pageSize:20}});
 try{await v.settle();v.events.focus();const tree=await v.settle();assert.equal(treeNodes(tree).filter(n=>n.type==='RoundItem').length,1);assert.ok(treeNodes(tree).some(n=>n.props?.role==='alert'));}finally{v.h.dispose()}
});

test('failed background list refresh still accepts its pending selection response',async()=>{
 let resolveInitial,lists=0;
 const saved={revision:1,state:'locked',lines:[{productId:'p',quantity:1}]};
 const v=listHarness(1,true,()=>new Promise(r=>resolveInitial=r),async()=>{if(++lists===2)throw Error('offline');return {items:[round],total:1,pageSize:20}});
 try{
  let tree=await v.settle();assert.equal(v.calls.selection,1);assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.loading,true);
  v.events.focus();tree=await v.settle();assert.ok(treeNodes(tree).some(n=>n.props?.role==='alert'));
  resolveInitial(saved);tree=await v.settle();const item=treeNodes(tree).find(n=>n.type==='RoundItem');
  assert.equal(item.props.loading,false);assert.equal(item.props.selection.revision,1);assert.equal(v.calls.selection,1);
 }finally{v.h.dispose()}
});
test('shrinking totals return to an accessible rounds page',async()=>{
 let calls=0;const v=listHarness(21,true,async()=>null,async()=>++calls<3?{items:[round],total:21,pageSize:20}:calls===3?{items:[],total:20,pageSize:20}:{items:[round],total:20,pageSize:20});
 try{
  let tree=await v.settle();treeNodes(tree).find(n=>n.type==='button'&&n.props['aria-controls']).props.onClick();tree=await v.settle();
  treeNodes(tree).find(n=>n.type==='Button'&&n.props.children==='Next').props.onClick();tree=await v.settle();assert.equal(v.calls.list,2);
  v.events.focus();tree=await v.settle();assert.equal(v.calls.list,4);
  assert.equal(treeNodes(tree).filter(n=>n.type==='RoundItem').length,1);
  assert.equal(treeNodes(tree).filter(n=>n.type==='nav').length,0);
  assert.equal(treeNodes(tree).filter(n=>n.type==='DataState').length,0);
 }finally{v.h.dispose()}
});

test('returning to CSA refetches selection when list revalidation fails',async()=>{
 const responses=[];let listCalls=0;
 const v=listHarness(1,true,()=>new Promise(resolve=>responses.push(resolve)),async()=>{if(++listCalls>1)throw Error('offline');return {items:[round],total:1,pageSize:20}});
 try{
  let tree=await v.settle();assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.loading,true);
  v.ui.accountTab='profile';await v.settle();
  v.ui.accountTab='csa';tree=await v.settle();assert.equal(v.calls.selection,2);
  responses[0]({revision:1,state:'selecting',lines:[{productId:'p',quantity:1}]});tree=await v.settle();
  assert.equal(treeNodes(tree).find(n=>n.type==='RoundItem').props.loading,true,'hidden-generation response stays ignored');
  responses[1]({revision:2,state:'selecting',lines:[{productId:'p',quantity:2}]});tree=await v.settle();
  const item=treeNodes(tree).find(n=>n.type==='RoundItem');assert.equal(item.props.loading,false);assert.equal(item.props.selection?.revision,2);
  assert.ok(treeNodes(tree).some(n=>n.props?.role==='alert'));
 }finally{v.h.dispose()}
});
