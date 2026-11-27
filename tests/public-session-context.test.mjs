import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const root=new URL("../",import.meta.url);
const account=new URL("../src/account/account-api.ts",import.meta.url).href;
const auth=new URL("../src/auth/auth-service.ts",import.meta.url).href;

test("a checked tab sends its login binding and suppresses late data after replacement",()=>{
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`
    import assert from "node:assert/strict";
    const auth=await import(${JSON.stringify(auth)});
    const {accountApi}=await import(${JSON.stringify(account)});
    const loginA="a1111111-1111-4111-8111-111111111111",loginB="b2222222-2222-4222-8222-222222222222";
    globalThis.document={cookie:"nfv_public_context="+loginA};
    let finish,binding;
    globalThis.fetch=async(path,init)=>{
      if(path==="/api/auth/session")return Response.json({data:{binding:loginA,user:{sub:loginA,name:"Owner A",email:null,email_verified:false,login_phone_number:"+84912345678",phone_number:"",date_of_birth:null,status:"active",locale:"vi",roles:["member"]}}});
      binding=new Headers(init.headers).get("X-NFV-Public-Session");
      return new Promise(resolve=>{finish=resolve;});
    };
    await auth.getSession();
    const pending=accountApi("shipping-address");
    assert.equal(binding,loginA);
    document.cookie="nfv_public_context="+loginB;
    finish(Response.json({data:{sensitive:true}}));
    await assert.rejects(pending,error=>error.code==="session_changed"&&error.status===0);
    await assert.rejects(()=>accountApi("shipping-address"),error=>error.code==="session_changed"&&error.status===409);
  `],{encoding:"utf8",cwd:root});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test("an unauthorized private read leaves a verified guest able to check out",()=>{
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`
    import assert from "node:assert/strict";
    const auth=await import(${JSON.stringify(auth)});
    const {accountApi,publicJson}=await import(${JSON.stringify(account)});
    globalThis.document={cookie:""};
    const sent=[];
    globalThis.fetch=async(path,init)=>{
      if(path==="/api/auth/session")return Response.json({data:{binding:"guest",user:null}});
      sent.push([path,new Headers(init.headers).get("X-NFV-Public-Session")]);
      if(path.startsWith("/api/account/"))return Response.json({error:"unauthorized"},{status:401});
      return Response.json({data:{created:true}});
    };
    await auth.getSession();
    await assert.rejects(()=>accountApi("shipping-address"),error=>error.status===401);
    assert.deepEqual(await publicJson("/api/store-orders/checkout",{method:"POST",body:"{}"},true),{data:{created:true}});
    assert.deepEqual(sent,[["/api/account/shipping-address","guest"],["/api/store-orders/checkout","guest"]]);
  `],{encoding:"utf8",cwd:root});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
