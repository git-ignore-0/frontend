import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const root=resolve(import.meta.dirname,"..");
const read=path=>readFileSync(resolve(root,path),"utf8");

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

test("Store detail presents discovery data without order controls",()=>{
 const detail=read("src/screens/store/ProductDetail.tsx");
 assert.match(detail,/product\.retail_price_vnd/);
 assert.match(detail,/product\.unit_size/);
 assert.match(detail,/product\.category\.name/);
 assert.match(detail,/product\.suppliers/);
 assert.match(detail,/product\.csa_eligible/);
 assert.match(detail,/href=\{`\/store\/\$\{locale\}`\}/);
 assert.doesNotMatch(detail,/addCart|Quantity|buy-row|mobile-sticky/);
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
