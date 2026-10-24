import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

const routes=["about","workshops"];
test("each page has one screen and two local language entrypoints",()=>{
  for(const page of routes){
    for(const file of [page==="workshops"?"app/workshops/[segment]/page.tsx":`app/${page}/[locale]/page.tsx`]){
      assert.ok(existsSync(new URL(`../${file}`,import.meta.url)),file);
      assert.match(source(file),new RegExp(`initialPage="${page}"`));
      assert.match(source(file),/notFound\(\)/);
    }
    assert.match(source("app/NFVClientApp.tsx"),new RegExp(`ui\.page==="${page}"`));
  }
  assert.match(source("app/NFVClientApp.tsx"),/<Header\/>/);
  assert.match(source("app/NFVClientApp.tsx"),/<SiteFooter\/>/);
  assert.equal(source("src/components/navigation/SiteHeader.tsx").includes("AboutPage"),false);
});

test("About content follows source section hierarchy, images and bilingual data",()=>{
  const about=source("src/screens/about/AboutPage.tsx");
  const content=source("src/data/about-content.ts");
  for(const phrase of ["Bám rễ tại nơi chốn","Rooted in place","Quan sát","Regenerate"])
    assert.ok(content.includes(phrase),phrase);
  for(const image of ["people-on-soil.webp","harvest-leaves.webp","farm-landscape.webp","farmer-field.webp"])
    assert.ok(about.includes(image),image);
  const sequence=["<PageHero","editorial-about-mission","editorial-section-cream","editorial-closing-panel"].map(x=>about.indexOf(x));
  assert.ok(sequence.every(x=>x>=0));
  assert.deepEqual(sequence,[...sequence].sort((a,b)=>a-b));
  assert.match(about,/<ContactLinks/);
  assert.match(about,/showSocials=\{false\}/);
});

test("Workshop Home and list reuse the same card and translated copy",()=>{
  const home=source("src/screens/home/HomeWorkshops.tsx"),list=source("src/screens/workshops/WorkshopsPage.tsx");
  assert.match(home,/import \{WorkshopCard\}/);
  assert.match(list,/import \{WorkshopCard\}/);
  assert.match(home,/WORKSHOP_COPY/);assert.match(list,/WORKSHOP_COPY/);
  assert.match(home,/if\(!workshops.length\)return null/);
  assert.match(list,/empty|<WorkshopSection/);
  assert.match(source("src/components/workshops/WorkshopCard.tsx"),/workshopDetailHref\(locale,item\.slug\)/);
  assert.ok(existsSync(new URL("../src/lib/workshop-date.ts",import.meta.url)));
  assert.ok(existsSync(new URL("../app/workshops/[segment]/[locale]/page.tsx",import.meta.url)));
  assert.ok(existsSync(new URL("../src/screens/workshops/WorkshopDetail.tsx",import.meta.url)));
});

