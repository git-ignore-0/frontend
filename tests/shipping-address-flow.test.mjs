import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import test from "node:test";

const modelUrl=new URL("../src/account/shipping-address-model.ts",import.meta.url).href;
const serviceUrl=new URL("../src/account/shipping-service.ts",import.meta.url).href;
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("shared shipping address validation accepts only an active configured ward",()=>run(`
  import assert from 'node:assert/strict';const model=await import(${JSON.stringify(modelUrl)});
  const areas=[{code:'66',name:'Đắk Lắk',wards:[{code:'22015',name:'Phường Tuy Hoà',shippingFeeVnd:'30000'}]}];
  const draft={name:' Nguyễn Văn An ',phone:'090 123 4567',provinceCode:'66',wardCode:'22015',address:' Số 12, ngõ 5 '};
  assert.deepEqual(model.reviewShippingAddress(draft,areas),{complete:true,missing:[],value:{name:'Nguyễn Văn An',phone:'+84901234567',provinceCode:'66',wardCode:'22015',address:'Số 12, ngõ 5'}});
  assert.deepEqual(model.reviewShippingAddress({...draft,wardCode:'22045'},areas).missing,['wardCode']);
  assert.deepEqual(model.reviewShippingAddress({...draft,phone:'123'},areas).missing,['phone']);
  assert.equal(model.sanitizeVietnamPhoneInput('09ab 01-23.45'),'09012345');
`));

test("supported provinces and wards are sorted A-Z using the active locale",()=>run(`
  import assert from 'node:assert/strict';const model=await import(${JSON.stringify(modelUrl)});
  const areas=[
    {code:'79',name:'Thành phố Hồ Chí Minh',wards:[{code:'2',name:'Phường Bình Minh',shippingFeeVnd:'0'},{code:'1',name:'Xã An Phú',shippingFeeVnd:'0'}]},
    {code:'01',name:'Thành phố Hà Nội',wards:[]},
    {code:'48',name:'Thành phố Đà Nẵng',wards:[]},
  ];
  const sorted=model.sortShippingAreas(areas,'vi');
  assert.deepEqual(sorted.map(item=>item.code),['48','01','79']);
  assert.deepEqual(sorted[2].wards.map(item=>item.code),['2','1']);
  assert.deepEqual(areas.map(item=>item.code),['79','01','48']);
`));

