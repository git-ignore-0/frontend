import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(root,path),'utf8');
const ts=createRequire(import.meta.url)('typescript');
test('Menu, cart and Stories use one navigation-style panel and shared close button',()=>{
 const shell=read('src/components/overlays/OverlayPrimitives.tsx');
 assert.match(shell,/className="nfv-mobile-nav-panel nfv-unified-panel"/);
 assert.match(shell,/className="nfv-mobile-nav-heading"/);
 assert.match(shell,/className="nfv-mobile-nav-close"/);
 assert.match(shell,/nfv-mobile-nav-overlay nfv-unified-panel-overlay/);
 assert.match(shell,/export function IconButton/);
 assert.match(shell,/useOverlayDialog/);
 assert.match(read('src/screens/Checkout.tsx'),/<SideDrawer/);
 assert.match(read('src/components/testimonials/StoriesWidget.tsx'),/<SideDrawer/);
 assert.match(read('src/components/navigation/MobileNavDrawer.tsx'),/<SideDrawer/);
 assert.match(read('app/styles/05-main-navigation.css'),/width:\s*min\(360px, 90vw\)/);
});
test('product filters and story details share existing Store modal/bottom-sheet classes',()=>{
 const shell=read('src/components/overlays/OverlayPrimitives.tsx');
 assert.match(shell,/className={`filter-sheet nfv-responsive-dialog/);
 assert.match(shell,/className="filter-sheet-inner"/);
 assert.match(read('src/screens/Store.tsx'),/<ResponsiveDialog/);
 assert.match(read('src/components/testimonials/StoryDetail.tsx'),/<ResponsiveDialog/);
 assert.ok(!existsSync(join(root,'src/components/testimonials/useStoryDialog.ts')));
 assert.match(read('app/styles/20-history-and-catalog.css'),/max-width:560px/);
});
test('Testimonials consumes v62 UI primitives and keeps a single story presentation',()=>{
 const page=read('src/screens/testimonials/TestimonialsPage.tsx');
 for(const value of ['<Tabs','<DataState','<Button','<StoryCard','kind="loading"'])assert.ok(page.includes(value),value);
 assert.match(page,/<Tabs value=\{filter\} disabled=\{disabled\}/);
 const drawer=read('src/components/testimonials/StoriesWidget.tsx');
 for(const value of ['<Button','<DataState','<StoryCard','kind="loading"'])assert.ok(drawer.includes(value),value);
 assert.match(read('src/components/testimonials/StoryPresentation.tsx'),/export function StoryCard/);
});
test('new overlay CSS avoids app-wide rules and preserves Header/Footer files from base',()=>{
 const styles=read('app/styles/03-overlays.css')+'\n'+read('app/styles/12-testimonials.css');
 for(const selector of [/^\s*body\s*\{/m,/^\s*:root\s*\{/m,/^\s*\.site-header\s*\{/m,/^\s*\.site-footer\s*\{/m])assert.doesNotMatch(styles,selector);
 assert.match(read('app/layout.tsx'),/03-overlays\.css/);
 assert.match(read('app/layout.tsx'),/12-testimonials\.css/);
 const files=['src/components/navigation/SiteHeader.tsx','src/components/layout/SiteFooter.tsx'];
 for(const file of files)assert.ok(existsSync(join(root,file)));
});
test('all modified TSX components parse without syntax errors',()=>{
 const files=['src/components/overlays/OverlayPrimitives.tsx','src/components/overlays/useOverlayDialog.ts','src/components/testimonials/StoriesWidget.tsx','src/components/testimonials/StoryDetail.tsx','src/components/testimonials/StoryPresentation.tsx','src/screens/testimonials/TestimonialsPage.tsx','src/screens/Store.tsx','src/screens/Checkout.tsx'];
 for(const file of files){
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file);
 }
});
