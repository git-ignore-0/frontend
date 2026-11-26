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
 const round={status:'open',opensAt:'2026-11-11T01:00:00Z',closesAt:'2026-11-11T02:00:00Z',deliveryDate:'2026-11-12'};
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
test('round delivery is a strict date and reselect closes at Vietnam midnight',()=>run(`
 const id='11111111-1111-4111-8111-111111111111';
 const raw={id,sequence:1,name:'Round',status:'closed',opens_at:'2026-12-30T00:00:00Z',closes_at:'2026-12-31T16:59:00Z',delivery_date:'2027-01-01',server_time:'2026-12-31T16:59:00Z',cancellation_reason:null};
 const round=m.parseCsaRound(raw);assert.equal(round.deliveryDate,'2027-01-01');assert.equal(round.deliveryAt,undefined);
 for(const delivery_date of ['2027-02-29','2026-13-01','2027-01-01T00:00:00Z',''])assert.throws(()=>m.parseCsaRound({...raw,delivery_date}));
 assert.throws(()=>m.parseCsaRound({...raw,closes_at:'2026-12-31T17:00:00Z'}));
 const selection={state:'reselecting',lines:[],reopenUntil:'2027-01-01T01:00:00Z'};
 const access=serverNow=>m.selectionAccess({round,selection,eligible:false,serverNow});
 assert.equal(access(Date.parse('2026-12-31T16:59:59Z')).mode,'reselect');assert.equal(access(Date.parse('2026-12-31T17:00:00Z')).mode,'readonly');
 assert.equal(m.parseCsaRound({...raw,delivery_date:'2028-02-29'}).deliveryDate,'2028-02-29');
`));

test('round products accept a capped held-only row and an older catalog row',()=>run(`
 const id='11111111-1111-4111-8111-111111111111';
 const model={id,name:'Rau',unit_size:'500',unit_label:'g',primary_image:null,available_quantity:2,csa_quota_group:{id,name:'Rau',cost:'1.00'}};
 assert.equal(m.parseCsaProduct({...model,selection_mode:'held_only'}).heldOnly,true);
 assert.equal(m.parseCsaProduct(model).heldOnly,undefined);
 assert.throws(()=>m.parseCsaProduct({...model,selection_mode:'unknown'}));
`));
