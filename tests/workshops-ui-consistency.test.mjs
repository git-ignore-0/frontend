import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Workshops uses shared v62 palette, typography and radius without a second design system',()=>{
  const css=source('app/styles/09-workshops.css');
  assert.match(css,/\.nfv-workshops\s*\{[^}]*background:\s*var\(--bg\)/s);
  assert.match(css,/\.wk-calendar-card\s*\{[^}]*border-radius:\s*var\(--radius\)[^}]*background:\s*var\(--paper\)/s);
  assert.match(css,/\.wk-date-tile\s*\{[^}]*border-radius:\s*var\(--radius\)/s);
  assert.match(css,/\.wk-hero h1\s*\{[^}]*font-size:\s*clamp\(1\.625rem,[^}]*2\.1875rem\)/s);
  assert.doesNotMatch(css,/--wk-(cream|paper|forest|moss|straw|soil|terra|ink|muted|line)\s*:/);
  assert.doesNotMatch(css,/font-family:\s*["']/);
});

test('Workshop actions reuse Store button styles while retaining actual external detail links',()=>{
  const card=source('src/components/workshops/WorkshopCard.tsx');
  assert.match(card,/sitePageHref\(locale,`workshops\/\$\{encodeURIComponent\(item\.slug\)\}`\)/);
  assert.match(card,/className="btn btn-small nfv-button" href=\{href\}/);
  assert.match(card,/<Icon name="arrow" size=\{14\}/);
  assert.match(card,/variant==="preview"/);
  assert.match(card,/home-workshop-card/);
  assert.match(card,/home-workshop-detail/);
  assert.doesNotMatch(card,/<button[^>]+href/);
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
