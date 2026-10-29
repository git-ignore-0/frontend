import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const modelUrl=new URL("../src/screens/account-csa/csa-selection-model.ts",import.meta.url).href;

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`const selection=await import(${JSON.stringify(modelUrl)});${script}`],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

const fixtures=`
 const plan=(id,type,initial,count=1)=>({id,name:id,payment_type:type,total_amount:'3600000',installment_count:count,initial_payment_amount:initial,installments:Array.from({length:count},(_,index)=>({sequence:index+1,amount:initial,cycle_count:1}))});
 const option=(id,months,plans=[])=>({id,duration_months:months,monthly_price_vnd:'600000',total_price_vnd:String(months*600000),sort_order:months,payment_plans:plans});
 const pkg=(id,options)=>({id,name:id,description:'',quota_policy:'expire',items:[],price_options:options});
`;

test("CSA selection skips packages without a purchasable duration",()=>{
 run(`${fixtures}
  assert.equal(selection.createCsaSelection([]),null);
  assert.equal(selection.createCsaSelection([pkg('empty',[])]),null);
  assert.deepEqual(selection.createCsaSelection([pkg('empty',[]),pkg('ready',[option('one',1)])]),{packageId:'ready',priceOptionId:'one',paymentPlanId:null});
 `);
});

test("CSA selection never substitutes another package for an unavailable preferred package",()=>{
 run(`${fixtures}
  const packages=[pkg('first',[option('first-option',1)]),pkg('empty',[]),pkg('preferred',[option('preferred-option',6)])];
  assert.deepEqual(selection.createCsaSelection(packages,'preferred'),{packageId:'preferred',priceOptionId:'preferred-option',paymentPlanId:null});
  assert.equal(selection.createCsaSelection(packages,'missing'),null);
  assert.equal(selection.createCsaSelection(packages,'empty'),null);
 `);
});

test("CSA selection prefers the API full plan and derives legacy full payment only when plans are absent",()=>{
 run(`${fixtures}
  const installment=plan('installment','installment','600000',6),full=plan('full','full','3600000');
  const packages=[pkg('p',[option('six',6,[installment,full]),option('one',1)])];
  const initial=selection.createCsaSelection(packages);
  assert.deepEqual(initial,{packageId:'p',priceOptionId:'six',paymentPlanId:'full'});
  assert.deepEqual(selection.csaSelectionSummary(packages,initial),{packageId:'p',priceOptionId:'six',paymentPlanId:'full',paymentType:'full',totalAmount:'3600000',initialPaymentAmount:'3600000',installmentCount:1});
  const one=selection.changeCsaPriceOption(packages,initial,'one');
  assert.deepEqual(one,{packageId:'p',priceOptionId:'one',paymentPlanId:null});
  assert.deepEqual(selection.csaSelectionSummary(packages,one),{packageId:'p',priceOptionId:'one',paymentPlanId:null,paymentType:'full',totalAmount:'600000',initialPaymentAmount:'600000',installmentCount:1});
 `);
});

test("CSA selection resets stale duration and payment IDs when package or duration changes",()=>{
 run(`${fixtures}
  const full=plan('full-a','full','3600000'),installment=plan('installment-a','installment','600000',6),other=plan('full-b','full','1200000');
  const packages=[pkg('a',[option('a-six',6,[full,installment]),option('a-one',1)]),pkg('empty',[]),pkg('b',[option('b-two',2,[other])])];
  const initial=selection.createCsaSelection(packages);
  const paying=selection.changeCsaPaymentPlan(packages,initial,'installment-a');
  assert.equal(paying.paymentPlanId,'installment-a');
  assert.deepEqual(selection.changeCsaPriceOption(packages,paying,'a-one'),{packageId:'a',priceOptionId:'a-one',paymentPlanId:null});
  assert.deepEqual(selection.changeCsaPackage(packages,paying,'b'),{packageId:'b',priceOptionId:'b-two',paymentPlanId:'full-b'});
  assert.deepEqual(selection.changeCsaPackage(packages,paying,'empty'),paying);
  assert.deepEqual(selection.changeCsaPaymentPlan(packages,paying,'missing'),paying);
 `);
});

test("CSA payable summary returns null for selections that no longer exist",()=>{
 run(`${fixtures}
  const packages=[pkg('a',[option('one',1)])];
  assert.equal(selection.csaSelectionSummary(packages,null),null);
  assert.equal(selection.csaSelectionSummary(packages,{packageId:'missing',priceOptionId:'one',paymentPlanId:null}),null);
  assert.equal(selection.csaSelectionSummary(packages,{packageId:'a',priceOptionId:'missing',paymentPlanId:null}),null);
 `);
});
