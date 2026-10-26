import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,join,resolve} from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const ts=require("typescript");

function load(path,requireStub,globals={}){
  assert.equal(existsSync(join(root,path)),true,`${path} must exist`);
  const code=ts.transpileModule(readFileSync(join(root,path),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:requireStub,URL,Headers,Request,Response,AbortSignal,DOMException,...globals});
  return exports;
}

function bffModel(){return load("src/account/bff-path.ts",()=>({}));}

test("guest CSA BFF allowlists only the required public purchase, administrative and tracker endpoints",()=>{
  const {accountUpstreamTarget}=bffModel();
  const target=(path,method)=>JSON.parse(JSON.stringify(accountUpstreamTarget(path,method)));
  assert.deepEqual(target(["administrative-provinces"],"GET"),{path:"/api/v1/administrative-units/provinces",session:"none",query:"none"});
  assert.deepEqual(target(["administrative-wards"],"GET"),{path:"/api/v1/administrative-units/wards",session:"none",query:"administrative-wards"});
  assert.deepEqual(target(["csa-payment-quotes"],"POST"),{path:"/api/v1/public/csa-payment-quotes",session:"optional",query:"none"});
  assert.deepEqual(target(["csa-confirm-transfer"],"POST"),{path:"/api/v1/public/csa-purchase-requests/confirm-transfer",session:"optional",query:"none"});
  assert.deepEqual(target(["csa-contract-tracker","lookup"],"POST"),{path:"/api/v1/public/csa-contract-tracker/lookup",session:"none",query:"none",trackerCookie:true});
  assert.deepEqual(target(["csa-contract-tracker","contract"],"GET"),{path:"/api/v1/public/csa-contract-tracker/contract",session:"none",query:"none",trackerCookie:true});
  assert.deepEqual(target(["csa-contract-tracker","contract","pdf"],"GET"),{path:"/api/v1/public/csa-contract-tracker/contract/pdf",session:"none",query:"tracker-pdf",trackerCookie:true});
  assert.equal(target(["csa-contract-tracker","lookup"],"GET"),null);
  assert.equal(target(["csa-contract-tracker","contract","secret"],"GET"),null);
  assert.equal(target(["administrative-provinces"],"POST"),null);
});

test("guest CSA BFF validates ward and tracker PDF queries exactly",()=>{
  const {accountQueryAllowed}=bffModel();
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/administrative-wards?province=66"),"administrative-wards"),true);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/administrative-wards"),"administrative-wards"),false);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/administrative-wards?province=66&extra=1"),"administrative-wards"),false);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/tracker/pdf?locale=vi"),"tracker-pdf"),true);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/tracker/pdf?locale=en&version_id=11111111-1111-4111-8111-111111111111"),"tracker-pdf"),true);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/tracker/pdf?locale=fr"),"tracker-pdf"),false);
  assert.equal(accountQueryAllowed(new URL("https://site/api/account/tracker/pdf?locale=vi&version_id=../secret"),"tracker-pdf"),false);
});

