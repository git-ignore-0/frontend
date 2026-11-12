import test from 'node:test';
import {execFileSync} from 'node:child_process';
const url=new URL('../src/screens/account-csa/csa-round-submit.ts',import.meta.url).href;
const run=code=>execFileSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',code],{stdio:'pipe'});
test('reselection saves before confirming using the returned revision',()=>run(`
 import assert from 'node:assert/strict';const {submitCsaSelection}=await import(${JSON.stringify(url)});const calls=[];
 const result=await submitCsaSelection({roundId:'r',selection:{id:'s',revision:3,lines:[]},lines:[{productId:'p',quantity:1}],locale:'vi',confirm:true},
 {save:async input=>{calls.push(input);return {id:'s',revision:4}},confirm:async input=>{calls.push(input);return {id:'s',revision:4,state:'confirmed'}}});
 assert.equal(calls[0].expectedRevision,3);assert.deepEqual(calls[1],{selectionId:'s',expectedRevision:4});assert.equal(result.state,'confirmed');
`));
test('retry confirmation of unchanged saved draft does not save a second time',()=>run(`
 import assert from 'node:assert/strict';const {submitCsaSelection}=await import(${JSON.stringify(url)});let saves=0;
 const selection={id:'s',revision:4,lines:[{productId:'p',quantity:1,name:'Carrot',unitLabel:'kg',quotaGroupId:'g',quotaCost:1}]};
 const result=await submitCsaSelection({roundId:'r',selection,lines:selection.lines,locale:'en',confirm:true},{save:async()=>{saves++;throw Error()},confirm:async input=>({...selection,state:'confirmed'})});assert.equal(saves,0);assert.equal(result.state,'confirmed');
`));
test('failed confirmation preserves successful save for truthful retry',()=>run(`
 import assert from 'node:assert/strict';const {submitCsaSelection,CsaConfirmationError}=await import(${JSON.stringify(url)});const saved={id:'s',revision:8};
 await assert.rejects(()=>submitCsaSelection({roundId:'r',selection:null,lines:[{productId:'p',quantity:1}],locale:'vi',confirm:true},{save:async()=>saved,confirm:async()=>{throw Error('network')}}),error=>error instanceof CsaConfirmationError&&error.selection.revision===8&&error.reason.message==='network');
`));
