import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=new URL('../',import.meta.url);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const all=tree=>Array.isArray(tree)?tree.flatMap(all):!tree||typeof tree!=='object'?[]:[tree,...all(tree.props?.children)];
const text=tree=>all(tree).flatMap(node=>[node.props?.children].flat(Infinity)).filter(value=>typeof value==='string').join(' ');
const usage=(id,status='applied')=>({id:String(id),productName:'Rau',date:'2026-11-01',quantity:2,unit:'điểm',status});
function historyHarness({items=Array.from({length:10},(_,i)=>usage(i)),nextCursor=null,total=items.length,onPage=async()=>({items:[],nextCursor:null,total})}={}){
 let cursor=0;const states=[],calls=[];
 const context={data:{csa:{active:{id:'membership-1',planName:'CSA',status:'active',quotas:[],usage:items,pagination:{usage:{nextCursor,total}}}}},ui:{locale:'vi',accountFetchState:{csa:'ready'},busyKeys:[],visible:{}},patch:value=>Object.assign(context.ui,value),setUI:fn=>{context.ui=fn(context.ui)},setData:fn=>{context.data=fn(context.data)},act:async(_key,task)=>{try{return await task()}catch{return undefined}},call:async(method,args)=>{calls.push({method,args});return onPage()}};
 const jsx=(type,props)=>typeof type==='function'?type(props):({type,props});
 const cache=new Map();
 function load(path){
  if(cache.has(path))return cache.get(path);
  const exports={};cache.set(path,exports);
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{
   if(name==='react')return {useEffect(){cursor++},useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value]},useRef(initial){const i=cursor++;return states[i]??={current:initial}}};
   if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
   if(name==='@/state/NFVContext')return {useNFV:()=>context};
   if(name==='@/components/account/PagedList')return load('src/components/account/PagedList.tsx');
   if(name==='./ListPaginationFooter')return load('src/components/account/ListPaginationFooter.tsx');
   if(name==='@/components/UI')return {Button:'Button',DataState:'DataState',localized:(value,key)=>value[key]};
   if(name==='@/data/account-copy')return {copyText:(_locale,key)=>key};
   if(name==='@/lib/format')return {dateLabel:value=>value};
   if(name==='@/lib/csa-navigation')return {csaLandingHref:()=>'/csa/vi'};
   return {};
  }});return exports;
 }
 const component=load('src/screens/AccountBenefits.tsx');let tree;
 const render=()=>{cursor=0;return tree=component.BenefitsView({kind:'csa'})};
 const rows=()=>all(tree).filter(node=>node.props?.className==='benefit-transaction');
 const more=()=>all(tree).find(node=>node.type==='Button'&&/Xem thêm|Thử lại/.test(String(node.props.children)));
 return {context,calls,render,rows,more,async clickMore(){more().props.onClick();await tick();return render()}};
}

test('points history reveals already loaded rows without a remote cursor',async()=>{
 const h=historyHarness();h.render();assert.equal(h.rows().length,7);
 await h.clickMore();assert.equal(h.rows().length,10);assert.equal(h.more(),undefined);assert.equal(h.calls.length,0);
});

test('failed remote history page preserves rows and retry reveals the appended items',async()=>{
 let fail=true;
 const h=historyHarness({items:Array.from({length:7},(_,i)=>usage(i)),nextCursor:'2',total:9,onPage:async()=>{if(fail)throw Error('offline');return {items:[usage(7),usage(8)],nextCursor:null,total:9}}});
 h.render();await h.clickMore();assert.equal(h.rows().length,7);assert.equal(h.more().props.children,'Thử lại');
 fail=false;await h.clickMore();assert.equal(h.rows().length,9);assert.equal(h.more(),undefined);
 assert.equal(h.calls.length,2);assert.ok(h.calls.every(call=>call.args.cursor==='2'));
});

test('reversed point usage is labelled restored and no longer displayed as an active deduction',()=>{
 const h=historyHarness({items:[usage(1,'reversed'),usage(2)]});h.render();
 assert.match(text(h.rows()[0]),/Đã hoàn điểm/);assert.doesNotMatch(text(h.rows()[0]),/−2/);
 assert.match(text(h.rows()[1]),/−2 điểm/);
});


test('history footer counts group rows rather than the number of source transactions',async()=>{
 const h=historyHarness({items:Array.from({length:9},(_,i)=>usage(i)),total:3});h.render();
 assert.equal(h.more().props.children,'Xem thêm 2 mục');
 await h.clickMore();assert.equal(h.rows().length,9);assert.equal(h.more(),undefined);
});

test('unknown row totals reveal only cached rows first and then one visible page from the next response',async()=>{
 const h=historyHarness({items:Array.from({length:9},(_,i)=>usage(i)),total:null,nextCursor:'2',onPage:async()=>({items:Array.from({length:30},(_,i)=>usage(i+9)),total:null,nextCursor:null})});
 h.render();assert.equal(h.more().props.children,'Xem thêm 2 mục');
 await h.clickMore();assert.equal(h.rows().length,9);assert.equal(h.calls.length,0);
 assert.equal(h.more().props.children,'Xem thêm 7 mục');
 await h.clickMore();assert.equal(h.rows().length,16);assert.equal(h.calls.length,1);
});
