import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const ts=require("typescript");
const modelUrl=new URL("../src/screens/account-csa/csa-terms-model.ts",import.meta.url).href;
const clientUrl=new URL("../src/screens/account-csa/csa-terms-client.ts",import.meta.url).href;

function runModel(script){
  const {spawnSync}=require("node:child_process");
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`const model=await import(${JSON.stringify(modelUrl)});${script}`],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

function routeHarness({origin="https://auth.test",payload,upstreamStatus=200}={}){
  const source=readFileSync(new URL("../app/api/csa-terms/route.ts",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const calls=[];
  const json=(body,init={})=>new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json",...(init.headers??{})}});
  vm.runInNewContext(compiled,{
    exports,URL,Request,Response,AbortSignal,
    fetch:async (url,options)=>{calls.push({url,options});const locale=new URL(url).searchParams.get("locale");return json(payload??{data:{version:"CSA_TERMS_V3",locale,content:{title:"CSA terms",sections:[{key:"delivery",heading:"Delivery",paragraphs:["Friday delivery."]}]},hash:"a".repeat(64)}},{status:upstreamStatus});},
    require:id=>{
      if(id==="next/server")return {NextResponse:{json}};
      if(id==="@/lib/public-workshop")return {getPublicContentOrigin:()=>origin};
      if(id==="@/screens/account-csa/csa-terms-model")return {parseCsaTerms:value=>value.data};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return {route:exports,calls};
}

test("public CSA terms parser preserves the published version, hash and ordered clauses",()=>runModel(`
  const raw={data:{version:'CSA_TERMS_V3',locale:'vi',content:{title:'Điều khoản CSA',sections:[{key:'delivery',heading:'',paragraphs:['Giao vào thứ Sáu.']},{key:'contact',heading:'Liên hệ',paragraphs:['Dùng Zalo.','Báo khi đổi địa chỉ.']}]},hash:'${"a".repeat(64)}'}};
  assert.deepEqual(model.parseCsaTerms(raw),raw.data);
`));

test("public CSA terms parser rejects malformed or duplicate clauses",()=>runModel(`
  const valid={data:{version:'CSA_TERMS_V3',locale:'en',content:{title:'CSA terms',sections:[{key:'delivery',heading:'Delivery',paragraphs:['Friday delivery.']}]},hash:'${"b".repeat(64)}'}};
  for(const data of [
    {...valid,data:{...valid.data,hash:'short'}},
    {...valid,data:{...valid.data,locale:'fr'}},
    {...valid,data:{...valid.data,content:{...valid.data.content,sections:[]}}},
    {...valid,data:{...valid.data,content:{...valid.data.content,sections:[valid.data.content.sections[0],valid.data.content.sections[0]]}}},
  ])assert.throws(()=>model.parseCsaTerms(data));
`));

test("CSA acceptance identity changes when either version or hash changes",()=>runModel(`
  const base={version:'CSA_TERMS_V3',locale:'en',content:{title:'CSA terms',sections:[{key:'delivery',heading:'',paragraphs:['Friday delivery.']}]},hash:'${"d".repeat(64)}'};
  assert.notEqual(model.csaTermsAcceptanceKey(base),model.csaTermsAcceptanceKey({...base,version:'CSA_TERMS_V4'}));
  assert.notEqual(model.csaTermsAcceptanceKey(base),model.csaTermsAcceptanceKey({...base,hash:'${"e".repeat(64)}'}));
`));

test("CSA terms client requests the selected locale and validates the response",()=>{
  const {spawnSync}=require("node:child_process");
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`
    const calls=[];
    globalThis.fetch=async (url,options)=>{calls.push({url,options});return new Response(JSON.stringify({data:{version:'CSA_TERMS_V3',locale:'en',content:{title:'CSA terms',sections:[{key:'delivery',heading:'Delivery',paragraphs:['Friday delivery.']}]},hash:'${"c".repeat(64)}'}}),{status:200,headers:{'Content-Type':'application/json'}})};
    const client=await import(${JSON.stringify(clientUrl)});
    const terms=await client.fetchCsaTerms('en');
    if(terms.locale!=='en'||calls[0].url!=='/api/csa-terms?locale=en'||calls[0].options.cache!=='no-store')process.exit(1);
  `],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test("CSA terms BFF forwards the selected locale to the public Backend endpoint",async()=>{
  const {route,calls}=routeHarness();
  const response=await route.GET(new Request("http://site.test/api/csa-terms?locale=en"));
  assert.equal(response.status,200);
  assert.equal((await response.json()).data.locale,"en");
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,"https://auth.test/api/v1/public/csa-terms?locale=en");
});

test("CSA terms BFF reports missing configuration and upstream failure",async()=>{
  const missing=routeHarness({origin:null});
  assert.equal((await missing.route.GET(new Request("http://site.test/api/csa-terms?locale=vi"))).status,503);
  const failed=routeHarness({payload:{error:"bad"},upstreamStatus:500});
  assert.equal((await failed.route.GET(new Request("http://site.test/api/csa-terms?locale=vi"))).status,502);
});
