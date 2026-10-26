import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import vm from "node:vm";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url),React=require("react"),jsxRuntime=require("react/jsx-runtime"),{renderToStaticMarkup}=require("react-dom/server"),ts=require("typescript");
const source=path=>readFileSync(join(root,path),"utf8");
const dateFormat=(()=>{const code=ts.transpileModule(source("src/lib/date-format.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};vm.runInNewContext(code,{exports,Intl,Date,Object,Number,String});return exports;})();

function loadCopy(){
  const code=ts.transpileModule(source("src/data/account-copy.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
  vm.runInNewContext(code,{exports});
  return exports.copyText;
}

function component(buttons=[]){
  const code=ts.transpileModule(source("src/screens/account-csa/AccountCsaTracker.tsx"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,exports={};
  vm.runInNewContext(code,{exports,React,console,URL,document:{},window:{},require:id=>{
    if(id==="react")return React;if(id==="react/jsx-runtime")return jsxRuntime;
    if(id==="@/components/UI")return {Button:({children,small,loading,variant,...props})=>{void small;void loading;void variant;buttons.push(props);return React.createElement("button",props,children);},FormField:({label,children})=>React.createElement("label",null,label,children),FormInput:props=>React.createElement("input",props),Icon:({name})=>React.createElement("span",{"data-icon":name}),Section:({title,description,children,className})=>React.createElement("section",{className},React.createElement("h2",null,title),description&&React.createElement("p",null,description),children)};
    if(id==="@/data/account-copy")return {copyText:(_locale,key,vars={})=>Object.entries(vars).reduce((text,[name,value])=>text.replace(`{${name}}`,String(value)),key)};
    if(id==="@/lib/date-format")return dateFormat;
    if(id==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi"}})};
    if(id==="@/account/csa-tracker-service")return {};
    if(id==="@/screens/csa/csa-packages-model")return {csaMoney:value=>`${value} VND`};
    if(id==="./csa-guest-buyer")return {normalizeVietnamPhone:value=>value,sanitizeVietnamPhoneInput:value=>value};
    throw new Error(`Unexpected import ${id}`);
  }});
  return exports;
}

const base={referenceCode:"CSA-001",referenceType:"request",status:"pending",packageName:"Gói Rau",priceOptionName:"6 tháng",durationMonths:6,amount:"3000000",currency:"VND",createdAt:"2026-10-25T00:00:00Z",expiresAt:"2026-10-26T00:00:00Z",paymentConfirmedAt:null,contract:null,pdfAvailable:false,availablePdfLocales:[]};

test("tracker result supports every Backend terminal and in-progress state",()=>{
  const {AccountCsaTrackerResult}=component();
  for(const status of ["pending","payment_confirmed","approved","rejected","expired"]){
    const result={...base,status,...(status==="rejected"?{rejectionReason:"Không tìm thấy giao dịch",refundStatus:"pending",rejectedAt:"2026-10-25T02:00:00Z"}:{})};
    const html=renderToStaticMarkup(React.createElement(AccountCsaTrackerResult,{locale:"vi",result,contract:null,contractLoading:false,error:"",downloading:new Set(),downloadErrors:{},onRetryContract:()=>{},onReset:()=>{},onDownload:()=>{}}));
    assert.match(html,new RegExp(status==="payment_confirmed"?"csa\\.trackerStatus\\.adminReview":`csa\\.trackerStatus\\.${status}`));
    if(status==="payment_confirmed"){
      assert.match(html,/acc-status processing[^>]*>csa\.trackerStatus\.adminReview/);
      assert.doesNotMatch(html,/csa\.trackerNotice\.payment_confirmed/);
    }
    if(status!=="approved")assert.match(html,/CSA-001/);
    assert.doesNotMatch(html,/has-contract|csa-tracker-contract-card|csa-tracker-versions|csa\.trackerDownload/);
    if(status==="rejected"){
      assert.match(html,/Không tìm thấy giao dịch/);
      assert.match(html,/Gói Rau/);
      assert.match(html,/csa\.monthCount/);
      assert.match(html,/3000000 VND/);
    }
  }
});

test("approved tracker result shows only the plan period and one current-contract download",()=>{
  const buttons=[],{AccountCsaTrackerResult}=component(buttons);
  const result={...base,status:"approved",contract:{id:"contract",referenceCode:"CSA-C-001",status:"active"},pdfAvailable:true,availablePdfLocales:["vi","en"]};
  const contract={id:"contract",referenceCode:"CSA-C-001",source:"purchase_request",status:"active",packageName:"Gói Rau",priceOptionName:"6 tháng",amount:"3000000",currency:"VND",durationMonths:6,startDate:"2026-11-01",endDate:"2027-05-01",issuedAt:"2026-10-26T00:00:00Z",revokedAt:null,revocationReason:null,availablePdfLocales:["vi","en"],pdfAvailable:true,currentVersion:{id:"v2",versionNumber:2,versionReason:"payment_confirmed",contractStatus:"active",createdAt:"2026-10-26T00:00:00Z",availableLocales:["vi"]},versions:[{id:"v1",versionNumber:1,versionReason:"issued",contractStatus:"active",createdAt:"2026-10-25T00:00:00Z",availableLocales:["vi"]}],paymentPlan:{id:"p",name:"Trả góp",paymentType:"installment",totalAmount:"3000000",installmentCount:2,initialPaymentAmount:"500000",installments:[]},paymentSummary:{totalAmount:"3000000",paidAmount:"500000",remainingAmount:"2500000",confirmedInstallments:1,installmentCount:2,paidCycles:1,totalCycles:6},payments:[{installmentSequence:1,amountDue:"500000",amountPaid:"500000",cycleCount:1,status:"confirmed",dueAt:"2026-10-25T12:00:00Z",confirmedAt:"2026-10-26T12:00:00Z",rejectedAt:null},{installmentSequence:2,amountDue:"2500000",amountPaid:null,cycleCount:5,status:"rejected",dueAt:"2026-11-25T12:00:00Z",confirmedAt:null,rejectedAt:"2026-11-26T12:00:00Z"}]};
  const downloads=[];
  const html=renderToStaticMarkup(React.createElement(AccountCsaTrackerResult,{locale:"vi",result,contract,contractLoading:false,error:"",downloading:new Set(),downloadErrors:{},onRetryContract:()=>{},onReset:()=>{},onDownload:(...args)=>downloads.push(args)}));
  const text=html.replace(/<[^>]+>|<!-- -->/g,"");
  assert.equal((text.match(/Gói Rau/g)||[]).length,1);
  assert.match(text,/csa\.trackerContractStatus\.active/);
  assert.match(text,/csa\.monthCount/);
  assert.match(text,/csa\.start01\/11\/2026/);
  assert.match(text,/csa\.end30\/04\/2027/);
  assert.equal((html.match(/<button/g)||[]).length,2);
  assert.match(html,/aria-label="csa\.trackerDownloadVi"/);
  buttons.find(button=>button["aria-label"]==="csa.trackerDownloadVi").onClick();
  assert.deepEqual(downloads,[["vi","v2"]]);
  assert.match(text,/csa\.trackerDownloadContract/);
  assert.doesNotMatch(html,/csa-tracker-payments|csa-tracker-versions|csa-tracker-contract-card/);
  assert.doesNotMatch(text,/CSA-C-001|csa\.paymentMethod|csa\.trackerIssuedAt|quota|Quota/);
  const failedCurrentPdf=renderToStaticMarkup(React.createElement(AccountCsaTrackerResult,{locale:"vi",result,contract,contractLoading:false,error:"",downloading:new Set(),downloadErrors:{"v2:vi":"Không tải được PDF"},onRetryContract:()=>{},onReset:()=>{},onDownload:()=>{}}));
  assert.match(failedCurrentPdf,/Không tải được PDF/);
  const revokedHtml=renderToStaticMarkup(React.createElement(AccountCsaTrackerResult,{locale:"vi",result:{...result,contract:{...result.contract,status:"revoked"},contractStatus:"revoked"},contract:{...contract,status:"revoked",revokedAt:"2026-11-02T00:00:00Z",revocationReason:"membership_revoked"},contractLoading:false,error:"",downloading:new Set(),downloadErrors:{},onRetryContract:()=>{},onReset:()=>{},onDownload:()=>{}}));
  assert.match(revokedHtml,/acc-status error[^>]*>csa\.trackerContractStatus\.revoked/);
});

test("tracker calendar dates do not move to the previous day in a western timezone",()=>{
  const previous=process.env.TZ;
  process.env.TZ="America/Los_Angeles";
  try{
    const {AccountCsaTrackerResult}=component();
    const result={...base,status:"approved",contract:{id:"contract",referenceCode:"CSA-C-001",status:"active"},pdfAvailable:false,availablePdfLocales:[]};
    const contract={id:"contract",referenceCode:"CSA-C-001",source:"purchase_request",status:"active",packageName:"Gói Rau",priceOptionName:"6 tháng",amount:"3000000",currency:"VND",durationMonths:6,startDate:"2026-11-01",endDate:"2027-05-01",issuedAt:"2026-10-26T00:00:00Z",revokedAt:null,revocationReason:null,availablePdfLocales:[],pdfAvailable:false,currentVersion:null,versions:[],paymentPlan:null,paymentSummary:null,payments:[]};
    const html=renderToStaticMarkup(React.createElement(AccountCsaTrackerResult,{locale:"en",result,contract,contractLoading:false,error:"",downloading:new Set(),downloadErrors:{},onRetryContract:()=>{},onReset:()=>{},onDownload:()=>{}}));
    assert.match(html,/csa\.start<\/span><strong>01\/11\/2026/);
  }finally{
    if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;
  }
});

test("tracker form only promises request-code lookup supported by Backend",()=>{
  const copyText=loadCopy();
  assert.equal(copyText("vi","csa.trackerIntro"),"Nhập mã yêu cầu và số điện thoại đã đăng ký để xem trạng thái.");
  assert.equal(copyText("vi","csa.trackerReference"),"Mã yêu cầu");
  assert.equal(copyText("en","csa.trackerIntro"),"Enter your request code and the phone number used to register to view its status.");
  assert.equal(copyText("en","csa.trackerReference"),"Request code");
  assert.equal(copyText("vi","csa.trackerStatus.adminReview"),"Chờ Admin duyệt");
  assert.equal(copyText("en","csa.trackerStatus.adminReview"),"Waiting for Admin approval");
  assert.equal(copyText("vi","csa.trackerRequestExpiresAt"),"Yêu cầu hết hạn lúc");
  assert.equal(copyText("en","csa.trackerRequestExpiresAt"),"Request expires at");
});

test("tracker result uses a simple responsive summary",()=>{
  const css=source("app/styles/96-account-benefits.css");
  assert.match(css,/\.account-tab-csa-tracker \.csa-tracker-result\{[^}]*container-name:csa-tracker[^}]*container-type:inline-size/);
  assert.match(css,/\.account-tab-csa-tracker \.csa-tracker-approved-summary\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@container csa-tracker \(max-width:560px\)\{[^}]*\.account-tab-csa-tracker \.csa-tracker-approved-summary\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(css,/\.account-tab-csa-tracker \.csa-tracker-payment-list|\.account-tab-csa-tracker \.csa-tracker-versions/);
});

test("tracker screen has validation, duplicate-submit, retry, session-expiry and new-lookup handling",()=>{
  const tracker=source("src/screens/account-csa/AccountCsaTracker.tsx");
  assert.match(tracker,/normalizeVietnamPhone\(phone\)/);
  assert.match(tracker,/lookupInFlight\.current/);
  assert.match(tracker,/downloadGeneration\.current/);
  assert.match(tracker,/isTrackerSessionExpired/);
  assert.match(tracker,/onRetryContract/);
  assert.match(tracker,/resetLookup/);
  assert.doesNotMatch(tracker,/getCSA|getCsaUsage|quota|Quota/);
  assert.match(source("src/screens/Account.tsx"),/key=\{`\$\{auth\.status\}:\$\{tab\}`\}/);
});
