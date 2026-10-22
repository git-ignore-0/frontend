import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');

test('Plants and Animals have one screen and a valid VI/EN direct route each',()=>{
  for(const name of ['plants','animals']){
    assert.ok(existsSync(path.join(root,`src/screens/${name}/${name[0].toUpperCase()+name.slice(1)}Page.tsx`)));
    assert.ok(existsSync(path.join(root,`app/${name}/[locale]/page.tsx`)));
    assert.match(read(`app/${name}/[locale]/page.tsx`),/locale!=="vi"&&locale!=="en"/);
  }
  const shell=read('app/NFVApp.tsx');
  assert.match(shell,/ui\.page==="plants"\?<PlantsPage\/>/);
  assert.match(shell,/ui\.page==="animals"\?<AnimalsPage\/>/);
});

test('link resolvers serve Plants and Animals locally and preserve Workshop detail external links',()=>{
  const nav=read('src/data/main-navigation.ts');
  assert.match(nav,/\/plants/);
  assert.match(nav,/\/animals/);
  const links=read('src/lib/site-links.ts');
  assert.match(links,/isLocalPublicPage/);
  assert.match(links,/SITE_ORIGIN/);
  const footer=read('src/data/footer-navigation.ts');
  assert.match(footer,/isLocalPublicPage\(link\.id\)/);
});

test('shared knowledge layout, table, figure, cards and PageHero are reused',()=>{
  const animals=read('src/screens/animals/AnimalsPage.tsx');
  const plants=read('src/screens/plants/PlantsPage.tsx');
  for(const s of [animals,plants]){
    assert.match(s,/KnowledgeLayout/);
    assert.match(s,/KnowledgeSection/);
    assert.match(s,/PageHero/);
    assert.match(s,/KnowledgeTable/);
    assert.match(s,/LegacyFigure/);
    assert.match(s,/nfv-editorial nfv-knowledge/);
  }
  assert.match(plants,/PLANT_INPUTS\.map/);
  assert.match(animals,/KnowledgeCards/);
});

test('scoped CSS cannot override shell, Account, Checkout, Home or Footer',()=>{
  const css=read('app/styles/10-knowledge.css');
  const rules=css.match(/(?:^|\})\s*([^{}]+)\{/gm)||[];
  assert.ok(css.includes('.nfv-knowledge .knowledge-layout'));
  assert.ok(!/(?:^|\})\s*(?:html|body|\*|\.nfv-site-footer|\.site-header|\.account-|\.checkout-|\.nfv-home)\b/.test(css));
  assert.ok(rules.length>45);
  assert.match(css,/@media\s*\(min-width:\s*1100px\)/);
  assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('both languages have real educational content and all eight plant inputs',()=>{
  const content=read('src/data/knowledge-content.ts');
  assert.match(content,/export const PLANTS_COPY/);
  assert.match(content,/export const ANIMALS_COPY/);
  assert.match(content,/Nuôi đất trước khi nuôi cây/);
  assert.match(content,/Feed the soil before feeding the plant/);
  assert.match(content,/Môi trường tốt bắt đầu từ tập tính tự nhiên/);
  assert.match(content,/A good environment begins with natural behavior/);
  for(const code of ['IMO','LAB','OHN','FPJ','FFJ','FAA','WCA','WCAP'])assert.match(content,new RegExp(`code:"${code}"`));
});
