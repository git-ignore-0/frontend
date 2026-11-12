import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript'),view={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/account/orders-view-state.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:view});
function storage(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}}
test('order view preferences are scoped to the authenticated owner and contain no order snapshots',()=>{
 const s=storage();view.saveOrdersView('A',{status:'delivered',page:3},s);
 assert.deepEqual(JSON.parse(JSON.stringify(view.readOrdersView('A',s))),{status:'delivered',page:3});assert.equal(view.readOrdersView('B',s),null);
 assert.deepEqual(JSON.parse([...s.values.values()][0]),{status:'delivered',page:3});
});
test('invalid saved filters and pages are ignored',()=>{
 const s=storage();view.saveOrdersView('A',{page:1},s);const key=[...s.values.keys()][0];
 for(const value of ['bad','null','{"page":0}','{"page":1.5}','{"page":2,"status":"admin"}']){s.setItem(key,value);assert.equal(view.readOrdersView('A',s),null)}
});
test('disabled browser storage does not prevent opening or using orders',()=>{
 const s={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.equal(view.readOrdersView('A',s),null);assert.doesNotThrow(()=>view.saveOrdersView('A',{page:1},s));
});
