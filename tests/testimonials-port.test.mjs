import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=path=>readFileSync(join(root,path),"utf8");
const require=createRequire(import.meta.url);
const ts=require("typescript");
const testSource=["src/lib/testimonials.ts","src/lib/testimonials-service.ts", "src/screens/testimonials/TestimonialsPage.tsx", "src/components/testimonials/StoryDetail.tsx", "src/components/testimonials/StoriesWidget.tsx", "src/components/testimonials/StoryPresentation.tsx", "src/components/overlays/useOverlayDialog.ts", "src/components/overlays/OverlayPrimitives.tsx"];
function runParser(){
 const code=ts.transpileModule(source("src/lib/testimonials.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};vm.runInNewContext(code,{exports:exp,require:()=>({SITE_ORIGIN:"https://naturalfarmingvietnam.com"}),URL});return exp;
}
test("one canonical Testimonials screen and locale routes",()=>{
 assert.match(source("app/testimonials/[locale]/page.tsx"),/initialPage="testimonials"/);
 assert.match(source("app/NFVApp.tsx"),/ui\.page==="testimonials"\?<TestimonialsPage/);
 assert.match(source("src/data/main-navigation.ts"),/return "testimonials"/);
 assert.match(source("src/lib/site-links.ts"),/path==="testimonials"/);
 assert.equal(source("src/components/navigation/SiteHeader.tsx").includes("TestimonialsPage"),false);
});
test("floating Stories uses a drawer with shared story detail, not a redundant page",()=>{
 const widget=source("src/components/testimonials/StoriesWidget.tsx");
 assert.match(widget,/StoriesDrawer/);
 assert.match(widget,/StoryDetail/);
 assert.match(widget,/StoryCard/);
 assert.match(widget,/className="testimonials-launcher"/);
 assert.doesNotMatch(widget,/testimonials-launcher-desktop|testimonials-launcher-mobile/);
 assert.match(source("app/NFVApp.tsx"),/PUBLIC_STORY_PAGES\.has\(ui\.page\)&&<StoriesWidget\/>/);
 assert.doesNotMatch(source("app/NFVApp.tsx"),/PUBLIC_STORY_PAGES = new Set<Screen>\([^)]*"checkout"/);
});
test("new routes use the real relative app import, never the aliased missing src\/app",()=>{
 assert.match(source("app/testimonials/[locale]/page.tsx"),/from "\.\.\/\.\.\/NFVApp"/);
 assert.doesNotMatch(source("app/testimonials/[locale]/page.tsx"),/@\/app\/NFVApp/);
});
test("public API proxies validate parameters and do not generate sample stories",()=>{
 for(const f of ["app/api/testimonials/route.ts","app/api/testimonials/featured/route.ts","app/api/testimonials/[uuid]/route.ts"]){
  assert.match(source(f),/fetchSiteStories/);
  assert.match(source(f),/invalid_request/);
 }
 assert.match(source("src/lib/testimonials-service.ts"),/SITE_ORIGIN/);
 assert.match(source("src/lib/testimonials-service.ts"),/\/api\/testimonials/);
});
test("runtime data validation rejects bad entries and accepts real image variants",()=>{
 const {parseTestimonial,parseTestimonialsPage,parseFeaturedTestimonials}=runParser();
 const row={id:"abcd-1234",type:"farmer",display_name:"Farm A",quote:"Good soil",role:"Farmer",image:{url:"/photo.jpg",width:500,height:350,variants:[{url:"/small.jpg",width:250}]}};
 const story=parseTestimonial(row);assert.equal(story.display_name,"Farm A");assert.equal(story.image.variants[0].width,250);assert.equal(story.image.url,"https://naturalfarmingvietnam.com/photo.jpg");
 assert.equal(parseTestimonial({...row,id:""}),null);
 assert.equal(parseTestimonial({...row,type:"unknown"}),null);
 assert.equal(parseTestimonial({...row,image:{url:"javascript:alert(1)"}}).image,null);
 const page=parseTestimonialsPage({data:[row],meta:{page:1,page_size:12,total:1}});
 assert.equal(page.data.length,1);
 assert.equal(parseFeaturedTestimonials({data:[row]}).length,1);
 assert.throws(()=>parseTestimonialsPage({data:[],meta:{page:0,page_size:12,total:0}}));
});
test("CSS declarations are scoped to Testimonials and floating Stories namespaces",()=>{
 const css=source("app/styles/12-testimonials.css");
 assert.match(css,/\.nfv-testimonials/);assert.match(css,/\.nfv-stories-widget/);
 for(const forbidden of [/^\s*body\s*\{/m,/^\s*html\s*\{/m,/^\s*\.site-header\s*\{/m,/^\s*\.site-footer\s*\{/m,/^\s*:root\s*\{/m])assert.doesNotMatch(css,forbidden);
 assert.match(source("app/layout.tsx"),/12-testimonials\.css/);
 assert.ok(existsSync(join(root,"src/screens/home/HomePage.tsx")));
});
test("all edited TS and TSX parse syntactically",()=>{
 for(const f of testSource){
  const text=source(f),result=ts.transpileModule(text,{fileName:f,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
  assert.equal(result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,f);
 }
});
