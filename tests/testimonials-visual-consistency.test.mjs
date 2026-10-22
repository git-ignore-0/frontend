import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>readFileSync(join(root,file),'utf8');

test('Stories launcher is a single visible shared Button with strong contrast',()=>{
  const widget=read('src/components/testimonials/StoriesWidget.tsx');
  const css=read('app/styles/12-testimonials.css');
  assert.equal((widget.match(/className="testimonials-launcher"/g)||[]).length,1);
  assert.match(widget,/<Button[\s\S]*?className="testimonials-launcher"/);
  assert.match(widget,/<Icon name="message" size=\{18\}/);
  assert.doesNotMatch(widget,/testimonials-launcher-(desktop|mobile)/);
  assert.match(css,/\.nfv-stories-widget \.testimonials-launcher\s*\{[^}]*background:var\(--green\);[^}]*color:#fff;/s);
  assert.match(css,/\.nfv-stories-widget \.testimonials-launcher\[data-drawer-mounted="true"\]/);
});

test('Page, drawer and detail all use the same centered DataState loading',()=>{
  assert.equal(read('src/components/UI.tsx').includes('nfv-data-state--${kind}'),true);
  for(const file of ['src/screens/testimonials/TestimonialsPage.tsx','src/components/testimonials/StoriesWidget.tsx','src/components/testimonials/StoryDetail.tsx']){
    assert.match(read(file),/<DataState kind="loading"/);
    assert.doesNotMatch(read(file),/StoriesLoading/);
  }
  assert.match(read('app/styles/12-testimonials.css'),/text-align:center/);
  assert.match(read('app/styles/60-data-states.css'),/justify-items:center/);
  assert.equal(existsSync(join(root,'src/components/testimonials/StoriesLoading.tsx')),false);
});

test('Testimonials shares v62 typography, status tags and spacing without global CSS changes',()=>{
  const css=read('app/styles/12-testimonials.css');
  const presentation=read('src/components/testimonials/StoryPresentation.tsx');
  assert.match(css,/font-family: inherit/);
  assert.match(css,/--story-card-radius: calc\(var\(--radius\) \+ 6px\)/);
  assert.match(presentation,/status testimonials-tag/);
  assert.doesNotMatch(css,/^\s*(body|html|:root|\.site-header|\.site-footer|\.account-layout|\.products-grid)\s*\{/m);
});
