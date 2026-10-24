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
const testSource=["app/api/testimonials/validation.ts","src/lib/testimonials.ts","src/lib/testimonials-service.ts", "src/screens/testimonials/TestimonialsPage.tsx", "src/components/testimonials/StoryDetail.tsx", "src/components/testimonials/StoriesWidget.tsx", "src/components/testimonials/StoryPresentation.tsx", "src/components/overlays/useOverlayDialog.ts", "src/components/overlays/OverlayPrimitives.tsx"];
function runParser(){
 const code=ts.transpileModule(source("src/lib/testimonials.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};vm.runInNewContext(code,{exports:exp,require:()=>({SITE_ORIGIN:"https://naturalfarmingvietnam.com"}),URL});return exp;
}
function runService({origin="http://127.0.0.1:8000",environment="development"}={}){
 const code=ts.transpileModule(source("src/lib/testimonials-service.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};
 const fetchCalls=[];
 const fetch=async(url,init)=>{fetchCalls.push({url:String(url),init});return {ok:true,status:200,json:async()=>({data:[],meta:{page:1,page_size:12,total:0}})};};
 const requireStub=id=>{
  if(id==="@/config/site-brand")return {SITE_ORIGIN:"https://naturalfarmingvietnam.com"};
  if(id==="@/lib/public-workshop")return {getPublicContentOrigin:()=>origin};
  if(id==="@/lib/testimonials")return {parseTestimonialsPage:value=>value,parseFeaturedTestimonials:value=>value.data,parseTestimonialDetail:value=>value.data};
  throw new Error(`Unexpected import ${id}`);
 };
 vm.runInNewContext(code,{exports:exp,require:requireStub,URL,AbortSignal,fetch,process:{env:{NODE_ENV:environment}},Error});
 return {service:exp,fetchCalls};
}
function runRequest(){
 const code=ts.transpileModule(source("src/lib/testimonials-request.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};vm.runInNewContext(code,{exports:exp,require:()=>({})});return exp;
}
function runPublicRequest(){
 const code=ts.transpileModule(source("src/lib/public-request.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};vm.runInNewContext(code,{exports:exp,require:()=>({})});return exp;
}
function runTestimonialsValidation(){
 const code=ts.transpileModule(source("app/api/testimonials/validation.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={};vm.runInNewContext(code,{exports:exp,require:()=>({})});return exp;
}
function runTestimonialsRoute(path,{result={data:[]},error=null}={}){
 const code=ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={},calls=[];
 class TestimonialsConfigurationError extends Error {}
 class TestimonialsUpstreamError extends Error {constructor(status){super(`status_${status}`);this.status=status;}}
 const fetchSiteStories=async(...args)=>{
  calls.push(args);
  if(error==="configuration")throw new TestimonialsConfigurationError();
  if(typeof error==="number")throw new TestimonialsUpstreamError(error);
  if(error)throw new Error("private upstream detail");
  return result;
 };
 const requireStub=id=>{
  if(id==="next/server")return {NextResponse:{json:(body,init={})=>new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json",...(init.headers??{})}})}};
  if(id==="@/lib/testimonials-service")return {fetchSiteStories,TestimonialsConfigurationError,TestimonialsUpstreamError};
  if(id==="@/lib/public-request")return runPublicRequest();
  if(id==="./validation"||id==="../validation")return runTestimonialsValidation();
  throw new Error(`Unexpected import ${id}`);
 };
 vm.runInNewContext(code,{exports:exp,require:requireStub,URL,Response,Error});
 return {route:exp,calls};
}
test("one canonical Testimonials screen and locale routes",()=>{
 assert.match(source("app/testimonials/[locale]/page.tsx"),/initialPage="testimonials"/);
 assert.match(source("app/NFVClientApp.tsx"),/ui\.page==="testimonials"\?<TestimonialsPage key=\{ui\.locale\}/);
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
 assert.match(source("app/NFVClientApp.tsx"),/PUBLIC_STORY_PAGES\.has\(ui\.page\)&&<StoriesWidget key=\{ui\.locale\}\/>/);
 assert.doesNotMatch(source("app/NFVClientApp.tsx"),/PUBLIC_STORY_PAGES = new Set<Screen>\([^)]*"checkout"/);
});
test("new routes use the real relative app import, never the aliased missing src\/app",()=>{
 assert.match(source("app/testimonials/[locale]/page.tsx"),/from "\.\.\/\.\.\/NFVApp"/);
 assert.doesNotMatch(source("app/testimonials/[locale]/page.tsx"),/@\/app\/NFVApp/);
});
test("public API proxies use the backend public endpoints and do not generate sample stories",()=>{
 assert.doesNotMatch(source("src/lib/testimonials-service.ts"),/SITE_ORIGIN/);
 assert.match(source("src/lib/testimonials-service.ts"),/\/api\/v1\/public\/testimonials/);
 assert.doesNotMatch(source("src/lib/testimonials-service.ts"),/sample|placeholder|mockStories/i);
});
test("Testimonials gateway reads the configured backend public API, never the production website",async()=>{
 const {service,fetchCalls}=runService();
 await service.fetchSiteStories("list",{locale:"en",type:"farmer",page:2});
 assert.equal(fetchCalls[0].url,"http://127.0.0.1:8000/api/v1/public/testimonials?locale=en&type=farmer&page=2&page_size=12");
 assert.equal(fetchCalls[0].init.cache,"no-store");
});
test("Testimonials gateway forwards the validated page size",async()=>{
 const {service,fetchCalls}=runService();
 await service.fetchSiteStories("list",{locale:"vi",type:"customer",page:3,pageSize:25});
 assert.equal(fetchCalls[0].url,"http://127.0.0.1:8000/api/v1/public/testimonials?locale=vi&type=customer&page=3&page_size=25");
});
test("Testimonials production cache is bounded and an explicit retry bypasses it",()=>{
 const {service}=runService({environment:"production"});
 assert.equal(typeof service.testimonialsFetchOptions,"function");
 assert.deepEqual(JSON.parse(JSON.stringify(service.testimonialsFetchOptions("production",false,["testimonials"]))),{next:{revalidate:300,tags:["testimonials"]}});
 assert.deepEqual(JSON.parse(JSON.stringify(service.testimonialsFetchOptions("production",true,["testimonials"]))),{cache:"no-store"});
});
test("shared retry parser accepts only an absent or bounded nonce",()=>{
 const request=runPublicRequest();
 assert.equal(request.parseRetryCacheBypass(new URLSearchParams()),false);
 assert.equal(request.parseRetryCacheBypass(new URLSearchParams("retry=1")),true);
 assert.equal(request.parseRetryCacheBypass(new URLSearchParams("retry=10000")),true);
 for(const query of ["retry=","retry=0","retry=10001","retry=anything"])
  assert.equal(request.parseRetryCacheBypass(new URLSearchParams(query)),null,query);
});
test("Testimonials routes reject invalid input before calling the service",async()=>{
 const cases=[
  ["app/api/testimonials/route.ts","http://localhost/api/testimonials?locale=fr&type=all&page=1&page_size=12",undefined],
  ["app/api/testimonials/featured/route.ts","http://localhost/api/testimonials/featured?locale=en&retry=",undefined],
  ["app/api/testimonials/[uuid]/route.ts","http://localhost/api/testimonials/not-a-uuid?locale=en",{params:Promise.resolve({uuid:"not-a-uuid"})}],
 ];
 for(const [path,url,context] of cases){
  const {route,calls}=runTestimonialsRoute(path);
  const response=await route.GET(new Request(url),context);
  assert.equal(response.status,400,url);
  assert.deepEqual(await response.json(),{error:"invalid_request"});
  assert.equal(calls.length,0,url);
 }
});
test("Testimonials routes forward validated input and retry cache bypass",async()=>{
 const list=runTestimonialsRoute("app/api/testimonials/route.ts",{result:{data:[],meta:{page:2,page_size:12,total:0}}});
 assert.equal((await list.route.GET(new Request("http://localhost/api/testimonials?locale=en&type=farmer&page=2&page_size=12&retry=3"))).status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(list.calls)),[["list",{locale:"en",type:"farmer",page:2,pageSize:12,bypassCache:true}]]);
 const featured=runTestimonialsRoute("app/api/testimonials/featured/route.ts");
 assert.equal((await featured.route.GET(new Request("http://localhost/api/testimonials/featured?locale=vi"))).status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(featured.calls)),[["featured",{locale:"vi",bypassCache:false}]]);
});
test("Testimonials list route matches v2 defaults and bounded integer syntax",async()=>{
 const defaults=runTestimonialsRoute("app/api/testimonials/route.ts",{result:{data:[],meta:{page:1,page_size:12,total:0}}});
 assert.equal((await defaults.route.GET(new Request("http://localhost/api/testimonials"))).status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(defaults.calls)),[["list",{locale:"vi",type:"all",page:1,pageSize:12,bypassCache:false}]]);

 const custom=runTestimonialsRoute("app/api/testimonials/route.ts",{result:{data:[],meta:{page:2,page_size:50,total:0}}});
 assert.equal((await custom.route.GET(new Request("http://localhost/api/testimonials?locale=en&type=customer&page=2&page_size=50"))).status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(custom.calls)),[["list",{locale:"en",type:"customer",page:2,pageSize:50,bypassCache:false}]]);

 for(const query of ["page=1e2","page=%201","page=01","page_size=0","page_size=51","page_size=1e1"]){
  const invalid=runTestimonialsRoute("app/api/testimonials/route.ts");
  const response=await invalid.route.GET(new Request(`http://localhost/api/testimonials?${query}`));
  assert.equal(response.status,400,query);
  assert.equal(invalid.calls.length,0,query);
 }
});
test("Testimonials routes preserve safe configuration, missing-detail, and upstream errors",async()=>{
 const configured=runTestimonialsRoute("app/api/testimonials/route.ts",{error:"configuration"});
 assert.equal((await configured.route.GET(new Request("http://localhost/api/testimonials?locale=vi&page_size=12"))).status,503);
 const uuid="3f7d06cb-8d37-44d5-a5ab-1e284f9d37d9";
 const missing=runTestimonialsRoute("app/api/testimonials/[uuid]/route.ts",{error:404});
 assert.equal((await missing.route.GET(new Request(`http://localhost/api/testimonials/${uuid}?locale=en`),{params:Promise.resolve({uuid})})).status,404);
 const failed=runTestimonialsRoute("app/api/testimonials/featured/route.ts",{error:"upstream"});
 const response=await failed.route.GET(new Request("http://localhost/api/testimonials/featured?locale=en"));
 assert.equal(response.status,502);
 assert.deepEqual(await response.json(),{error:"upstream_unavailable"});
});
test("Testimonials retry nonce belongs only to the query that failed",()=>{
 const request=runRequest();
 assert.equal(request.testimonialsRetrySuffix(0),"");
 assert.equal(request.testimonialsRetrySuffix(3),"&retry=3");
 const english=request.nextTestimonialsRetry(null,"en:all:1");
 assert.equal(request.testimonialsRetryNumber(english,"en:all:1"),1);
 assert.equal(request.testimonialsRetryNumber(english,"vi:all:1"),0);
 const vietnamese=request.nextTestimonialsRetry(english,"vi:all:1");
 assert.equal(request.testimonialsRetryNumber(vietnamese,"vi:all:1"),1);
 for(const file of ["src/screens/testimonials/TestimonialsPage.tsx","src/components/testimonials/StoriesWidget.tsx","src/components/testimonials/StoryDetail.tsx"])
  assert.match(source(file),/testimonialsRetryNumber/);
});
test("runtime data validation rejects bad entries and accepts the backend contract",()=>{
 const {parseTestimonial,parseTestimonialsPage,parseFeaturedTestimonials}=runParser();
 const row={id:"3f7d06cb-8d37-44d5-a5ab-1e284f9d37d9",type:"farmer",display_name:"Farm A",quote:"Good soil",role:"Farmer",location:"Da Lat",requested_locale:"en",content_locale:"en",available_locales:["en","vi"],is_fallback:false,published_at:"2026-10-23T09:30:00+07:00",image:{id:"image-1",url:"/photo.jpg",width:500,height:350,variants:[{file:"small.jpg",url:"/small.jpg",width:250,height:175}]}};
 const story=parseTestimonial(row);assert.equal(story.display_name,"Farm A");assert.equal(story.image.variants[0].width,250);assert.equal(story.image.url,"https://naturalfarmingvietnam.com/photo.jpg");
 assert.equal(parseTestimonial({...row,id:""}),null);
 assert.equal(parseTestimonial({...row,type:"unknown"}),null);
 assert.equal(parseTestimonial({...row,quote:""}),null);
 assert.equal(parseTestimonial({...row,display_name:"x".repeat(240)})?.display_name.length,240);
 assert.equal(parseTestimonial({...row,display_name:"x".repeat(241)}),null);
 assert.equal(parseTestimonial({...row,role:"x".repeat(241)}),null);
 assert.equal(parseTestimonial({...row,image:{url:"javascript:alert(1)"}}),null);
 const page=parseTestimonialsPage({data:[row],meta:{page:1,page_size:12,total:1}});
 assert.equal(page.data.length,1);
 assert.equal(parseFeaturedTestimonials({data:[row]}).length,1);
 assert.equal(runParser().parseTestimonialDetail({data:{...row,full_story:"x".repeat(20000)}}).full_story.length,20000);
 assert.throws(()=>runParser().parseTestimonialDetail({data:{...row,full_story:"x".repeat(20001)}}));
 assert.throws(()=>parseTestimonialsPage({data:[row,{...row,id:""}],meta:{page:1,page_size:12,total:2}}));
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
