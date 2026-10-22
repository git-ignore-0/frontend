import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const navigation = read("app/styles/30-account-navigation.css");
const account = read("src/screens/Account.tsx");

test("Account navigation has only mobile and desktop layouts", () => {
  assert.match(navigation, /@media\s*\(max-width:\s*1023px\)/);
  assert.match(navigation, /\.account-nav-shell\s*\{\s*display:\s*none;/);
  assert.match(navigation, /\.account-layout\.mobile-hub\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(navigation, /@media\s*\(min-width:\s*601px\)\s*and\s*\(max-width:\s*800px\)/);
  assert.doesNotMatch(navigation, /\.account-nav-arrow|scroll-snap-type/);
});

test("Account React view keeps a desktop sidebar and a mobile hub without tablet scrolling controls", () => {
  assert.match(account, /className="account-nav-shell"/);
  assert.match(account, /className="account-mobile-hub"/);
  assert.match(account, /className="account-mobile-back"/);
  assert.match(account, /aria-pressed=\{ui\.accountTab === id\}/);
  assert.doesNotMatch(account, /scrollBy|account-nav-arrow/);
});

test("Old tablet navigation overrides were removed from shared styles", () => {
  for (const path of ["app/styles/00-foundation-and-store.css", "app/styles/10-account-and-responsive.css"]) {
    const css = read(path);
    assert.doesNotMatch(css, /\.account-side\s*\{[^}]*overflow-x:\s*auto/);
    assert.doesNotMatch(css, /\.account-side\s*\{[^}]*display:\s*flex/);
    assert.doesNotMatch(css, /\.acc-mobile-picker|\.acc-picker-arrow/);
  }
});
