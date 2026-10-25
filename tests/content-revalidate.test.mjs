import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname,join,resolve} from "node:path";
import test from "node:test";
import {fileURLToPath,pathToFileURL} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const helperPath=join(root,"src/lib/revalidate-request.ts");
const routePath=join(root,"app/api/revalidate/route.ts");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("revalidation accepts a current correctly signed tag request",()=>{
  assert.equal(existsSync(helperPath),true,"signed revalidation helper must exist");
  run(`
    import assert from 'node:assert/strict';
    import crypto from 'node:crypto';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const secret='a'.repeat(32),timestamp='1792720000';
    const raw=Buffer.from(JSON.stringify({tags:['workshops','site-settings']}));
    const signature=crypto.createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
    assert.deepEqual(api.parseSignedRevalidation({secret,timestamp,signature:'sha256='+signature,raw,nowSeconds:1792720001}),{ok:true,tags:['workshops','site-settings']});
  `);
});

test("revalidation rejects weak secrets, stale timestamps, and bad signatures",()=>{
  assert.equal(existsSync(helperPath),true,"signed revalidation helper must exist");
  run(`
    import assert from 'node:assert/strict';
    import crypto from 'node:crypto';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const raw=Buffer.from('{"tags":["workshops"]}'),timestamp='1792720000';
    const secret='b'.repeat(32);
    const valid=crypto.createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
    for(const result of [
      api.parseSignedRevalidation({secret:'short',timestamp,signature:valid,raw,nowSeconds:1792720001}),
      api.parseSignedRevalidation({secret,timestamp,signature:valid,raw,nowSeconds:1792720601}),
      api.parseSignedRevalidation({secret,timestamp,signature:'not-hex',raw,nowSeconds:1792720001}),
    ]) assert.deepEqual(result,{ok:false,status:401,error:'invalid_signature'});
  `);
});

test("revalidation accepts only a bounded array of allowed tags",()=>{
  assert.equal(existsSync(helperPath),true,"signed revalidation helper must exist");
  run(`
    import assert from 'node:assert/strict';
    import crypto from 'node:crypto';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const secret='c'.repeat(32),timestamp='1792720000';
    const sign=raw=>crypto.createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
    const invalid=Buffer.from('{');
    assert.deepEqual(api.parseSignedRevalidation({secret,timestamp,signature:sign(invalid),raw:invalid,nowSeconds:1792720001}),{ok:false,status:400,error:'invalid_json'});
    const uuid='f71b35a8-4a85-4d38-b9cd-519ebc1d286a';
    const tags=['workshops','workshops','site-settings','tracker-farms','testimonials','workshop:soil-life','testimonial:'+uuid,'store-categories','store-products','store-product-details','store-product:root_vegetables'];
    const raw=Buffer.from(JSON.stringify({tags}));
    const result=api.parseSignedRevalidation({secret,timestamp,signature:sign(raw),raw,nowSeconds:1792720001});
    assert.equal(result.ok,true);
    assert.deepEqual(result.tags,['workshops','site-settings','tracker-farms','testimonials','workshop:soil-life','testimonial:'+uuid,'store-categories','store-products','store-product-details','store-product:root_vegetables']);
    for(const body of [null,{}, {tags:'workshops'}, {tags:[]}, {tags:['unknown']}, {tags:['workshops','bad']}, {tags:Array.from({length:21},(_,i)=>'workshop:item-'+i)}]){
      const candidate=Buffer.from(JSON.stringify(body));
      assert.deepEqual(api.parseSignedRevalidation({secret,timestamp,signature:sign(candidate),raw:candidate,nowSeconds:1792720001}),{ok:false,status:400,error:'invalid_payload'});
    }
  `);
});

test("revalidation body reader enforces its byte cap even without Content-Length",()=>{
  assert.equal(existsSync(helperPath),true,"signed revalidation helper must exist");
  run(`
    import assert from 'node:assert/strict';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const small=new Request('https://site.test/api/revalidate',{method:'POST',body:'hello'});
    assert.equal((await api.readLimitedRequestBody(small,8)).toString(),'hello');
    const oversized=new Request('https://site.test/api/revalidate',{method:'POST',body:'123456789'});
    assert.equal(await api.readLimitedRequestBody(oversized,8),null);
    const declared=new Request('https://site.test/api/revalidate',{method:'POST',headers:{'content-length':'9'},body:'x'});
    assert.equal(await api.readLimitedRequestBody(declared,8),null);
  `);
});

test("Next revalidation route delegates only verified tags to the cache API",()=>{
  assert.equal(existsSync(routePath),true,"revalidation route must exist");
  const source=readFileSync(routePath,"utf8");
  assert.match(source,/parseSignedRevalidation/);
  assert.match(source,/revalidateTag\(tag/);
  assert.match(source,/\{expire:0\}/);
  assert.match(source,/CONTENT_REVALIDATE_SECRET/);
  assert.match(source,/payload_too_large/);
});

test("every cached workshop collection uses the global workshops tag",()=>{
  for(const relative of ["app/api/home-content/route.ts","app/api/workshops/route.ts"]){
    const source=readFileSync(join(root,relative),"utf8");
    assert.match(source,/tags:\s*\["workshops"\]/,`${relative} must attach the workshops cache tag`);
  }
});
