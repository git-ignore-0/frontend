import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript");
const secret="test-store-bff-shared-secret-32-characters";
function identity(env,headers){
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/store/store-proxy-identity.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,process:{env},require:name=>name==="server-only"?{}:require(name)});
 return exports.storeLookupIdentityHeaders(new Headers(headers));
}
test("signed lookup identity differs per trusted client and never copies visitor proof headers",()=>{
 const env={STORE_BFF_SHARED_SECRET:secret,STORE_CLIENT_IP_HEADER:"x-real-ip"};
 const first=identity(env,{"x-real-ip":"198.51.100.1","X-NFV-Store-Client-Signature":"forged"});
 const second=identity(env,{"x-real-ip":"198.51.100.2"});
 assert.equal(first["X-NFV-Store-Client-IP"],"198.51.100.1");
 assert.notEqual(first["X-NFV-Store-Client-Signature"],second["X-NFV-Store-Client-Signature"]);
 const expected=require("node:crypto").createHmac("sha256",secret).update(`store-guest-lookup:v1\n${first["X-NFV-Store-Client-Time"]}\n198.51.100.1`).digest("hex");
 assert.equal(first["X-NFV-Store-Client-Signature"],expected);
});
test("unconfigured lookup keeps legacy throttling; partial or untrusted input fails closed",()=>{
 assert.deepEqual({...identity({}, {"x-forwarded-for":"198.51.100.1"})},{});
 for(const env of [{STORE_BFF_SHARED_SECRET:secret},{STORE_CLIENT_IP_HEADER:"x-real-ip"},{STORE_BFF_SHARED_SECRET:"short",STORE_CLIENT_IP_HEADER:"x-real-ip"}])assert.equal(identity(env,{"x-real-ip":"198.51.100.1"}),null);
 const env={STORE_BFF_SHARED_SECRET:secret,STORE_CLIENT_IP_HEADER:"x-real-ip"};
 for(const value of ["","malformed","198.51.100.1, 203.0.113.2"])assert.equal(identity(env,{"x-real-ip":value}),null);
 assert.equal(identity(env,{"x-real-ip":"2001:db8::1"})["X-NFV-Store-Client-IP"],"2001:db8::1");
});
