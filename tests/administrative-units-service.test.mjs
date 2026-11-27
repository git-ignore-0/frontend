import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

test("concurrent address resolutions share requests within the same locale and province",()=>{
  const service=new URL("../src/account/administrative-units-service.ts",import.meta.url).href;
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`
    import assert from "node:assert/strict";
    const {resolveAdministrativeAddressNames, getAdministrativeWards}=await import(${JSON.stringify(service)});
    let release;
    const response=new Promise(resolve=>{release=resolve;});
    const calls=[];
    globalThis.fetch=async(path,init)=>{
      calls.push([path,init.headers.get("Accept-Language")]);
      await response;
      return Response.json({data:[]});
    };
    const first=resolveAdministrativeAddressNames("66","1","vi");
    const second=resolveAdministrativeAddressNames("66","2","vi");
    const otherLocale=resolveAdministrativeAddressNames("66","1","en");
    const otherProvince=getAdministrativeWards("77","vi");
    assert.equal(calls.length,5);
    release();
    assert.deepEqual(await first,{provinceName:"66",wardName:"1"});
    assert.deepEqual(await second,{provinceName:"66",wardName:"2"});
    await Promise.all([otherLocale,otherProvince]);
    await getAdministrativeWards("66","vi");
    assert.equal(calls.filter(([path,locale])=>path.endsWith("province=66")&&locale==="vi").length,2);
  `],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.error?.message);
});
