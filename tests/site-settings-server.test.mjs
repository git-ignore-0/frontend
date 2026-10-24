import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const ts=require("typescript");

function loadServerSettings(){
  const source=readFileSync(new URL("../src/lib/site-settings-server.ts",import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(code,{
    exports,AbortSignal,process:{env:{NODE_ENV:"test"}},
    require:id=>{
      if(id==="server-only")return {};
      if(id==="next/cache")return {unstable_cache:fn=>fn};
      if(id==="@/lib/public-workshop")return {
        getPublicContentOrigin:()=>"https://content.example",
        workshopFetchOptions:()=>({}),
      };
      if(id==="@/lib/public-settings")return {parseSettings:value=>value};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

test("server site settings use a sub-second default failure budget",async()=>{
  const fetcher=(_url,{signal})=>new Promise((_resolve,reject)=>{
    signal.addEventListener("abort",()=>reject(signal.reason),{once:true});
  });
  const server=loadServerSettings();
  const started=Date.now();
  const keepAlive=setTimeout(()=>{},1500);
  const result=await server.fetchPublicSiteSettings("vi",{fetcher});
  clearTimeout(keepAlive);
  assert.equal(result,null);
  assert.ok(Date.now()-started<1000,"settings fallback must not hold primary HTML open");
});

test("server site settings parse a successful public response",async()=>{
  const settings={email:"hello@example.com",links:[]};
  const fetcher=async()=>({ok:true,json:async()=>({data:settings})});
  const server=loadServerSettings();
  assert.deepEqual(JSON.parse(JSON.stringify(await server.fetchPublicSiteSettings("en",{fetcher,timeoutMs:15}))),settings);
});
