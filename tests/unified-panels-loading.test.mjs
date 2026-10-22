import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),"utf8");

test("Menu, cart and Stories use one actual panel component",()=>{
  const menu=read("src/components/navigation/MobileNavDrawer.tsx");
  const cart=read("src/screens/Checkout.tsx");
  const stories=read("src/components/testimonials/StoriesWidget.tsx");
  const panel=read("src/components/overlays/OverlayPrimitives.tsx");
  for(const consumer of [menu,cart,stories])assert.match(consumer,/<SideDrawer/);
  assert.match(panel,/nfv-mobile-nav-overlay nfv-unified-panel-overlay/);
  assert.match(panel,/className="nfv-mobile-nav-panel nfv-unified-panel"/);
  assert.match(panel,/className="nfv-mobile-nav-heading"/);
  assert.match(panel,/IconButton className="nfv-mobile-nav-close"/);
  assert.doesNotMatch(menu,/useRef|element\.inert|onKeyDown/);
});

test("Every side panel shares focus trap, Escape, scroll lock and inert background",()=>{
  const hook=read("src/components/overlays/useOverlayDialog.ts");
  for(const token of ["activePanels","backgroundInert","element.inert=true","event.key===\"Escape\"","event.key===\"Tab\"","document.body.style.overflow"])
    assert.ok(hook.includes(token),token);
  assert.match(hook,/target\.focus\(\)/);
  assert.match(read("src/components/overlays/OverlayPrimitives.tsx"),/useOverlayDialog\(\{panelRef,returnRef,onClose\}\)/);
});

test("Stories loading is the existing centered DataState in page, drawer and detail",()=>{
  for(const name of ["src/screens/testimonials/TestimonialsPage.tsx","src/components/testimonials/StoriesWidget.tsx","src/components/testimonials/StoryDetail.tsx"]){
    assert.match(read(name),/<DataState kind="loading"/);
    assert.doesNotMatch(read(name),/StoriesLoading/);
  }
  assert.equal(existsSync(new URL("../src/components/testimonials/StoriesLoading.tsx",import.meta.url)),false);
  assert.match(read("src/screens/testimonials/TestimonialsPage.tsx"),/<div className="testimonials-results" aria-busy=\{loading\}>/);
  assert.match(read("app/styles/12-testimonials.css"),/\.testimonials-results > \.nfv-data-state/);
  assert.match(read("app/styles/60-data-states.css"),/justify-items:center/);
});

test("Dead original drawer shells and styles are removed without touching Header/Footer JSX",()=>{
  const foundational=read("app/styles/00-foundation-and-store.css");
  assert.doesNotMatch(foundational,/(?:^|\})\.overlay\{/);
  assert.doesNotMatch(foundational,/(?:^|\})\.drawer\{/);
  assert.doesNotMatch(foundational,/(?:^|\})\.drawer-head\{/);
  const panelCss=read("app/styles/03-overlays.css");
  assert.match(read("app/styles/05-main-navigation.css"),/width:\s*min\(360px, 90vw\)/);
  assert.match(panelCss,/\.nfv-unified-panel > \.drawer-body/);
  assert.match(panelCss,/\.nfv-unified-panel > \.drawer-foot/);
  const header=read("src/components/navigation/SiteHeader.tsx"),footer=read("src/components/layout/SiteFooter.tsx");
  assert.match(header,/<MobileNavDrawer/);
  assert.match(footer,/nfv-site-footer/);
});
