import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require:name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name)}});return exports}
const id='24803641-2dce-4cac-8fc4-91e55f03e95f';
test('round route validates locale/UUID and owns a private account screen',async()=>{
 const route=load('app/account/csa-rounds/[id]/[locale]/page.tsx',{'next/navigation':{notFound(){throw Error('404')}},'../../../../NFVApp':{NFVApp:'NFVApp'},'@/screens/account-csa/CsaRoundSelectionPage':{CsaRoundSelectionPage:'SelectionPage'},'react/jsx-runtime':{jsx:(type,props)=>({type,props})}});
 const page=await route.default({params:Promise.resolve({id,locale:'en'})});assert.equal(page.props.initialPage,'csa-round-selection');assert.equal(page.props.initialAccountTab,'csa');assert.equal(page.props.children.props.roundId,id);assert.equal(route.metadata.robots.index,false);
 await assert.rejects(()=>route.default({params:Promise.resolve({id:'invalid',locale:'vi'})}),/404/);
 await assert.rejects(()=>route.default({params:Promise.resolve({id,locale:'fr'})}),/404/);
});
test('round selection route belongs to Account navigation, not Store',()=>{
 const navigation=load('src/data/main-navigation.ts',{'@/config/site-brand':{SITE_ORIGIN:'https://example.com'}});
 assert.equal(navigation.activeMainNavId('csa-round-selection'),'account');assert.equal(navigation.localScreenFromPath(`/account/csa-rounds/${id}/vi`),'csa-round-selection');assert.equal(navigation.navigationHrefForPage('csa-round-selection','en','csa',id),`/account/csa-rounds/${id}/en`);
});
