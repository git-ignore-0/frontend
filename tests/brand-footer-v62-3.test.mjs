import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('v2 logo is canonical asset reused by one BrandLogo in Header and Footer',()=>{
  const logo=file('src/components/brand/BrandLogo.tsx');
  const site=file('src/components/navigation/SiteHeader.tsx');
  const footer=file('src/components/layout/SiteFooter.tsx');
  const brandConfig=file('src/config/site-brand.ts');
  assert.match(brandConfig,/header:\s*`[^`]*\/images\/logo-horizontal\.png`/);
  assert.match(brandConfig,/footer:\s*`[^`]*\/images\/logo-mark\.png`/);
  assert.match(logo,/BRAND_IMAGES\[variant\]/);
  assert.match(logo,/aria-label/);
  assert.match(logo,/alt=""/);
  assert.match(site,/<BrandLogo locale=\{ui\.locale\}/);
  assert.match(footer,/<BrandLogo locale=\{ui\.locale\} variant="footer"/);
  assert.doesNotMatch(site,/brand-symbol|NATURAL FARMING VIETNAM|<strong>NFV/);
});

test('Footer reproduces v2 brand/contact/links/copyright grouping',()=>{
  const footer=file('src/components/layout/SiteFooter.tsx');
  const data=file('src/data/footer-navigation.ts');
  for(const required of ['nfv-site-footer__about','nfv-site-footer__contact','nfv-site-footer__nav','nfv-site-footer__bottom','mailto:','tel:']){
    assert.ok(footer.includes(required),required);
  }
  assert.match(data,/khanh@naturalfarmingvietnam\.com/);
  assert.match(data,/\+84 988\.158\.285/);
  assert.match(data,/FOOTER_LINKS:[^=]+=/);
  const block=data.split('export const FOOTER_LINKS:')[1].split('];')[0];
  assert.equal((block.match(/\{id:/g)||[]).length,10);
  assert.match(data,/MAIN_NAV_ITEMS\.find/);
  assert.match(data,/SITE_ORIGIN/);
  assert.match(data,/href:resolveMainNavHref\(shared,locale\)/);
});

test('Brand/Footer CSS is isolated, old CSS is removed, locale behavior survives',()=>{
  const newStyles=file('app/styles/07-brand-and-footer.css');
  const layout=file('app/layout.tsx');
  assert.match(layout,/07-brand-and-footer\.css/);
  for(const selector of ['.nfv-brand-logo','\.nfv-site-footer__main','\.nfv-site-footer__nav','max-width:\\s*680px']){
    assert.match(newStyles,new RegExp(selector));
  }
  const original=file('app/styles/00-foundation-and-store.css')+'\n'+file('app/styles/10-account-and-responsive.css');
  assert.doesNotMatch(original,/\.brand\b|\.brand-symbol|\.footer\b|\.footer-links/);
  assert.match(original,/\.locale-button\{min-height:42px/);
  assert.doesNotMatch(file('app/styles/05-main-navigation.css'),/\.site-header \.brand\b/);
  assert.match(file('app/NFVApp.tsx'),/from "@\/components\/layout\/SiteFooter"/);
});
