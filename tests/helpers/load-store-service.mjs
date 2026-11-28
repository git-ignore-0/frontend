import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";

const ts=createRequire(import.meta.url)("typescript");
const src=new URL("../../src/",import.meta.url);

export function loadStoreService(fetcher,stubs={}){
  const modules=new Map();
  function load(url){
    const sourceUrl=new URL(url.href.endsWith(".ts")?url.href:`${url.href}.ts`);
    if(modules.has(sourceUrl.href))return modules.get(sourceUrl.href);
    const exports={};
    modules.set(sourceUrl.href,exports);
    const source=ts.transpileModule(readFileSync(sourceUrl,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(source,{exports,URL,URLSearchParams,Headers,DOMException,Response,AbortSignal,fetch:fetcher,require:name=>{
      if(name in stubs)return stubs[name];
      if(name==="@/config/site-brand")return {SITE_ORIGIN:"https://naturalfarmingvietnam.com"};
      return load(name.startsWith("@/")?new URL(name.slice(2),src):new URL(name,sourceUrl));
    }});
    return exports;
  }
  return load(new URL("store/store-order-service.ts",src));
}
