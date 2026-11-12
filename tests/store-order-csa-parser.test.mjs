import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(url){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,URL,URLSearchParams,require:name=>load(new URL(name.endsWith('.ts')?name:name+'.ts',url))});return exports;}
const {parseStoreOrder}=load(new URL('../src/store/store-order-model.ts',import.meta.url));
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',time='2026-11-11T00:00:00Z';
const round={id,sequence:1,name:'Round 1',status:'closed',opens_at:'2026-11-01T00:00:00Z',closes_at:'2026-11-10T00:00:00Z',delivery_at:'2026-11-20T00:00:00Z',server_time:time,cancellation_reason:null};
const selection={id:other,round_id:id,membership_id:other,state:'locked',revision:2,order_id:other,reopen_until:null,server_time:time,lines:[]};
const raw={id:other,reference_code:'CSA-1',status:'pending_delivery',payment_status:'not_required',locale:'en',lines:[],shipping_address:{recipient_name:'An',phone_number:'0901234567',province_code:'66',ward_code:'1',address:'12 Street'},subtotal_vnd:0,shipping_fee_vnd:0,shipping_discount_reason:null,total_vnd:0,payment:null,expires_at:null,server_time:time,transfer_reported_at:null,approved_at:null,delivered_at:null,cancelled_at:null,cancellation_reason:null,reconciliation_note:'',created_at:time,updated_at:time};
test('Store order preserves optional CSA round and selection with no buy again',()=>{
 const result=parseStoreOrder({...raw,can_buy_again:true,csa:{round,selection}});assert.equal(result.csa.round.id,id);assert.equal(result.csa.selection.revision,2);assert.equal(result.canBuyAgain,false);
 assert.equal(parseStoreOrder(raw).csa,undefined);assert.equal(parseStoreOrder({...raw,csa:null}).csa,undefined);
});
test('malformed or mismatched CSA snapshots cannot silently become retail orders',()=>{
 for(const csa of [{round,selection:{...selection,revision:-1}},{round,selection:{...selection,round_id:other}},{round:{...round,delivery_at:'bad'},selection},{}])assert.throws(()=>parseStoreOrder({...raw,csa}));
});
