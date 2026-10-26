import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,resolve} from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import vm from "node:vm";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const React=require("react"),jsxRuntime=require("react/jsx-runtime"),{renderToStaticMarkup}=require("react-dom/server"),ts=require("typescript");
const source=path=>readFileSync(resolve(root,path),"utf8");

function loadNavigation(){
  const code=ts.transpileModule(source("src/data/account-navigation.ts"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require:()=>({})});
  return exports;
}

function renderAccount(auth){
  const code=ts.transpileModule(source("src/screens/Account.tsx"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,React,console,require:id=>{
    if(id==="react")return React;
    if(id==="react/jsx-runtime")return jsxRuntime;
    if(id==="@/components/UI")return {
      DataState:({kind,title,description,action})=>React.createElement("div",{"data-state":kind},React.createElement("strong",null,title),description&&React.createElement("p",null,description),action&&React.createElement("button",{onClick:action.onClick},action.label)),
      Icon:()=>null,
      Section:({title,children})=>React.createElement("section",null,React.createElement("h2",null,title),children),
    };
    if(id==="@/data/account-navigation")return loadNavigation();
    if(id==="@/data/account-copy")return {copyText:(_locale,key)=>key};
    if(id==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi",accountTab:"csa",accountHubOpen:true},patch:()=>{}})};
    if(id==="@/auth/AuthProvider")return {useAuth:()=>auth};
    if(id==="@/screens/AccountOrders")return {OrdersView:()=>null};
    if(id==="@/screens/AccountProfile")return {AddressView:()=>null,ProfileView:()=>null};
    if(id==="@/screens/AccountBenefits")return {BenefitsView:()=>null};
    if(id==="@/components/auth/LogoutButton")return {LogoutButton:()=>null};
    if(id==="@/components/auth/GuestAuthActions")return {GuestAuthActions:()=>React.createElement("div",null,"guest-actions")};
    if(id==="@/screens/account-csa/AccountCsaPackageSelection")return {AccountCsaPackageSelection:()=>React.createElement("div",null,"guest-csa-selection")};
    if(id==="@/screens/account-csa/AccountCsaTracker")return {AccountCsaTracker:()=>null};
    throw new Error(`Unexpected import ${id}`);
  }});
  return renderToStaticMarkup(React.createElement(exports.Account));
}

test("guest Account exposes only CSA purchase and tracker while signed-in navigation stays unchanged",()=>{
  const {ACCOUNT_NAV,GUEST_ACCOUNT_NAV,accountNavigationFor}=loadNavigation();
  assert.deepEqual(Array.from(GUEST_ACCOUNT_NAV,item=>item.id),["csa","csa-tracker"]);
  assert.deepEqual(Array.from(accountNavigationFor("guest"),item=>item.id),["csa","csa-tracker"]);
  assert.deepEqual(Array.from(accountNavigationFor("authenticated"),item=>item.id),
    ["orders","profile","address","csa","rewards","redeem","referrals"]);
  assert.equal(ACCOUNT_NAV.some(item=>item.id==="csa-tracker"),false);
});

test("Account normalizes tabs at the guest/auth boundary",()=>{
  const {accountTabForAuth}=loadNavigation();
  assert.equal(accountTabForAuth("orders","guest"),"csa");
  assert.equal(accountTabForAuth("csa-tracker","guest"),"csa-tracker");
  assert.equal(accountTabForAuth("csa-tracker","authenticated"),"orders");
  assert.equal(accountTabForAuth("csa","authenticated"),"csa");
});

test("Account keeps every visited session pane mounted after the user visits another tab",()=>{
  const {accountPersistentTabs}=loadNavigation();
  let mounted=[];
  for(const tab of ["orders","profile","address","csa","rewards","redeem","referrals","csa-tracker"]){
    mounted=Array.from(accountPersistentTabs(mounted,tab));
  }
  assert.deepEqual(mounted,["orders","profile","address","csa","rewards","redeem","referrals","csa-tracker"]);
  mounted=Array.from(accountPersistentTabs(mounted,"csa"));
  assert.deepEqual(mounted,["orders","profile","address","csa","rewards","redeem","referrals","csa-tracker"]);
});

test("Account hides every visited pane instead of conditionally unmounting it",()=>{
  const account=source("src/screens/Account.tsx");
  assert.match(account,/accountPersistentTabs/);
  assert.match(account,/const renderedTabs=accountPersistentTabs\(persistentTabs,activeTab\)/);
  assert.match(account,/renderedTabs\.map\(tab=>/);
  assert.match(account,/hidden=\{activeTab!==tab\}/);
  assert.doesNotMatch(account,/activeTab!=="csa"&&activeTab!=="csa-tracker"/);
});

test("an unavailable auth service is not treated as a guest session",()=>{
  const {accountNavigationFor,accountTabForAuth}=loadNavigation();
  assert.deepEqual(Array.from(accountNavigationFor("error")),[]);
  assert.equal(accountTabForAuth("csa","error"),"csa");
  const html=renderAccount({status:"error",session:null,error:"Auth service unavailable",refresh:()=>{},expire:()=>{}});
  assert.match(html,/data-state="error"/);
  assert.match(html,/Auth service unavailable/);
  assert.match(html,/common\.retry/);
  assert.doesNotMatch(html,/guest-csa-selection|guest-actions/);
});

test("the Account route is public but private order detail remains behind AuthGate",()=>{
  const app=source("app/NFVClientApp.tsx");
  assert.match(app,/ui\.page==="account"\?<Account\/>/);
  assert.match(app,/ui\.page==="order-detail"\?<AuthGate><OrderDetail\/><\/AuthGate>/);
  assert.doesNotMatch(app,/ui\.page==="account"\?<AuthGate>/);
});

test("guest Account reuses the existing auth actions and hides logout",()=>{
  const account=source("src/screens/Account.tsx");
  assert.match(account,/useAuth\(\)/);
  assert.match(account,/<GuestAuthActions locale=\{ui\.locale\}/);
  assert.match(account,/auth\.status==="authenticated"&&<div className="account-mobile-logout"><LogoutButton variant="hub"\/><\/div>/);
  assert.match(account,/auth\.status==="authenticated"&&<LogoutButton variant="sidebar"\/>/);
  assert.match(account,/accountNavigationFor\(auth\.status\)/);
  assert.match(account,/const activeTab=accountTabForAuth\(ui\.accountTab,auth\.status\)/);
  assert.doesNotMatch(account,/ui\.accountTab === "orders"/);
});

test("guest notice follows the Account content width instead of spanning above the layout",()=>{
  const account=source("src/screens/Account.tsx");
  assert.match(account,/className="account-mobile-hub"[^]*guestNotice\("hub"\)/);
  assert.match(account,/className="account-content"[^]*guestNotice\("content"\)/);
  assert.match(account,/account-guest-notice--\$\{placement\}/);
  assert.doesNotMatch(account,/className="account-guest-notice"/);
});