function routeHarness({session=null,responseFactory,authUnavailable=false}={}){
  const calls=[];
  class StubAuthServiceUnavailableError extends Error{}
  const route=load("app/api/account/[...path]/route.ts",id=>{
    if(id==="next/server")return {NextResponse:class NextResponse extends Response{static json(body,init){return new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json",...init?.headers}});}}};
    if(id==="@/account/bff-path")return bffModel();
    if(id==="@/auth/server/config")return {authOrigin:()=>"https://auth.example.test",publicSiteOrigin:()=>"https://site.example.test"};
    if(id==="@/auth/server/oauth")return {AuthServiceUnavailableError:StubAuthServiceUnavailableError,currentPublicSession:async value=>{if(authUnavailable)throw new StubAuthServiceUnavailableError("unavailable");return value;},sessionTokensChanged:()=>false};
    if(id==="@/auth/server/session")return {clearSession:async()=>{},readSession:async()=>session,writeSession:async()=>{}};
    throw new Error(`Unexpected import ${id}`);
  },{fetch:async(target,init)=>{calls.push({target:String(target),init});return responseFactory?responseFactory(target,init):new Response(JSON.stringify({data:{}}),{status:200,headers:{"Content-Type":"application/json"}});}});
  return {route,calls};
}

test("optional purchase session works for guests and keeps the same-origin mutation guard",async()=>{
  const guest=routeHarness();
  const valid=new Request("https://site.example.test/api/account/csa-payment-quotes",{method:"POST",headers:{Origin:"https://site.example.test","X-NFV-Public-Request":"1","Content-Type":"application/json"},body:"{}"});
  assert.equal((await guest.route.POST(valid,{params:Promise.resolve({path:["csa-payment-quotes"]})})).status,200);
  assert.equal(guest.calls[0].init.headers.Authorization,undefined);

  const attack=new Request("https://site.example.test/api/account/csa-payment-quotes",{method:"POST",headers:{Origin:"https://evil.example","X-NFV-Public-Request":"1","Content-Type":"application/json"},body:"{}"});
  assert.equal((await guest.route.POST(attack,{params:Promise.resolve({path:["csa-payment-quotes"]})})).status,403);
  assert.equal(guest.calls.length,1);
});

test("optional purchase session returns 502 when an existing session cannot be verified",async()=>{
  const harness=routeHarness({session:{accessToken:"stored"},authUnavailable:true});
  const request=new Request("https://site.example.test/api/account/csa-payment-quotes",{method:"POST",headers:{Origin:"https://site.example.test","X-NFV-Public-Request":"1","Content-Type":"application/json"},body:"{}"});
  const response=await harness.route.POST(request,{params:Promise.resolve({path:["csa-payment-quotes"]})});
  assert.equal(response.status,502);
  assert.equal(harness.calls.length,0);
});

test("tracker BFF forwards only its bounded cookie and rewrites the upstream cookie path",async()=>{
  const harness=routeHarness({responseFactory:()=>new Response(JSON.stringify({data:{}}),{status:200,headers:{"Content-Type":"application/json","Set-Cookie":"nfv_csa_tracker=replaced; Path=/api/v1/public/csa-contract-tracker; Max-Age=600; HttpOnly; Secure; SameSite=Lax"}})});
  const request=new Request("https://site.example.test/api/account/csa-contract-tracker/lookup",{method:"POST",headers:{Origin:"https://site.example.test","X-NFV-Public-Request":"1","Content-Type":"application/json",Cookie:"nfv_csa_tracker=opaque-value; oauth_cookie=never-forward"},body:"{}"});
  const response=await harness.route.POST(request,{params:Promise.resolve({path:["csa-contract-tracker","lookup"]})});
  assert.equal(harness.calls[0].init.headers.Cookie,"nfv_csa_tracker=opaque-value");
  assert.match(response.headers.get("set-cookie")||"",/Path=\/api\/account\/csa-contract-tracker/i);
  assert.doesNotMatch(response.headers.get("set-cookie")||"",/oauth_cookie/);
});

test("tracker BFF streams PDF headers and rejects invalid queries before upstream",async()=>{
  const harness=routeHarness({responseFactory:()=>new Response("pdf",{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=contract.pdf","X-Content-Type-Options":"nosniff"}})});
  const valid=new Request("https://site.example.test/api/account/csa-contract-tracker/contract/pdf?locale=vi",{headers:{Cookie:"nfv_csa_tracker=opaque-value"}});
  const response=await harness.route.GET(valid,{params:Promise.resolve({path:["csa-contract-tracker","contract","pdf"]})});
  assert.equal(response.headers.get("content-disposition"),"attachment; filename=contract.pdf");
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");

  const invalid=new Request("https://site.example.test/api/account/csa-contract-tracker/contract/pdf?locale=fr");
  assert.equal((await harness.route.GET(invalid,{params:Promise.resolve({path:["csa-contract-tracker","contract","pdf"]})})).status,400);
  assert.equal(harness.calls.length,1);
});
