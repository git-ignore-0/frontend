import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const pendingUrl=new URL("../src/screens/account-csa/csa-pending-storage.ts",import.meta.url).href;
const accountUrl=new URL("../src/screens/account-csa/csa-account-review.ts",import.meta.url).href;

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

function runPending(script){
  run(`
    import assert from "node:assert/strict";
    const pending=await import(${JSON.stringify(pendingUrl)});
    const member="11111111-1111-4111-8111-111111111111", other="22222222-2222-4222-8222-222222222222";
    const phone="+84901234567";
    const key=pending.CSA_PENDING_STORAGE_KEY;
    const makeStorage=()=>{
      const values=new Map();
      return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
    };
    const confirmation={id:"request-1",requestCode:"CSA-001",status:"payment_confirmed",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"500000",expiresAt:"2026-11-01T00:00:00.000Z"};
    ${script}
  `);
}

test("new member pending state retains the request recipient phone after email and address changes",()=>runPending(`
  const storage=makeStorage();
  pending.saveCsaPending(storage,member,{...confirmation,recipientPhone:phone});
  const raw=storage.getItem(pending.csaPendingStorageKey(member));
  assert.equal(storage.getItem(key),null);
  assert.deepEqual(JSON.parse(raw),{version:3,owner:{subject:member,phone},reference:{requestCode:"CSA-001"}});
  assert.deepEqual(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:null,phone:""}),{requestCode:"CSA-001",phone});
  assert.deepEqual(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:"added@example.test",phone:"+84911111111"}),{requestCode:"CSA-001",phone});
  assert.deepEqual(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:"changed@example.test",phone:"+84922222222"}),{requestCode:"CSA-001",phone});
`));

test("another Core account sharing a recipient phone cannot resolve member pending state",()=>runPending(`
  const storage=makeStorage();
  pending.saveCsaPending(storage,member,{...confirmation,recipientPhone:phone});
  const raw=pending.readCsaPendingSnapshot(storage,member);
  assert.equal(pending.resolveCsaPendingMemberReference(raw,{subject:other,email:"member@example.test",phone}),null);
  assert.equal(pending.resolveCsaPendingMemberReference(raw,{subject:"",email:null,phone}),null);
`));

test("pending member references still normalize a stored legacy recipient phone",()=>runPending(`
  const raw=JSON.stringify({version:3,owner:{subject:member,phone:"+84 901-234-567"},reference:{requestCode:"CSA-001"}});
  assert.deepEqual(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:null,phone:""}),{requestCode:"CSA-001",phone});
  assert.equal(pending.resolveCsaPendingMemberReference(raw,{subject:other,email:null,phone}),null);
`));

test("legacy member references provide a request code for owner lookup without a phone",()=>runPending(`
  for (const raw of [
    JSON.stringify({version:1,owner:{email:"member@example.test",phone:"0901234567"},confirmation}),
    JSON.stringify({version:2,owner:{email:"member@example.test",phone:"0901234567"},reference:{requestCode:"CSA-001"}}),
  ]) {
    const owner={subject:member,email:" MEMBER@example.test ",phone:"+84911111111"};
    assert.deepEqual(pending.resolveCsaPendingMemberReference(raw,owner),{requestCode:"CSA-001",phone:null});
    assert.equal(pending.resolveCsaPendingMemberReference(raw,{...owner,email:"other@example.test"}),null);
    assert.equal(pending.resolveCsaPendingMemberReference(raw,{...owner,email:null}),null);
    assert.equal(pending.resolveCsaPendingMemberReference(raw,{...owner,subject:""}),null);
  }
`));

test("legacy guest references cannot be recovered under a signed-in member account",()=>runPending(`
  for (const raw of [
    JSON.stringify({version:1,owner:{email:"",phone:"0901234567"},confirmation}),
    JSON.stringify({version:2,owner:{email:"",phone:"0901234567"},reference:{requestCode:"CSA-001"}}),
  ]) {
    assert.equal(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:null,phone}),null);
    assert.equal(pending.resolveCsaPendingMemberReference(raw,{subject:member,email:"member@example.test",phone}),null);
  }
`));

