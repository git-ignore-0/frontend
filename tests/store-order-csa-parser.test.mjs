import assert from 'node:assert/strict';import test from 'node:test';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(url){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,URL,URLSearchParams,require:name=>load(new URL(name.endsWith('.ts')?name:name+'.ts',url))});return exports;}
const {parseStoreOrder}=load(new URL('../src/store/store-order-model.ts',import.meta.url));
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',time='2026-11-11T00:00:00Z';
const round={id,sequence:1,name:'Round 1',status:'closed',opens_at:'2026-11-01T00:00:00Z',closes_at:'2026-11-10T00:00:00Z',delivery_date:'2026-11-20',server_time:time,cancellation_reason:null};
const selection={id:other,round_id:id,membership_id:other,state:'locked',revision:2,order_id:other,reopen_until:null,server_time:time,lines:[]};
const raw={id:other,workflow_version:1,refund_status:null,transfer_reported_by:null,approved_by:null,payment_received_at:null,payment_received_by:null,refund_requested_at:null,refund_requested_by:null,refund_request_closed_at:null,refund_request_closed_by:null,refund_request_closed_reason:null,refunded_at:null,refunded_by:null,refund_amount_vnd:null,refund_note:"",cancelled_by:null,delivered_by:null,reference_code:'CSA-1',status:'pending_delivery',payment_status:'not_required',locale:'en',lines:[],shipping_address:{recipient_name:'An',phone_number:'0901234567',province_code:'66',ward_code:'1',address:'12 Street'},subtotal_vnd:0,shipping_fee_vnd:0,shipping_discount_reason:null,total_vnd:0,payment:null,expires_at:null,server_time:time,transfer_reported_at:null,approved_at:null,delivered_at:null,cancelled_at:null,cancellation_reason:null,reconciliation_note:'',created_at:time,updated_at:time};
test('Store order preserves optional CSA round and selection with no buy again',()=>{
 const result=parseStoreOrder({...raw,can_buy_again:true,csa:{round,selection}});assert.equal(result.csa.round.id,id);assert.equal(result.csa.selection.revision,2);assert.equal(result.canBuyAgain,false);
 assert.equal(parseStoreOrder(raw).csa,undefined);assert.equal(parseStoreOrder({...raw,csa:null}).csa,undefined);
});
test('malformed or mismatched CSA snapshots cannot silently become retail orders',()=>{
 for(const csa of [{round,selection:{...selection,revision:-1}},{round,selection:{...selection,round_id:other}},{round:{...round,delivery_date:'bad'},selection},{}])assert.throws(()=>parseStoreOrder({...raw,csa}));
});
test('new workflow and refund metadata are strict even without payment',()=>{
 for(const status of ['pending_review','payment_pending','payment_review','pending_delivery','delivered','cancelled']){
  const result=parseStoreOrder({...raw,status,workflow_version:2,refund_status:'pending',refund_requested_at:time,refund_amount_vnd:'0'});
  assert.equal(result.workflowVersion,2);assert.equal(result.status,status);assert.equal(result.refundStatus,'pending');assert.equal(result.refundRequestedAt,time);assert.equal(result.payment,null);
 }
 for(const workflow_version of [undefined,null,0,3,'2'])assert.throws(()=>parseStoreOrder({...raw,workflow_version}));
 for(const refund_status of [undefined,'refund_required',false])assert.throws(()=>parseStoreOrder({...raw,refund_status}));
 for(const value of ['bad',1,undefined])assert.throws(()=>parseStoreOrder({...raw,refund_requested_at:value}));
 assert.equal(parseStoreOrder({...raw,refund_status:'refunded',refunded_at:time,refund_note:'Bank returned',refund_amount_vnd:'45000'}).refundAmountVnd,45000);
});
test('locale actor UUID and timestamps are validated at order boundary',()=>{for(const [field,value] of [['locale','fr'],['payment_received_by','admin'],['server_time','now'],['server_time','2027-02-30T01:00:00Z'],['expires_at','2027-01-01'],['approved_at',9],['payment_received_at','2027-01-01T10:00:00']])assert.throws(()=>parseStoreOrder({...raw,[field]:value}));assert.equal(parseStoreOrder({...raw,payment_received_by:id,payment_received_at:time}).paymentReceivedBy,id)});
