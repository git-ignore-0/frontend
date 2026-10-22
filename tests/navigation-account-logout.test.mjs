import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {test} from "node:test";

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const nav=source("src/components/navigation/MainNavigation.tsx");
const drawer=source("src/components/navigation/MobileNavDrawer.tsx");
const data=source("src/data/main-navigation.ts");
const context=source("src/state/NFVContext.tsx");
const account=source("src/screens/Account.tsx");
const logout=source("src/components/auth/LogoutButton.tsx");

test("drawer shows only site links, Account and language selector",()=>{
  assert.match(nav,/MAIN_NAV_ITEMS\.map/);
  assert.match(nav,/item=\{MAIN_NAV_ACCOUNT\}/);
  assert.doesNotMatch(nav,/shortcut|Quick access|Truy cập nhanh|Khám phá NFV/);
  assert.doesNotMatch(drawer,/nfv-mobile-nav-shortcuts/);
  assert.match(drawer,/<LocaleToggle variant="drawer"\/>/);
  assert.match(data,/path:"\/account\/\{locale\}"/);
  assert.match(context,/navigationItemForPage/);
  assert.match(data,/page==="account"\s*\?\s*MAIN_NAV_ACCOUNT/);
  assert.ok(existsSync(new URL("../app/account/[locale]/page.tsx",import.meta.url)));
});

test("the single logout UI uses v2's POST route on the same origin",()=>{
  assert.match(account,/<LogoutButton variant="hub"\/>/);
  assert.match(account,/<LogoutButton variant="sidebar"\/>/);
  assert.doesNotMatch(account,/AccountLogout/);
  assert.match(logout,/export function LogoutButton/);
  const button=source("src/components/auth/LogoutButton.tsx");
  assert.match(button,/method="post" action=\{siteLogoutHref\(ui.locale\)\}/);
  assert.match(button,/externalSiteAccountHref/);
  assert.doesNotMatch(button,/await signOut|auth\.logout|window\.NFV_BACKEND/);
});

test("private state is invalidated on session loss, with stale responses blocked",()=>{
  assert.match(context,/if\(auth.status!=="authenticated"\)/);
  assert.match(context,/orders:\[\],csa:null,rewards:null,referrals:null/);
  assert.match(context,/recipient:\{\.\.\.recipientEmpty\}/);
  assert.match(context,/epoch===authEpoch\.current/);
  assert.match(context,/if\(epoch!==authEpoch\.current\)return;/);
});

test("orders list receives dedicated top spacing, including mobile",()=>{
  assert.match(source("src/screens/AccountOrders.tsx"),/id="accountOrdersList" className="account-orders-list"/);
  const css=source("app/styles/20-history-and-catalog.css");
  assert.match(css,/\.nfv-orders-section \.account-orders-list \{ margin-block-start: 16px; \}/);
  assert.match(css,/\.nfv-orders-section \.account-orders-list \{ margin-block-start: 14px; \}/);
});
