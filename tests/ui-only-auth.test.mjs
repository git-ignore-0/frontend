import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("header does not call an undeclared useAuth hook",()=>{
  const header=read("src/components/navigation/SiteHeader.tsx");
  assert.doesNotMatch(header,/\buseAuth\s*\(/);
  assert.match(header,/export function Header\(/);
});

test("external session access is disabled by default in UI-only mode",()=>{
  const config=read("src/auth/auth-config.ts");
  const provider=read("src/auth/AuthProvider.tsx");
  assert.match(config,/NEXT_PUBLIC_SESSION_ENABLED/);
  assert.match(config,/NEXT_PUBLIC_V2_SESSION_ENABLED/);
  assert.match(provider,/SESSION_ENABLED\?"checking":"guest"/);
  assert.match(provider,/const refresh=useCallback\(async\(\)=>\{\s*if\(!SESSION_ENABLED\)return;/);
  assert.match(provider,/useEffect\(\(\)=>\{\s*if\(!SESSION_ENABLED\)return;/);
  assert.match(provider,/const expire=useCallback\(\(\)=>\{\s*if\(!SESSION_ENABLED\)return;/);
  assert.doesNotMatch(read("src/components/auth/AuthEntry.tsx"),/fetch\(/);
});

test("guest Account and Drawer reuse links without local auth forms",()=>{
  assert.match(read("src/components/auth/AuthGate.tsx"),/<AuthEntry locale=\{ui.locale\}/);
  assert.match(read("src/components/navigation/MainNavigation.tsx"),/<GuestAuthActions locale=\{ui.locale\} variant="drawer"\/>/);
  const actions=read("src/components/auth/GuestAuthActions.tsx");
  assert.match(actions,/href=\{siteAuthHref\("login",locale\)\}/);
  assert.match(actions,/href=\{siteAuthHref\("register",locale\)\}/);
});
