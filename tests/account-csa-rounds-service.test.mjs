import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
const serviceUrl=new URL('../src/account/csa-rounds-service.ts',import.meta.url).href;
const bffUrl=new URL('../src/account/bff-path.ts',import.meta.url).href;
const id='11111111-1111-4111-8111-111111111111';
const round={id,sequence:1,name:'Đợt 1',opens_at:'2026-11-11T01:00:00Z',closes_at:'2026-11-11T02:00:00Z',delivery_date:'2026-11-12',status:'open',server_time:'2026-11-11T01:30:00Z',cancellation_reason:null};
const selection={id,round_id:id,membership_id:id,state:'selecting',revision:2,order_id:null,reopen_until:null,server_time:round.server_time,lines:[{product_id:id,quantity:2,name:'Rau',unit_label:'túi',quota_group_id:id,quota_cost:'0.25'}]};
const product={id,name:'Rau',unit_size:'0.500',unit_label:'túi',primary_image:null,available_quantity:5,csa_quota_group:{id,name:'Rau nhóm',cost:.25}};
function run(script){const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','--eval',`import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});const id=${JSON.stringify(id)},round=${JSON.stringify(round)},selection=${JSON.stringify(selection)},product=${JSON.stringify(product)};${script}`],{encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);}
test('round services parse backend envelopes and send revision-bound mutations',()=>run(`
 const calls=[];let payload={data:[round],meta:{page:1,page_size:20,total:21}};
 globalThis.fetch=async(path,options)=>{calls.push({path,options});return new Response(JSON.stringify(payload),{status:200});};
 const page=await service.getRoundsPage();assert.equal(page.items[0].opensAt,round.opens_at);assert.deepEqual({...page,items:[]},{items:[],page:1,pageSize:20,total:21});
 payload={data:null};assert.equal(await service.getRoundSelection(id),null);
 payload={data:selection};assert.equal((await service.getRoundSelection(id)).lines[0].quotaCost,.25);
 payload={data:[product],round,selection,quota:[{product_id:id,available_units:'3.25'}]};
 const products=await service.getRoundProducts(id,'en');assert.equal(products.quota[0].availableUnits,3.25);assert.equal(products.products[0].quotaGroupName,'Rau nhóm');assert.equal(products.selection.revision,2);
 payload={data:{...selection,revision:3}};await service.saveRoundSelection({roundId:id,lines:[{productId:id,quantity:2}],locale:'en',expectedRevision:2});
 assert.deepEqual(JSON.parse(calls.at(-1).options.body),{lines:[{product_id:id,quantity:2}],locale:'en',expected_revision:2});assert.equal(calls.at(-1).options.method,'PUT');
 payload={data:{...selection,state:'confirmed',revision:3,order_id:id}};
 await service.confirmRoundSelection({selectionId:id,expectedRevision:2});assert.deepEqual(JSON.parse(calls.at(-1).options.body),{expected_revision:2});assert.equal(calls.at(-1).options.method,'POST');
 assert.deepEqual(calls.map(c=>c.path),['/api/account/csa-rounds?page=1','/api/account/csa-rounds/'+id+'/selection','/api/account/csa-rounds/'+id+'/selection','/api/account/csa-rounds/'+id+'/products?locale=en','/api/account/csa-rounds/'+id+'/selection','/api/account/csa-selections/'+id+'/confirm']);
`));
test('malformed contracts cannot become empty selections or successful saves',()=>run(`
 let payload;globalThis.fetch=async()=>new Response(JSON.stringify(payload),{status:200});
 for(const data of [undefined,{}, {...selection,state:'invented'}, {...selection,revision:1.2},{...selection,lines:[{...selection.lines[0],quota_cost:'0.251'}]},{...selection,round_id:'bad'},{...selection,reopen_until:'nonsense'}]){payload={data};await assert.rejects(()=>service.getRoundSelection(id),e=>e.code==='invalid_response');}
 payload={data:null};await assert.rejects(()=>service.saveRoundSelection({roundId:id,lines:[],locale:'vi',expectedRevision:2}),e=>e.code==='invalid_response');
 for(const p of [{...product,csa_quota_group:null},{...product,available_quantity:-1},{...product,primary_image:{} }]){payload={data:[p],round,selection:null,quota:[]};await assert.rejects(()=>service.getRoundProducts(id,'vi'),e=>e.code==='invalid_response');}
 payload={data:[product],round,selection,quota:[{product_id:id,available_units:'1.234'}]};await assert.rejects(()=>service.getRoundProducts(id,'vi'),e=>e.code==='invalid_response');
`));
test('CSA round BFF only allows scoped methods and strict UUID and query rules',()=>{
 const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','--eval',`import assert from 'node:assert/strict';const {accountUpstreamTarget:t,accountQueryAllowed:q}=await import(${JSON.stringify(bffUrl)});const id=${JSON.stringify(id)};
 for(const [path,method,query] of [[['csa-rounds'],'GET','page'],[['csa-rounds',id,'selection'],'GET','none'],[['csa-rounds',id,'selection'],'PUT','none'],[['csa-rounds',id,'products'],'GET','localized'],[['csa-selections',id,'confirm'],'POST','none']])assert.deepEqual(t(path,method),{path:'/api/v1/'+path.join('/'),session:'required',query});
 for(const [path,method] of [[['csa-rounds'],'POST'],[['csa-rounds','bad','selection'],'GET'],[['csa-rounds',id,'products'],'PUT'],[['csa-selections',id,'confirm'],'GET'],[['csa-rounds',id,'selection','extra'],'GET']])assert.equal(t(path,method),null);
 for(const query of ['?page=0','?page=1&page=2','?page_size=20','?locale=en'])assert.equal(q(new URL('https://x'+query),'page'),false);
 assert.equal(q(new URL('https://x?page=2'),'page'),true);assert.equal(q(new URL('https://x?locale=en'),'localized'),true);assert.equal(q(new URL('https://x?locale=fr'),'localized'),false);
 `],{encoding:'utf8'});assert.equal(result.status,0,result.stderr||result.stdout);
});
test('responses must belong to the requested round and selection',()=>run(`
 const other='22222222-2222-4222-8222-222222222222';let payload;
 globalThis.fetch=async()=>new Response(JSON.stringify(payload),{status:200});
 payload={data:{...selection,round_id:other}};await assert.rejects(()=>service.getRoundSelection(id),e=>e.code==='invalid_response');
 await assert.rejects(()=>service.saveRoundSelection({roundId:id,lines:[],locale:'vi',expectedRevision:2}),e=>e.code==='invalid_response');
 payload={data:{...selection,id:other}};await assert.rejects(()=>service.confirmRoundSelection({selectionId:id,expectedRevision:2}),e=>e.code==='invalid_response');
 payload={data:[product],round:{...round,id:other},selection:null,quota:[]};await assert.rejects(()=>service.getRoundProducts(id,'vi'),e=>e.code==='invalid_response');
 payload={data:[product],round,selection:{...selection,round_id:other},quota:[]};await assert.rejects(()=>service.getRoundProducts(id,'vi'),e=>e.code==='invalid_response');
`));

test('catalog reads preserve snapshot quota and the backend cap without adding own hold',()=>run(`
 const snapshotGroup='a2222222-2222-4222-8222-222222222222';
 const snapshotSelection={...selection,lines:[{...selection.lines[0],quantity:3,name:'Original pack',quota_group_id:snapshotGroup,quota_cost:'0.37'}]};
 const snapshotProduct={...product,name:'Original pack',csa_quota_group:{id:snapshotGroup,name:'Original group',cost:'0.37'}};
 const quota=[{product_id:snapshotGroup,available_units:'3.25'}];let payload;
 globalThis.fetch=async()=>Response.json(payload);
 for(const [available_quantity,selection_mode] of [[3,'held_only'],[2,'held_only'],[10,undefined]]){
   payload={data:[{...snapshotProduct,available_quantity,selection_mode}],round,selection:snapshotSelection,quota};
   const result=await service.getRoundProducts(id,'en');
   assert.equal(result.products[0].availableQuantity,available_quantity);
   assert.equal(result.products[0].heldOnly,selection_mode==='held_only'?true:undefined);
   assert.equal(result.products[0].quotaGroupId,snapshotGroup);
   assert.equal(result.products[0].quotaGroupName,'Original group');
   assert.equal(result.products[0].quotaCost,.37);
   assert.equal(result.quota[0].availableUnits,3.25);
 }
 payload={...payload,data:[{...product,available_quantity:0}],selection:null};
 assert.equal((await service.getRoundProducts(id,'en')).products[0].availableQuantity,0);
`));

test('a malformed held-only catalog row cannot grant stock or replace saved quota terms',()=>run(`
 const held={...product,selection_mode:'held_only',available_quantity:2};
 const invalidResponse=e=>e.code==='invalid_response'&&e.status===502;
 let payload;globalThis.fetch=async()=>Response.json(payload);
 for(const [row,saved] of [
   [held,null],
   [held,{...selection,lines:[]}],
   [{...held,available_quantity:0},selection],
   [{...held,available_quantity:3},selection],
   [{...held,csa_quota_group:{...held.csa_quota_group,id:'22222222-2222-4222-8222-222222222222'}},selection],
   [{...held,csa_quota_group:{...held.csa_quota_group,cost:'0.01'}},selection],
 ]){
   payload={data:[row],round,selection:saved,quota:[]};
   await assert.rejects(()=>service.getRoundProducts(id,'vi'),invalidResponse);
 }
`));

test('duplicate UUIDs cannot override catalog limits, selection lines or quota',()=>run(`
 const duplicate='a2222222-2222-4222-8222-222222222222',alternate=duplicate.toUpperCase();
 const row={...product,id:duplicate},quota={product_id:duplicate,available_units:'1.00'};
 let payload;globalThis.fetch=async()=>Response.json(payload);
 const valid={data:[row],round,selection:null,quota:[quota]};
 const invalidResponse=e=>e.code==='invalid_response'&&e.status===502;
 payload={...valid,data:[row,{...row,id:alternate,available_quantity:50}]};
 await assert.rejects(()=>service.getRoundProducts(id,'vi'),invalidResponse);
 payload={...valid,quota:[quota,{product_id:alternate,available_units:'100.00'}]};
 await assert.rejects(()=>service.getRoundProducts(id,'vi'),invalidResponse);
 const line={...selection.lines[0],product_id:duplicate};
 payload={data:{...selection,lines:[line,{...line,product_id:alternate}]}};
 await assert.rejects(()=>service.getRoundSelection(id),invalidResponse);
`));

test('PUT acknowledges the submitted revision and quantities',()=>run(`
 const input={roundId:id,selectionId:id,lines:[{productId:id,quantity:2}],locale:'vi',expectedRevision:2};
 const other='22222222-2222-4222-8222-222222222222';
 const saved={...selection,revision:3};
 let payload;globalThis.fetch=async()=>Response.json({data:payload});
 for(const invalid of [{...saved,id:other},{...saved,revision:2},{...saved,revision:4},{...saved,state:'cancelled'},{...saved,lines:[{...saved.lines[0],quantity:1}]}]){
   payload=invalid;
   await assert.rejects(()=>service.saveRoundSelection(input),e=>e.code==='invalid_response'&&e.status===502);
 }
 payload=saved;
 assert.equal((await service.saveRoundSelection(input)).revision,3);
`));

test('POST acknowledges a confirmed selection with an order and a matching revision',()=>run(`
 const input={selectionId:id,roundId:id,expectedRevision:2};
 const other='22222222-2222-4222-8222-222222222222';
 const confirmed={...selection,state:'confirmed',order_id:id,revision:3};
 let payload;globalThis.fetch=async()=>Response.json({data:payload});
 for(const invalid of [{...confirmed,round_id:other},{...confirmed,state:'selecting'},{...confirmed,order_id:null},{...confirmed,revision:1},{...confirmed,revision:4}]){
   payload=invalid;
   await assert.rejects(()=>service.confirmRoundSelection(input),e=>e.code==='invalid_response'&&e.status===502);
 }
 for(const revision of [2,3]){
   payload={...confirmed,revision};
   assert.equal((await service.confirmRoundSelection(input)).revision,revision);
 }
`));

test('PUT and POST expose transport loss and malformed success as uncertain outcomes',()=>run(`
 const mutations=[
   ()=>service.saveRoundSelection({roundId:id,lines:[],locale:'vi',expectedRevision:2}),
   ()=>service.confirmRoundSelection({selectionId:id,expectedRevision:2}),
 ];
 const responses=[
   [()=>{throw new TypeError('network lost');},'network_error',0,true],
   [()=>Response.json({error:'upstream_timeout'},{status:504}),'upstream_timeout',504,true],
   [()=>Response.json({error:'upstream_unavailable'},{status:502}),'upstream_unavailable',502,true],
   [()=>new Response('{',{status:200}),'invalid_response',502,true],
   [()=>Response.json({errors:[{code:'csa_selection_stale'}]},{status:409}),'csa_selection_stale',409,false],
   [()=>Response.json({error:'forbidden'},{status:403}),'forbidden',403,false],
 ];
 for(const [respond,code,status,uncertain] of responses){
   for(const mutate of mutations){
     globalThis.fetch=async()=>respond();
     await assert.rejects(mutate,e=>{
       assert.equal(e.code,code);
       assert.equal(e.status,status);
       assert.equal(service.isCsaMutationOutcomeUnknown(e),uncertain);
       return true;
     });
   }
 }
`));
