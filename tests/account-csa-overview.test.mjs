import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("My CSA is status-only and always sends purchases back to public packages",()=>{
 const source=read("src/screens/AccountBenefits.tsx");
 assert.doesNotMatch(source,/AccountCsaPackageSelection/);
 assert.match(source,/AccountCsaUpcoming/);
 assert.match(source,/!c\?\.planName&&!upcoming\.length/);
 assert.match(source,/csaLandingHref\(ui\.locale,"packages"\)/);
 assert.match(source,/csa\.managePurchase|csa\.registerAgain|csa\.explore/);
});

test("signed-in My CSA renders one upcoming item directly and collapses multiple items",()=>{
 const source=read("src/screens/account-csa/AccountCsaUpcoming.tsx");
 assert.match(source,/items\.length===1/);
 assert.match(source,/aria-expanded/);
 assert.match(source,/setExpanded/);
 assert.match(source,/is-collapsed/);
 assert.match(source,/csa\.requestPending/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|CSA_PENDING_STORAGE_KEY|getCsaPurchaseStatus/);
});

test("upcoming CSA summary uses the compact account density",()=>{
 const css=read("app/styles/96-account-benefits.css");
 assert.match(css,/\.csa-upcoming-section,\.account-tab-csa \.csa-current-section\{padding:11px 13px/);
 assert.match(css,/\.csa-upcoming-meta\{[^}]*margin-top:6px/);
 assert.match(css,/\.csa-plan-summary \.benefit-plan-title>strong\{grid-column:1;grid-row:1;font-size:13px/);
});

test("current and upcoming CSA status badges center beside both summary rows",()=>{
 const css=read("app/styles/96-account-benefits.css");
 assert.match(css,/\.csa-plan-summary \.acc-status\{display:inline-flex;align-items:center;justify-content:center;line-height:1/);
 assert.match(css,/\.csa-plan-summary\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;align-items:center/);
 assert.match(css,/\.csa-plan-summary \.benefit-plan-title\{display:contents/);
 assert.match(css,/\.csa-plan-summary \.acc-status\{[^}]*grid-column:2;grid-row:1\/3;align-self:center/);
 assert.match(css,/\.csa-plan-summary \.csa-upcoming-meta\{grid-column:1;grid-row:2/);
});

test("current and upcoming CSA plans share the same compact summary",()=>{
 const account=read("src/screens/AccountBenefits.tsx");
 const summary=read("src/screens/account-csa/AccountCsaUpcoming.tsx");
 assert.match(summary,/export function AccountCsaPlanSummary/);
 assert.match(account,/AccountCsaPlanSummary/);
 assert.match(account,/csa\.currentPlan/);
 assert.match(account,/className="csa-current-section"/);
 assert.doesNotMatch(account,/className="benefit-section csa-current-section"/);
});

test("legacy guest tracker Account deep link redirects to the public tracker",()=>{
 const source=read("app/account/[locale]/page.tsx");
 assert.match(source,/requested==="csa-tracker"/);
 assert.match(source,/redirect\(csaTrackerHref\(locale as Locale\)\)/);
});
