import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import vm from "node:vm";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const React=require("react");
const jsxRuntime=require("react/jsx-runtime");
const {renderToStaticMarkup}=require("react-dom/server");
const ts=require("typescript");
const source=path=>readFileSync(join(root,path),"utf8");
const compile=(path,jsx=false)=>ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.ReactJSX:undefined}}).outputText;

function runModule(path,requireStub){
 const exp={};
 vm.runInNewContext(compile(path,path.endsWith(".tsx")),{exports:exp,require:requireStub,React,console,URLSearchParams});
 return exp;
}

const packageModel=runModule("src/screens/csa/csa-packages-model.ts",id=>{throw new Error(`Unexpected package-model import ${id}`);});
const selectionModel=runModule("src/screens/account-csa/csa-selection-model.ts",id=>{
 if(id==="../csa/csa-packages-model")return packageModel;
 throw new Error(`Unexpected selection-model import ${id}`);
});
const accountReview=runModule("src/screens/account-csa/csa-account-review.ts",id=>{throw new Error(`Unexpected account-review import ${id}`);});
const pendingStorage=runModule("src/screens/account-csa/csa-pending-storage.ts",id=>{throw new Error(`Unexpected pending-storage import ${id}`);});
const guestBuyer=runModule("src/screens/account-csa/csa-guest-buyer.ts",id=>{throw new Error(`Unexpected guest-buyer import ${id}`);});
const dateFormat=runModule("src/lib/date-format.ts",id=>{throw new Error(`Unexpected date-format import ${id}`);});
const realUI=runModule("src/components/UI.tsx",id=>{
 if(id==="react")return React;
 if(id==="react/jsx-runtime")return jsxRuntime;
 throw new Error(`Unexpected UI import ${id}`);
});

let hookState={status:"loading",page:null,retry:()=>{}};
let hookCalls=[];
let renderedButtons=[];
const UI={
 ActionLink:({children,variant,small,...props})=>{void variant;void small;return React.createElement("a",props,children);},
 Button:({children,loading,variant,small,...props})=>{void loading;void variant;void small;renderedButtons.push({children,props});return React.createElement("button",props,children);},
 DataState:({kind="empty",title,description,action})=>React.createElement("div",{"data-kind":kind},title,description,action&&React.createElement("button",{onClick:action.onClick},action.label)),
 Icon:({name})=>React.createElement("span",{"data-icon":name}),
 Section:({title,description,children,className=""})=>React.createElement("section",{className},React.createElement("h2",null,title),description&&React.createElement("p",null,description),children),
 FormField:({label,children,className})=>React.createElement("label",{className},label,children),
 FormInput:props=>React.createElement("input",props),
 FormSelect:({children,...props})=>React.createElement("select",props,children),
};

