import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const component=read('src/screens/Store.tsx');
const store=component.slice(component.indexOf('export function Store(){'));
const css=read('app/styles/95-category-hierarchy.css');
const foundation=read('app/styles/00-foundation-and-store.css');

test('Store has one CSA panel placed after sidebar in the desktop rail, before product content',()=>{
  assert.equal((store.match(/className="editorial catalog-csa-editorial"/g)||[]).length,1);
  assert.ok(store.indexOf('className="catalog-rail"') < store.indexOf('className="category-sidebar"'));
  assert.ok(store.indexOf('className="category-sidebar"') < store.indexOf('className="editorial catalog-csa-editorial"'));
  assert.ok(store.indexOf('className="editorial catalog-csa-editorial"') < store.indexOf('className="catalog-main"'));
  assert.match(css,/@media\(max-width:800px\)\{[^}]*\.catalog-layout\{display:flex;flex-direction:column;gap:0\}/s);
  assert.match(css,/@media\(max-width:800px\)\{[\s\S]*?\.catalog-rail\{display:contents\}/);
  assert.match(css,/\.catalog-csa-editorial\{order:1;/);
  assert.match(css,/\.catalog-main\{order:0;width:100%\}/);
});

test('Store removes repetitive catalog heading and subtitle without removing category context or results count',()=>{
  assert.doesNotMatch(store, /Giá theo quy cách bán của từng sản phẩm|<h2>\{ui\.query\?/);
  assert.doesNotMatch(store, /className="catalog-head"/);
  assert.match(store,/className="catalog-breadcrumb"/);
  assert.match(store,/className="catalog-results-count" aria-live="polite"/);
});

test('Store uses one search, filter and sort action group without duplicated controls',()=>{
  assert.equal((store.match(/<DebouncedStoreSearch /g)||[]).length,1);
  assert.equal((store.match(/className="sort-wrap"/g)||[]).length,1);
  assert.equal((store.match(/catalog-filter-btn/g)||[]).length,1);
  assert.equal((store.match(/catalog-category-btn/g)||[]).length,1);
  assert.ok(store.indexOf('<DebouncedStoreSearch ')<store.indexOf('className="store-control-actions"'));
  assert.match(foundation,/\.store-search\{[^}]*width:100%;flex:1 1 0;/);
  assert.match(css,/\.store-control-actions\{display:flex;align-items:center;gap:10px;/);
  assert.match(css,/@media\(max-width:800px\)\{[\s\S]*?\.store-control\{display:flex;flex-direction:column;align-items:stretch;gap:8px\}/);
  assert.match(css,/\.store-control \.store-search\{flex:none;width:100%\}/);
});

test('Search filtering, category picker, sort, facet chips, and CTA navigation retain interaction hooks',()=>{
  assert.match(store,/onCommit=\{commitSearch\}/);
  assert.match(store,/onClick=\{\(\)=>setFilterOpen\(true\)\}/);
  assert.match(store,/onClick=\{\(\)=>setCategoryOpen\(true\)\}/);
  assert.match(store,/onChange=\{event=>setQuery\(\{sort:event\.target\.value as StoreSort,page:1\}\)\}/);
  assert.match(store,/active>0&&<div className="facet-chips"/);
  assert.match(store,/onClick=\{\(\)=>navigate\("csa"\)\}/);
});
