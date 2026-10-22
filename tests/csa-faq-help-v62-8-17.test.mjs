import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read = name => fs.readFileSync(path.join(process.cwd(), name), 'utf8');
const css = read('app/styles/13-csa.css');
const page = read('src/screens/CSAProgram.tsx');
const faq = read('src/screens/csa/CsaFaq.tsx');

test('CSA FAQ restores V2 single framed panel, divided rows and reduced V62 heading scale', () => {
  assert.match(css, /\.nfv-csa \.csa-v2-faq-list\{[^}]*background:var\(--paper\);[^}]*border:1px solid/);
  assert.match(css, /\.nfv-csa \.csa-v2-faq-item\+\.csa-v2-faq-item\{border-top:/);
  assert.match(css, /\.nfv-csa \.csa-v2-faq>h2\{font-size:clamp\(19px,1\.7vw,22px\)/);
  assert.match(css, /\.nfv-csa \.csa-v2-faq>h2\{font-size:19px\}/);
  assert.doesNotMatch(css, /\.nfv-csa \.csa-v2-faq-list\{border-top:1px solid var\(--line\)\}/);
});

test('FAQ retains V62 Button, keyboard control, correctly hidden answers and aria relations', () => {
  assert.match(faq, /<Button variant="plain"/);
  assert.match(faq, /aria-expanded=\{active\}/);
  assert.match(faq, /aria-controls=/);
  assert.match(faq, /hidden=\{!active\}/);
  assert.match(css, /\.nfv-csa \.csa-v2-faq-answer\[hidden\]\{display:none\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('CSA Zalo help restores V2 dark banner, light copy and contrasting V62 ActionLink', () => {
  assert.match(page, /className="csa-v2-help-copy"/);
  assert.match(page, /<ActionLink className="csa-v2-help-action" href=\{copy.zaloUrl\}>/);
  assert.match(css, /\.nfv-csa \.csa-v2-help\{[^}]*background:var\(--green\)/);
  assert.match(css, /\.nfv-csa \.csa-v2-help h2\{[^}]*color:var\(--honey\)/);
  assert.match(css, /\.nfv-csa \.csa-v2-help-action\.btn\{[^}]*background:var\(--honey\)/);
  assert.match(css, /@media\(min-width:768px\)\{\s*\.nfv-csa \.csa-v2-help\{flex-direction:row/);
  assert.doesNotMatch(page, /<ActionLink variant="outline" href=\{copy.zaloUrl\}>/);
});