function loadComponent(){
 return runModule("src/screens/account-csa/AccountCsaPackageSelection.tsx",id=>{
  if(id==="react")return React;
  if(id==="react/jsx-runtime")return jsxRuntime;
  if(id==="@/components/UI")return UI;
  if(id==="@/data/account-copy")return {copyText:(_locale,key)=>key};
  if(id==="@/lib/date-format")return dateFormat;
  if(id==="@/auth/site-auth")return {siteAccountHref:()=>"/account"};
  if(id==="@/auth/AuthProvider")return {useAuth:()=>({status:"authenticated"})};
  if(id==="@/account/csa-service")return {confirmCsaTransfer:async()=>({}),createCsaPaymentQuote:async()=>({}),getCsaPurchaseStatus:async()=>({})};
  if(id==="@/account/administrative-units-service")return {getAdministrativeProvinces:async()=>[],getAdministrativeWards:async()=>[]};
  if(id==="@/account/referral-share")return {copyTextToClipboard:async()=>{}};
  if(id==="./csa-terms")return {CSA_TERM_IDS:Array.from({length:11},(_,index)=>`csa-term-${index+1}`),CSA_TERMS:{vi:Array(11).fill("Điều khoản"),en:Array(11).fill("Term")}};
  if(id==="@/screens/csa/csa-packages-model")return packageModel;
  if(id==="@/screens/csa/useCsaPackages")return {useCsaPackages:(locale,page)=>{hookCalls.push([locale,page]);return hookState;}};
  if(id==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi"},data:{profile:{name:"",phone:"",email:""}}})};
  if(id==="./csa-selection-model")return selectionModel;
	  if(id==="./csa-account-review")return accountReview;
	  if(id==="./csa-pending-storage")return pendingStorage;
  if(id==="./csa-guest-buyer")return guestBuyer;
  throw new Error(`Unexpected component import ${id}`);
 });
}

function paymentPlan(id,type,initial,count=1){
 return {id,name:id,payment_type:type,total_amount:"3600000",installment_count:count,initial_payment_amount:initial,installments:Array.from({length:count},(_,index)=>({sequence:index+1,amount:initial,cycle_count:1}))};
}
function packageRow(id,plans=[]){
 return {id,name:`Package ${id}`,description:`Description ${id}`,quota_policy:"expire",items:[{product_id:`product-${id}`,product_name:`Vegetable ${id}`,unit_size:"1.000",unit_label_vi:"bó",unit_label_en:"bunch",quota_units:10}],price_options:[{id:`option-${id}`,duration_months:6,monthly_price_vnd:"600000",total_price_vnd:"3600000",sort_order:0,payment_plans:plans}]};
}

test("Account CSA package loader renders explicit loading, error and empty states",()=>{
 const component=loadComponent();
 hookCalls=[];hookState={status:"loading",page:null,retry:()=>{}};
 assert.match(renderToStaticMarkup(React.createElement(component.AccountCsaPackageSelection)),/data-kind="loading"/);
 hookState={status:"error",page:null,retry:()=>{}};
 assert.match(renderToStaticMarkup(React.createElement(component.AccountCsaPackageSelection)),/data-kind="error"/);
 hookState={status:"ready",page:{data:[],meta:null},retry:()=>{}};
 assert.match(renderToStaticMarkup(React.createElement(component.AccountCsaPackageSelection)),/data-kind="empty"/);
 assert.deepEqual(hookCalls.map(value=>Array.from(value)),[["vi",1],["vi",1],["vi",1]]);
});

test("Account CSA package view renders API cards, duration, payment choices and one selection summary",()=>{
 const component=loadComponent();
 const packages=[packageRow("real-one",[paymentPlan("pay-full","full","3600000"),paymentPlan("pay-two","installment","1800000",2)]),packageRow("real-two")];
 const selected=selectionModel.createCsaSelection(packages);
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPackageSelectionView,{locale:"vi",packages,selected,onSelectPackage:()=>{},onSelectDuration:()=>{},onSelectPayment:()=>{}}));
 assert.match(html,/Package real-one/);
 assert.match(html,/Package real-two/);
 assert.match(html,/Vegetable real-one/);
 assert.match(html,/pay-two/);
 assert.match(html,/aria-pressed="true"/);
 assert.equal((html.match(/data-csa-package-card=/g)||[]).length,2);
 assert.equal((html.match(/data-csa-selection-summary=/g)||[]).length,1);
 assert.equal((html.match(/data-csa-continue=/g)||[]).length,1);
 assert.match(html,/class="v2-purchase-brief"/);
 assert.match(html,/class="v2-plan-cards"/);
 assert.match(html,/class="v2-plan-card selected"/);
 assert.match(html,/class="v2-package-payment"/);
 assert.match(html,/class="payment-plan-choice-v2 selected"/);
 assert.match(html,/class="v2-checkout-review"/);
 assert.match(html,/class="v2-legal-demo"/);
 assert.doesNotMatch(html,/Gói CSA A|Gói CSA B|Gói CSA C|QR MẪU|Tình huống demo/);
});

test("Account CSA package view supports arbitrary package counts without hiding cards",()=>{
 const component=loadComponent();
 const packages=["one","two","three","four"].map(id=>packageRow(id));
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPackageSelectionView,{locale:"en",packages,selected:selectionModel.createCsaSelection(packages),onSelectPackage:()=>{},onSelectDuration:()=>{},onSelectPayment:()=>{}}));
 assert.equal((html.match(/data-csa-package-card=/g)||[]).length,4);
 for(const id of ["one","two","three","four"])assert.match(html,new RegExp(`Package ${id}`));
});

