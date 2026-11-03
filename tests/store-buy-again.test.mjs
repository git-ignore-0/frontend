import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript');
function load(path,require=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require});return exports;}
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('buy again source is owner scoped and only clears its matching session',()=>{
 const s=storage(),api=load('src/store/buy-again-session.ts');
 api.saveBuyAgain(s,{owner:'a',orderId:'order-a',sessionId:'session-a'});
 assert.equal(api.readBuyAgain(s,'b'),null);
 assert.equal(api.readBuyAgain(s,'a').orderId,'order-a');
 api.clearBuyAgain(s,'a','different');assert.ok(api.readBuyAgain(s,'a'));
 api.clearBuyAgain(s,'a','session-a');assert.equal(api.readBuyAgain(s,'a'),null);
});
test('prepare endpoint BFF is self scoped with locale only',()=>{
 const api=load('src/store/order-bff.ts'),id='11111111-1111-4111-8111-111111111111';
 assert.equal(api.storeOrderTarget(['user-orders',id,'buy-again'],'GET')?.session,'required');
 assert.equal(api.storeOrderTarget(['user-orders',id,'buy-again'],'POST'),null);
});
test('logout and switching accounts discard the previous prepared source',()=>{
 const s=storage(),api=load('src/store/buy-again-session.ts');
 api.saveBuyAgain(s,{owner:'a',orderId:'order-a',sessionId:'session-a'});
 api.retainBuyAgainOwner(s,'a');assert.ok(api.readBuyAgain(s,'a'));
 api.retainBuyAgainOwner(s,'b');assert.equal(api.readBuyAgain(s,'a'),null);
 api.saveBuyAgain(s,{owner:'a',orderId:'order-a',sessionId:'session-a'});
 api.retainBuyAgainOwner(s,null);assert.equal(api.readBuyAgain(s,'a'),null);
});
