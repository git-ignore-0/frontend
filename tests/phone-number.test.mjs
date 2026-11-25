import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const moduleUrl=new URL("../src/lib/phone-number.ts",import.meta.url).href;

test("Vietnamese phone contracts distinguish user input, stored data and display",()=>{
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",`
    import assert from "node:assert/strict";
    const phone=await import(${JSON.stringify(moduleUrl)});
    assert.equal(phone.normalizeLocalVietnamPhone("0981234567"),"+84981234567");
    assert.equal(phone.normalizeLocalVietnamPhone("02412345678"),"+842412345678");
    assert.equal(phone.normalizeLocalVietnamPhone("0612345678"),"+84612345678");
    assert.equal(phone.isCanonicalVietnamPhone("+84612345678","identity"),false);
    assert.equal(phone.isCanonicalVietnamPhone("+842412345678","identity"),true);
    assert.equal(phone.isCanonicalVietnamPhone("02412345678","identity"),false);
    for(const value of ["","0","84","+84","84981234567","+84981234567","0981 234567","0981-234567",
      "0981234567 ","0981234567\\n","0981234567x","098123456789","０９８１２３４５６７"]){
      assert.equal(phone.normalizeLocalVietnamPhone(value),"",JSON.stringify(value));
    }
    assert.equal(phone.normalizeVietnamPhone("+84 981-234-567"),"+84981234567");
    assert.equal(phone.normalizeVietnamPhone("+84\\t981-234-567"),"+84981234567");
    assert.equal(phone.normalizeVietnamPhone("090 123 4567"),"+84901234567");
    assert.equal(phone.normalizeVietnamPhone("123"),"");
    assert.equal(phone.formatVietnamPhone("+84981234567"),"0981234567");
    assert.equal(phone.formatVietnamPhone(" 84 981.234-567 "),"0981234567");
    assert.equal(phone.formatVietnamPhone("(+84) 24 1234 5678"),"02412345678");
    assert.equal(phone.formatVietnamPhone("+84\\t981-234-567"),"+84\\t981-234-567");
    assert.equal(phone.formatVietnamPhone("0981234567\\n"),"0981234567\\n");
    assert.equal(phone.formatVietnamPhone("+12025550123"),"+12025550123");
    assert.equal(phone.formatVietnamPhone(" legacy contact ")," legacy contact ");
    assert.equal(phone.formatVietnamPhone(null),null);
    assert.equal(phone.formatVietnamPhone(undefined),null);
    assert.equal(phone.formatVietnamPhone(""),"");
    assert.equal(phone.formatVietnamPhone("   "),"   ");
    for(const value of ["0981234567","+84981234567","84981234567","(+84) 981-234-567"]){
      assert.equal(phone.normalizeTelephoneNumber(value),"+84981234567");
    }
    assert.equal(phone.normalizeTelephoneNumber("024 1234 5678"),"+842412345678");
    assert.equal(phone.normalizeTelephoneNumber("+1 (202) 555-0123"),"+12025550123");
    assert.equal(phone.normalizeTelephoneNumber("202-555-0123"),"2025550123");
    assert.equal(phone.normalizeTelephoneNumber(""),"");
    assert.equal(phone.normalizeTelephoneNumber("   "),"");
  `],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
