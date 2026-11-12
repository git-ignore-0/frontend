import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
test('checkout explains frozen membership in each locale',()=>{
 const exports={};const source=readFileSync(new URL('../src/screens/Checkout.tsx',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source+'\nexports.message=storeMembershipFrozenMessage;',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:()=>({})});
 assert.match(exports.message('vi'),/đóng băng/);assert.match(exports.message('en'),/frozen/);
 assert.match(source,/reason.code==="store_membership_frozen"\?storeMembershipFrozenMessage\(ui.locale\)/);
});
