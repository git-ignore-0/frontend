import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";

const ts=createRequire(import.meta.url)("typescript");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const slots=[],pending=[],calls=[];let cursor=0,effects=[],dirty=false,value,params=new URLSearchParams();
 const state=initial=>{const i=cursor++;if(!(i in slots))slots[i]={value:initial};return [slots[i].value,next=>{slots[i].value=typeof next==="function"?next(slots[i].value):next;dirty=true;}];};
 const memo=(fn,deps)=>{const i=cursor++,before=slots[i];if(!before||deps.some((v,j)=>v!==before.deps[j]))slots[i]={deps,value:fn()};return slots[i].value;};
 const react={useState:state,useRef:initial=>state({current:initial})[0],useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect:(fn,deps)=>{const i=cursor++,before=slots[i];if(!before||deps.some((v,j)=>v!==before.deps[j]))effects.push(()=>{before?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const router={replace(){},push(){}};
 function load(path){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URLSearchParams,AbortController,fetch:(url,init)=>{calls.push({url,init});if(url.includes("categories"))return Promise.resolve({ok:true,json:async()=>[]});return new Promise(resolve=>pending.push(resolve));},require:id=>id==="react"?react:id==="next/navigation"?{useRouter:()=>router,usePathname:()=>"/store/vi",useSearchParams:()=>params}:id==="./store-model"?{parseStoreCategories:v=>v,parseStorePage:v=>v}:id==="./store-request"?load("src/store/store-request.ts"):{} });return exports;}
 const hook=load("src/store/useStoreCatalog.ts").useStoreCatalog;
 function render(){let turns=0;do{dirty=false;cursor=0;value=hook("vi");const queue=effects;effects=[];queue.forEach(fn=>fn());if(++turns>20)throw Error("loop");}while(dirty);}
 render();
 return {render,calls,pending,get value(){return value;},query(text){params=new URLSearchParams(text);render();},async respond(page,ids,total){pending.shift()({ok:true,json:async()=>({data:ids.map(id=>({id})),meta:{page,page_size:24,total}})});await tick();render();},dispose(){slots.forEach(slot=>slot?.cleanup?.());}};
}

test("Store loads batches of 24, appends once, deduplicates and stops at the last page",async()=>{
 const h=harness();assert.match(h.calls[1].url,/page=1&page_size=24/);
 await h.respond(1,["a","b"],30);assert.equal(h.value.hasMore,true);assert.deepEqual(Array.from(h.value.batch,p=>p.id),["a","b"]);const original=h.value.products[0];
 const load=h.value.loadMore;const first=load();load();h.render();assert.equal(new URL(h.calls.at(-1).url,"http://localhost").searchParams.has("retry"),false);assert.equal(h.pending.length,1);assert.equal(h.value.loadingMore,true);
 await h.respond(2,["b","c"],30);await first;h.render();
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["a","b","c"]);assert.deepEqual(Array.from(h.value.batch,p=>p.id),["c"]);assert.equal(h.value.products[0],original);assert.equal(h.value.hasMore,false);assert.equal(h.value.loadingMore,false);h.dispose();
});

test("Store keeps loaded products on failure and retries the same next page",async()=>{
 const h=harness();await h.respond(1,["a"],50);
 const failed=h.value.loadMore();assert.equal(new URL(h.calls.at(-1).url,"http://localhost").searchParams.has("retry"),false);h.pending.shift()({ok:false});await failed;h.render();
 assert.equal(h.value.moreError,true);assert.equal(h.value.products.length,1);
 const retry=h.value.loadMore();assert.match(h.calls.at(-1).url,/page=2&page_size=24/);assert.equal(new URL(h.calls.at(-1).url,"http://localhost").searchParams.get("retry"),"1");
 await h.respond(2,["b"],48);await retry;h.render();assert.equal(h.value.moreError,false);assert.equal(h.value.products.length,2);h.dispose();
});

test("changing a filter aborts pending append and starts at page one",async()=>{
 const h=harness();await h.respond(1,["a"],50);const late=h.value.loadMore();
 h.query("search=tomato&page=4");assert.equal(h.calls.at(-2).init.signal.aborted,true);assert.equal(h.value.state,"loading");assert.match(h.calls.at(-1).url,/page=1&page_size=24/);
 await h.respond(2,["old"],50);await late;await h.respond(1,["new"],1);
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["new"]);h.dispose();
});

