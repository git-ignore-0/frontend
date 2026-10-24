import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const jsonLdUrl=new URL("../src/lib/organization-json-ld.ts",import.meta.url).href;

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("organization structured data includes only enabled valid contact and social fields",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(jsonLdUrl)});
    const value=seo.organizationJsonLd({
      email:' hello@example.com ',is_email_enabled:true,
      phone_display:'+84 988 158 285',is_phone_enabled:true,
      links:[
        {kind:'facebook',url:'https://facebook.com/nfv'},
        {kind:'youtube',url:'https://youtube.com/@nfv'},
        {kind:'forum',url:'https://forum.example.com'},
      ],
    });
    assert.equal(value['@type'],'Organization');
    assert.equal(value.url,'https://naturalfarmingvietnam.com');
    assert.equal(value.email,'hello@example.com');
    assert.equal(value.telephone,'+84988158285');
    assert.deepEqual(value.sameAs,['https://facebook.com/nfv','https://youtube.com/@nfv']);
  `);
});

test("organization structured data omits disabled or malformed optional values",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(jsonLdUrl)});
    const value=seo.organizationJsonLd({
      email:'not-an-email',is_email_enabled:true,
      phone_display:'12',is_phone_enabled:true,
      links:[{kind:'facebook',url:'javascript:alert(1)'},{kind:'youtube',url:'not a url'}],
    });
    assert.equal('email' in value,false);
    assert.equal('telephone' in value,false);
    assert.equal('sameAs' in value,false);
    assert.deepEqual(seo.organizationJsonLd(null),{
      '@context':'https://schema.org','@type':'Organization',name:'Natural Farming Vietnam',url:'https://naturalfarmingvietnam.com',
    });
  `);
});

test("organization structured data accepts only social URLs owned by the declared platform",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(jsonLdUrl)});
    const value=seo.organizationJsonLd({
      email:'',is_email_enabled:false,phone_display:'',is_phone_enabled:false,
      links:[
        {kind:'facebook',url:'https://evil.example/nfv'},
        {kind:'facebook',url:'https://notfacebook.com/nfv'},
        {kind:'youtube',url:'https://facebook.com/nfv'},
        {kind:'facebook',url:'https://m.facebook.com/nfv'},
        {kind:'youtube',url:'https://youtu.be/channel'},
      ],
    });
    assert.deepEqual(value.sameAs,['https://m.facebook.com/nfv','https://youtu.be/channel']);
  `);
});

test("JSON-LD serialization prevents CMS text from closing the script element",()=>{
  run(`
    import assert from 'node:assert/strict';
    const seo=await import(${JSON.stringify(jsonLdUrl)});
    const serialized=seo.serializeJsonLd({name:'</script><script>alert(1)</script>'});
    assert.equal(serialized.includes('<'),false);
    assert.equal(JSON.parse(serialized).name,'</script><script>alert(1)</script>');
  `);
});
