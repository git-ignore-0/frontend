import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Workshops uses shared v62 palette, typography and radius without a second design system',()=>{
  const css=source('app/styles/09-workshops.css');
  assert.match(css,/\.nfv-workshops\s*\{[^}]*background:\s*var\(--bg\)/s);
  assert.match(css,/\.nfv-workshops\s*\{[^}]*--workshop-surface-radius:\s*var\(--nfv-surface-radius\)/s);
  assert.match(css,/\.wk-calendar-card\s*\{[^}]*border-radius:\s*var\(--workshop-surface-radius\)[^}]*background:\s*var\(--paper\)/s);
  assert.match(css,/\.wk-date-tile\s*\{[^}]*border-radius:\s*var\(--workshop-surface-radius\)/s);
  assert.match(css,/\.wk-hero h1\s*\{[^}]*font-size:\s*clamp\(1\.625rem,[^}]*2\.1875rem\)/s);
  assert.doesNotMatch(css,/--wk-(cream|paper|forest|moss|straw|soil|terra|ink|muted|line)\s*:/);
  assert.doesNotMatch(css,/font-family:\s*["']/);
});

test('Workshop actions reuse Store button styles and open the local detail route',()=>{
  const card=source('src/components/workshops/WorkshopCard.tsx');
  assert.match(card,/workshopDetailHref\(locale,item\.slug\)/);
  assert.match(card,/className="btn btn-small nfv-button" href=\{href\}/);
  assert.match(card,/<Icon name="arrow" size=\{14\}/);
  assert.match(card,/variant==="preview"/);
  assert.match(card,/home-workshop-card/);
  assert.match(card,/home-workshop-detail/);
  assert.doesNotMatch(card,/<button[^>]+href/);
});

test('Workshop detail renders CMS content, facts, registration and fallback states',()=>{
  const detail=source('src/screens/workshops/WorkshopDetail.tsx');
  const richText=source('src/components/workshops/WorkshopRichText.tsx');
  assert.match(detail,/workshop\.status==="upcoming"&&Boolean\(workshop\.registration_url\)/);
  assert.match(detail,/<WorkshopRichText document=\{workshop\.body\}/);
  assert.match(detail,/application\/ld\+json/);
  assert.match(detail,/workshop\.is_fallback/);
  for(const node of ['paragraph','heading','bulletList','orderedList','blockquote','image'])assert.ok(richText.includes(`node.type==="${node}"`),node);
});

test('Workshop pages do not render a floating stories control over their content',()=>{
  const app=source('app/NFVClientApp.tsx');
  const publicPages=app.match(/PUBLIC_STORY_PAGES = new Set<Screen>\(\[([^\]]+)\]\)/)?.[1]||'';
  assert.doesNotMatch(publicPages,/workshops/);
});

test('Workshop loading, error and empty share DataState; legacy decoration is removed',()=>{
  const page=source('src/screens/workshops/WorkshopsPage.tsx');
  const css=source('app/styles/09-workshops.css');
  assert.match(page,/import \{DataState\} from "@\/components\/UI"/);
  assert.match(page,/<DataState kind="loading" title=\{c\.loading\}/);
  assert.match(page,/<DataState kind="error" title=\{c\.unavailable\}/);
  assert.match(page,/<DataState compact title=\{past\?c\.emptyPast:c\.emptyUpcoming\}/);
  assert.doesNotMatch(page+css,/wk-(background|grain|moss|straw|empty)(?!Upcoming|Past)/);
  assert.match(css,/\.wk-page-state\s*\{[^}]*display:\s*grid;[^}]*align-items:\s*center/s);
});

test('Workshop presentation remains scoped, responsive and motion-accessible',()=>{
  const css=source('app/styles/09-workshops.css');
  assert.match(css,/@media \(max-width: 767px\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/\.nfv-workshops \.wk-calendar-card:hover/);
  assert.match(css,/\.nfv-workshops \.wk-card-action \.btn/);
  assert.doesNotMatch(css,/(^|\n)\s*(html|body|\.btn|\.site-header|\.nfv-site-footer|\.account-nav-shell|\.product-card)(?=\s*[{,:])/);
});
