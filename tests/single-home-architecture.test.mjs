import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
test("one Home page, reused by all three locale entrypoints",()=>{
  assert.ok(existsSync(new URL("../src/screens/home/HomePage.tsx",import.meta.url)));
  assert.ok(!existsSync(new URL("../src/screens/V2Home.tsx",import.meta.url)));
  assert.deepEqual(readdirSync(new URL("../src/screens/home/",import.meta.url)).filter(n=>/^(?:V2Home|HomePage)\.tsx$/.test(n)),["HomePage.tsx"]);
  assert.match(read("app/NFVApp.tsx"),/ui\.page==="home"\?<HomePage\/>/);
  for(const route of ["app/page.tsx","app/vi/page.tsx","app/en/page.tsx"])
    assert.match(read(route),/initialPage="home"/);
});
test("Home names and CSS namespace describe the page, not its source version",()=>{
  const home=read("src/screens/home/HomePage.tsx");
  const css=read("app/styles/08-home.css");
  assert.match(home,/className="nfv-home"/);
  assert.match(css,/\.nfv-home \.home-hero/);
  assert.doesNotMatch(home+css,/\bV2Home\b|\.v2-home-|--v2-|nfv-v2-home/);
  assert.match(read("src/screens/home/useHomeContent.ts"),/api\/home-content/);
  assert.match(read("app/layout.tsx"),/08-home\.css/);
  assert.ok(existsSync(new URL("../app/api/home-content/route.ts",import.meta.url)));
});
