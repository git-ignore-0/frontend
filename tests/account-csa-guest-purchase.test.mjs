import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import test from "node:test";

const buyerUrl=new URL("../src/screens/account-csa/csa-guest-buyer.ts",import.meta.url).href;
const unitsUrl=new URL("../src/account/administrative-units-service.ts",import.meta.url).href;
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("guest buyer validation normalizes Vietnamese phones and requires every Backend identity field",()=>run(`
  import assert from 'node:assert/strict';const buyer=await import(${JSON.stringify(buyerUrl)});
  assert.equal(buyer.normalizeVietnamPhone('090 123 4567'),'+84901234567');
  assert.equal(buyer.normalizeVietnamPhone('+84 901-234-567'),'+84901234567');
  assert.equal(buyer.normalizeVietnamPhone('123'), '');
  assert.equal(buyer.sanitizeVietnamPhoneInput('09ab 01-23.45'),'09012345');
  assert.equal(buyer.sanitizeVietnamPhoneInput('+84abc901+234567'),'+84901234567');
  assert.equal(buyer.sanitizeVietnamPhoneInput('84+901xyz'),'84901');
  const areas=[{code:'66',name:'Đắk Lắk',wards:[{code:'22015',name:'Phường Tuy Hoà',shippingFeeVnd:'30000'}]}];
  const complete=buyer.csaGuestBuyerReview({name:' Nguyễn Văn An ',phone:'0901234567',provinceCode:'66',wardCode:'22015',address:' Số 12, ngõ 5 '},areas);
  assert.deepEqual(complete,{complete:true,missing:[],identity:{name:'Nguyễn Văn An',phone:'+84901234567',province_code:'66',ward_code:'22015',address:'Số 12, ngõ 5'}});
  const missing=buyer.csaGuestBuyerReview({name:'',phone:'123',provinceCode:'',wardCode:'',address:''},areas);
  assert.equal(missing.complete,false);assert.deepEqual(missing.missing,['name','phone','provinceCode','wardCode','address']);assert.equal(missing.identity,null);
  const mismatched=buyer.csaGuestBuyerReview({name:'Nguyễn Văn An',phone:'0901234567',provinceCode:'66',wardCode:'99999',address:'Số 12'},areas);
  assert.equal(mismatched.complete,false);assert.deepEqual(mismatched.missing,['wardCode']);assert.equal(mismatched.identity,null);
`));

test("administrative unit service uses public BFF data and rejects malformed rows",()=>run(`
  import assert from 'node:assert/strict';const units=await import(${JSON.stringify(unitsUrl)});const calls=[];
  globalThis.fetch=async path=>{calls.push(path);return new Response(JSON.stringify({data:[{code:'66',name:'Đồng Tháp'}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  assert.deepEqual(await units.getAdministrativeProvinces('vi'),[{code:'66',name:'Đồng Tháp'}]);
  assert.deepEqual(await units.getAdministrativeWards('66','vi'),[{code:'66',name:'Đồng Tháp'}]);
  assert.deepEqual(calls,['/api/account/administrative-provinces','/api/account/administrative-wards?province=66']);
  globalThis.fetch=async()=>new Response(JSON.stringify({data:[{code:'',name:'Invalid'}]}),{status:200,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>units.getAdministrativeProvinces('vi'),error=>error.code==='invalid_response');
`));

test("existing CSA component branches only the buyer step and sends guest identity to quote and confirmation",()=>{
  const component=source("src/screens/account-csa/AccountCsaPackageSelection.tsx");
  assert.match(component,/useAuth\(\)/);
  assert.match(component,/<AccountCsaGuestStep/);
  assert.match(component,/createCsaPaymentQuote\(\{\.\.\.current,locale:ui\.locale,guestIdentity/);
  assert.match(component,/confirmCsaTransfer\(quote\.quoteToken,guestIdentity/);
  assert.match(component,/const storage=csaPendingStorage\(!guestMode,window\);if\(storage\)saveCsaPending\(storage,owner,result\)/);
  assert.doesNotMatch(component,/csaPendingGuestPhone/);
  assert.match(component,/useSupportedShippingAreas/);
  assert.match(component,/useSupportedShippingAreas\(ui\.locale,guestMode&&\["account","terms","payment"\]\.includes\(step\)\)/);
  assert.match(component,/ShippingAddressFields/);
  assert.doesNotMatch(component,/getAdministrativeProvinces|getAdministrativeWards/);
  assert.doesNotMatch(source("src/screens/account-csa/csa-guest-buyer.ts"),/email/);
  assert.match(source("src/screens/account-csa/AccountCsaTracker.tsx"),/setPhone\(sanitizeVietnamPhoneInput\(event\.target\.value\)\)/);
});
