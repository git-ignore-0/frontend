import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire,stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const require=createRequire(import.meta.url);
const ts=require('typescript');
const model=await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/screens/tracker/tracker-model.ts')))}`);
const publicRequest={};
vm.runInNewContext(ts.transpileModule(read('src/lib/public-request.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:publicRequest,require:()=>({})});
const api={};
vm.runInNewContext(ts.transpileModule(read('src/screens/tracker/tracker-api.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:api,require:id=>id==='@/lib/public-request'?publicRequest:{},process:{env:{NODE_ENV:'test'}}});
const farm=(count,oneMonth=2)=>({id:'farm-1',name:'Farm',location:'Vietnam',description:'',signup_count:count,one_month_signup_count:oneMonth,sort_order:1,image:null,images:[]});
function runTrackerRoute({origin='http://127.0.0.1:8000',upstreamOk=true}={}){
 const code=ts.transpileModule(read('app/api/tracker-farms/route.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exp={},fetchCalls=[];
 const fetch=async(url,init)=>{fetchCalls.push({url:String(url),init});return {ok:upstreamOk,status:upstreamOk?200:503,json:async()=>({data:[farm(10)]})};};
 const requireStub=id=>{
  if(id==='next/server')return {NextResponse:{json:(body,init={})=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...(init.headers??{})}})}};
  if(id==='@/lib/public-workshop')return {getPublicContentOrigin:()=>origin};
  if(id==='@/screens/tracker/tracker-api')return api;
  if(id==='@/screens/tracker/tracker-model')return model;
  throw new Error(`Unexpected import ${id}`);
 };
 vm.runInNewContext(code,{exports:exp,require:requireStub,URL,AbortSignal,Response,fetch,process:{env:{NODE_ENV:'production'}}});
 return {route:exp,fetchCalls};
}

test('tracker has exactly one local page and correct localized routes',()=>{
 assert.ok(existsSync(new URL('app/tracker/[locale]/page.tsx',root)));
 assert.match(read('app/tracker/[locale]/page.tsx'),/initialPage="tracker"/);
 assert.match(read('src/data/main-navigation.ts'),/screen:"tracker"/);
 assert.match(read('app/NFVApp.tsx'),/ui\.page==="tracker"\?<TrackerPage\/>/);
});
test('farm milestone transitions match original 0 10 20 30 rules',()=>{
 for(const [count,key,next,remaining] of [[0,'seedPlanted','gettingStarted',10],[9,'seedPlanted','gettingStarted',1],[10,'gettingStarted','providingForFamily',10],[20,'providingForFamily','communityLeader',10],[30,'communityLeader',null,0],[80,'communityLeader',null,0]]){
  const m=model.farmView(farm(count));assert.equal(m.milestone.key,key);assert.equal(m.nextMilestone?.key??null,next);assert.equal(m.remaining,remaining);
  assert.ok(m.progress>=0&&m.progress<=100);
 }
});
test('stats are computed only from real farms; invalid count values never leak',()=>{
 assert.deepEqual(model.trackerStats([]),{farms:0,oneMonth:0,sixMonth:0,leaders:0});
 assert.deepEqual(model.trackerStats([farm(30,1),farm(20,3)]),{farms:2,oneMonth:4,sixMonth:50,leaders:1});
 assert.equal(model.normalizeCount(Number.NaN),0);
});
test('public tracker contract rejects malformed payloads and unsafe images',()=>{
 assert.deepEqual(model.parseTrackerFarms({data:[farm(10)]}),[farm(10)]);
 assert.throws(()=>model.parseTrackerFarms({wrong:[]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),signup_count:'10'}]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),sort_order:1.5}]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),image:{id:'i',url:'javascript:alert(1)',width:300,height:200}}]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),image:{id:'i',url:'https://example.test/farm.jpg',width:300,height:200,variants:[{url:'https://example.test/thumb.jpg',width:120.5,height:80}]}}]}));
});
test('tracker upstream cache is fresh locally, cached in production, and bypassed by retry',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(api.trackerFetchOptions('development',false))),{cache:'no-store'});
 assert.deepEqual(JSON.parse(JSON.stringify(api.trackerFetchOptions('production',false))),{next:{revalidate:300,tags:['tracker-farms']}});
 assert.deepEqual(JSON.parse(JSON.stringify(api.trackerFetchOptions('production',true))),{cache:'no-store'});
 assert.equal(api.trackerRetrySuffix(0),'');
 assert.equal(api.trackerRetrySuffix(2),'&retry=2');
});
test('tracker request validation rejects bad locales and unbounded cache-bypass values',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(api.parseTrackerRequest(new URL('http://localhost/api/tracker-farms?locale=en').searchParams))),{locale:'en',bypassCache:false});
 assert.deepEqual(JSON.parse(JSON.stringify(api.parseTrackerRequest(new URL('http://localhost/api/tracker-farms?locale=vi&retry=2').searchParams))),{locale:'vi',bypassCache:true});
 for(const url of [
  'http://localhost/api/tracker-farms',
  'http://localhost/api/tracker-farms?locale=fr',
  'http://localhost/api/tracker-farms?locale=en&retry=',
  'http://localhost/api/tracker-farms?locale=en&retry=0',
  'http://localhost/api/tracker-farms?locale=en&retry=10001',
  'http://localhost/api/tracker-farms?locale=en&retry=anything',
 ]) assert.equal(api.parseTrackerRequest(new URL(url).searchParams),null,url);
});
test('tracker route rejects invalid input before contacting the backend',async()=>{
 for(const url of [
  'http://localhost/api/tracker-farms?locale=fr',
  'http://localhost/api/tracker-farms?locale=en&retry=',
  'http://localhost/api/tracker-farms?locale=en&retry=anything',
 ]){
  const {route,fetchCalls}=runTrackerRoute();
  const response=await route.GET(new Request(url));
  assert.equal(response.status,400,url);
  assert.deepEqual(await response.json(),{error:'invalid_request'});
  assert.equal(fetchCalls.length,0,url);
 }
});
test('tracker route uses the configured backend and only bypasses cache for a valid retry',async()=>{
 const initial=runTrackerRoute();
 assert.equal((await initial.route.GET(new Request('http://localhost/api/tracker-farms?locale=en'))).status,200);
 assert.equal(initial.fetchCalls[0].url,'http://127.0.0.1:8000/api/v1/public/tracker-farms?locale=en');
 assert.deepEqual(JSON.parse(JSON.stringify(initial.fetchCalls[0].init.next)),{revalidate:300,tags:['tracker-farms']});
 const retry=runTrackerRoute();
 assert.equal((await retry.route.GET(new Request('http://localhost/api/tracker-farms?locale=vi&retry=2'))).status,200);
 assert.equal(retry.fetchCalls[0].init.cache,'no-store');
});
test('tracker style is namespace-scoped and does not reset site header/footer',()=>{
 const css=read('app/styles/11-tracker.css');
 assert.match(css,/\.nfv-tracker\.tracker-standalone/);
 assert.match(css,/@media\s*\(max-width:\s*900px\)/);
 assert.match(css,/@media\s*\(max-width:\s*680px\)/);
 assert.match(css,/@media\s*\(max-width:\s*380px\)/);
 assert.doesNotMatch(css,/\.site-header\b|\.site-footer\b|\.account-nav-shell\b|\.checkout-form\b/);
 assert.match(read('app/layout.tsx'),/11-tracker\.css/);
});

// The status card appears right after the stats on loading/error/empty states.
// Both status and populated content must have the same section spacing.
test('tracker status card uses the same section gap as ready content without global CSS overrides',()=>{
 const css=read('app/styles/11-tracker.css');
 assert.match(css,/--tracker-section-gap:\s*clamp\(22px,3vw,32px\)/);
 assert.match(css,/\.nfv-tracker \.tracker-field-section\s*\{[^}]*margin:\s*var\(--tracker-section-gap\) 0;/s);
 assert.match(css,/\.nfv-tracker \.tracker-state\s*\{[^}]*margin-top:\s*var\(--tracker-section-gap\);/s);
 assert.doesNotMatch(css,/(?:^|\n)\s*\.tracker-state\s*\{/);
});
