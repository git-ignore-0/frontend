import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const root=new URL("../",import.meta.url);
const require=createRequire(import.meta.url);
const ts=require("typescript");

function transpile(path,{jsx=false}={}){
  return ts.transpileModule(readFileSync(new URL(path,root),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})},
  }).outputText;
}

function loadRequestLocale(){
  const path=new URL("src/lib/request-locale.ts",root);
  assert.equal(existsSync(path),true,"request locale resolver must exist");
  const exports={};
  vm.runInNewContext(transpile("src/lib/request-locale.ts"),{exports,URL,URLSearchParams});
  return exports;
}

test("request locale follows the route suffix and only honors referral locale queries",()=>{
  const {requestLocale}=loadRequestLocale();
  for(const path of ["/en","/about/en","/workshops/living-soil/en","/login/en"]){
    assert.equal(requestLocale(new URL(`https://site.test${path}`)),"en",path);
  }
  assert.equal(requestLocale(new URL("https://site.test/share/ref/CODE?locale=en")),"en");
  assert.equal(requestLocale(new URL("https://site.test/ref/CODE?locale=en")),"en");
  assert.equal(requestLocale(new URL("https://site.test/vi?locale=en")),"vi");
  assert.equal(requestLocale(new URL("https://site.test/tracker/fr")),"vi");
});

test("proxy forwards the derived locale as an internal request header",()=>{
  const requestLocale=loadRequestLocale();
  const proxyPath=new URL("proxy.ts",root);
  assert.equal(existsSync(proxyPath),true,"Next proxy must exist");
  const exports={};
  vm.runInNewContext(transpile("proxy.ts"),{
    exports,Headers,
    require:id=>{
      if(id==="next/server")return require("next/server");
      if(id==="@/lib/request-locale")return requestLocale;
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const {NextRequest}=require("next/server");
  const response=exports.proxy(new NextRequest("https://site.test/about/en"));
  assert.equal(response.headers.get("x-middleware-request-x-nfv-locale"),"en");
});

test("root layout renders the document language from the trusted proxy header",async()=>{
  const exports={};
  vm.runInNewContext(transpile("app/layout.tsx",{jsx:true}),{
    exports,URL,
    require:id=>{
      if(id==="next/headers")return {headers:async()=>new Headers({"x-nfv-locale":"en"})};
      if(id==="@/config/site-brand")return {SITE_ORIGIN:"https://site.test"};
      if(id==="react/jsx-runtime")return require("react/jsx-runtime");
      if(id.endsWith(".css"))return {};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const document=await exports.default({children:"content"});
  assert.equal(document.type,"html");
  assert.equal(document.props.lang,"en");
});
