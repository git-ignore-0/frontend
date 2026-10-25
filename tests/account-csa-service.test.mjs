import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const serviceUrl=new URL("../src/account/csa-service.ts",import.meta.url).href;
function run(script){const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});assert.equal(result.status,0,result.stderr||result.stdout);}

test("CSA service maps membership, quota, usage and owner contract",()=>run(`
  import assert from 'node:assert/strict';
  const service=await import(${JSON.stringify(serviceUrl)});const id='11111111-1111-4111-8111-111111111111';
  const payloads={
    '/api/account/csa-current?locale=vi':{data:{id,package_name:'Gói Rau',package_description:'Mô tả',status:'active',start_date:'2026-10-01',end_date:'2027-03-31',duration_months:6,monthly_price_vnd:'500000',total_price_vnd:'3000000'}},
    '/api/account/csa-quota?locale=vi':{data:{membership_id:id,products:[{product_name:'Rau',quota_units_per_cycle:4,remaining_units:3,unit_label_vi:'kg',unit_label_en:'kg'}]}},
    '/api/account/csa-usage?locale=vi&page=1':{data:[{id:'usage-old',status:'confirmed',created_at:'2026-10-20T00:00:00Z',lines:[{product_name:'Rau',units:1,unit_label_vi:'kg',unit_label_en:'kg'}]},{id:'usage-new',order_id:'NFV-2026-0142',status:'confirmed',created_at:'2026-10-21T00:00:00Z',lines:[{product_name:'Củ',units:2,unit_label_vi:'phần',unit_label_en:'portion'}]}],meta:{page:1,page_size:30,total:31}},
    ['/api/account/memberships/'+id+'/contract']:{data:{reference_code:'CSA-2026-1',issued_at:'2026-10-01T00:00:00Z',status:'active',available_locales:['vi','en']}},
  };
  globalThis.fetch=async path=>new Response(JSON.stringify(payloads[path]),{status:200,headers:{'Content-Type':'application/json'}});
  const result=await service.getCSA('vi');assert.equal(result.planName,'Gói Rau');assert.equal(result.quotas[0].remaining,3);assert.equal(result.usage[0].quantity,1);assert.equal(result.usage[0].orderId,undefined);assert.equal(result.usage[1].orderId,'NFV-2026-0142');assert.equal(result.pagination.usage.nextCursor,'2');assert.equal(result.contract.downloadUrl,'/api/account/memberships/'+id+'/contract/pdf?locale=vi');
`));

test("CSA purchase service posts only selection, accepted locale and signed quote token",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async (path,options)=>{calls.push({path,body:JSON.parse(options.body)});const data=path.endsWith('csa-payment-quotes')?{quote_token:'signed',expires_at:'2026-10-25T01:00:00Z',request_code:'CSA-1',payment:{amount:'500000',bank_code:'970436',bank_name:'VCB',account_number:'123',account_name:'NFV',transfer_content:'CSA-1'},payment_summary:{payment_type:'installment',total_amount:'3000000',initial_payment_amount:'500000',installment_count:2,installments:[{sequence:1,amount:'500000',cycle_count:1},{sequence:2,amount:'2500000',cycle_count:5}]},terms:{version:'v1',locale:'vi',hash:'abc'},qr_payload:{acqId:'970436',accountNo:'123',accountName:'NFV',amount:'500000',addInfo:'CSA-1',format:'text',template:'compact2'}}:{id:'purchase-1',request_code:'CSA-1',status:'payment_confirmed',package_snapshot:{name:'Gói Rau'},price_option_snapshot:{duration_months:6},amount:'3000000',initial_payment_amount:'500000',expires_at:'2026-11-01T00:00:00Z'};return new Response(JSON.stringify({data}),{status:200,headers:{'Content-Type':'application/json'}})};
  const quote=await service.createCsaPaymentQuote({packageId:'p',priceOptionId:'o',paymentPlanId:'plan',locale:'vi'});assert.equal(quote.payment.amount,'500000');assert.deepEqual(quote.summary.installments,[{sequence:1,amount:'500000',cycleCount:1},{sequence:2,amount:'2500000',cycleCount:5}]);assert.deepEqual(calls[0].body,{package_id:'p',price_option_id:'o',payment_plan_id:'plan',terms_accepted:true,terms_locale:'vi'});
  const confirmed=await service.confirmCsaTransfer(quote.quoteToken);assert.equal(confirmed.status,'payment_confirmed');assert.equal(confirmed.expiresAt,'2026-11-01T00:00:00Z');assert.deepEqual(calls[1].body,{quote_token:'signed'});
`));

test("CSA purchase status is read back from the Backend tracker payload",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async (path,options)=>{calls.push({path,body:JSON.parse(options.body)});return new Response(JSON.stringify({data:{reference_code:'CSA-001',status:'rejected',package_snapshot:{name:'Gói Rau'},duration_months:6,amount:'3000000',initial_payment_amount:'500000',expires_at:'2026-11-01T00:00:00Z',rejection_reason:'Không tìm thấy giao dịch'}}),{status:200,headers:{'Content-Type':'application/json'}})};
  const result=await service.getCsaPurchaseStatus({requestCode:'CSA-001',phone:'0912345678'});
  assert.deepEqual(result,{requestCode:'CSA-001',status:'rejected',packageName:'Gói Rau',durationMonths:6,amount:'3000000',initialPaymentAmount:'500000',expiresAt:'2026-11-01T00:00:00Z',rejectionReason:'Không tìm thấy giao dịch'});
  assert.deepEqual(calls[0],{path:'/api/account/csa-purchase-status',body:{reference_code:'CSA-001',phone:'0912345678'}});
`));

test("approved CSA purchase status preserves the scheduled membership dates",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});
  globalThis.fetch=async ()=>new Response(JSON.stringify({data:{reference_code:'CSA-002',status:'approved',package_snapshot:{name:'Gói Rau'},duration_months:6,amount:'3000000',initial_payment_amount:'3000000',expires_at:'2026-11-01T00:00:00Z',membership_start_date:'2026-12-01',membership_end_date:'2027-06-01'}}),{status:200,headers:{'Content-Type':'application/json'}});
  const result=await service.getCsaPurchaseStatus({requestCode:'CSA-002',phone:'0912345678'});
  assert.equal(result.status,'approved');
  assert.equal(result.membershipStartDate,'2026-12-01');
  assert.equal(result.membershipEndDate,'2027-06-01');
`));
