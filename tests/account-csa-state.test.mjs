import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const pendingUrl=new URL("../src/screens/account-csa/csa-pending-storage.ts",import.meta.url).href;
const accountUrl=new URL("../src/screens/account-csa/csa-account-review.ts",import.meta.url).href;

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("stored CSA data is only an Account-scoped request reference for Backend synchronization",()=>run(`
  import assert from "node:assert/strict";
  const pending=await import(${JSON.stringify(pendingUrl)});
  const values=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const owner={email:"Member@Example.com",phone:"+84 912 345 678"};
  const confirmation={id:"request-1",requestCode:"CSA-001",status:"payment_confirmed",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"500000",expiresAt:"2026-11-01T00:00:00.000Z"};
  pending.saveCsaPending(storage,owner,confirmation);
  assert.deepEqual(pending.loadCsaPending(storage,{email:"member@example.com",phone:"0912 345 678"},Date.parse("2026-11-02T00:00:00.000Z")),{requestCode:"CSA-001"});
  assert.equal(pending.loadCsaPending(storage,{email:"other@example.com",phone:"0912345678"},Date.parse("2026-10-26T00:00:00.000Z")),null);
`));

test("Account review requires exposed identity and validates a delivery address when available",()=>run(`
  import assert from "node:assert/strict";
  const account=await import(${JSON.stringify(accountUrl)});
  const profile={name:"Nguyễn Minh Anh",phone:"0912345678",email:"member@example.com"};
  assert.deepEqual(account.csaAccountReview(profile,undefined),{complete:false,missing:["address"],addressKnown:false,addressLabel:""});
  assert.deepEqual(account.csaAccountReview(profile,{name:"Nguyễn Minh Anh",phone:"0912345678",city:"Hà Nội",ward:"Phường Láng",detail:"25 Đường Láng"}),{complete:true,missing:[],addressKnown:true,addressLabel:"25 Đường Láng, Phường Láng, Hà Nội"});
  assert.deepEqual(account.csaAccountReview({...profile,phone:""},{name:"A",phone:"",city:"Hà Nội",ward:"Phường Láng",detail:"25 Đường Láng"}).missing,["phone"]);
  assert.deepEqual(account.csaAccountReview(profile,{name:"A",phone:"",city:"Hà Nội",ward:"",detail:"25 Đường Láng"}).missing,["address"]);
`));
