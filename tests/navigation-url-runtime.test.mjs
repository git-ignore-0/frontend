import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

/** Exercise the real TypeScript URL resolver without needing Next.js dependencies. */
const raw=readFileSync(new URL('../src/data/main-navigation.ts',import.meta.url),'utf8');
const compiled=stripTypeScriptTypes(raw.replace(
  'import {SITE_ORIGIN} from "@/config/site-brand";',
  'const SITE_ORIGIN = "https://v2.example";'
));
const nav=await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

async function loadBrowserNavigation(){
  try {
    const raw=readFileSync(new URL('../src/lib/browser-navigation.ts',import.meta.url),'utf8');
    return await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(raw))}`);
  } catch (error) {
    assert.fail(`browser navigation helper is unavailable: ${error instanceof Error?error.message:String(error)}`);
  }
}

test('desktop/drawer routing keeps ported pages local and tracker stay on local routes',()=>{
  const items=nav.mainNavigationItems({links:[{kind:'forum',url:'https://forum.example/'}]});
  const item=id=>items.find(x=>x.id===id);
  assert.equal(nav.resolveMainNavHref(item('home'),'vi'),'/vi');
  assert.equal(nav.resolveMainNavHref(item('about'),'en'),'/about/en');
  assert.equal(nav.resolveMainNavHref(item('workshops'),'vi'),'/workshops/vi');
  assert.equal(nav.resolveMainNavHref(item('tracker'),'vi'),'/tracker/vi');
  assert.equal(nav.resolveMainNavHref(item('store'),'en'),'/store/en');
  assert.equal(nav.resolveMainNavHref(item('csa'),'vi'),'/csa/vi');
  assert.equal(nav.resolveMainNavHref(item('forum'),'vi'),'https://forum.example/');
  assert.equal(nav.resolveMainNavHref(nav.MAIN_NAV_ACCOUNT,'vi'),'/account/vi');
});

test('local route mapping is canonical and does not send guest Account to v2',()=>{
  assert.equal(nav.navigationItemForPage('account'),nav.MAIN_NAV_ACCOUNT);
  assert.equal(nav.navigationItemForPage('checkout'),undefined);
  assert.equal(nav.localScreenFromPath('/vi'),'home');
  assert.equal(nav.localScreenFromPath('/en'),'home');
  assert.equal(nav.localScreenFromPath('/account/en'),'account');
  assert.equal(nav.localScreenFromPath('/store/vi'),'store');
  assert.equal(nav.localScreenFromPath('/workshops/vi'),'workshops');
  assert.equal(nav.localScreenFromPath('/tracker/en'),'tracker');
});

test('Account screen navigation preserves the requested tab in the document URL',()=>{
  assert.equal(nav.navigationHrefForPage('account','vi','csa'),'/account/vi?tab=csa');
  assert.equal(nav.navigationHrefForPage('account','en','orders'),'/account/en?tab=orders');
  assert.equal(nav.navigationHrefForPage('csa','vi'),'/csa/vi');
});

test('server-rendered route content performs document navigation instead of only changing history',async()=>{
  const {syncBrowserRoute}=await loadBrowserNavigation();
  const calls=[];
  const browser={
    location:{pathname:'/workshops/soil-101/vi',assign:href=>calls.push(['assign',href]),replace:href=>calls.push(['replace',href])},
    history:{pushState:(_state,_title,href)=>calls.push(['push',href]),replaceState:(_state,_title,href)=>calls.push(['history-replace',href])}
  };

  assert.equal(syncBrowserRoute(browser,'/csa/vi'),true);
  assert.deepEqual(calls,[['assign','/csa/vi']]);
});

test('normal public pages also perform document navigation so route metadata is refreshed',async()=>{
  const {syncBrowserRoute}=await loadBrowserNavigation();
  const calls=[];
  const browser={
    location:{pathname:'/workshops/vi',assign:href=>calls.push(['assign',href]),replace:href=>calls.push(['replace',href])},
    history:{pushState:(_state,_title,href)=>calls.push(['push',href]),replaceState:(_state,_title,href)=>calls.push(['history-replace',href])}
  };

  assert.equal(syncBrowserRoute(browser,'/csa/vi'),true);
  assert.deepEqual(calls,[['assign','/csa/vi']]);
});

test('locale navigation preserves a workshop detail slug and leaves server-rendered content',async()=>{
  const {localizedRouteHref,syncLocaleRoute}=await loadBrowserNavigation();
  assert.equal(typeof localizedRouteHref,'function');
  assert.equal(typeof syncLocaleRoute,'function');
  const calls=[];
  const browser={
    location:{pathname:'/workshops/soil-101/vi',assign:href=>calls.push(['assign',href]),replace:href=>calls.push(['replace',href])},
    history:{pushState:(_state,_title,href)=>calls.push(['push',href]),replaceState:(_state,_title,href)=>calls.push(['history-replace',href])}
  };

  assert.equal(localizedRouteHref('/workshops/soil-101/vi','en'),'/workshops/soil-101/en');
  assert.equal(syncLocaleRoute(browser,'en'),true);
  assert.deepEqual(calls,[['replace','/workshops/soil-101/en']]);
});

test('locale navigation refreshes the document on regular public pages',async()=>{
  const {syncLocaleRoute}=await loadBrowserNavigation();
  assert.equal(typeof syncLocaleRoute,'function');
  const calls=[];
  const browser={
    location:{pathname:'/csa/vi',assign:href=>calls.push(['assign',href]),replace:href=>calls.push(['replace',href])},
    history:{pushState:(_state,_title,href)=>calls.push(['push',href]),replaceState:(_state,_title,href)=>calls.push(['history-replace',href])}
  };

  assert.equal(syncLocaleRoute(browser,'en'),true);
  assert.deepEqual(calls,[['replace','/csa/en']]);
});

test('locale navigation preserves the public CSA flow kind',async()=>{
  const {localizedRouteHref}=await loadBrowserNavigation();
  assert.equal(localizedRouteHref('/csa/purchase/vi','en'),'/csa/purchase/en');
  assert.equal(localizedRouteHref('/csa/track/en','vi'),'/csa/track/vi');
});

test('locale navigation preserves the selected CSA package query and hash',async()=>{
  const {syncLocaleRoute}=await loadBrowserNavigation();
  const calls=[];
  const browser={location:{pathname:'/csa/purchase/vi',search:'?package=family-6&page=2',hash:'#payment',assign:href=>calls.push(['assign',href]),replace:href=>calls.push(['replace',href])}};
  assert.equal(syncLocaleRoute(browser,'en'),true);
  assert.deepEqual(calls,[['replace','/csa/purchase/en?package=family-6&page=2#payment']]);
});

test('links are resolved by a shared function and obsolete wrappers are removed',()=>{
  const main=readFileSync(new URL('../src/components/navigation/MainNavigation.tsx',import.meta.url),'utf8');
  const footer=readFileSync(new URL('../src/data/footer-navigation.ts',import.meta.url),'utf8');
  assert.match(main,/resolveMainNavHref\(item,ui\.locale\)/);
  assert.match(footer,/resolveMainNavHref\(shared,locale\)/);
  assert.equal(existsSync(new URL('../src/components/Shell.tsx',import.meta.url)),false);
  assert.equal(existsSync(new URL('../src/components/account/AccountLogout.tsx',import.meta.url)),false);
});
