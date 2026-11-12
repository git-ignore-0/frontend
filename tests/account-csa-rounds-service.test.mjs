import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
const serviceUrl=new URL('../src/account/csa-rounds-service.ts',import.meta.url).href;
const bffUrl=new URL('../src/account/bff-path.ts',import.meta.url).href;
const id='11111111-1111-4111-8111-111111111111';
const round={id,sequence:1,name:'Đợt 1',opens_at:'2026-11-11T01:00:00Z',closes_at:'2026-11-11T02:00:00Z',delivery_at:'2026-11-12T01:00:00Z',status:'open',server_time:'2026-11-11T01:30:00Z',cancellation_reason:null};
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
 payload={data:selection};await service.saveRoundSelection({roundId:id,lines:[{productId:id,quantity:2}],locale:'en',expectedRevision:2});
 assert.deepEqual(JSON.parse(calls.at(-1).options.body),{lines:[{product_id:id,quantity:2}],locale:'en',expected_revision:2});assert.equal(calls.at(-1).options.method,'PUT');
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