test("shipping service reads only supported areas and preserves Backend fees without using them in CSA totals",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async (path,options)=>{calls.push({path,options});return new Response(JSON.stringify({data:[{province_code:'66',province_name:'Đắk Lắk',wards:[{ward_code:'22015',ward_name:'Phường Tuy Hoà',shipping_fee_vnd:'30000'}]}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  assert.deepEqual(await service.getSupportedShippingAreas('vi'),[{code:'66',name:'Đắk Lắk',wards:[{code:'22015',name:'Phường Tuy Hoà',shippingFeeVnd:'30000'}]}]);
  assert.equal(calls[0].path,'/api/account/shipping-areas?locale=vi');
  globalThis.fetch=async()=>new Response(JSON.stringify({data:[{province_code:'66',province_name:'Đắk Lắk',wards:[{ward_code:'',ward_name:'Bad',shipping_fee_vnd:'0'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>service.getSupportedShippingAreas('vi'),error=>error.code==='invalid_response');
  globalThis.fetch=async()=>new Response(JSON.stringify({data:[{province_code:'66',province_name:'Đắk Lắk',wards:[{ward_code:'22015',ward_name:'Phường Tuy Hoà',shipping_fee_vnd:null}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
  await assert.rejects(()=>service.getSupportedShippingAreas('vi'),error=>error.code==='invalid_response');
`));

test("shipping service maps the owner's saved address and keeps a disabled area readable",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});const calls=[];
  globalThis.fetch=async path=>{calls.push(path);const data=path==='/api/account/shipping-address'?{id:'address-1',recipient_name:'Nguyễn Văn An',phone_number:'+84901234567',province_code:'66',ward_code:'22015',address:'Số 12',is_supported:false,shipping_fee_vnd:null,created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z'}:path==='/api/account/administrative-provinces'?[{code:'66',name:'Đắk Lắk'}]:[{code:'22015',name:'Phường Tuy Hoà'}];return new Response(JSON.stringify({data}),{status:200,headers:{'Content-Type':'application/json'}})};
  assert.deepEqual(await service.getShippingAddress('vi'),{id:'address-1',name:'Nguyễn Văn An',phone:'+84901234567',city:'Đắk Lắk',ward:'Phường Tuy Hoà',detail:'Số 12',provinceCode:'66',wardCode:'22015',isSupported:false,shippingFeeVnd:null,isDefault:true});
  assert.deepEqual(calls,['/api/account/shipping-address','/api/account/administrative-provinces','/api/account/administrative-wards?province=66']);
`));

test("shipping service saves one address with codes and never sends a client shipping fee",()=>run(`
  import assert from 'node:assert/strict';const service=await import(${JSON.stringify(serviceUrl)});let submitted;
  globalThis.fetch=async (path,options)=>{submitted={path,method:options.method,body:JSON.parse(options.body)};return new Response(JSON.stringify({data:{id:'address-1',recipient_name:'Nguyễn Văn An',phone_number:'+84901234567',province_code:'66',ward_code:'22015',address:'Số 12',is_supported:true,shipping_fee_vnd:'30000',created_at:'2026-10-28T00:00:00Z',updated_at:'2026-10-28T00:00:00Z'}}),{status:200,headers:{'Content-Type':'application/json'}})};
  const draft={name:'Nguyễn Văn An',phone:'+84901234567',provinceCode:'66',provinceName:'Đắk Lắk',wardCode:'22015',wardName:'Phường Tuy Hoà',address:'Số 12'};
  assert.deepEqual(await service.saveShippingAddress(draft),{id:'address-1',name:'Nguyễn Văn An',phone:'+84901234567',city:'Đắk Lắk',ward:'Phường Tuy Hoà',detail:'Số 12',provinceCode:'66',wardCode:'22015',isSupported:true,shippingFeeVnd:'30000',isDefault:true});
  assert.deepEqual(submitted,{path:'/api/account/shipping-address',method:'PUT',body:{recipient_name:'Nguyễn Văn An',phone_number:'+84901234567',province_code:'66',ward_code:'22015',address:'Số 12'}});
`));

test("Account and guest CSA use the same supported-area address fields without showing a CSA delivery fee",()=>{
  const account=source("src/screens/AccountProfile.tsx");
  const csa=source("src/screens/account-csa/AccountCsaPackageSelection.tsx");
  const context=source("src/state/NFVContext.tsx");
  const types=source("src/types.ts");
  const accountCss=source("app/styles/10-account-and-responsive.css");
  assert.match(account,/ShippingAddressFields/);
  assert.match(csa,/ShippingAddressFields/);
  assert.match(csa,/useSupportedShippingAreas/);
  assert.doesNotMatch(csa,/getAdministrativeProvinces|getAdministrativeWards/);
  assert.doesNotMatch(csa,/shippingFeeVnd/);
  assert.match(csa,/tab=address/);
  assert.match(context,/shippingService\.getShippingAddress/);
  assert.match(context,/shippingService\.saveShippingAddress/);
  assert.match(context,/safe<Address\|null>\("getAddress"/);
  assert.doesNotMatch(context,/if\(method==="getAddress"\)return await shippingService/);
  assert.match(types,/shippingAddress: Address \| null/);
  assert.match(account,/const address=data\.shippingAddress/);
  assert.match(csa,/address=\{data\.shippingAddress\?\?undefined\}/);
  assert.match(account,/accountFetchState\.address/);
  assert.match(account,/isSupported===false/);
  assert.match(accountCss,/\.acc-form-grid \.acc-wide\{grid-column:1\/-1\}/);
});

test("service-backed Account resources are loaded without requiring the legacy browser bridge",()=>run(`
  import assert from 'node:assert/strict';
  const state=await import(${JSON.stringify(new URL("../src/state/initial-state.ts",import.meta.url).href)});
  assert.deepEqual(state.ACCOUNT_SERVICE_RESOURCES,["csa","rewards","referrals"]);
`));

