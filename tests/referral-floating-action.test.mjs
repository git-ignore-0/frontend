import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {readFileSync} from "node:fs";

const modelUrl=new URL("../src/components/account/referral-floating-action-model.ts",import.meta.url).href;
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("referral floating action exposes localized account destinations",()=>{
  run(`
    import assert from 'node:assert/strict';
    const model=await import(${JSON.stringify(modelUrl)});
    assert.deepEqual(model.referralFloatingActionModel('vi'),{
      href:'/account/vi?tab=referrals',
      label:'Giới thiệu bạn bè',
    });
    assert.deepEqual(model.referralFloatingActionModel('en'),{
      href:'/account/en?tab=referrals',
      label:'Refer friends',
    });
  `);
});

test("referral floating action stays on public pages and yields to private or overlay flows",()=>{
  run(`
    import assert from 'node:assert/strict';
    const model=await import(${JSON.stringify(modelUrl)});
    for(const page of ['home','about','workshops','plants','animals','tracker','testimonials','store','product','csa']){
      assert.equal(model.shouldShowReferralFloatingAction({page,overlayOpen:false}),true,page);
      assert.equal(model.shouldShowReferralFloatingAction({page,overlayOpen:true}),false,page+' overlay');
    }
    for(const page of ['account','checkout','order-detail','success']){
      assert.equal(model.shouldShowReferralFloatingAction({page,overlayOpen:false}),false,page);
    }
  `);
});

test("referral action keeps its accessible label and is wired into the shared public shell",()=>{
  const component=source("src/components/account/ReferralFloatingAction.tsx");
  const shell=source("app/NFVClientApp.tsx");
  const css=source("app/styles/96-account-benefits.css");
  assert.match(component,/aria-label=\{label\}/);
  assert.match(shell,/shouldShowReferralFloatingAction/);
  assert.match(shell,/ui\.cartOpen\|\|ui\.filterOpen\|\|ui\.categoryOpen/);
  assert.match(css,/\.referral-floating-action-label/);
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.referral-floating-action-label\{position:absolute/);
  assert.match(css,/\.nfv-app:has\(\[role="dialog"\]\)/);
});
