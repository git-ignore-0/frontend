import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
import test from "node:test";

const raw=readFileSync(new URL("../src/lib/csa-navigation.ts",import.meta.url),"utf8");
const compiled=stripTypeScriptTypes(raw.replace('import type {Locale} from "@/types";',''));
const navigation=await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

test("CSA public URLs keep purchase and tracking outside Account",()=>{
  assert.equal(navigation.csaLandingHref("vi"),"/csa/vi");
  assert.equal(navigation.csaLandingHref("en","packages"),"/csa/en#csa-packages");
  assert.equal(navigation.csaPurchaseHref("vi"),"/csa/purchase/vi");
  assert.equal(navigation.csaPurchaseHref("vi"," package/id "),"/csa/purchase/vi?package=package%2Fid");
  assert.equal(navigation.csaPurchaseHref("vi","package-2",3),"/csa/purchase/vi?package=package-2&page=3");
  assert.equal(navigation.csaPurchaseHref("vi","package-2",0),"/csa/purchase/vi?package=package-2");
  assert.equal(navigation.csaPurchaseHref("en","   "),"/csa/purchase/en");
  assert.equal(navigation.csaTrackerHref("en"),"/csa/track/en");
});
