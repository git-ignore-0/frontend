import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(import.meta.url)('typescript');
const read=p=>readFileSync(join(root,p),'utf8');
async function loadPureTs(path){
 const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,path);
 return import('data:text/javascript;charset=utf-8,'+encodeURIComponent(result.outputText));
}
test('Testimonials hides prior filter/page results even during error, loading, and stale success',async()=>{
 const {visibleTestimonials}=await loadPureTs('src/lib/testimonials-request.ts');
 const sample={data:[{id:'s1'}],meta:{total:1,page:1,page_size:12}};
 const state={key:'vi:customer:1',status:'success',data:sample};
 assert.equal(visibleTestimonials(state,'vi:customer:1'),sample);
 assert.equal(visibleTestimonials(state,'vi:farmer:1'),null);
 assert.equal(visibleTestimonials(state,'vi:customer:2'),null);
 assert.equal(visibleTestimonials(state,'en:customer:1'),null);
 assert.equal(visibleTestimonials({...state,status:'loading'},state.key),null);
 assert.equal(visibleTestimonials({...state,status:'error'},state.key),null);
});
test('Selected catalog parent includes products assigned to descendant categories',async()=>{
 const {getTree,productBelongsToCategory}=await loadPureTs('src/lib/catalog-categories.ts');
 const category={id:'root',name:'Produce',children:[{id:'leaf1',name:'Vegetables',children:[{id:'leaf2',name:'Leafy Greens',children:[]}]}]};
 const [parent]=getTree([category]);
 for(const [categoryId,cat] of [['root','Produce'],['leaf1','Vegetables'],['leaf2','Leafy Greens'],['leaf2','Other']]) {
  assert.equal(productBelongsToCategory({categoryId,cat},parent),true);
 }
 assert.equal(productBelongsToCategory({categoryId:'unrelated',cat:'Other'},parent),false);
 const [flatRoot]=getTree([{id:'R',name:'Root'},{id:'C',name:'Child',parentId:'R'}]);
 assert.equal(productBelongsToCategory({categoryId:'C',cat:'Child'},flatRoot),true);
});
test('Overlay and category/gift dialogs have a single scroll-lock owner',()=>{
 const context=read('src/state/NFVContext.tsx');
 const hook=read('src/components/overlays/useOverlayDialog.ts');
 assert.doesNotMatch(context,/classList\.toggle\("noscroll"/);
 assert.match(hook,/activePanels\.push/);
 assert.match(read('src/screens/Store.tsx'),/useOverlayDialog\(\{panelRef,onClose\}\)/);
 assert.match(read('src/screens/AccountBenefits.tsx'),/useOverlayDialog\(\{panelRef,onClose:close\}\)/);
});
test('Business pagination and catalog logic are not duplicated inside UI primitives',()=>{
 assert.doesNotMatch(read('src/components/UI.tsx'),/export function PagedList/);
 assert.match(read('src/components/account/PagedList.tsx'),/export function PagedList/);
 assert.doesNotMatch(read('src/screens/Store.tsx'),/function getTree/);
 assert.match(read('src/lib/catalog-categories.ts'),/export function getTree/);
 assert.doesNotMatch(read('app/styles/00-foundation-and-store.css'),/\.drawer-head h2\{/);
});
