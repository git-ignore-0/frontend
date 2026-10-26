import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const context = source("src/state/NFVContext.tsx");
const address = source("src/screens/AccountProfile.tsx");
const checkout = source("src/screens/Checkout.tsx");
const account = source("src/screens/Account.tsx");
const nav = source("src/data/account-navigation.ts");
const wardHook = source("src/hooks/useWardOptions.ts");

test("Account tabs come from one definition for desktop and mobile", () => {
  for (const id of ["orders", "profile", "address", "csa", "rewards", "redeem", "referrals"]) {
    assert.match(nav, new RegExp(`id:"${id}"`));
  }
  assert.match(account, /const navigation=accountNavigationFor\(auth\.status\)/);
  assert.match(account, /navigation\.map\(/);
  assert.match(account, /navigation\.filter\(/);
  assert.match(account, /\.map\(renderHubLink\)/);
  assert.doesNotMatch(account, /const ACCOUNT_TABS|const TABS_WITH_DESCRIPTION/);
});

test("Account moves keyboard focus to detail and back to the selected Hub link", () => {
  assert.match(account, /headingRef\.current\?\.focus\(\)/);
  assert.match(account, /hubLinkRefs\.current\[activeTab\]\?\.focus\(\)/);
  assert.match(account, /tabIndex=\{-1\}/);
  assert.match(account, /nextFocus\.current="hub"/);
});

test("Ward options are fetched for saved addresses and failed fetches can be retried", () => {
  assert.match(wardHook, /useEffect\(/);
  assert.match(wardHook, /loadWards\(city\)/);
  assert.match(wardHook, /retry:\(\)=>loadWards\(city,true\)/);
  assert.match(address, /useWardOptions\(value\.city\)/);
  assert.match(address, /wardOptions\.options\.includes\(value\.ward\)/);
  assert.match(address, /wardOptions\.error.*copy\.retry/);
});

test("Ward fetch has in-flight de-duplication and separate ready/error statuses", () => {
  assert.match(context, /wardRequests\.current\.get\(province\)/);
  assert.match(context, /wardRequests\.current\.set\(province,request\)/);
  assert.match(context, /loadedWards\.current\.add\(province\)/);
  assert.match(context, /\[province\]:"ready"/);
  assert.match(context, /\[province\]:"error"/);
  assert.doesNotMatch(context, /catch\s*\{setData\(s=>\(\{\.\.\.s,wards:\{\.\.\.s\.wards,\[province\]:\[\]/);
});

test("Checkout validates saved wards before submission and offers recovery", () => {
  assert.match(checkout, /useWardOptions\(ui\.recipient\.city\)/);
  assert.match(checkout, /wardOptions\.loading&&/);
  assert.match(checkout, /wardOptions\.error&&/);
  assert.match(checkout, /setValidation\(recipientErrors\)/);
  assert.match(checkout, /checkoutStep:0,checkoutEditRecipient:true,checkoutEditFromReview:false/);
});

test("Cancel from review restores pre-edit recipient, and changed address invalidates coupon", () => {
  assert.match(checkout, /reviewRecipient\.current=\{\.\.\.ui\.recipient\}/);
  assert.match(checkout, /recipient:reviewRecipient\.current\?\?ui\.recipient/);
  assert.match(checkout, /onChange=\{recipient=>\{patch\(\{recipient,couponCode:"",couponAmount:0/);
});

test("Concurrent API actions maintain per-key busy state and reject duplicate submissions", () => {
  assert.match(context, /new Set<string>\(\)/);
  assert.match(context, /activeActions\.current\.has\(key\)/);
  assert.match(context, /activeActions\.current\.add\(key\)/);
  assert.match(context, /busyKeys:\[\.\.\.s\.busyKeys,key\]/);
  assert.match(context, /busyKeys:s\.busyKeys\.filter\(item=>item!==key\)/);
  assert.doesNotMatch(context, /busy:null/);
  assert.match(checkout, /act\("place-order"/);
});

test("CSA prices are clearly provisional without a defined backend quote schema", () => {
  assert.match(checkout, /copy\.provisionalTotal/);
  assert.match(checkout, /copy\.csaNotDeducted/);
  assert.match(checkout, /copy\.shippingExcluded/);
});

test("Account stylesheet no longer contains shared transaction history selectors", () => {
  const css = source("app/styles/30-account-navigation.css");
  const history = source("app/styles/20-history-and-catalog.css");
  assert.doesNotMatch(css, /\.history-item\{|\.hist-status-filter\{|\.acc-status\[data-status-badge\]/);
  assert.match(history, /\.history-item\{/);
  assert.match(history, /\.hist-status-filter\{/);
});