test("Account step requires a known complete address and blocks missing data",()=>{
 const component=loadComponent();
 const profile={name:"Nguyễn Minh Anh",phone:"0912345678",email:"member@example.com"};
 const address={name:"Nguyễn Minh Anh",phone:"0912345678",city:"Hà Nội",ward:"Phường Láng",detail:"25 Đường Láng"};
 const complete=renderToStaticMarkup(React.createElement(component.AccountCsaAccountStep,{locale:"vi",profile,address,onBack:()=>{},onContinue:()=>{}}));
 assert.match(complete,/25 Đường Láng, Phường Láng, Hà Nội/);
 assert.doesNotMatch(complete,/csa\.accountIncomplete/);
 const unknownAddress=renderToStaticMarkup(React.createElement(component.AccountCsaAccountStep,{locale:"vi",profile,address:undefined,onBack:()=>{},onContinue:()=>{}}));
 assert.match(unknownAddress,/csa\.accountIncomplete/);
 assert.match(unknownAddress,/disabled=""/);
 const incomplete=renderToStaticMarkup(React.createElement(component.AccountCsaAccountStep,{locale:"vi",profile:{...profile,phone:""},address,onBack:()=>{},onContinue:()=>{}}));
 assert.match(incomplete,/csa\.accountIncomplete/);
 assert.match(incomplete,/disabled=""/);
});

test("guest Account step rejects a ward outside the selected province list",()=>{
 const component=loadComponent();
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaGuestStep,{locale:"vi",buyer:{name:"Nguyễn Văn An",phone:"0901234567",provinceCode:"66",wardCode:"99999",address:"Số 12"},submitted:true,provinces:[{code:"66",name:"Đồng Tháp"}],wards:[{code:"22015",name:"Phường Cao Lãnh"}],provincesLoading:false,wardsLoading:false,provincesError:false,wardsError:false,onRetryUnits:()=>{},onChange:()=>{},onBack:()=>{},onContinue:()=>{}}));
 assert.match(html,/csa\.guestIncomplete/);
 assert.match(html,/name="ward_code"[^>]*aria-invalid="true"/);
});

test("Account CSA styles keep wide cards equal and narrow cards in one scroll-snap row",()=>{
 const css=source("app/styles/96-account-benefits.css");
 assert.match(css,/\.account-tab-csa \.csa-account-package-selection\{[^}]*container-type:inline-size/);
 assert.match(css,/\.account-tab-csa \.v2-plan-cards\{[^}]*display:grid[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@container account-csa \(max-width:760px\)/);
 assert.match(css,/\.account-tab-csa \.v2-plan-cards\{[^}]*display:flex[^}]*overflow-x:auto[^}]*scroll-snap-type:x mandatory/);
 assert.match(css,/\.account-tab-csa \.v2-plan-card\{[^}]*flex:0 0 min\(275px,calc\(100% - 44px\)\)[^}]*scroll-snap-align:start/);
 assert.match(css,/\.account-tab-csa \.payment-plan-list-v2\{[^}]*grid-template-columns:1fr/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^{]*\{[^}]*\.account-tab-csa \.v2-plan-cards\{[^}]*scroll-behavior:auto/);
});

test("Account CSA state markup follows the approved active and pending surfaces",()=>{
 const benefits=source("src/screens/AccountBenefits.tsx");
 const purchase=source("src/screens/account-csa/AccountCsaPackageSelection.tsx");
 assert.match(benefits,/className="csa-plan-meta"/);
 assert.match(benefits,/className="csa-contract-inline"/);
 assert.match(benefits,/contract\.downloadUrl\?<ActionLink[^>]+csa-contract-action/);
 assert.match(benefits,/:<Button[^>]+csa-contract-action[^>]+disabled>/);
 assert.match(benefits,/className="csa-rights"/);
 assert.match(benefits,/className="csa-rights-header"/);
 assert.match(benefits,/className="csa-rights-row"/);
 assert.match(benefits,/className="[^"]*csa-history-footer[^"]*"/);
 assert.match(benefits,/className="acc-text-link"/);
 assert.match(benefits,/navigate\("order-detail",\{productId:u\.orderId\}\)/);
 assert.match(purchase,/className="benefit-plan-title"/);
 assert.match(purchase,/className="benefit-detail-grid"/);
 assert.match(purchase,/className="csa-notice csa-condensed"/);
});

