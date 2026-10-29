import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const read=(name)=>fs.readFileSync(path.join(process.cwd(),name),'utf8');
const modelUrl=new URL('../src/screens/csa/csa-packages-model.ts',import.meta.url).href;
function runModel(script){
 const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','--eval',`const model=await import(${JSON.stringify(modelUrl)});${script}`],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);
}

test('CSA V2 sections and localized copy are ported in their original order',()=>{
 const source=read('src/screens/CSAProgram.tsx');
 const positions=['csa-v2-hero','copy.comparisons.map','<CsaPackages','csa-v2-timeline','<CsaFaq','csa-v2-help'];
 let last=-1;for(const item of positions){const index=source.indexOf(item);assert.ok(index>last,`missing/out-of-order ${item}`);last=index;}
 const content=read('src/data/csa-content.ts');
 for(const marker of ['Thực phẩm tươi mỗi tuần','Fresh food each week','why-natural-farming','why-csa','Các gói đang mở đăng ký','Packages open for registration','monday-availability.jpg','friday-delivery.jpg','faqItems','zalo.me/84988158285'])assert.ok(content.includes(marker),`missing V2 content ${marker}`);
});
test('CSA reuses V62 shared Button, DataState, assets and configuration',()=>{
 const source=['src/screens/CSAProgram.tsx','src/screens/csa/CsaComparison.tsx','src/screens/csa/CsaPackages.tsx','src/screens/csa/CsaFaq.tsx'].map(read).join('\n');
 for(const marker of ['Button','DataState','siteImageSrc','CsaSectionHeading'])assert.ok(source.includes(marker));
 assert.match(read('app/api/csa-packages/route.ts'),/getPublicContentOrigin/);
 assert.match(read('app/api/csa-packages/route.ts'),/\/api\/v1\/public\/membership-packages/);
});
test('CSA buy and tracking actions stay in the public CSA flow',()=>{
 const source=read('src/screens/CSAProgram.tsx');
 const packages=read('src/screens/csa/CsaPackages.tsx');
 assert.doesNotMatch(source,/navigate\("account"|openCsaPurchase/);
 assert.match(source,/csaTrackerHref\(locale\)/);
 assert.match(source,/csaPurchaseHref\(locale\)/);
 assert.match(source,/href="#csa-packages"/);
 assert.match(packages,/id="csa-packages"/);
 assert.match(packages,/csaPurchaseHref\(locale,item\.id,page\)/);
 assert.match(packages,/copy\.choosePackage/);
});
test('Scoped CSA stylesheet preserves V2 responsive structure and V62 tokens',()=>{
 const css=read('app/styles/13-csa.css');
 assert.match(css,/\.nfv-csa/);
 assert.match(css,/@media\(min-width:1024px\)/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/var\(--csa-surface-radius\)/);
 assert.match(css,/var\(--bg\)/);
 assert.match(css,/\.csa-v2-package-action\{[^}]*order:6/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(read('app/layout.tsx'),/13-csa\.css/);
});
test('Public package data validates payloads and cancels obsolete requests',()=>{
 assert.match(read('src/screens/csa/csa-packages-model.ts'),/parseCsaPackages/);
 assert.match(read('src/screens/csa/useCsaPackages.ts'),/AbortController/);
 assert.match(read('src/screens/csa/CsaPackages.tsx'),/kind="error"/);
 assert.match(read('src/screens/csa/CsaPackages.tsx'),/kind="loading"/);
});
test('CSA payment plans survive the strict public package boundary',()=>{
 runModel(`
  const payload={data:[{id:'package-1',name:'Gói gia đình',description:'Rau theo mùa',quota_policy:'rollover',items:[],price_options:[{id:'option-6',duration_months:6,monthly_price_vnd:'600000',total_price_vnd:'3600000',payment_plans:[{id:'plan-full',name:'Thanh toán một lần',payment_type:'full',total_amount:'3600000',installment_count:1,initial_payment_amount:'3600000',installments:[{sequence:1,amount:'3600000',cycle_count:6}]},{id:'plan-two',name:'Trả góp 2 đợt',payment_type:'installment',total_amount:'3600000',installment_count:2,initial_payment_amount:'1800000',installments:[{sequence:1,amount:'1800000',cycle_count:3},{sequence:2,amount:'1800000',cycle_count:3}]}]}]}],meta:{page:1,page_size:30,total:1}};
  const parsed=model.parseCsaPackages(payload);
  assert.equal(parsed.data[0].price_options[0].payment_plans.length,2);
  assert.deepEqual(parsed.data[0].price_options[0].payment_plans[1],payload.data[0].price_options[0].payment_plans[1]);
 `);
});
test('CSA payment plan boundary rejects malformed plan fields and installment rows',()=>{
 runModel(`
  const base={id:'plan-six',name:'Trả góp',payment_type:'installment',total_amount:'3600000',installment_count:2,initial_payment_amount:'1800000',installments:[{sequence:1,amount:'1800000',cycle_count:3},{sequence:2,amount:'1800000',cycle_count:3}]};
  const envelope=plan=>({data:[{id:'package-1',name:'Gói',description:'',quota_policy:'expire',items:[],price_options:[{id:'option-6',duration_months:6,monthly_price_vnd:'600000',total_price_vnd:'3600000',payment_plans:[plan]}]}],meta:null});
  for(const plan of [
   {...base,id:3},
   {...base,payment_type:'later'},
   {...base,total_amount:'-1'},
   {...base,installment_count:0},
   {...base,installments:'invalid'},
   {...base,installments:[{sequence:0,amount:'1800000',cycle_count:3}]},
   {...base,installments:[{sequence:1,amount:'0',cycle_count:3}]},
   {...base,installments:[{sequence:1,amount:'1800000',cycle_count:0}]},
  ])assert.throws(()=>model.parseCsaPackages(envelope(plan)));
  assert.throws(()=>model.parseCsaPackages({data:[{...envelope(base).data[0],price_options:[{...envelope(base).data[0].price_options[0],payment_plans:{}}]}],meta:null}));
 `);
});
