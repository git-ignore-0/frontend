import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Tracker page content consumes Store/Account tokens without creating a separate theme', () => {
  const css = read('app/styles/11-tracker.css');
  const block = css.match(/\.nfv-tracker \.tracker-shell \{([\s\S]*?)\}/)?.[1];
  assert.ok(block);
  for (const token of ['--green','--paper','--bg','--line','--radius','--muted'])
    assert.ok(css.includes(`var(${token})`), `missing ${token}`);
  assert.match(block, /--tracker-card-radius:\s*var\(--radius\)/);
  assert.match(css, /\.nfv-tracker \.tracker-farm-card \{[^}]*border-radius:\s*var\(--tracker-card-radius\)/s);
  assert.match(css, /\.nfv-tracker \.tracker-stat \{[^}]*border-radius:\s*var\(--tracker-card-radius\)/s);
  assert.doesNotMatch(css, /\.nfv-tracker \.detail-trigger/);
});

test('Tracker actions reuse existing Button, leaving dialog implementations alone', () => {
  const parts = read('src/screens/tracker/TrackerParts.tsx');
  assert.match(parts, /import \{ Button, Icon \} from "@\/components\/UI"/);
  assert.match(parts, /<Button[\s\S]*?onClick=\{onRetry\}/);
  assert.match(parts, /className="tracker-detail-button"/);
  assert.doesNotMatch(parts, /className="tracker-retry"|className="detail-trigger"/);
  const dialogs = read('src/screens/tracker/TrackerDialogs.tsx');
  assert.match(dialogs, /<dialog/);
  assert.match(dialogs, /className="farmer-dialog"/);
});

test('Tracker styles stay namespaced and avoid site-wide CSS overrides', () => {
 const css = read('app/styles/11-tracker.css');
 assert.doesNotMatch(css, /\.site-header|\.site-footer|\.account-layout|\.checkout/);
 assert.match(css, /\.nfv-tracker \.tracker-detail-button/);
});
