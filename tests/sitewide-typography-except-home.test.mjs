import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const get = (path) => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Package version remains synchronized with the lockfile',()=>{
  const pkg=JSON.parse(get('package.json'));
  const lock=JSON.parse(get('package-lock.json'));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
});

test('Home stylesheet stays byte-identical to v62.8.9; no inherited body typography shift',()=>{
  const home=get('app/styles/08-home.css');
  assert.equal(createHash('sha256').update(home).digest('hex'),
    'bb66f4f307a1e033cb1de0f8dd428a92044f4d79f1b0c3b1187d43eae7944f1d');
  assert.match(home,/\.nfv-home\s*\{[^}]*font-size:\s*16px/s);
  const css=get('app/styles/00-foundation-and-store.css');
  assert.match(css,/body\{background:var\(--bg\);font-family:[^}]*font-size:13px;line-height:1\.55;letter-spacing:-\.005em/);
  assert.match(css,/\.main-content\{padding-bottom:44px;font-size:14px\}/);
  assert.doesNotMatch(css,/(^|[{}])\s*\.nfv-home\s*\{/);
});

test('Common Store/Account buttons and inputs derive updated font sizes from shared tokens',()=>{
  const css=get('app/styles/00-foundation-and-store.css');
  assert.match(css,/--nfv-btn-font:13px/);
  assert.match(css,/--nfv-btn-small-font:12px/);
  assert.match(css,/\.btn\{[^}]*font-size:var\(--nfv-btn-font\)/s);
  assert.match(css,/\.btn-small\{[^}]*font-size:var\(--nfv-btn-small-font\)/s);
  const form=get('app/styles/40-form-controls-and-chips.css');
  assert.match(form,/--nfv-control-font-size:\s*14px/);
  assert.match(form,/--nfv-control-label-size:\s*12px/);
});

test('Header/menu and footer font sizes are increased without changing navigation breakpoint or animations',()=>{
  const nav=get('app/styles/05-main-navigation.css');
  const footer=get('app/styles/07-brand-and-footer.css');
  assert.match(nav,/\.nfv-nav-link--desktop\s*\{[^}]*font-size:\s*12\.5px/s);
  assert.match(nav,/\.nfv-nav-link--drawer\s*\{[^}]*font-size:\s*14px/s);
  assert.match(nav,/@media \(max-width: 1279px\)/);
  assert.match(nav,/@keyframes nfv-nav-slide-in/);
  assert.match(footer,/\.nfv-site-footer\s*\{[^}]*font-size:\s*13px/s);
  assert.match(footer,/\.nfv-site-footer__nav\s*\{[^}]*font-size:\s*13px/s);
  assert.match(footer,/\.nfv-site-footer__bottom\s*\{[^}]*font-size:\s*12px/s);
});

test('Store, CSA, Account and Checkout typography is adjusted in existing feature rules',()=>{
  const foundation=get('app/styles/00-foundation-and-store.css');
  const account=get('app/styles/10-account-and-responsive.css');
  assert.match(foundation,/\.card-title\{[^}]*font-size:13px/s);
  assert.match(foundation,/\.csa-hero h1\{[^}]*font-size:27px/s);
  assert.match(foundation,/\.checkout-top h1,\.account-title h1\{[^}]*font-size:23px/s);
  assert.match(account,/\.account-link\{[^}]*font-size:13px/s);
  assert.match(account,/\.acc-metrics span\{[^}]*font-size:12px/s);
});

test('All six previously ported pages receive their balanced increments without changing animation syntax',()=>{
  const editorial=get('app/styles/09-editorial.css');
  const workshops=get('app/styles/09-workshops.css');
  const knowledge=get('app/styles/10-knowledge.css');
  const tracker=get('app/styles/11-tracker.css');
  const stories=get('app/styles/12-testimonials.css');
  assert.match(editorial,/editorial-page-hero h1\s*\{[^}]*font-size:\s*clamp\(31px,3\.8vw,48px\)/s);
  assert.match(workshops,/wk-hero h1\s*\{[^}]*font-size:\s*clamp\(1\.625rem, 3\.2vw, 2\.1875rem\)/s);
  assert.match(knowledge,/knowledge-section h2\s*\{[^}]*font-size:\s*clamp\(26px,2\.9vw,36px\)/s);
  assert.match(tracker,/tracker-header h1\s*\{[^}]*font-size:\s*clamp\(21px,2\.05vw,26px\)/s);
  assert.match(stories,/testimonials-page-intro h1\s*\{[^}]*font-size:\s*clamp\(24px,2\.55vw,30px\)/s);
  assert.match(stories,/--story-author-size:\s*13px/);
});

// Guard against adding a second typography design layer or accidentally editing Home.
test('Existing components remain the source of shared interactive UI',()=>{
  const ui=get('src/components/UI.tsx');
  const menu=get('src/components/overlays/OverlayPrimitives.tsx');
  assert.match(ui,/export function Button/);
  assert.match(menu,/SideDrawer/);
  assert.match(menu,/ResponsiveDialog/);
});


test('Only shared Menu/Cart/Stories drawer headings are reduced to 16px',()=>{
  const nav=get('app/styles/05-main-navigation.css');
  const overlay=get('app/styles/03-overlays.css');
  const component=get('src/components/overlays/OverlayPrimitives.tsx');
  const mobileMenu=get('src/components/navigation/MobileNavDrawer.tsx');
  const checkout=get('src/screens/Checkout.tsx');
  const stories=get('src/components/testimonials/StoriesWidget.tsx');
  assert.match(nav,/\.nfv-mobile-nav-heading h2\s*\{[^}]*font-size:\s*16px/s);
  assert.doesNotMatch(nav,/\.nfv-mobile-nav-heading h2\s*\{[^}]*font-size:\s*(?:17|18)px/s);
  assert.match(overlay,/\.nfv-unified-panel \.nfv-mobile-nav-heading h2/);
  assert.match(component,/className="nfv-mobile-nav-heading"/);
  for(const x of [mobileMenu,checkout,stories])assert.match(x,/SideDrawer/);
  assert.match(nav,/\.nfv-nav-link--drawer\s*\{[^}]*font-size:\s*14px/s);
});
