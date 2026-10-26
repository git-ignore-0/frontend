import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Tracker header omits redundant brand eyebrow in both locales', () => {
  const parts = read('src/screens/tracker/TrackerParts.tsx');
  const copy = read('src/screens/tracker/tracker-copy.ts');
  assert.doesNotMatch(parts, /tracker-eyebrow|copy\.eyebrow/);
  assert.doesNotMatch(copy, /eyebrow:/);
  assert.match(copy, /title: "From Seed to Harvest — CSA Growth Tracker"/);
  assert.match(copy, /title: "Từ hạt giống đến mùa thu hoạch — Hành trình phát triển CSA"/);
});

test('Tracker title has a compact, balanced desktop and mobile scale', () => {
  const css = read('app/styles/11-tracker.css');
  assert.doesNotMatch(css, /tracker-eyebrow/);
  assert.match(css, /\.nfv-tracker \.tracker-header h1 \{[^}]*max-width: 780px;[^}]*font-size: clamp\(21px,2\.05vw,26px\);[^}]*text-wrap: balance;/s);
  assert.match(css, /@media \(max-width:680px\)[\s\S]*?\.nfv-tracker \.tracker-header h1 \{[^}]*font-size: clamp\(20px,5vw,23px\);/);
  assert.match(css, /\.nfv-tracker \.tracker-intro \{/);
});

test('Tracker detail and photo dialogs are still separate from header styling', () => {
  const parts = read('src/screens/tracker/TrackerParts.tsx');
  assert.match(parts, /<header className="tracker-header">/);
  assert.match(parts, /<h1><span aria-hidden="true">🌱 <\/span>\{copy.title\}<\/h1>/);
  const dialogs = read('src/screens/tracker/TrackerDialogs.tsx');
  assert.match(dialogs, /className="farmer-dialog"/);
});

test('Farmer dialog clips its rounded shell and scrolls inside the body', () => {
  const css = read('app/styles/11-tracker.css');
  assert.match(css, /\.nfv-tracker \.farmer-dialog \{[^}]*overflow: hidden;/s);
  assert.match(css, /\.nfv-tracker \.farmer-dialog__body \{[^}]*max-height: calc\(90dvh - 2px\);[^}]*min-height: min\(320px,calc\(90dvh - 2px\)\);[^}]*overflow-y: auto;[^}]*scrollbar-gutter: stable;/s);
});