test("About and Workshop styles stay fully scoped; app shared shell styles are unchanged",()=>{
  const layout=source("app/layout.tsx");
  for(const style of ["08-home.css","09-editorial.css","09-workshops.css"])assert.equal(layout.split(style).length-1,1);
  const about=source("app/styles/09-editorial.css"),wk=source("app/styles/09-workshops.css");
  assert.match(about,/\.nfv-editorial \.editorial-page-hero/);
  assert.match(wk,/\.nfv-workshops \.wk-calendar-card/);
  for(const css of [about,wk]){
    assert.doesNotMatch(css,/(^|\n)\s*(body|html|\.site-header|\.nfv-site-footer|\.main-nav|\.account-nav-shell|\.btn)(?=\s*[{,:])/m);
    assert.match(css,/prefers-reduced-motion/);
  }
});

test("only public CMS routes are used; app does not add auth endpoints",()=>{
  const about=source("src/screens/about/AboutPage.tsx"),wk=source("src/screens/workshops/WorkshopsPage.tsx");
  assert.doesNotMatch(about+wk,/getSession|login\(|logout\(|NFV_BACKEND/);
  const api=source("app/api/workshops/route.ts");
  assert.match(api,/api\/v1\/public\/workshops/);
  assert.match(api,/Promise\.allSettled/);
  assert.match(api,/getPublicContentOrigin/);
  assert.match(source("src/screens/workshops/useWorkshops.ts"),/AbortController/);
});

test("public Workshop parser rejects untrusted input and normalizes correct records",async()=>{
  const raw=source("src/lib/public-workshop.ts");
  const js=stripTypeScriptTypes(raw);
  const parser=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  const item={id:4,slug:"soil-101",title:"Soil",summary:"Learn",start_at:"2026-11-12T10:00:00+07:00",end_at:"2026-11-12T11:00:00+07:00",status:"ongoing",event_timezone:"Asia/Ho_Chi_Minh"};
  assert.deepEqual(parser.parsePublicWorkshops({data:[item]}).map(x=>x.id),["4"]);
  assert.equal(parser.parsePublicWorkshops({data:[{...item,start_at:"not a date"}]}).length,0);
  assert.equal(parser.parsePublicWorkshops({data:[{...item,slug:""}]}).length,0);
  assert.equal(parser.parsePublicWorkshops({data:[]}).length,0);
  assert.equal(parser.parsePublicWorkshops({data:[{...item,status:"unexpected"}]}).length,0);
  assert.equal(parser.parsePublicWorkshop({...item,status:undefined}),null);
  const detail=parser.parsePublicWorkshop({...item,requested_locale:"vi",content_locale:"en",available_locales:["vi","en","fr"],registration_url:"https://example.com/register",body:{type:"doc"}});
  assert.equal(detail.content_locale,"en");
  assert.deepEqual(detail.available_locales,["vi","en"]);
  assert.equal(detail.registration_url,"https://example.com/register");
  assert.deepEqual(detail.body,{type:"doc"});
  assert.equal(parser.parsePublicWorkshop({...item,registration_url:"javascript:alert(1)"}).registration_url,null);
  const original=process.env.CONTENT_API_ORIGIN;
  delete process.env.CONTENT_API_ORIGIN;
  assert.equal(parser.getPublicContentOrigin(),null);
  process.env.CONTENT_API_ORIGIN="https://api.example.org";
  assert.equal(parser.getPublicContentOrigin(),"https://api.example.org");
  process.env.CONTENT_API_ORIGIN="https://user:pass@example.com";
  assert.equal(parser.getPublicContentOrigin(),null);
  if(original===undefined)delete process.env.CONTENT_API_ORIGIN;else process.env.CONTENT_API_ORIGIN=original;
});

test("Workshop proxy bypasses the content cache in development",async()=>{
  const js=stripTypeScriptTypes(source("src/lib/public-workshop.ts"));
  const workshop=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  assert.equal(typeof workshop.workshopFetchOptions,"function");
  assert.deepEqual(workshop.workshopFetchOptions("development"),{cache:"no-store"});
  assert.deepEqual(workshop.workshopFetchOptions("production"),{next:{revalidate:300}});
});

test("Every workshop fetch uses the shared development and production cache policy",async()=>{
  const js=stripTypeScriptTypes(source("src/lib/public-workshop.ts"));
  const workshop=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  assert.equal(typeof workshop.fetchPublicWorkshopJson,"function");
  const calls=[];
  const fetcher=async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>({data:[]})};};
  const signal=new AbortController().signal;

  await workshop.fetchPublicWorkshopJson("https://api.example.org/api/v1/public/workshops",{environment:"development",fetcher,signal});
  await workshop.fetchPublicWorkshopJson("https://api.example.org/api/v1/public/workshops/soil",{environment:"production",tags:["workshops","workshop:soil"],fetcher,signal});

  assert.equal(calls[0].init.cache,"no-store");
  assert.equal(calls[0].init.next,undefined);
  assert.deepEqual(calls[1].init.next,{revalidate:300,tags:["workshops","workshop:soil"]});
});

test("Workshop date formatter is safe for invalid timezone and date",async()=>{
  const js=stripTypeScriptTypes(source("src/lib/workshop-date.ts"));
  const formatter=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  const invalid={start_at:"garbage",end_at:"garbage",event_timezone:"not real"};
  assert.equal(formatter.formatWorkshopDate(invalid,"vi").day,"--");
  const valid={start_at:"2026-11-12T10:00:00+07:00",end_at:"2026-11-12T11:00:00+07:00",event_timezone:"bad/zone"};
  const result=formatter.formatWorkshopDate(valid,"vi");
  assert.equal(result.day,"12");assert.ok(result.label.includes("10:00"));
});

test("Workshop rich-text sanitizer preserves valid internal and remote images",async()=>{
  let sanitizer;
  try{
    const js=stripTypeScriptTypes(source("src/lib/workshop-rich-text.ts"));
    sanitizer=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  }catch(error){assert.fail(`Workshop rich-text sanitizer is unavailable: ${error instanceof Error?error.message:String(error)}`);}
  assert.equal(sanitizer.safeWorkshopImage("/media/workshops/soil.webp"),"/media/workshops/soil.webp");
  assert.equal(sanitizer.safeWorkshopImage("https://cdn.example.org/soil.webp"),"https://cdn.example.org/soil.webp");
  assert.equal(sanitizer.safeWorkshopImage("//evil.example/soil.webp"),null);
  assert.equal(sanitizer.safeWorkshopImage("javascript:alert(1)"),null);
});
