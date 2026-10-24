import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
import test from "node:test";

const root=new URL("../",import.meta.url);

async function loadSiteImageSrc(){
  const source=readFileSync(new URL("src/lib/site-assets.ts",root),"utf8")
    .replace('import {SITE_ORIGIN} from "@/config/site-brand";','const SITE_ORIGIN="https://remote.example";');
  const loaded=await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(source))}`);
  return loaded.siteImageSrc;
}

const REQUIRED_IMAGES=[
  "logo-horizontal.png","logo-mark.png",
  "farm-aerial.webp","harvest.webp","piglets.webp","family-field.webp","microscope.webp",
  "people-on-soil.webp","harvest-leaves.webp","farm-landscape.webp","farmer-field.webp",
  "green-beans.webp","piglets-straw.webp","chicken-house.webp","chickens.webp","csa-seedlings.webp",
  "legacy/potato-cycle.png","legacy/pig-house-design.png","legacy/sample-pig-house.png","legacy/feed-process.png","legacy/brooder-crib.jpg",
  "csa/timeline/monday-availability.jpg","csa/timeline/tuesday-product-list.jpg","csa/timeline/wednesday-order-selection.jpg","csa/timeline/thursday-harvest.jpg","csa/timeline/friday-delivery.jpg",
];

test("v1 resolves editorial and CSA photographs from its own public directory",async()=>{
  const siteImageSrc=await loadSiteImageSrc();
  assert.equal(siteImageSrc("csa/timeline/monday-availability.jpg"),"/images/csa/timeline/monday-availability.jpg");
  assert.equal(siteImageSrc("/green-beans.webp"),"/images/green-beans.webp");
  for(const file of REQUIRED_IMAGES){
    assert.equal(existsSync(new URL(`public/images/${file}`,root)),true,`missing public/images/${file}`);
  }
});

test("shared brand images use the same local public asset root",()=>{
  const source=stripTypeScriptTypes(readFileSync(new URL("src/config/site-brand.ts",root),"utf8"));
  return import(`data:text/javascript,${encodeURIComponent(source)}`).then(brand=>{
    assert.equal(brand.BRAND_IMAGES.header,"/images/logo-horizontal.png");
    assert.equal(brand.BRAND_IMAGES.footer,"/images/logo-mark.png");
  });
});

test("App Router publishes one correctly typed PNG tab icon",()=>{
  const icon=new URL("app/icon.png",root);
  assert.equal(existsSync(icon),true,"missing App Router PNG icon");
  assert.equal(existsSync(new URL("app/favicon.ico",root)),false,"renamed PNG must not be served as image/x-icon");
  const bytes=readFileSync(icon);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  const width=bytes.readUInt32BE(16);
  const height=bytes.readUInt32BE(20);
  assert.equal(width,height,"tab icon must use a square canvas");
});
