import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("My CSA is status-only and always sends purchases back to public packages",()=>{
 const source=read("src/screens/AccountBenefits.tsx");
 assert.doesNotMatch(source,/AccountCsaPackageSelection/);
 assert.match(source,/AccountCsaPendingStatus/);
 assert.match(source,/csaLandingHref\(ui\.locale,"packages"\)/);
 assert.match(source,/csa\.managePurchase|csa\.registerAgain|csa\.explore/);
});

test("legacy guest tracker Account deep link redirects to the public tracker",()=>{
 const source=read("app/account/[locale]/page.tsx");
 assert.match(source,/requested==="csa-tracker"/);
 assert.match(source,/redirect\(csaTrackerHref\(locale as Locale\)\)/);
});
