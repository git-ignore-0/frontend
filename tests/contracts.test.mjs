import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";

test("App Router root and TSX composition are present",()=>{
  const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
  const app=readFileSync(new URL("../app/NFVClientApp.tsx",import.meta.url),"utf8");
  assert.match(layout,/export default async function RootLayout/);
  for(const name of ["Store","ProductDetail","Checkout","Account","CSAProgram","OrderDetail"]){
    assert.ok(app.includes(name),name);
  }
});
test("do not ship fake backend, success or default customer records",()=>{
  const context=readFileSync(new URL("../src/state/NFVContext.tsx",import.meta.url),"utf8");
  const initial=readFileSync(new URL("../src/state/initial-state.ts",import.meta.url),"utf8");
  assert.match(initial,/products:\[\],categories:\[\],provinces:\[\]/);
  assert.match(context,/Chưa kết nối API/);
  assert.doesNotMatch(context,/localStorage|fetch\(['"]\/api\//);
});
test("bundles Inter and Noto Sans fonts without rewriting application stylesheets",()=>{
  const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
  const styles=readFileSync(new URL("../app/styles/99-local-fonts.css",import.meta.url),"utf8");
  assert.match(layout,/@fontsource-variable\/inter\/wght.css/);
  assert.match(layout,/@fontsource-variable\/noto-sans\/wght.css/);
  assert.match(styles,/"Inter Variable"/);
  assert.match(styles,/\.nfv-control\s*\{\s*font-family:\s*"Noto Sans Variable"/);
});
