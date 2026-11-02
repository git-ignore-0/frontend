import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;

test("shared clipboard notification is emitted after success and consistently reports failures in both locales",async()=>{
 for(const locale of ["vi","en"]){
  const messages=[],values=[];let resolve;
  const exports={};
  vm.runInNewContext(compile("src/lib/copy-feedback.ts"),{exports,require:()=>({copyTextToClipboard:value=>{values.push(value);return new Promise(done=>{resolve=done})}})});
  const pending=exports.copyWithFeedback("SO-123",locale,(...args)=>messages.push(args));
  assert.deepEqual(values,["SO-123"]);assert.deepEqual(messages,[]);
  resolve();assert.equal(await pending,true);
  assert.deepEqual(messages,[[locale==="vi"?"Đã sao chép":"Copied","success"]]);
  const failed={};vm.runInNewContext(compile("src/lib/copy-feedback.ts"),{exports:failed,require:()=>({copyTextToClipboard:async()=>{throw Error("denied")}})});
  messages.length=0;
  assert.equal(await failed.copyWithFeedback("SO-123",locale,(...args)=>messages.push(args)),false);
  assert.deepEqual(messages,[[locale==="vi"?"Không thể sao chép. Vui lòng thử lại.":"Could not copy. Please try again.","error"]]);
 }
});

test("all copy entry points delegate to the shared method without inline feedback",()=>{
 for(const path of ["src/components/BankTransferPanel.tsx","src/screens/AccountBenefits.tsx","src/components/account/ReferralShareDialog.tsx"]){
  assert.match(read(path),/copyToClipboard/);
  assert.doesNotMatch(read(path),/copyTextToClipboard|clipboard\.writeText|CopyFeedback|referral-share-feedback|bank-transfer-copy-feedback/);
 }
 const context=read("src/state/NFVContext.tsx");
 assert.match(context,/copyWithFeedback\(value,ui.locale,toast\)/);
 assert.match(context,/\[ui.toast,ui.toastSequence,patch\]/);
});

test("one portal toast sits top-right above dialogs with a live region and tone-aware icon",()=>{
 const jsx={jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key})},exports={},body={};
 vm.runInNewContext(compile("src/components/Toast.tsx"),{exports,document:{body},require:name=>name==="react"?{useSyncExternalStore:(_subscribe,getClient)=>getClient()}:name==="react/jsx-runtime"?jsx:name==="react-dom"?{createPortal:(tree,target)=>({tree,target})}:{Icon:"Icon"}});
 const {tree,target}=exports.Toast({message:"Copied",tone:"error",sequence:2});
 assert.equal(target,body);assert.equal(tree.props.role,"status");
 assert.equal(tree.props["aria-live"],"polite");
 assert.equal(tree.props.children.props["data-tone"],"error");
 assert.equal(tree.props.children.props.children[0].props.name,"alert");
 assert.equal(tree.props.children.key,2);
 const css=read("app/styles/16-notifications.css");
 assert.match(css,/position:fixed;top:/);assert.match(css,/right:/);assert.match(css,/z-index:200/);
 assert.doesNotMatch(read("app/styles/00-foundation-and-store.css"),/\.toast\{/);
});
