import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Home has real local routes and remains inside existing shared Header/Footer',()=>{
  for(const route of ['app/vi/page.tsx','app/en/page.tsx']){
    assert.match(source(route),/initialPage="home"/);
  }
  assert.match(source('app/page.tsx'),/permanentRedirect\("\/vi"\)/);
  const app=source('app/NFVClientApp.tsx');
  assert.match(app,/ui\.page==="home"\?<HomePage\/>/);
  assert.match(app,/<Header\/>/);assert.match(app,/<SiteFooter\/>/);
  assert.match(source('src/components/brand/BrandLogo.tsx'),/href=\{`\/\$\{locale\}`\}/);
});

test('Home section order, reusable components and original image assets',()=>{
  const home=source('src/screens/home/HomePage.tsx');
  for(const name of ['farm-aerial.webp','harvest.webp','piglets.webp','family-field.webp','microscope.webp'])
    assert.match(home,new RegExp(name.replace('.','\\.')));
  const positions=['home-hero','home-principles','home-story-grid','<HomeWorkshops','home-section-forest','home-contact-band'].map(marker=>home.indexOf(marker));
  assert.deepEqual(positions,[...positions].sort((a,b)=>a-b));
  assert.ok(positions.every(n=>n>=0));
  assert.match(home,/<HomeStoryCard/);assert.match(home,/<ContactLinks/);
  assert.equal(existsSync(new URL('../src/screens/home/HomeShared.tsx',import.meta.url)),true);
  assert.match(source('src/data/home-content.ts'),/Sự sống bắt đầu từ đất sống/);
});

test('home CSS is imported only once and uses a dedicated namespace, not global CSS',()=>{
  const layout=source('app/layout.tsx');
  assert.equal(layout.split('08-home.css').length-1,1);
  const css=source('app/styles/08-home.css');
  assert.match(css,/\.nfv-home \.home-hero/);
  assert.match(css,/@media \(min-width:800px\)/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/(^|\n)\s*(html|body|h1|\.site-header|\.nfv-site-footer|\.btn)(?=\s*[{,:])/m);
});

test('Home loads workshops separately and reuses the shared site-settings loader',()=>{
  assert.match(source('src/screens/home/useHomeContent.ts'),/api\/home-content/);
  assert.match(source('src/screens/home/HomePage.tsx'),/useSiteSettings/);
  assert.doesNotMatch(source('app/api/home-content/route.ts'),/site-settings/);
  assert.match(source('src/lib/public-workshop.ts'),/CONTENT_API_ORIGIN/);
  assert.match(source('src/screens/home/HomeWorkshops.tsx'),/if\(!workshops.length\)return null/);
  assert.match(source('src/lib/contact-settings.ts'),/is_email_enabled/);
  assert.doesNotMatch(source('src/screens/home/HomePage.tsx'),/\/api\/auth|useAuth/);
});

test('canonical navigation resolves Home, About and Workshops locally',async()=>{
  const raw=source('src/data/main-navigation.ts');
  const js=stripTypeScriptTypes(raw.replace('import {SITE_ORIGIN} from "@/config/site-brand";','const SITE_ORIGIN="https://site.example";'));
  const nav=await import(`data:text/javascript,${encodeURIComponent(js)}`);
  const find=id=>nav.MAIN_NAV_ITEMS.find(x=>x.id===id);
  assert.equal(nav.resolveMainNavHref(find('home'),'vi'),'/vi');
  assert.equal(nav.resolveMainNavHref(find('about'),'vi'),'/about/vi');
  assert.equal(nav.activeMainNavId('home'),'home');
  assert.equal(nav.localScreenFromPath('/en'),'home');
  assert.equal(nav.localScreenFromPath('/store/en'),'store');
});
