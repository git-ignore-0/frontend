import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const termsUrl=new URL("../src/screens/account-csa/csa-terms.ts",import.meta.url).href;
function run(script){const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});assert.equal(result.status,0,result.stderr||result.stdout);}

test("CSA terms expose the complete matching Vietnamese and English agreement",()=>run(`
  import assert from 'node:assert/strict';const terms=await import(${JSON.stringify(termsUrl)});
  assert.equal(terms.CSA_TERMS.vi.length,11);assert.equal(terms.CSA_TERMS.en.length,11);
  assert.deepEqual(terms.CSA_TERM_IDS,Array.from({length:11},(_,index)=>'csa-term-'+(index+1)));
  assert.match(terms.CSA_TERMS.vi[0],/Canh tác tự nhiên/);assert.match(terms.CSA_TERMS.en[10],/permitted by law/);
`));
