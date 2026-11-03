import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript");
const source=readFileSync(new URL("../app/api/store-orders/[...path]/route.ts",import.meta.url),"utf8");
const UUID="11111111-1111-4111-8111-111111111111";

class TestNextResponse extends Response{
  static json(value,init){const response=new TestNextResponse(JSON.stringify(value),init);response.cookies={values:[],set(...args){this.values.push(args)}};return response}
}

function routeHarness({cookieJar={},guestOrders={},storedSession=null,currentSession=storedSession,upstream,authError,clientIdentity={}}={}){
  const exports={},calls=[],clears=[];
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(compiled,{exports,URL,Headers,Response,AbortSignal,DOMException,process:{env:{NODE_ENV:"test"}},fetch:async(url,init)=>{calls.push({url:String(url),init});return upstream?upstream(url,init):new Response(JSON.stringify({data:{id:UUID}}),{status:200,headers:{"content-type":"application/json"}})},require:name=>{
    if(name==="next/server")return {NextResponse:TestNextResponse};
    if(name==="@/store/order-bff"){
      const helpers={};
      vm.runInNewContext(ts.transpileModule(readFileSync("src/store/order-bff.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:helpers});
      return helpers;
    }
    if(name==="@/store/store-proxy-identity")return {storeLookupIdentityHeaders:()=>clientIdentity};
    if(name==="@/auth/server/config")return {authOrigin:()=>"https://auth.test",publicSiteOrigin:()=>"https://site.test"};
    if(name==="@/auth/server/oauth"){
      class AuthServiceUnavailableError extends Error{}
      return {AuthServiceUnavailableError,currentPublicSession:async()=>{if(authError)throw authError;return currentSession},sessionTokensChanged:()=>false};
    }
    if(name==="@/auth/server/session")return {readSession:async()=>storedSession,clearSession:async()=>{clears.push(true)},writeSession:async()=>{}};
    if(name==="@/store/store-order-session"){
      const helpers={};
      const compiledSession=ts.transpileModule(readFileSync("src/store/store-order-session.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
      vm.runInNewContext(compiledSession,{exports:helpers,require:id=>id==="server-only"?{}:{seal:JSON.stringify,unseal:value=>{try{return JSON.parse(value)}catch{return null}}}});
      return helpers;
    }
    return {};
  }});
  const request=(path,{method="GET",body,origin=true,marker=true,query="",cookie=JSON.stringify({orders:guestOrders})}={})=>({
    url:`https://site.test/api/store-orders/${path.join("/")}${query}`,
    method,
    headers:new Headers(origin&&method==="POST"?{origin:"https://site.test",...(marker?{"x-nfv-public-request":"1"}:{})}:{}),
    cookies:{get:name=>cookieJar[name]?{value:cookieJar[name]}:name==="nfv_store_guest_orders"&&cookie?{value:cookie}:undefined},
    json:async()=>body??{},
  });
  const call=(path,options)=>exports[options?.method==="POST"?"POST":"GET"](request(path,options),{params:Promise.resolve({path})});
  return {call,calls,clears};
}

test("matching guest-order cookie remains the authority before and after OAuth login",async()=>{
  for(const storedSession of [null,{accessToken:"oauth-token"}]){
    const harness=routeHarness({guestOrders:{[UUID]:"guest-secret"},storedSession});
    await harness.call(["orders",UUID]);
    assert.equal(harness.calls.length,1);
    assert.equal(harness.calls[0].init.headers["X-Store-Access-Token"],"guest-secret");
    assert.equal(harness.calls[0].init.headers.Authorization,undefined);
  }
});

test("guest authority injects only the matching order token into report and cancel bodies",async()=>{
  for(const action of ["report-transfer","cancel"]){
    const harness=routeHarness({guestOrders:{[UUID]:"guest-secret","22222222-2222-4222-8222-222222222222":"other-secret"},storedSession:{accessToken:"oauth-token"}});
    const clientBody=action==="cancel"?{idempotency_key:"33333333-3333-4333-8333-333333333333"}:{};
    await harness.call(["orders",UUID,action],{method:"POST",body:clientBody});
    assert.deepEqual(JSON.parse(harness.calls[0].init.body),{...clientBody,access_token:"guest-secret"});
    assert.equal(harness.calls[0].init.headers.Authorization,undefined);
  }
});

test("OAuth owner authority is preserved when no matching guest token exists",async()=>{
  for(const status of [200,404]){
    const harness=routeHarness({guestOrders:{"22222222-2222-4222-8222-222222222222":"wrong-order"},storedSession:{accessToken:"owner-token"},upstream:()=>new Response("{}",{status})});
    const response=await harness.call(["orders",UUID]);
    assert.equal(harness.calls[0].init.headers.Authorization,"Bearer owner-token");
    assert.equal(harness.calls[0].init.headers["X-Store-Access-Token"],undefined);
    assert.equal(response.status,status);
  }
});

test("an unrelated expired OAuth session does not block a matching guest-order cookie",async()=>{
  const harness=routeHarness({guestOrders:{[UUID]:"guest-secret"},storedSession:{accessToken:"expired"},authError:new Error("expired")});
  const response=await harness.call(["orders",UUID]);
  assert.equal(response.status,200);
  assert.equal(harness.calls[0].init.headers["X-Store-Access-Token"],"guest-secret");
  assert.equal(harness.clears.length,0);
});

test("missing or wrong guest token never grants anonymous access",async()=>{
  for(const guestOrders of [{},{"22222222-2222-4222-8222-222222222222":"wrong"}]){
    const harness=routeHarness({guestOrders,upstream:(_url,init)=>{
      assert.equal(init.headers["X-Store-Access-Token"],undefined);
      return new Response("{}",{status:404});
    }});
    assert.equal((await harness.call(["orders",UUID])).status,404);
  }
});

test("a client-supplied guest token is never accepted or forwarded",async()=>{
  const harness=routeHarness({upstream:(_url,init)=>{
    assert.deepEqual(JSON.parse(init.body),{});
    return new Response("{}",{status:404});
  }});
  const response=await harness.call(["orders",UUID,"report-transfer"],{method:"POST",body:{access_token:"attacker-token"}});
  assert.equal(response.status,404);
});

test("guest checkout strips the access token and sets an HttpOnly cookie",async()=>{
  const harness=routeHarness({upstream:()=>new Response(JSON.stringify({data:{id:UUID,guest_access_token:"secret",reference_code:"SO1"}}),{status:201,headers:{"content-type":"application/json"}})});
  const response=await harness.call(["checkout"],{method:"POST",body:{lines:[]}});
  const payload=await response.json();
  assert.equal(response.status,201);
  assert.equal(payload.data.guest_access_token,undefined);
  assert.equal(JSON.stringify(payload).includes("secret"),false);
  assert.equal(response.cookies.values[0][2].httpOnly,true);
  assert.equal(response.cookies.values[0][2].path,`/api/store-orders/orders/${UUID}`);
});

test("mutation origin and CSRF header checks run before upstream access",async()=>{
  const harness=routeHarness({guestOrders:{[UUID]:"guest-secret"}});
  const response=await harness.call(["orders",UUID,"cancel"],{method:"POST",body:{},origin:false});
  assert.equal(response.status,403);
  assert.equal(harness.calls.length,0);
});


test("lookup forwards only server-generated client identity and rejects misconfiguration",async()=>{
 const identity={"X-NFV-Store-Client-IP":"198.51.100.1","X-NFV-Store-Client-Time":"123","X-NFV-Store-Client-Signature":"signed"};
 const ready=routeHarness({clientIdentity:identity});await ready.call(["lookup"],{method:"POST"});
 assert.equal(ready.calls[0].init.headers["X-NFV-Store-Client-Signature"],"signed");
 const invalid=routeHarness({clientIdentity:null});const response=await invalid.call(["lookup"],{method:"POST"});
 assert.equal(response.status,503);assert.equal(invalid.calls.length,0);
});


test("concurrent guest checkout responses retain both orders in either arrival order",async()=>{
 const ids=[UUID,"22222222-2222-4222-8222-222222222222"];
 const responses=await Promise.all(ids.map(id=>routeHarness({upstream:()=>Response.json({data:{id,guest_access_token:`token-${id}`}})}).call(["checkout"],{method:"POST"})));
 for(const ordered of [responses,[...responses].reverse()]){
  const cookieJar={};
  for(const response of ordered){for(const [name,value]of response.cookies.values)cookieJar[name]=value;assert.equal((await response.clone().json()).data.guest_access_token,undefined)}
  for(const id of ids){
   const harness=routeHarness({cookieJar,storedSession:{accessToken:"expired"},authError:new Error("expired")});
   await harness.call(["orders",id]);
   assert.equal(harness.calls[0].init.headers["X-Store-Access-Token"],`token-${id}`);
   await harness.call(["orders",id,"report-transfer"],{method:"POST"});
   assert.equal(JSON.parse(harness.calls[1].init.body).access_token,`token-${id}`);
  }
 }
});

test("a dedicated order cookie never grants access to another order",async()=>{
 const other="22222222-2222-4222-8222-222222222222";
 const created=await routeHarness({upstream:()=>Response.json({data:{id:UUID,guest_access_token:"secret"}})}).call(["checkout"],{method:"POST"});
 const [name,value]=created.cookies.values[0];
 const harness=routeHarness({cookieJar:{[name]:value,[name.replace(UUID,other)]:value},upstream:(_url,init)=>{
  assert.equal(init.headers["X-Store-Access-Token"],undefined);return new Response("{}",{status:404});
 }});
 assert.equal((await harness.call(["orders",other])).status,404);
});


test("voucher preview enforces exact route, query, Origin marker and Core session before fetching",async()=>{
 for(const [options,status] of [[{method:"GET"},404],[{method:"POST",query:"?locale=vi"},404],[{method:"POST",origin:false},403],[{method:"POST",marker:false},403],[{method:"POST"},401]]){
  const harness=routeHarness({guestOrders:{[UUID]:"guest-secret"}});
  assert.equal((await harness.call(["voucher-preview"],options)).status,status);
  assert.equal(harness.calls.length,0);
 }
 const harness=routeHarness({storedSession:{accessToken:"owner-token"}}),body={locale:"vi",coupon_code:"STORE30",lines:[]};
 const result=await harness.call(["voucher-preview"],{method:"POST",body});
 assert.equal(result.status,200);assert.equal(harness.calls[0].url,"https://auth.test/api/v1/store-voucher-preview");assert.equal(harness.calls[0].init.headers.Authorization,"Bearer owner-token");assert.deepEqual(JSON.parse(harness.calls[0].init.body),body);assert.equal(result.headers.get("Cache-Control"),"private, no-store");
});
test("voucher BFF preserves backend errors and maps transport failure without inventing business rejection",async()=>{
 const body={errors:[{code:"coupon_expired"}]};
 const rejected=routeHarness({storedSession:{accessToken:"owner-token"},upstream:()=>Response.json(body,{status:400})});const result=await rejected.call(["voucher-preview"],{method:"POST"});assert.equal(result.status,400);assert.deepEqual(await result.json(),body);
 for(const [reason,status,code] of [[Error("offline"),502,"upstream_unavailable"],[new DOMException("timeout","TimeoutError"),504,"upstream_timeout"]]){
  const failed=routeHarness({storedSession:{accessToken:"owner-token"},upstream:()=>{throw reason;}});const response=await failed.call(["voucher-preview"],{method:"POST"});assert.equal(response.status,status);assert.equal((await response.json()).error,code);
 }
});
