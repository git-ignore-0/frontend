import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadAccountRoute() {
  const code = ts.transpileModule(
    readFileSync(resolve(root, "app/account/[locale]/page.tsx"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const exports = {};
  const NFVApp = Symbol("NFVApp");
  vm.runInNewContext(code, {
    exports,
    require: (id) => {
      if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }) };
      if (id === "next/navigation") return { notFound: () => { throw new Error("not-found"); } };
      if (id === "../../NFVApp") return { NFVApp };
      if (id === "@/account/referral-presentation") return {
        normalizeReferralCode: (value) => value.trim().toUpperCase(),
        isReferralCode: (value) => value === "NFV2345678",
      };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return { Page: exports.default, NFVApp };
}

test("account route opens a valid requested tab instead of the mobile hub", async () => {
  const { Page, NFVApp } = loadAccountRoute();
  const result = await Page({
    params: Promise.resolve({ locale: "vi" }),
    searchParams: Promise.resolve({ tab: "profile" }),
  });

  assert.equal(result.type, NFVApp);
  assert.equal(result.props.initialAccountTab, "profile");
  assert.equal(result.props.initialAccountHubOpen, false);
});

test("account route ignores invalid or repeated tab values and keeps the account hub", async () => {
  const { Page } = loadAccountRoute();
  for (const tab of ["admin", ["profile", "orders"]]) {
    const result = await Page({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ tab }),
    });
    assert.equal(result.props.initialAccountTab, "orders");
    assert.equal(result.props.initialAccountHubOpen, true);
  }
});

test("account referral route pre-fills only a valid referral code", async () => {
  const { Page } = loadAccountRoute();
  const valid = await Page({
    params: Promise.resolve({ locale: "vi" }),
    searchParams: Promise.resolve({ tab: "referrals", ref: "nfv2345678" }),
  });
  assert.equal(valid.props.initialReferrerCode, "NFV2345678");

  const invalid = await Page({
    params: Promise.resolve({ locale: "vi" }),
    searchParams: Promise.resolve({ tab: "referrals", ref: "NFV23456I8" }),
  });
  assert.equal(invalid.props.initialReferrerCode, "");
});
