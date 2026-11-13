import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const root=new URL('..',import.meta.url).pathname.replace(/\/$/,'');
const ts=createRequire(root+'/package.json')('typescript');
function harness(kind,prepare=()=>{}){let resolve;const ctx={data:{referrals:{referrer:null,invitees:[{id:'old'}]},rewards:{balance:100,history:[{id:'old'}],redemptions:[{id:'old'}],pagination:{redemptions:{nextCursor:'cursor',total:2}}}},ui:{visible:{},busyKeys:[]},patch(change){ctx.ui={...ctx.ui,...change}},setUI(fn){ctx.ui=fn(ctx.ui)},setData(fn){ctx.data=fn(ctx.data)},act:async(_,fn)=>fn(),call:()=>new Promise(r=>resolve=r)};
 prepare(ctx);
 const exports={};const source=readFileSync(root+'/src/screens/AccountBenefits.tsx','utf8')+'\nexport {useCursor};';
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react')return {useState:()=>[{},()=>{}]};if(name==='@/state/NFVContext')return {useNFV:()=>ctx};return {}}});
 const pending=exports.useCursor().next(kind,'cursor');return {ctx,pending,resolve:value=>resolve(value)};
}
test('ACC-02 referral pagination overwrites referrer attached while page is pending',async()=>{
 const h=harness('referrals');h.ctx.data={...h.ctx.data,referrals:{...h.ctx.data.referrals,referrer:{id:'new-referrer'}}};
 h.resolve({items:[{id:'page-2'}],nextCursor:null,total:2});await h.pending;
 assert.equal(h.ctx.data.referrals.referrer.id,'new-referrer');
});
test('ACC-02 redemption pagination drops concurrently created redemption but preserves balance',async()=>{
 const h=harness('redemptions');h.ctx.data={...h.ctx.data,rewards:{...h.ctx.data.rewards,balance:80,redemptions:[{id:'just-added'},{id:'old'}],pagination:{redemptions:{nextCursor:'cursor',total:3}}}};
 h.resolve({items:[{id:'page-2'}],nextCursor:null,total:2});await h.pending;
 assert.equal(h.ctx.data.rewards.balance,80);assert.equal(h.ctx.data.rewards.pagination.redemptions.total,3);assert.deepEqual(Array.from(h.ctx.data.rewards.redemptions,x=>x.id),['just-added','old','page-2']);
});

for(const kind of ['gifts','rewards','redemptions','referrals'])test(`${kind} accepts a lower server total without a concurrent update`,async()=>{
 const metaName=kind==='rewards'?'points':kind==='referrals'?'invitees':kind;
 const h=harness(kind,ctx=>{
  if(kind==='referrals')ctx.data.referrals.pagination={invitees:{nextCursor:'cursor',total:40}};
  else ctx.data.rewards.pagination[metaName]={nextCursor:'cursor',total:40};
 });
 h.resolve({items:[],nextCursor:null,total:20});await h.pending;
 const pagination=kind==='referrals'?h.ctx.data.referrals.pagination:h.ctx.data.rewards.pagination;
 assert.equal(pagination[metaName].total,20);assert.equal(pagination[metaName].nextCursor,null);
});
test('a page with a superseded cursor cannot replace refreshed pagination or append old rows',async()=>{
 const h=harness('redemptions');h.ctx.data={...h.ctx.data,rewards:{...h.ctx.data.rewards,pagination:{redemptions:{nextCursor:'fresh',total:1}}}};
 h.resolve({items:[{id:'obsolete'}],nextCursor:null,total:2});await h.pending;
 assert.equal(h.ctx.data.rewards.pagination.redemptions.nextCursor,'fresh');
 assert.equal(h.ctx.data.rewards.pagination.redemptions.total,1);
 assert.equal(h.ctx.data.rewards.redemptions.some(x=>x.id==='obsolete'),false);
});
