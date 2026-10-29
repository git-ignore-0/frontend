import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("CSA purchase and tracker are dedicated public routes",()=>{
 for(const path of ["app/csa/purchase/[locale]/page.tsx","app/csa/track/[locale]/page.tsx"])assert.equal(existsSync(new URL(`../${path}`,import.meta.url)),true,path);
 const purchase=read("app/csa/purchase/[locale]/page.tsx"),tracker=read("app/csa/track/[locale]/page.tsx");
 assert.match(purchase,/csaFlowMetadata\("purchase",locale\)/);
 assert.match(purchase,/<NFVApp initialPage="csa" initialLocale=/);
 assert.match(purchase,/<CsaPurchasePage/);
 assert.match(purchase,/initialPackagePage/);
 assert.match(tracker,/csaFlowMetadata\("track",locale\)/);
 assert.match(tracker,/<NFVApp initialPage="csa" initialLocale=/);
 assert.match(tracker,/<CsaTrackerPublicPage/);
});

test("public CSA page wrappers contain no Account navigation chrome",()=>{
 const purchase=read("src/screens/csa/CsaPurchasePage.tsx"),tracker=read("src/screens/csa/CsaTrackerPublicPage.tsx");
 assert.match(purchase,/csa-purchase-page/);
 assert.match(tracker,/csa-tracker-public-page/);
 assert.doesNotMatch(purchase+tracker,/account-side|GuestAuthActions|account-mobile-hub/);
});
