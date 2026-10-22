import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Footer background follows the primary button token with a slightly deeper shade',()=>{
  const footer=read('app/styles/07-brand-and-footer.css');
  const theme=read('app/styles/00-foundation-and-store.css');
  assert.match(theme,/\.btn\{[^}]*background:var\(--green\)/);
  assert.match(footer,/--nfv-footer-background:\s*color-mix\(in srgb, var\(--green\) 86%, black\)/);
  assert.match(footer,/background:\s*var\(--nfv-footer-background\)/);
  assert.match(footer,/border-top:\s*1px solid var\(--nfv-footer-background\)/);
  assert.doesNotMatch(footer,/background:\s*#376749/);
});
