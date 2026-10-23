import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {test} from "node:test";

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const data=source("src/data/main-navigation.ts");
const main=source("src/components/navigation/MainNavigation.tsx");
const drawer=source("src/components/navigation/MobileNavDrawer.tsx");
const header=source("src/components/navigation/SiteHeader.tsx");
const styles=source("app/styles/05-main-navigation.css");

test("v62 has exactly seven canonical navigation destinations",()=>{
  const ids=[...data.matchAll(/\{id:"(home|about|workshops|csa|tracker|store|forum)"/g)].map(match=>match[1]);
  assert.deepEqual(ids,["home","about","workshops","csa","tracker","store","forum"]);
  for(const route of ["/{locale}","/about/{locale}","/workshops/{locale}","/csa/{locale}","/tracker/{locale}","/store/{locale}","https://forum.naturalfarmingvietnam.com/"]){
    assert.ok(data.includes(`path:"${route}"`),route);
  }
  assert.match(data,/MAIN_NAV_ACCOUNT: MainNavItem/);
  assert.match(data,/path:"\/account\/\{locale\}"/);
  assert.doesNotMatch(data,/MAIN_NAV_SHORTCUTS|featured:true/);
});

test("desktop and drawer share a link component; only drawer includes Account",()=>{
  assert.match(main,/export function MainNavLink/);
  assert.match(main,/MAIN_NAV_ITEMS\.map\(item=><MainNavLink/);
  assert.match(main,/item=\{MAIN_NAV_ACCOUNT\}/);
  assert.doesNotMatch(main,/MAIN_NAV_SHORTCUTS|Truy cập nhanh|Khám phá NFV/);
  assert.match(main,/href=\{href\}/);
  assert.match(main,/target=\{item\.external\?"_blank"/);
  assert.match(main,/rel=\{item\.external\?"noopener noreferrer"/);
  assert.match(main,/aria-current=\{active\?"page"/);
  assert.match(main,/event\.metaKey\|\|event\.ctrlKey/);
  assert.doesNotMatch(header,/mobile-global-nav|Chương trình CSA/);
  assert.doesNotMatch(source("app/styles/10-account-and-responsive.css"),/mobile-global-nav/);
});

test("Menu uses the shared modal panel and retains responsive close",()=>{
  const shell=source("src/components/overlays/OverlayPrimitives.tsx");
  const keyboard=source("src/components/overlays/useOverlayDialog.ts");
  assert.match(drawer,/<SideDrawer/);
  assert.match(shell,/className="nfv-mobile-nav-panel nfv-unified-panel"/);
  assert.match(shell,/aria-modal="true"/);
  assert.match(keyboard,/event.key==="Escape"/);
  assert.match(keyboard,/event.key==="Tab"/);
  assert.match(keyboard,/activePanels/);
  assert.match(keyboard,/target.focus\(\)/);
  assert.match(drawer,/media.addEventListener\("change"/);
  assert.match(styles,/@media \(max-width: 1279px\)/);
  assert.match(styles,/\.main-nav \{ display: none; \}/);
  assert.match(styles,/\.nfv-menu-trigger \{ display: inline-flex; \}/);
  assert.match(header,/aria-expanded=\{menuOpen\}/);
});

test("Store, CSA and Account are direct-entry Next routes",()=>{
  assert.ok(existsSync(new URL("../app/store/[locale]/page.tsx",import.meta.url)));
  assert.ok(existsSync(new URL("../app/csa/[locale]/page.tsx",import.meta.url)));
  assert.match(source("app/csa/[locale]/page.tsx"),/initialPage="csa"/);
  assert.match(source("app/store/[locale]/page.tsx"),/initialPage="store"/);
  assert.match(source("src/state/NFVContext.tsx"),/window\.addEventListener\("popstate",handlePopState\)/);
  assert.ok(existsSync(new URL("../app/account/[locale]/page.tsx",import.meta.url)));
  assert.match(source("app/account/[locale]/page.tsx"),/initialPage="account"/);
});

test("package metadata matches lockfile and navigation CSS is included",()=>{
  const pkg=JSON.parse(source("package.json"));
  const lock=JSON.parse(source("package-lock.json"));
  assert.equal(pkg.name,"natural-farming-vietnam-frontend");
  assert.equal(pkg.name,lock.name);
  assert.equal(pkg.version,lock.version);
  assert.match(source("app/layout.tsx"),/05-main-navigation\.css/);
});
