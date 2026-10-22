import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("root document reserves a stable scrollbar gutter",()=>{
  const css=read("app/styles/00-foundation-and-store.css");
  assert.match(css,/html\s*\{[^}]*scrollbar-gutter\s*:\s*stable\b[^}]*\}/);
});

test("only the shared overlay hook controls background scroll locking",()=>{
  const hook=read("src/components/overlays/useOverlayDialog.ts");
  assert.match(hook,/document\.body\.style\.overflow\s*=\s*"hidden"/);
  assert.match(hook,/activePanels\.push\(panel\)/);
  assert.match(hook,/if\s*\(!activePanels\.length\)/);
  assert.match(hook,/document\.body\.style\.overflow\s*=\s*previousOverflow/);
  const panel=read("src/components/overlays/OverlayPrimitives.tsx");
  assert.match(panel,/useOverlayDialog\(\{panelRef,returnRef,onClose\}\)/);
  for(const f of ["src/components/navigation/MobileNavDrawer.tsx","src/screens/Checkout.tsx","src/components/testimonials/StoriesWidget.tsx"]){
    assert.match(read(f),/<SideDrawer/);
  }
});
