import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=path=>readFileSync(join(root,path),"utf8");
const require=createRequire(import.meta.url);const ts=require("typescript");
function moduleFrom(path){const exp={};const code=ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports:exp,require:()=>({}),URLSearchParams});return exp}

test("Store URL state round-trips search, facets, sort and page with exact defaults",()=>{
 const request=moduleFrom("src/store/store-request.ts");
 const parsed=request.parseStoreUrlState(new URLSearchParams("search=tomato&category_id=e55e4778-0528-4594-a4bf-cab97007c50f&csa_eligible=true&price=mid&sort=price_desc&page=3"),"en");
 assert.deepEqual(JSON.parse(JSON.stringify(parsed.query)),{locale:"en",search:"tomato",categoryId:"e55e4778-0528-4594-a4bf-cab97007c50f",csaEligible:true,priceMin:25000,priceMax:35000,sort:"price_desc",page:3,pageSize:12});
 assert.equal(parsed.priceBand,"mid");
 assert.equal(request.storePublicSearchParams(parsed.query,parsed.priceBand).toString(),"search=tomato&category_id=e55e4778-0528-4594-a4bf-cab97007c50f&csa_eligible=true&price=mid&sort=price_desc&page=3");
 assert.deepEqual(JSON.parse(JSON.stringify(request.parseStoreUrlState(new URLSearchParams(),"vi").query)),{locale:"vi",sort:"default",page:1,pageSize:12});
});

test("Store URL parser canonicalizes malformed public query values to safe defaults",()=>{
 const request=moduleFrom("src/store/store-request.ts");
 const parsed=request.parseStoreUrlState(new URLSearchParams("search="+"x".repeat(101)+"&category_id=bad&csa_eligible=yes&price=unknown&sort=featured&page=0&junk=1"),"vi");
 assert.deepEqual(JSON.parse(JSON.stringify(parsed.query)),{locale:"vi",sort:"default",page:1,pageSize:12});
 assert.equal(parsed.priceBand,"all");
 assert.equal(parsed.canonical.toString(),"");
});

test("Store recovers empty out-of-range pages with a replace navigation",()=>{
 const store=source("src/screens/Store.tsx");
 assert.match(store,/catalog\.state==="ready"&&catalog\.products\.length===0&&catalog\.query\.page>1/);
 assert.match(store,/setQuery\(\{page:totalPages\},\{replace:true\}\)/);
 const hook=source("src/store/useStoreCatalog.ts");
 assert.match(hook,/options\?:\{replace\?:boolean\}/);
 assert.match(hook,/options\?\.replace\?router\.replace:router\.push/);
});

test("Store search input enforces the public API maximum length",()=>{
 const store=source("src/screens/Store.tsx");
 assert.match(store,/maxLength=\{100\}/);
 const ui=source("src/components/UI.tsx");
 assert.match(ui,/maxLength\?:number/);
 assert.match(ui,/maxLength=\{maxLength\}/);
});

test("Store catalog hook owns cancellable keyed requests and independent retry states",()=>{
 const hook=source("src/store/useStoreCatalog.ts");
 assert.match(hook,/AbortController/);
 assert.match(hook,/productRequestKey/);
 assert.match(hook,/categoryRetry/);
 assert.match(hook,/productRetry/);
 assert.match(hook,/productRetry\.key===productBaseKey/);
 assert.match(hook,/categoryRetry\.key===categoryBaseKey/);
 assert.match(hook,/\/api\/store\/categories/);
 assert.match(hook,/\/api\/store\/products/);
});

test("Store UI uses localized API states, native detail links and server pagination",()=>{
 const store=source("src/screens/Store.tsx");
 const copy=source("src/data/store-copy.ts");
 assert.match(copy,/vi:/);assert.match(copy,/en:/);
 assert.match(store,/useStoreCatalog/);
 assert.match(store,/href=\{`\/store\/\$\{product\.slug\}\/\$\{locale\}`\}/);
 assert.match(store,/kind="loading"/);
 assert.match(store,/kind="error"/);
 assert.match(store,/meta\.total/);
 assert.match(store,/copy\.previous/);
 assert.match(store,/copy\.next/);
 assert.doesNotMatch(store,/addCart|className="add-mini"/);
});

test("Store hero uses a localized real image without the NFV STORE eyebrow",()=>{
 const store=source("src/screens/Store.tsx");
 const copy=source("src/data/store-copy.ts");
 const css=source("app/styles/00-foundation-and-store.css");
 assert.doesNotMatch(store,/copy\.eyebrow/);
 assert.doesNotMatch(copy,/eyebrow:"NFV STORE"/);
 assert.match(store,/<Photo src="\/images\/harvest\.webp" alt=\{copy\.welcomeImageAlt\}/);
 assert.match(copy,/welcomeImageAlt:/);
 assert.match(css,/\.welcome-media img:not\(\[src=""\]\) \+ \.photo-fallback\{display:none\}/);
 assert.match(css,/\.welcome-media img\.img-error \+ \.photo-fallback\{display:flex\}/);
 assert.match(css,/\.welcome-media::after\{display:block;border:0;background:linear-gradient\(90deg,/);
});

test("Clear filters resets URL state and closes the mobile filter dialog",()=>{
 const store=source("src/screens/Store.tsx");
 assert.match(store,/const clearFilters=\(\)=>\{setQuery\(\{search:undefined,categoryId:undefined,csaEligible:undefined,priceBand:"all",sort:"default",page:1\}\);setFilterOpen\(false\);\}/);
});

test("Global context no longer treats optional window functions as the Store data source",()=>{
 const context=source("src/state/NFVContext.tsx");
 const types=source("src/types.ts");
 assert.doesNotMatch(context,/normalizeProducts|getProducts|getCategories/);
 assert.doesNotMatch(types,/getProducts\?|getCategories\?/);
});
