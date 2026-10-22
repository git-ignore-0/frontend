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

test('desktop/drawer routing keeps ported pages local and tracker stay on local routes',()=>{
  const item=id=>nav.MAIN_NAV_ITEMS.find(x=>x.id===id);
  assert.equal(nav.resolveMainNavHref(item('home'),'vi'),'/vi');
  assert.equal(nav.resolveMainNavHref(item('about'),'en'),'/about/en');
  assert.equal(nav.resolveMainNavHref(item('workshops'),'vi'),'/workshops/vi');
  assert.equal(nav.resolveMainNavHref(item('tracker'),'vi'),'/tracker/vi');
  assert.equal(nav.resolveMainNavHref(item('store'),'en'),'/store/en');
  assert.equal(nav.resolveMainNavHref(item('csa'),'vi'),'/csa/vi');
  assert.equal(nav.resolveMainNavHref(item('forum'),'vi'),'https://forum.naturalfarmingvietnam.com/');
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

test('links are resolved by a shared function and obsolete wrappers are removed',()=>{
  const main=readFileSync(new URL('../src/components/navigation/MainNavigation.tsx',import.meta.url),'utf8');
  const footer=readFileSync(new URL('../src/data/footer-navigation.ts',import.meta.url),'utf8');
  assert.match(main,/resolveMainNavHref\(item,ui\.locale\)/);
  assert.match(footer,/resolveMainNavHref\(shared,locale\)/);
  assert.equal(existsSync(new URL('../src/components/Shell.tsx',import.meta.url)),false);
  assert.equal(existsSync(new URL('../src/components/account/AccountLogout.tsx',import.meta.url)),false);
});
