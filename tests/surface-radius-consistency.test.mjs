import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('Public content surfaces share one radius without changing controls or special shapes',()=>{
  const foundation=read('app/styles/00-foundation-and-store.css');
  const testimonials=read('app/styles/12-testimonials.css');
  const csa=read('app/styles/13-csa.css');
  const tracker=read('app/styles/11-tracker.css');
  const workshops=read('app/styles/09-workshops.css');
  const editorial=read('app/styles/09-editorial.css');
  const knowledge=read('app/styles/10-knowledge.css');
  const account=read('app/styles/10-account-and-responsive.css');

  assert.match(foundation,/:root\{[^}]*--nfv-surface-radius:10px[^}]*--radius:4px/s);
  assert.match(testimonials,/--story-card-radius:\s*var\(--nfv-surface-radius\)/);
  assert.match(csa,/\.nfv-csa\s*\{[^}]*--csa-surface-radius:\s*var\(--nfv-surface-radius\)/s);
  for(const selector of ['csa-v2-hero-media','csa-v2-conclusion','csa-v2-quote','csa-v2-package-card','csa-v2-package-prices li','csa-v2-faq-list','csa-v2-help','csa-v2-column'])
    assert.match(csa,new RegExp(`\\.${selector.replace(' ', '\\s+')}\\s*\\{[^}]*border-radius:var\\(--csa-surface-radius\\)`,'s'),selector);
  assert.match(tracker,/--tracker-card-radius:\s*var\(--nfv-surface-radius\)/);
  for(const selector of ['tracker-legend li','tracker-demo-note','tracker-stat','tracker-field-section','tracker-farm-card','tracker-state'])
    assert.match(tracker,new RegExp(`\\.${selector.replace(' ', '\\s+')}\\s*\\{[^}]*border-radius:\\s*var\\(--tracker-card-radius\\)`,'s'),selector);
  assert.match(workshops,/\.nfv-workshops\s*\{[^}]*--workshop-surface-radius:\s*var\(--nfv-surface-radius\)/s);
  for(const selector of ['wk-calendar-card','wk-date-tile','wk-fallback-banner','wk-inline-image','wk-detail-facts'])
    assert.match(workshops,new RegExp(`\\.${selector}\\s*\\{[^}]*border-radius:\\s*var\\(--workshop-surface-radius\\)`,'s'),selector);
  assert.match(editorial,/\.nfv-editorial\s*\{[^}]*--editorial-surface-radius:\s*var\(--nfv-surface-radius\)/s);
  assert.match(editorial,/\.editorial-page-hero-image\s*\{[^}]*border-radius:\s*var\(--editorial-surface-radius\)/s);
  assert.match(knowledge,/\.nfv-knowledge\s*\{[^}]*--knowledge-surface-radius:\s*var\(--nfv-surface-radius\)/s);
  for(const selector of ['knowledge-feature-figure.wide-reference img','knowledge-legacy-figure','knowledge-legacy-figure img','knowledge-table-wrap','knowledge-card','knowledge-inputs details','knowledge-safety-panel'])
    assert.match(knowledge,new RegExp(`\\.${selector.replaceAll('.', '\\.').replaceAll(' ', '\\s+')}\\s*\\{[^}]*border-radius:\\s*var\\(--knowledge-surface-radius\\)`,'s'),selector);

  assert.match(foundation,/\.btn\s*\{[^}]*border-radius:4px/s);
  assert.match(foundation,/\.product-card\s*\{[^}]*border-radius:4px/s);
  assert.match(account,/\.acc-section\s*\{[^}]*border-radius:4px/s);
  assert.match(csa,/\.csa-v2-help-action\.btn\s*\{[^}]*border-radius:var\(--radius\)/s);
  assert.match(csa,/border-radius:999px/);
  assert.match(tracker,/\.farmer-dialog\s*\{[^}]*border-radius:\s*22px/s);
  assert.match(tracker,/border-radius:\s*50%/);
  assert.match(workshops,/\.wk-status\s*\{[^}]*border-radius:\s*3px/s);
  assert.match(knowledge,/\.knowledge-legacy-figure > span\s*\{[^}]*border-radius:\s*var\(--radius\)/s);
  assert.match(knowledge,/\.knowledge-inputs summary strong\s*\{[^}]*border-radius:\s*var\(--radius\)/s);
});
