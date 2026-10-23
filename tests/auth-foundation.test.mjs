import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const runScript=(script,env={})=>{
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],
    {encoding:"utf8",env:{...process.env,...env}});
  assert.equal(result.status,0,result.stderr||result.stdout);
};

test("v1 delegates identity to the Core OAuth BFF and never renders local login/register forms",()=>{
  const app=read("app/NFVApp.tsx"),context=read("src/state/NFVContext.tsx");
  const provider=read("src/auth/AuthProvider.tsx"),gate=read("src/components/auth/AuthGate.tsx");
  const buttons=read("src/components/auth/GuestAuthActions.tsx"),guest=read("src/components/auth/AuthEntry.tsx");
  assert.match(app,/<AuthProvider><NFVProvider/);
  assert.match(app,/<AuthGate><Account\/><\/AuthGate>/);
  assert.match(app,/<AuthGate><OrderDetail\/><\/AuthGate>/);
  assert.doesNotMatch(app,/AuthForm|mode="login"|mode="register"/);
  assert.ok(!existsSync(new URL("../src/components/auth/AuthForm.tsx",import.meta.url)));
  assert.match(provider,/"checking"/);
  assert.match(provider,/"expired"/);
  assert.match(provider,/"error"/);
  assert.doesNotMatch(provider,/login:\(|register:\(|logout:\(/);
  assert.match(gate,/auth.status==="guest"\|\|auth.status==="expired"/);
  assert.match(gate,/<AuthEntry locale=\{ui.locale\}/);
  assert.match(guest,/<GuestAuthActions locale=\{locale\}/);
  assert.match(buttons,/href=\{siteAuthHref\("login",locale\)\}/);
  assert.match(buttons,/href=\{siteAuthHref\("register",locale\)\}/);
  assert.match(buttons,/className="btn btn-outline"/);
  assert.doesNotMatch(context,/authReturnTo|auth.pending|const signOut|login\(|register\(/);
});

test("same-origin auth URLs preserve locale and safe returnTo",()=>{
  const authUrl=new URL("../src/auth/site-auth.ts",import.meta.url).href;
  runScript(`
    import assert from 'node:assert/strict';
    const auth=await import(${JSON.stringify(authUrl)});
    const login=new URL(auth.siteAuthHref('login','vi'),'https://example.com');
    assert.equal(login.pathname,'/api/auth/login');
    assert.equal(login.searchParams.get('locale'),'vi');
    assert.equal(login.searchParams.get('returnTo'),'/account/vi');
    const register=new URL(auth.siteAuthHref('register','en','/store/en'),'https://example.com');
    assert.equal(register.pathname,'/api/auth/register');
    assert.equal(register.searchParams.get('returnTo'),'/store/en');
    assert.equal(new URL(auth.siteAuthHref('login','vi','https://evil.example'),'https://example.com').searchParams.get('returnTo'),'/account/vi');
    assert.equal(auth.siteLogoutHref('en'),'/api/auth/logout?locale=en');
    const account=new URL(auth.siteAccountHref('vi','/account/vi?tab=profile'),'https://example.com');
    assert.equal(account.pathname,'/api/auth/account');
    assert.equal(account.searchParams.get('returnTo'),'/account/vi?tab=profile');
    assert.equal(new URL(auth.siteAccountHref('en','https://evil.example'),'https://example.com').searchParams.get('returnTo'),'/account/en');
  `);
});

test("profile presentation localizes birth dates and missing values",()=>{
  const presentationUrl=new URL("../src/screens/profile-presentation.ts",import.meta.url).href;
  const copyUrl=new URL("../src/data/account-copy.ts",import.meta.url).href;
  runScript(`
    import assert from 'node:assert/strict';
    const presentation=await import(${JSON.stringify(presentationUrl)});
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.equal(presentation.profileBirthDate('1990-06-15','vi'),'15/06/1990');
    assert.equal(presentation.profileBirthDate('1990-06-15','en'),'15 Jun 1990');
    assert.equal(presentation.profileBirthDate(null,'vi'),'');
    assert.equal(copy.copyText('vi','profile.phone'),'Số điện thoại');
    assert.equal(copy.copyText('en','profile.birthDate'),'Date of birth');
    assert.equal(copy.copyText('en','profile.edit'),'Edit');
  `);
});

test("session adapter actually consumes v2 data.user instead of the old mock bridge",()=>{
  const authUrl=new URL("../src/auth/auth-service.ts",import.meta.url).href;
  runScript(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(authUrl)});
    const requests=[];
    globalThis.fetch=async (path,opts)=>{requests.push({path,opts});return new Response(JSON.stringify({data:{user:{sub:'uuid',name:'NFV Customer',email:'x@y.com',phone_number:'+84 912 345 678',date_of_birth:'1990-06-15'}}}),{status:200});};
    const user=await service.getSession();
    assert.equal(user.authenticated,true);
    assert.deepEqual(user.profile,{name:'NFV Customer',email:'x@y.com',phone:'+84 912 345 678',dateOfBirth:'1990-06-15'});
    assert.equal(requests[0].path,'/api/auth/session');
    assert.equal(requests[0].opts.credentials,'same-origin');
    assert.equal(requests[0].opts.cache,'no-store');
    globalThis.fetch=async()=>new Response(JSON.stringify({data:{user:null}}),{status:200});
    assert.equal(await service.getSession(),null);
    globalThis.fetch=async()=>new Response(JSON.stringify({error:'session_expired'}),{status:401});
    await assert.rejects(()=>service.getSession(),e=>service.isUnauthorized(e));
    globalThis.fetch=async()=>new Response('bad gateway',{status:502});
    await assert.rejects(()=>service.getSession(),/HTTP 502/);
    globalThis.fetch=async()=>new Response('{}',{status:200});
    await assert.rejects(()=>service.getSession(),/không hợp lệ/);
  `);
  assert.doesNotMatch(read("src/auth/auth-service.ts"),/window\.NFV_BACKEND|localStorage|sessionStorage|document\.cookie|mockUsers|login\(|register\(/);
});

test("OAuth entry and logout are same-origin native navigation",()=>{
  const header=read("src/components/navigation/SiteHeader.tsx"),nav=read("src/components/navigation/MainNavigation.tsx");
  const logout=read("src/components/auth/LogoutButton.tsx");
  assert.match(header,/onClick=\{\(\)=>navigate\("account"\)\}/);
  assert.match(nav,/status==="authenticated"\?<MainNavLink item=\{MAIN_NAV_ACCOUNT\}/);
  assert.match(nav,/<GuestAuthActions locale=\{ui.locale\} variant="drawer"\/>/);
  assert.match(logout,/<form method="post" action=\{siteLogoutHref\(ui.locale\)\}>/);
  assert.doesNotMatch(logout,/externalSiteAccountHref/);
  assert.match(read("app/login/[locale]/page.tsx"),/redirect\(siteAuthHref\("login"/);
  assert.match(read("app/register/[locale]/page.tsx"),/redirect\(siteAuthHref\("register"/);
});
