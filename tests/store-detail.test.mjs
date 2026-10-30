import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readdirSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import vm from "node:vm";

const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(resolve(root,path),"utf8");
const require=createRequire(import.meta.url);

function loadUi(){
 const ts=require("typescript"),loadedModule={exports:{}};
 const code=ts.transpileModule(read("src/components/UI.tsx"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:loadedModule.exports,module:loadedModule,require});
 return loadedModule.exports;
}

test("Store detail is a real localized server route with explicit status handling",()=>{
 const page=read("app/store/[segment]/[locale]/page.tsx");
 assert.match(page,/fetchStoreProduct/);
 assert.match(page,/StoreUpstreamError/);
 assert.match(page,/error\.status===404.*notFound\(\)/s);
 assert.match(page,/validLocale/);
 assert.match(page,/validSlug/);
 assert.match(page,/parseRetryCacheBypass/);
 assert.match(page,/<ProductDetail product=\{product\} locale=\{locale\}/);
});

test("Store detail metadata provides locale alternates and noindexes fallback content",()=>{
 const metadata=read("src/lib/public-metadata.ts");
 assert.match(metadata,/storeProductMetadata/);
 assert.match(metadata,/product\.available_locales/);
 assert.match(metadata,/product\.is_fallback\?\{index:false,follow:true\}/);
 assert.match(metadata,/`\/store\/\$\{slug\}\/\$\{locale\}`/);
});

test("Store detail presents product data without the supplier placeholder",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 assert.match(detail,/product\.retail_price_vnd/);
 assert.match(detail,/product\.unit_size/);
 assert.match(detail,/product\.category\.name/);
 assert.doesNotMatch(detail,/product\.suppliers|sourceEmpty|Nguồn cung|Suppliers/);
 assert.match(detail,/product\.csa_quota_group/);
 assert.doesNotMatch(detail,/product\.csa_eligible/);
 assert.match(detail,/href=\{`\/store\/\$\{locale\}`\}/);
 assert.doesNotMatch(detail,/useNFV|mobile-sticky/);
});

test("Store detail has local quantity controls and an add-to-cart UI button",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 assert.match(detail,/^"use client";/);
 assert.match(detail,/useState\(1\)/);
 assert.match(detail,/<Quantity[^>]*count=\{quantity\}[^>]*onMinus=\{\(\)=>setQuantity\(value=>Math\.max\(1,value-1\)\)\}[^>]*onPlus=\{\(\)=>setQuantity\(value=>Math\.min\(99,value\+1\)\)\}/);
 assert.match(detail,/className="buy-row"/);
 assert.match(detail,/<Button><Icon name="bag"[^>]*\/> \{copy\.addCart\}<\/Button>/);
 assert.match(detail,/addCart:"Thêm vào giỏ hàng"/);
 assert.match(detail,/addCart:"Add to cart"/);
});

test("Store detail purchase controls remain visible at mobile breakpoints",()=>{
 const postcss=require("postcss");
 const stylesDir=resolve(root,"app/styles");
 const stylesheet=readdirSync(stylesDir).filter(file=>file.endsWith(".css")).sort().map(file=>readFileSync(resolve(stylesDir,file),"utf8")).join("\n");
 const hidden=[];
 postcss.parse(stylesheet).walkDecls("display",declaration=>{
  if(declaration.value.trim()!=="none"||declaration.parent.type!=="rule"||!declaration.parent.selectors.includes(".detail-info .buy-row"))return;
  for(let node=declaration.parent.parent;node;node=node.parent){
   if(node.type==="atrule"&&node.name==="media"&&/max-width\s*:\s*(?:[0-5]?\d{1,2}|600)px/.test(node.params))hidden.push(node.params);
  }
 });
 assert.deepEqual(hidden,[]);
});

