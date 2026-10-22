import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('header uses the exact full v2 logo-horizontal.png at original 151x40 dimensions', () => {
  const config = read('src/config/site-brand.ts');
  const logo = read('src/components/brand/BrandLogo.tsx');
  const header = read('src/components/navigation/SiteHeader.tsx');
  assert.match(config, /header:\s*`[^`]*\/images\/logo-horizontal\.png`/);
  assert.match(config, /footer:\s*`[^`]*\/images\/logo-mark\.png`/);
  assert.match(logo, /variant === "header"\s*\?\s*\{width: 151, height: 40\}/);
  assert.match(logo, /BRAND_IMAGES\[variant\]/);
  assert.match(logo, /aria-label=\{label\}/);
  assert.match(header, /<BrandLogo locale=\{ui\.locale\}/);
  assert.doesNotMatch(header, /brand-symbol|NATURAL FARMING VIETNAM|<strong>NFV/);
});

test('header logo is never cropped into an icon or distorted', () => {
  const css = read('app/styles/07-brand-and-footer.css');
  assert.match(css, /\.nfv-brand-logo--header img\s*\{[^}]*width:\s*151px;\s*height:\s*40px/s);
  assert.doesNotMatch(css, /\.nfv-brand-logo__art|overflow:\s*hidden/);
  assert.match(css, /\.nfv-brand-logo--footer img\s*\{[^}]*width:\s*100%;/);
});
