import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("header does not call an undeclared useAuth hook",()=>{
  const header=read("src/components/navigation/SiteHeader.tsx");
  assert.doesNotMatch(header,/\buseAuth\s*\(/);
  assert.match(header,/export function Header\(/);
});

test("the local BFF session is checked on initial load and browser return",()=>{
  const provider=read("src/auth/AuthProvider.tsx");
  assert.match(provider,/status:"checking"/);
  assert.doesNotMatch(provider,/SESSION_ENABLED|NEXT_PUBLIC_SESSION_ENABLED|NEXT_PUBLIC_V2_SESSION_ENABLED/);
  assert.match(provider,/void refresh\(\)/);
  assert.match(provider,/if\(showChecking\)setSnapshot/);
  assert.match(provider,/document\.visibilityState==="visible"\)void refresh\(false\)/);
  assert.match(provider,/event\.persisted\)void refresh\(false\)/);
  assert.match(provider,/window\.addEventListener\("pageshow",onPageShow\)/);
  assert.match(provider,/document\.addEventListener\("visibilitychange",onVisible\)/);
  assert.doesNotMatch(read("src/components/auth/AuthEntry.tsx"),/fetch\(/);
});

test("guest Account and Drawer reuse links without local auth forms",()=>{
  assert.match(read("src/components/auth/AuthGate.tsx"),/<AuthEntry locale=\{ui.locale\}/);
  assert.match(read("src/components/navigation/MainNavigation.tsx"),/<GuestAuthActions locale=\{ui.locale\} variant="drawer"\/>/);
  const actions=read("src/components/auth/GuestAuthActions.tsx");
  assert.match(actions,/href=\{siteAuthHref\("login",locale\)\}/);
  assert.match(actions,/href=\{siteAuthHref\("register",locale\)\}/);
});
