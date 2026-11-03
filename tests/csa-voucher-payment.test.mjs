import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";

const require=createRequire(import.meta.url),ts=require("typescript");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
class ApiError extends Error{constructor(code){super(code);this.code=code;}}
const preview={coupon:{code:"SAVE",discountAmount:"100000",customerPayableTotal:"2900000",initialPaymentBeforeDiscount:"500000"},summary:{initialPaymentAmount:"400000"}};
function harness(api,{guest=false}={}){
 let slots=[],cursor=0,effects=[],dirty=false,value;
 const auth={status:guest?"guest":"authenticated",session:guest?null:{subject:"A"}};
 const context={selection:{packageId:"package",priceOptionId:"option",paymentPlanId:"plan"},locale:"vi"};
 const state=initial=>{const i=cursor++;if(!(i in slots))slots[i]={value:initial};return [slots[i].value,next=>{const result=typeof next==="function"?next(slots[i].value):next;if(!Object.is(result,slots[i].value)){slots[i].value=result;dirty=true;}}];};
 const react={useMemo:(fn,deps)=>{const i=cursor++,before=slots[i];if(!before||deps.some((d,j)=>!Object.is(d,before.deps[j])))slots[i]={deps,value:fn()};return slots[i].value;},useState:state,useRef:initial=>{const [value]=state({current:initial});return value;},useLayoutEffect:(fn,deps)=>{const i=cursor++,before=slots[i];if(!before||deps.some((d,j)=>!Object.is(d,before.deps[j])))effects.push(()=>{before?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const cache=new Map();
 function load(path){
  const exports={};if(cache.has(path))return cache.get(path);cache.set(path,exports);
  vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>{
   if(id==="react")return react;
   if(id==="@/auth/AuthProvider")return {useAuth:()=>auth};
   if(id==="@/account/csa-service")return {AccountApiError:ApiError,previewCsaVoucher:api};
   if(id==="@/lib/voucher-copy")return load("src/lib/voucher-copy.ts");
   throw Error(id);
  }});return exports;
 }
 const hook=load("src/screens/account-csa/useCsaVoucher.ts").useCsaVoucher;
 function render(){let turns=0;do{dirty=false;cursor=0;value=hook(context.selection,context.locale);const callbacks=effects;effects=[];callbacks.forEach(fn=>fn());if(++turns>10)throw Error("loop");}while(dirty);}
 render();return {render,context,auth,get value(){return value;},change:code=>{value.change(code);render();},dispose:()=>slots.forEach(slot=>slot?.cleanup?.())};
}

test("selection previews only a code/selection, locks duplicate requests and marks the chosen voucher ready",async()=>{
 const late=deferred(),calls=[];const r=harness(input=>{calls.push(input);return late.promise;});r.change("SAVE");assert.equal(r.value.ready,false);
 const apply=r.value.apply;apply();apply();r.render();assert.equal(calls.length,1);assert.equal(r.value.loading,true);
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{packageId:"package",priceOptionId:"option",paymentPlanId:"plan",couponCode:"SAVE"});
 late.resolve(preview);await tick();r.render();assert.equal(r.value.loading,false);assert.equal(r.value.ready,true);assert.equal(r.value.applied,preview);r.dispose();
});

for(const field of ["packageId","priceOptionId","paymentPlanId"]){
 test(`changing ${field} requires another preview and discards late results`,async()=>{
  const late=deferred();const r=harness(()=>late.promise);r.change("SAVE");r.value.apply();r.context.selection={...r.context.selection,[field]:"other"};r.render();late.resolve(preview);await tick();r.render();assert.equal(r.value.applied,undefined);assert.equal(r.value.ready,false);assert.equal(r.value.loading,false);r.dispose();
 });
}

test("editing or clearing the selection code drops the old result without creating another API quote",async()=>{
 let calls=0;const r=harness(async()=>{calls++;return preview;});r.change("SAVE");await r.value.apply();r.render();assert.equal(r.value.ready,true);r.change("OTHER");assert.equal(r.value.applied,undefined);assert.equal(r.value.ready,false);r.value.clear();r.render();assert.equal(r.value.code,"");assert.equal(r.value.ready,true);assert.equal(calls,1);r.dispose();
});

test("preview failures block Continue and are localized",async()=>{
 const r=harness(async()=>{throw new ApiError("coupon_scope_mismatch");});r.change("STORE");await r.value.apply();r.render();assert.match(r.value.error,/CSA/);assert.equal(r.value.ready,false);assert.equal(r.value.loading,false);r.dispose();
});

test("guest preview never calls authenticated API",async()=>{
 let calls=0;const r=harness(async()=>{calls++;return preview;},{guest:true});r.change("SAVE");await r.value.apply();assert.equal(calls,0);assert.equal(r.value.applied,undefined);r.dispose();
});

test("leaving selection, changing locale or replacing a session discards old preview requests",async()=>{
 for(const change of ["unmount","locale","session"]){
  const late=deferred();const r=harness(()=>late.promise);r.change("SAVE");r.value.apply();if(change==="unmount")r.dispose();else{if(change==="locale")r.context.locale="en";else r.auth.session={subject:"A"};r.render();}late.resolve(preview);await tick();if(change!=="unmount"){r.render();assert.equal(r.value.applied,undefined);r.dispose();}
 }
});

for(const field of ["packageId","priceOptionId","paymentPlanId","locale"]){
 test(`returning to an earlier ${field} never restores an invalidated CSA preview`,async()=>{
  let calls=0;const r=harness(async()=>{calls++;return preview;});r.change("SAVE");await r.value.apply();r.render();assert.equal(r.value.ready,true);
  const original=r.context.selection,locale=r.context.locale;
  if(field==="locale")r.context.locale="en";else r.context.selection={...original,[field]:"other"};r.render();assert.equal(r.value.ready,false);
  r.context.selection=original;r.context.locale=locale;r.render();assert.equal(r.value.ready,false);assert.equal(r.value.applied,undefined);assert.equal(calls,1);
  await r.value.apply();r.render();assert.equal(r.value.ready,true);assert.equal(calls,2);r.dispose();
 });
}