test("Store detail quantity control cannot shrink and clip its step buttons",()=>{
 const postcss=require("postcss");
 const stylesDir=resolve(root,"app/styles");
 const stylesheet=readdirSync(stylesDir).filter(file=>file.endsWith(".css")).sort().map(file=>readFileSync(resolve(stylesDir,file),"utf8")).join("\n");
 let preventsShrink=false;
 postcss.parse(stylesheet).walkRules(rule=>{
  if(!rule.selectors.includes(".buy-row .qty"))return;
  rule.walkDecls(declaration=>{
   if(declaration.prop==="flex"&&declaration.value.trim()==="none"||declaration.prop==="flex-shrink"&&declaration.value.trim()==="0")preventsShrink=true;
  });
 });
 assert.equal(preventsShrink,true);
});

test("Store detail shows the localized CSA quota group and point cost",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 assert.match(detail,/formatCsaQuotaBadge/);
 assert.match(detail,/product\.csa_quota_group&&<span className="status">\{formatCsaQuotaBadge\(product\.csa_quota_group,locale\)\}<\/span>/);
 assert.doesNotMatch(detail,/csa:"Có thể dùng quyền lợi CSA"|csa:"CSA-eligible"/);
});

test("Store detail shows one localized name and keeps price with unit",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 const css=read("app/styles/00-foundation-and-store.css");
 assert.match(detail,/<h1>\{product\.name\}<\/h1>/);
 assert.doesNotMatch(detail,/product\.alternate_name/);
 assert.match(detail,/className="detail-price-line"><div className="detail-price">\{money\(product\.retail_price_vnd\)\}<\/div><div className="detail-unit">\/ \{formatUnitSize\(product\.unit_size\)\} \{product\.unit_label\}/);
 assert.doesNotMatch(detail,/copy\.unit|Giá theo quy cách|Price per selling unit/);
 assert.match(css,/\.detail-price-line\{[^}]*display:flex;[^}]*align-items:baseline;/);
});

test("Store detail main image and thumbnails use the shared corner radius",()=>{
 const css=read("app/styles/00-foundation-and-store.css");
 assert.match(css,/\.detail-photo,\.detail-thumb\{[^}]*border-radius:var\(--radius\)/);
 assert.doesNotMatch(css,/\.detail-(?:photo|thumb)\{[^}]*border-radius:4px/);
});

test("Photo does not cover a valid product image with its empty fallback",()=>{
 const React=require("react"),{renderToStaticMarkup}=require("react-dom/server"),{Photo}=loadUi();
 const markup=renderToStaticMarkup(React.createElement(Photo,{src:"https://example.test/product.webp",alt:"Product"}));
 assert.match(markup,/<img[^>]+src="https:\/\/example\.test\/product\.webp"/);
 assert.doesNotMatch(markup,/photo-fallback|Chưa có ảnh/);
});

test("Photo retries when its source changes after an image error",()=>{
 const ui=read("src/components/UI.tsx");
 assert.match(ui,/const \[failedSrc,setFailedSrc\]=useState<string>\(\)/);
 assert.match(ui,/failedSrc===src/);
 assert.match(ui,/onError=\{\(\)=>setFailedSrc\(src\)\}/);
 assert.doesNotMatch(ui,/const \[broken,setBroken\]=useState\(false\)/);
});

test("Store detail description uses the full-width one-column panel and shared heading typography",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 const css=read("app/styles/00-foundation-and-store.css");
 assert.match(detail,/className="detail-tabs"[\s\S]*<h2>/);
 assert.match(css,/\.detail-tabs\{[^}]*grid-template-columns:1fr;/);
 assert.match(css,/\.detail-tabs h2,/);
});

test("Store detail error boundary retries through a bounded URL nonce",()=>{
 const boundary=read("app/store/[segment]/[locale]/error.tsx");
 assert.match(boundary,/useSearchParams/);
 assert.match(boundary,/current>=10_000\?1:current\+1/);
 assert.match(boundary,/params\.set\("retry"/);
 assert.match(boundary,/router\.replace/);
});