for(const field of ["category_id","search"]){
 test(`returning A to B to A with ${field} waits for fresh page one before appending`,async()=>{
  const h=harness();await h.respond(1,["a1"],60);
  const second=h.value.loadMore();await h.respond(2,["a2"],60);await second;h.render();
  h.query(`${field}=${field==="category_id"?"e55e4778-0528-4594-a4bf-cab97007c50f":"other"}`);
  h.query("");
  assert.equal(h.value.state,"loading");assert.equal(h.value.hasMore,false);
  const count=h.calls.length;await h.value.loadMore();assert.equal(h.calls.length,count);
  // Resolve the current A first, then return an obsolete B response.
  const obsolete=h.pending.shift(),fresh=h.pending.shift();
  fresh({ok:true,json:async()=>({data:[{id:"fresh-a1"}],meta:{page:1,page_size:24,total:60}})});
  await tick();h.render();
  obsolete({ok:true,json:async()=>({data:[{id:"obsolete-b"}],meta:{page:1,page_size:24,total:1}})});
  await tick();h.render();
  const next=h.value.loadMore();assert.match(h.calls.at(-1).url,/page=2&page_size=24/);
  await h.respond(2,["fresh-a2"],60);await next;h.render();
  assert.deepEqual(Array.from(h.value.products,p=>p.id),["fresh-a1","fresh-a2"]);h.dispose();
 });
}

test("an obsolete append cannot report an error or load again after A B A",async()=>{
 const h=harness();await h.respond(1,["a"],60);
 const oldLoad=h.value.loadMore,late=oldLoad(),obsolete=h.pending.shift();
 h.query("search=other");h.query("");
 const other=h.pending.shift(),fresh=h.pending.shift();
 fresh({ok:true,json:async()=>({data:[{id:"fresh"}],meta:{page:1,page_size:24,total:60}})});
 await tick();h.render();
 obsolete({ok:false});await late;other({ok:false});await tick();h.render();
 assert.equal(h.value.state,"ready");assert.equal(h.value.moreError,false);
 const count=h.calls.length;await oldLoad();assert.equal(h.calls.length,count);
 const next=h.value.loadMore();assert.match(h.calls.at(-1).url,/page=2&page_size=24/);
 await h.respond(2,["next"],48);await next;h.render();
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["fresh","next"]);h.dispose();
});

test("first-page failure retries before any append is allowed",async()=>{
 const h=harness();h.pending.shift()({ok:false});await tick();h.render();assert.equal(h.value.state,"error");
 h.value.retryProducts();h.render();assert.equal(h.value.state,"loading");
 assert.equal(new URL(h.calls.at(-1).url,"http://localhost").searchParams.get("retry"),"1");
 const count=h.calls.length;await h.value.loadMore();assert.equal(h.calls.length,count);
 await h.respond(1,["recovered"],1);assert.equal(h.value.state,"ready");assert.equal(h.value.hasMore,false);h.dispose();
});

test("sort keeps existing products, blocks append and replaces with sorted page one",async()=>{
 const h=harness();await h.respond(1,["old"],60);h.query("sort=price_asc");
 assert.equal(h.value.keepProducts,true);assert.equal(h.value.state,"loading");assert.equal(h.value.hasMore,false);
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["old"]);
 const count=h.calls.length;await h.value.loadMore();assert.equal(h.calls.length,count);
 await h.respond(1,["sorted"],60);assert.equal(h.value.keepProducts,false);
 const next=h.value.loadMore();assert.match(h.calls.at(-1).url,/sort=price_asc&page=2/);
 await h.respond(2,["sorted-next"],48);await next;h.render();
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["sorted","sorted-next"]);h.dispose();
});

test("sort failure preserves products through repeated retries",async()=>{
 const h=harness();await h.respond(1,["old"],60);h.query("sort=name");
 for(let i=0;i<2;i++){
  h.pending.shift()({ok:false});await tick();h.render();
  assert.equal(h.value.state,"error");assert.equal(h.value.keepProducts,true);assert.equal(h.value.hasMore,false);
  h.value.retryProducts();h.render();assert.equal(h.value.state,"loading");assert.equal(h.value.keepProducts,true);
 }
 await h.respond(1,["sorted"],1);assert.deepEqual(Array.from(h.value.products,p=>p.id),["sorted"]);h.dispose();
});

test("rapid sort changes retain products but discard obsolete responses",async()=>{
 const h=harness();await h.respond(1,["old"],60);h.query("sort=name");const obsolete=h.pending.shift();
 h.query("");assert.equal(h.value.keepProducts,true);assert.equal(h.value.state,"loading");
 await h.respond(1,["fresh"],1);
 obsolete({ok:false});await tick();h.render();assert.equal(h.value.state,"ready");
 assert.deepEqual(Array.from(h.value.products,p=>p.id),["fresh"]);
 h.query("search=other&sort=name");assert.equal(h.value.keepProducts,false);h.dispose();
});


test("sorting an empty result still exposes a failure and retry",async()=>{
 const h=harness();await h.respond(1,[],0);h.query("sort=name");
 assert.equal(h.value.keepProducts,false);h.pending.shift()({ok:false});await tick();h.render();
 assert.equal(h.value.state,"error");assert.equal(h.value.keepProducts,false);
 h.value.retryProducts();h.render();await h.respond(1,[],0);assert.equal(h.value.state,"ready");h.dispose();
});
