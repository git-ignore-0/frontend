import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Footer keeps brand, contact and links in one content grid before copyright',()=>{
  const jsx=read('src/components/layout/SiteFooter.tsx');
  const mainStart=jsx.indexOf('className="nfv-site-footer__main"');
  const about=jsx.indexOf('className="nfv-site-footer__about"');
  const contact=jsx.indexOf('className="nfv-site-footer__contact"');
  const links=jsx.indexOf('className="nfv-site-footer__nav"');
  const bottom=jsx.indexOf('className="nfv-site-footer__bottom"');
  assert.ok(mainStart < about && about < contact && contact < links && links < bottom);
  assert.equal((jsx.match(/<BrandLogo/g)||[]).length,1);
  assert.equal((jsx.match(/<nav /g)||[]).length,1);
});

test('Footer darkens the primary button base green rather than using hover color',()=>{
  const css=read('app/styles/07-brand-and-footer.css');
  const base=read('app/styles/00-foundation-and-store.css');
  assert.match(css,/--nfv-footer-background:\s*color-mix\(in srgb, var\(--green\) 86%, black\)/);
  assert.match(css,/\.nfv-site-footer\s*\{[^}]*background:\s*var\(--nfv-footer-background\)/s);
  assert.match(base,/--green:\s*#[0-9a-f]{6}/);
  assert.match(base,/\.btn\{[^}]*background:var\(--green\)/);
  assert.match(base,/\.btn:hover\{background:#376749\}/);
  assert.doesNotMatch(css,/background:\s*#376749/);
  assert.doesNotMatch(css,/\.nfv-site-footer\s*\{[^}]*background:\s*var\(--soft\)/s);
});

test('Footer links remain data-driven and responsive without horizontal list',()=>{
  const css=read('app/styles/07-brand-and-footer.css');
  const jsx=read('src/components/layout/SiteFooter.tsx');
  assert.match(css,/\.nfv-site-footer__nav\s*\{\s*display:\s*grid/);
  assert.match(css,/max-width:\s*1023px/);
  assert.match(css,/max-width:\s*680px/);
  assert.match(jsx,/FOOTER_LINKS\.map/);
  assert.doesNotMatch(css,/\.nfv-site-footer__upper/);
});
