import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('guest Account stays inside the shared app shell before the shared footer',()=>{
  const root=file('app/NFVClientApp.tsx');
  const gate=file('src/components/auth/AuthGate.tsx');
  const entry=file('src/components/auth/AuthEntry.tsx');
  assert.match(root,/nfv-app--auth-route/);
  assert.match(root,/ui\.page==="account"\|\|ui\.page==="order-detail"/);
  assert.doesNotMatch(root,/ui\.page==="home"\?" nfv-app--auth-route"/);
  assert.match(root,/ui\.page==="account"\?<Account\/>/);
  assert.doesNotMatch(root,/<AuthGate><Account\/><\/AuthGate>/);
  assert.ok(root.indexOf('<SiteFooter/>')>root.indexOf('ui.page==="account"'));
  assert.match(gate,/auth\.status==="guest"\|\|auth\.status==="expired"/);
  assert.match(entry,/<main className="main-content nfv-auth-page">/);
});

test('short pages push footer down; viewport fallback and dynamic height supported',()=>{
  const css=file('app/styles/07-brand-and-footer.css');
  assert.match(css,/\.nfv-app--auth-route\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*min-height:\s*100vh;[^}]*min-height:\s*100dvh;/);
  assert.match(css,/\.nfv-app--auth-route\s*>\s*\.nfv-site-footer\s*\{\s*margin-top:\s*auto;/);
  assert.doesNotMatch(css,/\.nfv-site-footer\s*\{[^}]*position:\s*(fixed|sticky)/);
  assert.doesNotMatch(file('app/styles/06-auth.css'),/min-height:\s*calc\(/);
});
