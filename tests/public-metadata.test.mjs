import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {readFileSync} from "node:fs";

const metadataUrl=new URL("../src/lib/public-metadata.ts",import.meta.url).href;
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("public metadata identifies the localized canonical and every language alternative",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(metadataUrl)});
    const metadata=seo.publicPageMetadata('about','en');
    assert.equal(metadata.title,'About us | Natural Farming Vietnam');
    assert.match(metadata.description,/observation/i);
    assert.equal(metadata.alternates.canonical,'https://naturalfarmingvietnam.com/about/en');
    assert.deepEqual(metadata.alternates.languages,{
      vi:'https://naturalfarmingvietnam.com/about/vi',
      en:'https://naturalfarmingvietnam.com/about/en',
      'x-default':'https://naturalfarmingvietnam.com/about/vi',
    });
    assert.equal(metadata.openGraph.url,'https://naturalfarmingvietnam.com/about/en');
    assert.equal(metadata.openGraph.locale,'en_US');
    assert.deepEqual(metadata.openGraph.alternateLocale,['vi_VN']);
  `);
});

test("home and catalog metadata follow v1 suffix-locale routes",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(metadataUrl)});
    assert.equal(seo.publicPageMetadata('home','vi').alternates.canonical,'https://naturalfarmingvietnam.com/vi');
    assert.equal(seo.publicPageMetadata('store','en').alternates.canonical,'https://naturalfarmingvietnam.com/store/en');
    assert.equal(seo.publicPageMetadata('workshops','vi').openGraph.type,'website');
  `);
});

test("workshop metadata uses public content while keeping fallback pages out of the index",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(metadataUrl)});
    const workshop={slug:'living-soil',title:'Living soil',summary:'Observe the soil ecosystem.',is_fallback:true,content_locale:'en',available_locales:['vi','en']};
    const metadata=seo.workshopPageMetadata(workshop,'vi');
    assert.equal(metadata.title,'Living soil | Natural Farming Vietnam');
    assert.equal(metadata.alternates.canonical,'https://naturalfarmingvietnam.com/workshops/living-soil/en');
    assert.equal(metadata.alternates.languages.vi,'https://naturalfarmingvietnam.com/workshops/living-soil/vi');
    assert.equal(metadata.alternates.languages.en,'https://naturalfarmingvietnam.com/workshops/living-soil/en');
    assert.equal(metadata.alternates.languages['x-default'],'https://naturalfarmingvietnam.com/workshops/living-soil/en');
    assert.deepEqual(metadata.robots,{index:false,follow:true});
    assert.equal(metadata.openGraph.type,'article');
    assert.equal(metadata.openGraph.url,'https://naturalfarmingvietnam.com/workshops/living-soil/en');
  `);
});

test("root metadata configures the public origin as metadataBase",()=>{
  const layout=source("app/layout.tsx");
  assert.match(layout,/metadataBase:\s*new URL\(SITE_ORIGIN\)/);
  assert.match(layout,/import \{SITE_ORIGIN\} from "@\/config\/site-brand"/);
});

test("every public route delegates metadata to the shared helper",()=>{
  for(const path of [
    "app/page.tsx","app/vi/page.tsx","app/en/page.tsx","app/about/[locale]/page.tsx",
    "app/plants/[locale]/page.tsx","app/animals/[locale]/page.tsx","app/workshops/[segment]/page.tsx",
    "app/workshops/[segment]/[locale]/page.tsx","app/tracker/[locale]/page.tsx",
    "app/testimonials/[locale]/page.tsx","app/store/[locale]/page.tsx","app/csa/[locale]/page.tsx",
  ]) assert.match(source(path),/(publicPageMetadata|workshopPageMetadata)/,path);
});
