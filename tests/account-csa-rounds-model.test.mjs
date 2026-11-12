import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
const url=new URL('../src/account/csa-rounds-model.ts',import.meta.url).href;
function run(script){const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','--eval',`import assert from 'node:assert/strict';const m=await import(${JSON.stringify(url)});${script}`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);}
test('point decimals convert exactly and reject precision loss and unsafe values',()=>run(`
 for(const [v,n] of [['0.00',0],['1.01',101],[.29,29],['3.5',350],[20,2000]]) assert.equal(m.pointHundredths(v),n);
 for(const v of ['1.001','-1','1e2','',null,true,NaN,Infinity,9007199254740991,'90071992547409.92'])assert.throws(()=>m.pointHundredths(v),e=>e.code==='invalid_response');
`));
test('selection access honors terminal states and exact server window boundaries',()=>run(`
 const round={status:'open',opensAt:'2026-11-11T01:00:00Z',closesAt:'2026-11-11T02:00:00Z',deliveryAt:'2026-11-12T01:00:00Z'};
 const now=Date.parse(round.opensAt),selection={roundId:'r',state:'selecting',lines:[{}]};
 const access=(r=round,s=null,eligible=true,t=now)=>m.selectionAccess({round:r,selection:s,eligible,serverNow:t});
 assert.equal(access().mode,'select');assert.equal(access(round,null,false).mode,'readonly');assert.equal(access(round,null,true,now-1).mode,'readonly');
 assert.equal(access(round,selection,false).mode,'edit');assert.equal(access(round,{...selection,lines:[]},false).mode,'select');
 assert.equal(access(round,selection,true,Date.parse(round.closesAt)).mode,'readonly');
 for(const state of ['locked','confirmed','cancelled','delivered'])assert.equal(access(round,{...selection,state}).mode,'readonly');
 const reopened={...selection,state:'reselecting',reopenUntil:'2026-11-11T03:00:00Z'};
 assert.deepEqual(access(round,reopened,false,Date.parse(round.closesAt)),{mode:'reselect',deadline:reopened.reopenUntil});
 assert.equal(access(round,reopened,true,Date.parse(reopened.reopenUntil)).mode,'readonly');
 assert.equal(access({...round,status:'cancelled'},reopened).mode,'readonly');assert.equal(access(round,selection,true,NaN).mode,'readonly');
`));
