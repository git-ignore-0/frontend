import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function loadContactPresentation() {
  const path = join(root, "src/lib/contact-settings.ts");
  assert.equal(existsSync(path), true, "contact settings resolver must exist");
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: () => ({}) });
  return exports.contactPresentation;
}

function loadOrganizationJsonLd() {
  const exports = {};
  vm.runInNewContext(transpile("src/lib/organization-json-ld.ts"), {
    exports,
    URL,
    require: (id) => {
      if (id === "../config/site-brand.ts") return { SITE_ORIGIN: "https://site.example" };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

function loadSiteSettingsHook(fetcher) {
  const path = join(root, "src/hooks/useSiteSettings.ts");
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    fetch: fetcher,
    require: (id) => {
      if (id === "react") return { useContext:()=>undefined,useEffect: () => {}, useState: () => [null, () => {}] };
      if(id==="@/context/SiteSettingsContext")return {SiteSettingsContext:{}};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

function loadServerSettingsRenderer(){
  const contextExports={};
  vm.runInNewContext(transpile("src/context/SiteSettingsContext.tsx",true),{
    exports:contextExports,
    require:id=>{
      if(id==="react")return React;
      if(id==="react/jsx-runtime")return require("react/jsx-runtime");
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const hookExports={};
  vm.runInNewContext(transpile("src/hooks/useSiteSettings.ts"),{
    exports:hookExports,
    fetch:async()=>{throw new Error("effects must not run during SSR")},
    require:id=>{
      if(id==="react")return React;
      if(id==="@/context/SiteSettingsContext")return contextExports;
      throw new Error(`Unexpected import ${id}`);
    },
  });
  function Consumer(){
    const value=hookExports.useSiteSettings("vi");
    return React.createElement("span",null,value?.email||"none");
  }
  return initial=>renderToStaticMarkup(React.createElement(
    contextExports.SiteSettingsProvider,{locale:"vi",settings:initial},React.createElement(Consumer)
  ));
}

function transpile(path,jsx=false) {
  return ts.transpileModule(readFileSync(join(root,path),"utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      ...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})
    },
  }).outputText;
}

function loadPublicSettings() {
  const exports = {};
  vm.runInNewContext(transpile("src/lib/public-settings.ts"), {exports,URL});
  return exports;
}

function loadMainNavigation() {
  const exports = {};
  vm.runInNewContext(transpile("src/data/main-navigation.ts"), {
    exports,
    require: (id) => {
      if (id === "@/config/site-brand") return {SITE_ORIGIN:"https://site.example"};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

function loadFooterNavigation(mainNavigation) {
  const exports = {};
  vm.runInNewContext(transpile("src/data/footer-navigation.ts"), {
    exports,
    require: (id) => {
      if (id === "@/data/main-navigation") return mainNavigation;
      if (id === "@/config/site-brand") return {SITE_ORIGIN:"https://site.example"};
      if (id === "@/lib/site-links") return {isLocalPublicPage:()=>true};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

function loadSiteLinks() {
  const exports = {};
  vm.runInNewContext(transpile("src/lib/site-links.ts"), {
    exports,
    require: (id) => {
      if (id === "@/config/site-brand") return {SITE_ORIGIN:"https://site.example"};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return exports;
}

function renderFooter(siteSettings) {
  const path = join(root, "src/components/layout/SiteFooter.tsx");
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  const contactPresentation = loadContactPresentation();
  const organizationJsonLd = loadOrganizationJsonLd();
  vm.runInNewContext(code, {
    exports,
    require: (id) => {
      if (id === "react/jsx-runtime") return require("react/jsx-runtime");
      if (id === "@/components/brand/BrandLogo") {
        return { BrandLogo: () => React.createElement("span", null, "Logo") };
      }
      if (id === "@/data/footer-navigation") {
        return {
          FOOTER_COPY: {
            vi: { description: "Mô tả", contactTitle: "Kết nối", emailLabel: "Email", phoneLabel: "Điện thoại", contactNote: "Ghi chú", legal: "Pháp lý", closing: "Kết" },
          },
          footerNavigationLinks: () => [],
          resolveFooterLink: () => { throw new Error("no footer links in fixture"); },
        };
      }
      if (id === "@/state/NFVContext") return { useNFV: () => ({ ui: { locale: "vi" } }) };
      if (id === "@/hooks/useSiteSettings") return { useSiteSettings: () => siteSettings };
      if (id === "@/lib/contact-settings") return { contactPresentation };
      if (id === "@/lib/organization-json-ld") return organizationJsonLd;
      if (id === "@/lib/site-links") return { externalLinkLabel: (label,locale) => `${label} (${locale==="vi"?"mở trong tab mới":"opens in a new tab"})` };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.SiteFooter));
}

const settings = {
  email: "hello@example.com",
  is_email_enabled: true,
  phone_display: "+84 97 151 91 85",
  is_phone_enabled: true,
  links: [
    { kind: "facebook", url: "https://facebook.com/nfv" },
    { kind: "youtube", url: "https://youtube.com/@nfv" },
    { kind: "forum", url: "https://forum.example.com/" },
  ],
};

test("contact presentation exposes enabled backend contact and social settings", () => {
  const present = loadContactPresentation();
  assert.deepEqual(JSON.parse(JSON.stringify(present(settings))), {
    email: "hello@example.com",
    phone: "+84 97 151 91 85",
    phoneHref: "tel:+84971519185",
    facebook: "https://facebook.com/nfv",
    youtube: "https://youtube.com/@nfv",
  });
});

test("contact presentation hides disabled fields and never falls back when settings are absent", () => {
  const present = loadContactPresentation();
  assert.deepEqual(JSON.parse(JSON.stringify(present({
    ...settings,
    is_email_enabled: false,
    is_phone_enabled: false,
    links: [],
  }))), { email: "", phone: "", phoneHref: "", facebook: "", youtube: "" });
  assert.deepEqual(JSON.parse(JSON.stringify(present(null))), {
    email: "", phone: "", phoneHref: "", facebook: "", youtube: "",
  });
});

test("contact presentation rejects a phone display that cannot form a safe telephone link", () => {
  const present = loadContactPresentation();
  assert.deepEqual(JSON.parse(JSON.stringify(present({
    ...settings,
    phone_display: "call us",
  }))), {
    email: "hello@example.com",
    phone: "",
    phoneHref: "",
    facebook: "https://facebook.com/nfv",
    youtube: "https://youtube.com/@nfv",
  });
});

test("footer renders backend contacts and socials without hardcoded fallback values", () => {
  const enabled = renderFooter(settings);
  assert.match(enabled, /mailto:hello@example\.com/);
  assert.match(enabled, /tel:\+84971519185/);
  assert.match(enabled, /https:\/\/facebook\.com\/nfv/);
  assert.match(enabled, /https:\/\/youtube\.com\/@nfv/);
  assert.match(enabled, /aria-label="Facebook \(mở trong tab mới\)"/);
  assert.match(enabled, /aria-label="YouTube \(mở trong tab mới\)"/);

  const disabled = renderFooter({
    ...settings,
    is_email_enabled: false,
    is_phone_enabled: false,
    links: [],
  });
  assert.doesNotMatch(disabled, /mailto:|tel:|facebook|youtube/i);
});

test("site settings loader deduplicates concurrent and cached requests per locale", async () => {
  let calls = 0;
  const {fetchSiteSettings:load} = loadSiteSettingsHook(async () => {
    calls += 1;
    return { ok: true, json: async () => settings };
  });
  const [first, second] = await Promise.all([load("vi"), load("vi")]);
  const third = await load("vi");
  assert.equal(calls, 1);
  assert.equal(first.email, "hello@example.com");
  assert.equal(second, first);
  assert.equal(third, first);
});

test("site settings loader can refresh a cached locale after an admin change", async () => {
  let calls = 0;
  const {fetchSiteSettings:load} = loadSiteSettingsHook(async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => calls===1?settings:{...settings,links:[]},
    };
  });
  assert.equal((await load("vi")).links.length,3);
  assert.equal((await load("vi",{refresh:true})).links.length,0);
  assert.equal(calls,2);
});

test("a forced refresh queued during an older request still fetches fresh settings once", async () => {
  let releaseFirst;
  let calls = 0;
  const {fetchSiteSettings:load} = loadSiteSettingsHook(async () => {
    calls += 1;
    if(calls===1){
      await new Promise(resolve=>{releaseFirst=resolve});
      return {ok:true,json:async()=>settings};
    }
    return {ok:true,json:async()=>({...settings,links:[]})};
  });
  const initial = load("vi");
  const firstRefresh = load("vi",{refresh:true});
  const secondRefresh = load("vi",{refresh:true});
  assert.equal(calls,1);
  releaseFirst();
  assert.equal((await initial).links.length,3);
  assert.equal((await firstRefresh).links.length,0);
  assert.equal(await secondRefresh,await firstRefresh);
  assert.equal(calls,2);
});

test("site settings loader does not cache failures", async () => {
  let calls = 0;
  const {fetchSiteSettings:load} = loadSiteSettingsHook(async () => {
    calls += 1;
    if (calls === 1) throw new Error("offline");
    return { ok: true, json: async () => settings };
  });
  assert.equal(await load("en"), null);
  assert.equal((await load("en")).email, "hello@example.com");
  assert.equal(calls, 2);
});

test("shared app shell fetches settings on the server and passes them into the client shell",()=>{
  const server=readFileSync(join(root,"app/NFVApp.tsx"),"utf8");
  const client=readFileSync(join(root,"app/NFVClientApp.tsx"),"utf8");
  assert.match(server,/getPublicSiteSettings/);
  assert.match(server,/initialSiteSettings=\{settings\}/);
  assert.match(client,/<SiteSettingsProvider locale=\{initialLocale\} settings=\{initialSiteSettings\}>/);
});

test("request-local settings provider does not leak a prior success into a later null SSR render",()=>{
  const contextSource=readFileSync(join(root,"src/context/SiteSettingsContext.tsx"),"utf8");
  assert.match(contextSource,/SiteSettingsContext\.Provider value=\{value\}/);
  const hookSource=readFileSync(join(root,"src/hooks/useSiteSettings.ts"),"utf8");
  assert.match(hookSource,/useContext\(SiteSettingsContext\)/);
  assert.match(hookSource,/hasInitial\?initial\.settings/);
  const client=readFileSync(join(root,"app/NFVClientApp.tsx"),"utf8");
  assert.doesNotMatch(client,/primeSiteSettings\(/);
  const renderSettings=loadServerSettingsRenderer();
  assert.equal(renderSettings(settings),"<span>hello@example.com</span>");
  assert.equal(renderSettings(null),"<span>none</span>");
});

test("header and footer expose Forum only when public settings contain its link", () => {
  const main = loadMainNavigation();
  const footer = loadFooterNavigation(main);
  const enabledMain = main.mainNavigationItems(settings);
  assert.deepEqual(Array.from(enabledMain,item=>item.id), ["home","about","workshops","csa","tracker","store","forum"]);
  assert.equal(enabledMain.at(-1).path, "https://forum.example.com/");
  assert.deepEqual(Array.from(main.mainNavigationItems({...settings,links:[]}),item=>item.id), ["home","about","workshops","csa","tracker","store"]);

  const enabledFooter = footer.footerNavigationLinks(settings);
  assert.equal(enabledFooter.at(-1).id, "forum");
  assert.equal(footer.resolveFooterLink(enabledFooter.at(-1),"vi",settings).href, "https://forum.example.com/");
  assert.equal(footer.footerNavigationLinks({...settings,links:[]}).some(item=>item.id==="forum"), false);
});

test("external link labels announce the new browsing context in both locales", () => {
  const links = loadSiteLinks();
  assert.equal(links.externalLinkLabel("Facebook","vi"),"Facebook (mở trong tab mới)");
  assert.equal(links.externalLinkLabel("YouTube","en"),"YouTube (opens in a new tab)");
});

test("site settings proxy bypasses the Next cache so admin changes are observable", async () => {
  const publicSettings = loadPublicSettings();
  const exports = {};
  const calls = [];
  vm.runInNewContext(transpile("app/api/site-settings/route.ts"), {
    exports,
    AbortSignal,
    URL,
    process:{env:{NODE_ENV:"production"}},
    fetch:async (url,init)=>{
      calls.push({url,init});
      return {ok:true,json:async()=>({data:settings})};
    },
    require:(id)=>{
      if(id==="next/server")return {NextResponse:{json:value=>value}};
      if(id==="@/lib/public-workshop")return {getPublicContentOrigin:()=>"http://127.0.0.1:8000"};
      if(id==="@/lib/public-settings")return publicSettings;
      throw new Error(`Unexpected import ${id}`);
    }
  });
  await exports.GET(new Request("http://localhost/api/site-settings?locale=vi"));
  assert.equal(calls.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].init)),{cache:"no-store",signal:{}});
});
