import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const editorial=read('app/styles/09-editorial.css');
const knowledge=read('app/styles/10-knowledge.css');

test('About, Plants and Animals reuse the same PageHero and shared v62 foundation',()=>{
  for(const file of ['src/screens/about/AboutPage.tsx','src/screens/plants/PlantsPage.tsx','src/screens/animals/AnimalsPage.tsx']){
    const source=read(file);
    assert.match(source, /<PageHero/);
    assert.match(source, /className="nfv-editorial/);
  }
  assert.match(editorial,/background:\s*var\(--bg\)/);
  assert.match(editorial,/background:\s*var\(--soft\)/);
  assert.match(editorial,/font:\s*inherit/);
  assert.match(editorial,/font-family:\s*inherit/);
  assert.match(editorial,/var\(--max\)/);
  assert.match(knowledge,/background:\s*var\(--paper\)/);
  assert.match(knowledge,/border-radius:\s*var\(--radius\)/);
  assert.match(knowledge,/var\(--line\)/);
  assert.doesNotMatch(editorial+knowledge,/#f3eee3|#fbf8f0|#173f34|#bd5d3a|NFV Display Serif/i);
});

test('Editorial and knowledge layouts preserve motion and responsive breakpoints',()=>{
  for(const css of [editorial,knowledge]){
    assert.match(css,/prefers-reduced-motion:\s*reduce/);
    assert.doesNotMatch(css,/^\s*(?:body|html|:root|\.site-header|\.account-|\.product-card)\s*\{/m);
  }
  for(const token of ['ed-rise-fade','ed-slow-zoom','animation-timeline: view()'])assert.ok(editorial.includes(token));
  for(const token of ['kn-rise','knowledge-inputs details\u005bopen\u005d','knowledge-feature-figure','knowledge-table-wrap'])assert.ok(knowledge.includes(token),token);
  assert.match(editorial,/@media\s*\(min-width:\s*800px\)/);
  assert.match(knowledge,/@media\s*\(min-width:\s*1100px\)/);
  assert.doesNotMatch(knowledge,/--kn-(?:cream|paper|forest|shadow)/);
});

test('The shared legacy reference figure owns its VI/EN text once',()=>{
  const figure=read('src/components/knowledge/KnowledgeContent.tsx');
  assert.match(figure,/LegacyFigure\(\{file,locale,alt,caption\}/);
  assert.match(figure,/locale==="vi"\?"Tư liệu tham khảo cũ":"Legacy reference"/);
  for(const file of ['src/screens/plants/PlantsPage.tsx','src/screens/animals/AnimalsPage.tsx']){
    const source=read(file);
    assert.match(source,/LegacyFigure\s+.*locale=\{locale\}/);
    assert.doesNotMatch(source,/legacyLabel/);
  }
});
