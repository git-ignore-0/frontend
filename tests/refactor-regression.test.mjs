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

test("Account delivery address uses the supported shipping-area API while Checkout keeps its existing ward lookup", () => {
  assert.match(wardHook, /useEffect\(/);
  assert.match(wardHook, /loadWards\(city\)/);
  assert.match(wardHook, /retry:\(\)=>loadWards\(city,true\)/);
  assert.match(address, /useSupportedShippingAreas\(ui\.locale\)/);
  assert.match(address, /ShippingAddressFields/);
  assert.match(address, /shipping\.error/);
  assert.match(address, /onRetry=\{shipping\.retry\}/);
  assert.doesNotMatch(address, /useWardOptions/);
});

test("Ward fetch has in-flight de-duplication and separate ready/error statuses", () => {
  assert.match(context, /wardRequests\.current\.get\(province\)/);
  assert.match(context, /wardRequests\.current\.set\(province,request\)/);
  assert.match(context, /loadedWards\.current\.add\(province\)/);
  assert.match(context, /\[province\]:"ready"/);
  assert.match(context, /\[province\]:"error"/);
  assert.doesNotMatch(context, /catch\s*\{setData\(s=>\(\{\.\.\.s,wards:\{\.\.\.s\.wards,\[province\]:\[\]/);
});

test("Checkout validates a versioned saved address and supported shipping quote before submission", () => {
  assert.match(checkout, /address\?\.updatedAt/);
  assert.match(checkout, /address\.isSupported!==false/);
  assert.match(checkout, /getShippingQuote\(provinceCode,wardCode\)/);
});

test("Checkout uses code-based guest addresses and has no unsupported coupon state", () => {
  assert.match(checkout, /province_code:guestReview\.value!\.provinceCode/);
  assert.match(checkout, /ward_code:guestReview\.value!\.wardCode/);
  assert.doesNotMatch(checkout, /couponCode|couponAmount|couponDraft/);
});

test("Concurrent API actions maintain per-key busy state and reject duplicate submissions", () => {
  assert.match(context, /activeActions=useRef\(new Map<string,number>\(\)\)/);
  assert.match(context, /activeActions\.current\.get\(key\)===epoch/);
  assert.match(context, /activeActions\.current\.set\(key,epoch\)/);
  assert.match(context, /busyKeys:\[\.\.\.s\.busyKeys\.filter\(item=>item!==key\),key\]/);
  assert.match(context, /busyKeys:s\.busyKeys\.filter\(item=>item!==key\)/);
  assert.doesNotMatch(context, /busy:null/);
  assert.match(checkout, /submitting\.current/);
  assert.match(checkout, /crypto\.randomUUID\(\)/);
  assert.match(checkout, /saveCheckoutIntent\(window.sessionStorage,attempt\)/);
});

test("Checkout uses the Store quote contract and explicitly handles stale quotes", () => {
  assert.match(checkout, /buildStoreQuote/);
  assert.match(checkout, /checkoutPayload/);
  assert.match(checkout, /reason instanceof AccountApiError&&checkoutDefinitelyRejected\(reason\)/);
  assert.match(checkout, /setRequote\(true\)/);
});

test("Account stylesheet no longer contains shared transaction history selectors", () => {
  const css = source("app/styles/30-account-navigation.css");
  const history = source("app/styles/20-history-and-catalog.css");
  assert.doesNotMatch(css, /\.history-item\{|\.hist-status-filter\{|\.acc-status\[data-status-badge\]/);
  assert.match(history, /\.history-item\{/);
  assert.match(history, /\.hist-status-filter\{/);
});