test("approved scheduled request renders its effective date instead of a loading state",()=>{
 const component=loadComponent();
 const confirmation={requestCode:"CSA-002",status:"approved",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"3000000",expiresAt:"2026-11-01T00:00:00Z",membershipStartDate:"2026-12-01",membershipEndDate:"2027-06-01"};
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPendingStep,{locale:"vi",confirmation}));
 assert.match(html,/csa\.requestApproved/);
 assert.match(html,/csa\.membershipStarts/);
 assert.match(html,/01\/12\/2026/);
 assert.doesNotMatch(html,/2026-12-01/);
 assert.doesNotMatch(html,/state\.loadingTitle/);
});

test("payment-reported request only shows the Admin-review status and a tracker action",()=>{
 const component=loadComponent(),confirmation={requestCode:"CSA-004",status:"payment_confirmed",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"500000",expiresAt:"2026-11-01T00:00:00Z"};
 let tracked=false;renderedButtons=[];
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPendingStep,{locale:"vi",confirmation,onTrack:()=>{tracked=true;}}));
 assert.match(html,/csa\.pendingTitle/);
 assert.match(html,/csa\.openTracker/);
 assert.doesNotMatch(html,/csa\.pendingDescription|csa\.pendingQuotaNote|csa\.pendingReloadNote|csa\.transferReported|csa\.paymentAmount/);
 const trackerButton=renderedButtons.find(({children})=>children==="csa.openTracker");
 assert.ok(trackerButton);trackerButton.props.onClick();assert.equal(tracked,true);
});

test("rejected and expired requests show their terminal result and a choose-again action",()=>{
 const component=loadComponent();
 const base={requestCode:"CSA-003",packageName:"Gói Rau",durationMonths:6,amount:"3000000",initialPaymentAmount:"500000",expiresAt:"2026-11-01T00:00:00Z"};
 const rejected=renderToStaticMarkup(React.createElement(component.AccountCsaPendingStep,{locale:"vi",confirmation:{...base,status:"rejected",rejectionReason:"Không tìm thấy giao dịch"},onDismiss:()=>{}}));
 assert.match(rejected,/csa\.requestRejected/);
 assert.match(rejected,/Không tìm thấy giao dịch/);
 assert.match(rejected,/csa\.chooseAgain/);
 const expired=renderToStaticMarkup(React.createElement(component.AccountCsaPendingStep,{locale:"vi",confirmation:{...base,status:"expired"},onDismiss:()=>{}}));
 assert.match(expired,/csa\.requestExpired/);
 assert.match(expired,/csa\.chooseAgain/);
});

test("Contract action renders a file icon instead of the fallback leaf",()=>{
 const file=renderToStaticMarkup(React.createElement(realUI.Icon,{name:"file",size:14}));
 const fallback=renderToStaticMarkup(React.createElement(realUI.Icon,{name:"leaf",size:14}));
 assert.notEqual(file,fallback);
});

test("Account CSA reuses Account primitives without legacy or overriding styles",()=>{
 const css=source("app/styles/96-account-benefits.css");
 const benefits=source("src/screens/AccountBenefits.tsx");
 for(const selector of [
  "csa-selection-steps","csa-package-toolbar","csa-plan-cards","csa-plan-card",
  "csa-plan-allocation","csa-duration-group","csa-payment-selection",
  "csa-payment-options","csa-selection-summary","csa-account-details",
  "csa-pending-summary","csa-qr-layout","csa-current-card","csa-terms-accept","csa-step-actions",
 ])assert.doesNotMatch(css,new RegExp(`\\.${selector}(?:[^a-z0-9-]|$)`));
 assert.doesNotMatch(css,/!important/);
 assert.doesNotMatch(css,/\.csa-purchase-step\s*\{[^}]*padding:/);
 assert.doesNotMatch(css,/\.csa-package-selection-section[^}]*>\.acc-heading h2\s*\{/);
 assert.match(benefits,/import \{ActionLink,Button,DataState,Icon,Section,localized\} from "@\/components\/UI"/);
});

test("VietQR URL uses only a validated Backend payment payload",()=>{
 const component=loadComponent();
 const quote={payment:{amount:"500000",bankCode:"970422",bankName:"MB",accountNumber:"123456789",accountName:"NFV",transferContent:"CSA-1"},summary:{initialPaymentAmount:"500000"},qr:{acqId:"970422",accountNo:"123456789",accountName:"NFV",amount:"500000",addInfo:"CSA-1",format:"text",template:"compact2"}};
 const url=component.csaVietQrImageUrl(quote);assert.match(url,/^https:\/\/img\.vietqr\.io\/image\/970422-123456789-qr_only\.png\?/);assert.match(url,/amount=500000/);
 assert.equal(component.csaVietQrImageUrl({...quote,qr:{...quote.qr,amount:"1"}}),"");
});

