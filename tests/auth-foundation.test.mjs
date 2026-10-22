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

test("v62 delegates identity to v2 and never renders local login/register forms",()=>{
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

test("v2 auth URLs preserve locale and safe same-origin returnTo",()=>{
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
    assert.equal(auth.externalSiteAccountHref('vi'),null);
  `,{NEXT_PUBLIC_V2_SITE_ORIGIN:""});
  runScript(`
    import assert from 'node:assert/strict';
    const auth=await import(${JSON.stringify(authUrl)});
    assert.ok(auth.siteAuthHref('login','vi').startsWith('https://naturalfarmingvietnam.com/api/auth/login?'));
    assert.equal(auth.externalSiteAccountHref('vi'),'https://naturalfarmingvietnam.com/account/vi');
  `,{NEXT_PUBLIC_V2_SITE_ORIGIN:"https://naturalfarmingvietnam.com"});
});

test("session adapter actually consumes v2 data.user instead of the old mock bridge",()=>{
  const authUrl=new URL("../src/auth/auth-service.ts",import.meta.url).href;
  runScript(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(authUrl)});
    const requests=[];
    globalThis.fetch=async (path,opts)=>{requests.push({path,opts});return new Response(JSON.stringify({data:{user:{sub:'uuid',name:'NFV Customer',email:'x@y.com'}}}),{status:200});};
    const user=await service.getSession();
    assert.equal(user.authenticated,true);
    assert.deepEqual(user.profile,{name:'NFV Customer',email:'x@y.com'});
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

test("the v2 OAuth entry and logout are native navigation with server-side origin checks",()=>{
  const header=read("src/components/navigation/SiteHeader.tsx"),nav=read("src/components/navigation/MainNavigation.tsx");
  const logout=read("src/components/auth/LogoutButton.tsx");
  assert.match(header,/onClick=\{\(\)=>navigate\("account"\)\}/);
  assert.match(nav,/status==="authenticated"\?<MainNavLink item=\{MAIN_NAV_ACCOUNT\}/);
  assert.match(nav,/<GuestAuthActions locale=\{ui.locale\} variant="drawer"\/>/);
  assert.match(logout,/<form method="post" action=\{siteLogoutHref\(ui.locale\)\}>/);
  assert.match(logout,/externalSiteAccountHref/);
  assert.match(read("app/login/[locale]/page.tsx"),/redirect\(siteAuthHref\("login"/);
  assert.match(read("app/register/[locale]/page.tsx"),/redirect\(siteAuthHref\("register"/);
});