test("guest mode clears legacy guest references and keeps member state across logout",()=>runPending(`
  const localStorage=makeStorage(),sessionStorage=makeStorage();
  const stores={localStorage,sessionStorage};
  const guest=JSON.stringify({version:2,owner:{email:"",phone:"0901234567"},reference:{requestCode:"CSA-GUEST"}});
  assert.equal(pending.csaPendingStorage(false,stores),null);
  assert.equal(pending.csaPendingStorage(true,stores),localStorage);
  localStorage.setItem(key,guest);sessionStorage.setItem(key,guest);
  pending.clearGuestCsaPending(stores);
  assert.equal(localStorage.getItem(key),null);
  assert.equal(sessionStorage.getItem(key),null);
  const legacyMember=JSON.stringify({version:2,owner:{email:"member@example.test",phone:"0901234567"},reference:{requestCode:"CSA-001"}});
  localStorage.setItem(key,legacyMember);
  pending.clearGuestCsaPending(stores);
  assert.equal(localStorage.getItem(key),legacyMember);
  pending.saveCsaPending(localStorage,member,{...confirmation,recipientPhone:phone});
  const memberRaw=localStorage.getItem(pending.csaPendingStorageKey(member));
  pending.clearGuestCsaPending(stores);
  assert.equal(localStorage.getItem(key),legacyMember);
  assert.equal(localStorage.getItem(pending.csaPendingStorageKey(member)),memberRaw);
`));

test("discard only removes the matching owner's request from scoped or legacy storage",()=>runPending(`
  const storage=makeStorage(),owner={subject:member,email:'a@example.test',phone};
  const legacy=JSON.stringify({version:2,owner:{email:owner.email,phone},reference:{requestCode:'CSA-LEGACY'}});
  storage.setItem(key,legacy);
  pending.saveCsaPending(storage,member,{...confirmation,recipientPhone:phone});
  pending.saveCsaPending(storage,other,{...confirmation,requestCode:'CSA-OTHER',recipientPhone:phone});
  pending.discardCsaPending(storage,owner,'CSA-OTHER');
  assert.equal(pending.resolveCsaPendingMemberReference(pending.readCsaPendingSnapshot(storage,member),owner).requestCode,'CSA-001');
  pending.discardCsaPending(storage,owner,'CSA-001');
  assert.equal(pending.readCsaPendingSnapshot(storage,member),legacy);
  pending.discardCsaPending(storage,{...owner,subject:other,email:'b@example.test'},'CSA-LEGACY',legacy);
  assert.equal(storage.getItem(key),legacy);
  pending.discardCsaPending(storage,owner,'CSA-LEGACY');
  assert.equal(storage.getItem(key),legacy);
  pending.discardCsaPending(storage,owner,'CSA-LEGACY',legacy);
  assert.equal(pending.readCsaPendingSnapshot(storage,member),null);
  assert.equal(pending.resolveCsaPendingMemberReference(pending.readCsaPendingSnapshot(storage,other),{...owner,subject:other}).requestCode,'CSA-OTHER');
`));

test("member Account review follows the Backend Shipping Address requirements",()=>run(`
  import assert from "node:assert/strict";
  const account=await import(${JSON.stringify(accountUrl)});
  assert.deepEqual(account.csaAccountReview(),{complete:false,addressLabel:""});
  const address={name:"Người nhận",phone:"+84912345678",city:"Hà Nội",ward:"Phường Láng",detail:"25 Đường Láng",provinceCode:"01",wardCode:"00001",isSupported:true};
  assert.deepEqual(account.csaAccountReview(address),{complete:true,addressLabel:"25 Đường Láng, Phường Láng, Hà Nội"});
  for (const invalid of [
    {...address,isSupported:false}, {...address,isSupported:undefined}, {...address,phone:"123"}, {...address,name:" "},
    {...address,provinceCode:""}, {...address,wardCode:""}, {...address,detail:""},
  ]) {
    assert.equal(account.csaAccountReview(invalid).complete,false);
  }
`));
