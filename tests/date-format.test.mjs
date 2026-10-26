import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import test from "node:test";

const moduleUrl=new URL("../src/lib/date-format.ts",import.meta.url).href;

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("shared date formatting uses dd/MM/yyyy for date-only and timestamp values",()=>run(`
  import assert from "node:assert/strict";
  const dates=await import(${JSON.stringify(moduleUrl)});
  assert.equal(dates.formatDate("2026-11-01"),"01/11/2026");
  assert.equal(dates.formatDate("01/11/2026"),"01/11/2026");
  assert.equal(dates.formatDate("2026-10-25T18:30:00Z"),"26/10/2026");
  assert.equal(dates.formatDate("2026-10-25T18:30:00Z","America/Los_Angeles"),"25/10/2026");
  assert.equal(dates.formatDate("not-a-date"),"—");
`));

test("shared date-time formatting uses dd/MM/yyyy HH:mm",()=>run(`
  import assert from "node:assert/strict";
  const dates=await import(${JSON.stringify(moduleUrl)});
  assert.equal(dates.formatDateTime("2026-10-25T18:30:00Z"),"26/10/2026 01:30");
  assert.equal(dates.formatTime("2026-10-25T18:30:00Z","America/Los_Angeles"),"11:30");
  assert.equal(dates.formatDateTime(null),"—");
`));

test("exclusive CSA end dates retain dd/MM/yyyy without timezone drift",()=>run(`
  import assert from "node:assert/strict";
  const dates=await import(${JSON.stringify(moduleUrl)});
  assert.equal(dates.formatExclusiveEndDate("2027-05-01"),"30/04/2027");
  assert.equal(dates.formatExclusiveEndDate("invalid"),"—");
`));
