import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const serviceUrl=new URL("../src/account/csa-tracker-service.ts",import.meta.url).href;
function run(script){const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});assert.equal(result.status,0,result.stderr||result.stdout);}

const resultFixture=`{reference_code:'CSA-2026-001',reference_type:'request',status:'approved',package_snapshot:{name:'Gói Rau'},price_option_snapshot:{name:'6 tháng'},duration_months:6,amount:'3000000',currency:'VND',created_at:'2026-10-25T00:00:00Z',expires_at:null,payment_confirmed_at:'2026-10-25T01:00:00Z',contract:{id:'11111111-1111-4111-8111-111111111111',reference_code:'CSA-C-001',status:'active'},pdf_available:true,available_pdf_locales:['vi','en']}`;
const contractFixture=`{id:'11111111-1111-4111-8111-111111111111',reference_code:'CSA-C-001',source:'purchase_request',status:'active',package_name_snapshot:'Gói Rau',price_option_name_snapshot:'6 tháng',amount_snapshot:'3000000',currency_snapshot:'VND',duration_months_snapshot:6,start_date:'2026-11-01',end_date:'2027-05-01',issued_at:'2026-10-26T00:00:00Z',revoked_at:null,revocation_reason:'',available_pdf_locales:['vi','en'],pdf_available:true,current_version:{id:'22222222-2222-4222-8222-222222222222',version_number:2,version_reason:'payment_confirmed',contract_status:'active',created_at:'2026-10-26T00:00:00Z',available_locales:['vi','en'],paid_amount:'500000',remaining_amount:'2500000',paid_cycles:1,total_cycles:6},versions:[],payment_plan:{id:'plan',name:'Trả góp',payment_type:'installment',total_amount:'3000000',installment_count:2,initial_payment_amount:'500000',installments:[{sequence:1,amount:'500000',cycle_count:1},{sequence:2,amount:'2500000',cycle_count:5}]},payment_summary:{total_amount:'3000000',paid_amount:'500000',remaining_amount:'2500000',confirmed_installments:1,installment_count:2,paid_cycles:1,total_cycles:6},payments:[{installment_sequence:1,amount_due:'500000',amount_paid:'500000',cycle_count:1,status:'confirmed',due_at:null,confirmed_at:'2026-10-25T01:00:00Z',rejected_at:null}]}`;

test("tracker service uses lookup cookie flow then parses approved contract details",()=>run(`
  import assert from 'node:assert/strict';const tracker=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async(path,init={})=>{calls.push({path,init});const data=path.endsWith('/lookup')?${resultFixture}:${contractFixture};return new Response(JSON.stringify({data}),{status:200,headers:{'Content-Type':'application/json'}})};
  const result=await tracker.lookupCsaContract({referenceCode:'CSA-2026-001',phone:'+84901234567'});assert.equal(result.status,'approved');assert.equal(result.contract.referenceCode,'CSA-C-001');
  const contract=await tracker.getTrackedCsaContract();assert.equal(contract.paymentSummary.remainingAmount,'2500000');assert.equal(contract.payments[0].status,'confirmed');assert.equal(contract.currentVersion.versionNumber,2);assert.equal(contract.revocationReason,null);
  assert.deepEqual(JSON.parse(calls[0].init.body),{reference_code:'CSA-2026-001',phone:'+84901234567'});assert.equal(calls[0].init.credentials,'same-origin');assert.equal(calls[1].path,'/api/account/csa-contract-tracker/contract');
`));

test("tracker PDF validates content type and preserves a safe response filename",()=>run(`
  import assert from 'node:assert/strict';const tracker=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async path=>{calls.push(path);return new Response('pdf',{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="contract-vi.pdf"'}})};
  const file=await tracker.downloadTrackedCsaContract('vi','22222222-2222-4222-8222-222222222222');assert.equal(file.filename,'contract-vi.pdf');assert.equal(file.blob.type,'application/pdf');assert.match(calls[0],/locale=vi&version_id=22222222/);
  globalThis.fetch=async()=>new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});await assert.rejects(()=>tracker.downloadTrackedCsaContract('vi'),error=>error.code==='csa_contract_pdf_unavailable');
`));

test("tracker service maps rate limits and secure-session expiry without masking codes",()=>run(`
  import assert from 'node:assert/strict';const tracker=await import(${JSON.stringify(serviceUrl)});
  globalThis.fetch=async()=>new Response(JSON.stringify({errors:[{code:'csa_tracker_session_expired'}]}),{status:401,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>tracker.getTrackedCsaContract(),error=>tracker.isTrackerSessionExpired(error));
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'anything'}),{status:429,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>tracker.lookupCsaContract({referenceCode:'CSA-1',phone:'+84901234567'}),error=>error.code==='rate_limited'&&error.status===429);
`));

test("tracker service rejects unknown statuses and malformed contract money",()=>run(`
  import assert from 'node:assert/strict';const tracker=await import(${JSON.stringify(serviceUrl)});
  globalThis.fetch=async path=>new Response(JSON.stringify({data:path.endsWith('/lookup')?{...${resultFixture},status:'mystery'}:{...${contractFixture},amount_snapshot:'not-money'}}),{status:200,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>tracker.lookupCsaContract({referenceCode:'CSA-1',phone:'+84901234567'}),error=>error.code==='invalid_response');
  await assert.rejects(()=>tracker.getTrackedCsaContract(),error=>error.code==='invalid_response');
`));

test("tracker contract must belong to the approved lookup result",()=>run(`
  import assert from 'node:assert/strict';const tracker=await import(${JSON.stringify(serviceUrl)});
  const result={contract:{id:'contract-a',referenceCode:'CSA-C-A',status:'active'}};
  assert.equal(tracker.trackerContractMatchesResult(result,{id:'contract-a',referenceCode:'CSA-C-A'}),true);
  assert.equal(tracker.trackerContractMatchesResult(result,{id:'contract-b',referenceCode:'CSA-C-A'}),false);
  assert.equal(tracker.trackerContractMatchesResult(result,{id:'contract-a',referenceCode:'CSA-C-B'}),false);
  assert.equal(tracker.trackerContractMatchesResult({...result,contract:null},{id:'contract-a',referenceCode:'CSA-C-A'}),false);
`));