test("payment step keeps Backend totals, installments and transfer fallback when QR is unavailable",()=>{
 const component=loadComponent();
 const quote={quoteToken:"signed",expiresAt:"2099-10-25T01:00:00Z",requestCode:"CSA-1",payment:{amount:"500000",bankCode:"970422",bankName:"MB",accountNumber:"123456789",accountName:"NFV",transferContent:"CSA-1"},summary:{paymentType:"installment",totalAmount:"3000000",initialPaymentAmount:"500000",installmentCount:2,installments:[{sequence:1,amount:"500000",cycleCount:1},{sequence:2,amount:"2500000",cycleCount:5}]},terms:{version:"v1",locale:"vi",hash:"abc"},qr:{acqId:"970422",accountNo:"123456789",accountName:"NFV",amount:"1",addInfo:"CSA-1",format:"text",template:"compact2"}};
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPaymentStep,{locale:"vi",quote,busy:false,error:"",onBack:()=>{},onConfirm:()=>{}}));
 assert.match(html,/csa\.contractTotal/);
 assert.match(html,/csa\.firstPayment/);
 assert.match(html,/csa\.installmentSchedule/);
 assert.match(html,/csa\.copyAccountNumber/);
 assert.match(html,/csa\.copyTransferContent/);
 assert.match(html,/csa\.qrUnavailable/);
 assert.match(html,/25\/10\/2099 08:00/);
 assert.doesNotMatch(html,/csa\.paymentDescription/);
 assert.equal((html.match(/csa\.firstPayment/g)||[]).length,1);
 assert.equal((html.match(/csa\.contractTotal/g)||[]).length,1);
 assert.doesNotMatch(html,/disabled=""/);
});

test("payment step presents a branded QR and compact accessible copy actions",()=>{
 const component=loadComponent();
 const quote={quoteToken:"signed",expiresAt:"2099-10-25T01:00:00Z",requestCode:"CSA-1",payment:{amount:"500000",bankCode:"970422",bankName:"MB",accountNumber:"123456789",accountName:"NFV",transferContent:"CSA-1"},summary:{paymentType:"full",totalAmount:"500000",initialPaymentAmount:"500000",installmentCount:1,installments:[{sequence:1,amount:"500000",cycleCount:1}]},terms:{version:"v1",locale:"vi",hash:"abc"},qr:{acqId:"970422",accountNo:"123456789",accountName:"NFV",amount:"500000",addInfo:"CSA-1",format:"text",template:"compact2"}};
 const html=renderToStaticMarkup(React.createElement(component.AccountCsaPaymentStep,{locale:"vi",quote,busy:false,error:"",onBack:()=>{},onConfirm:()=>{}}));
 assert.match(html,/class="csa-qr-frame"/);
 assert.match(html,/class="csa-qr-image"/);
 assert.match(html,/class="csa-qr-logo" src="\/images\/logo-mark\.png"/);
 assert.equal((html.match(/class="csa-copy-button"/g)||[]).length,2);
 assert.match(html,/aria-label="csa\.copyAccountNumber"[^>]*><span data-icon="copy"><\/span><\/button>/);
 assert.match(html,/aria-label="csa\.copyTransferContent"[^>]*><span data-icon="copy"><\/span><\/button>/);
 assert.doesNotMatch(html,/csa\.paymentDescription|csa\.contractTotal/);
 assert.equal((html.match(/csa\.paymentAmount/g)||[]).length,1);
});

test("payment detail rows reserve the same value height with or without a copy action",()=>{
 const css=source("app/styles/96-account-benefits.css");
 assert.match(css,/\.account-tab-csa \.csa-transfer-row dd\{[^}]*min-height:34px/);
});

test("quote expiry helper rejects expired and malformed Backend timestamps",()=>{
 const component=loadComponent();
 const now=Date.parse("2026-10-25T01:00:00Z");
 assert.equal(component.csaQuoteExpired("2026-10-25T01:00:00Z",now),true);
 assert.equal(component.csaQuoteExpired("2026-10-25T01:00:01Z",now),false);
 assert.equal(component.csaQuoteExpired("not-a-date",now),true);
});
