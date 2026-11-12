import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const url=pathToFileURL(new URL('../src/screens/account-csa/csa-rounds-presentation.ts',import.meta.url).pathname).href;
const run=code=>execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{stdio:'pipe'});
test('round collection expands only multiple rows and uses total across pages',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 assert.equal(m.roundsExpanded(1,false),true);assert.equal(m.roundsExpanded(21,false),false);assert.equal(m.roundsExpanded(21,true),true);
 assert.equal(m.roundsExpanded(0,false),false);
`));
test('shared quota and stock limit increases without adding own hold or credit again',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 const p=[{id:'a',quotaGroupId:'g',quotaCost:.25,availableQuantity:100},{id:'b',quotaGroupId:'g',quotaCost:.5,availableQuantity:10}];
 const q=[{groupId:'g',availableUnits:1.25}];const draft={a:3,b:1};
 assert.deepEqual(m.usedPoints(draft,p),{g:125});assert.equal(m.quantityLimits(p,draft,q).a,3);
 assert.equal(m.quantityLimits(p,{a:0,b:0},q).a,5);
 assert.equal(m.quantityLimits([{...p[0],availableQuantity:2},p[1]],{a:0,b:0},q).a,2);
 assert.equal(m.quantityLimits([{...p[0],quotaGroupId:'missing'}],{a:0},q).a,0);
`));
test('selection comparison disregards line order and omits zero quantities',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 assert.deepEqual(m.draftLines({b:2,a:0}),[{productId:'b',quantity:2}]);
 assert.equal(m.sameDraft({a:1,b:2},[{productId:'b',quantity:2},{productId:'a',quantity:1}]),true);
 assert.equal(m.sameDraft({a:2},[{productId:'a',quantity:1}]),false);
`));
test('saved selection metadata does not make an unchanged draft dirty',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 assert.equal(m.sameDraft({a:1},[{productId:'a',quantity:1,name:'Carrot',quotaGroupId:'g',quotaCost:.25,unitLabel:'kg'}]),true);
`));

test('limits consume shared group totals including unavailable draft choices',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 const products=[{id:'a',quotaGroupId:'g',quotaCost:.25,availableQuantity:20},{id:'b',quotaGroupId:'g',quotaCost:.5,availableQuantity:10}];
 assert.deepEqual(m.quantityLimits(products,{a:1,b:0},[{groupId:'g',availableUnits:2}],{g:125}),{a:4,b:1});
`));
test('summary keeps unavailable draft metadata and prefers current catalog metadata',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 const old={id:'a',name:'Old',unitLabel:'kg',quotaGroupId:'g',quotaCost:1};
 const snapshot={products:[{...old,name:'Current'}],selection:{lines:[{...old,productId:'a',name:'Saved'},{...old,productId:'c',name:'Historical'}]}};
 const products=m.selectionProducts(snapshot,[old,{...old,id:'b',name:'Beans'}]);
 assert.deepEqual(products.map(p=>[p.id,p.name]),[['a','Current'],['c','Historical'],['b','Beans']]);
`));

test('100 distinct choices block only new products, retaining quantity edits and removals',()=>run(`
 import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});
 const products=Array.from({length:101},(_,i)=>({id:String(i),quotaGroupId:'g',quotaCost:1,availableQuantity:10}));
 const draft=Object.fromEntries(products.slice(0,100).map(p=>[p.id,1]));const quota=[{groupId:'g',availableUnits:1000}];
 const limits=m.quantityLimits(products,draft,quota);
 assert.equal(limits['100'],0);assert.equal(limits['0'],10);
 draft['0']=0;assert.equal(m.quantityLimits(products,draft,quota)['100'],10);
`));
