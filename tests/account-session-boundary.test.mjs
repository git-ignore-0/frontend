import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),jsx=require('react/jsx-runtime'),{renderToStaticMarkup}=require('react-dom/server'),ts=require('typescript');
const root=new URL('../',import.meta.url);
function renderAccount(auth,owner){
const context={accountSessionKey:owner,data:{profile:{name:`Name ${owner}`,phone:'+84901234567',email:`${owner}@example.com`,dateOfBirth:null}},ui:{locale:'vi',accountTab:'profile',accountHubOpen:false,accountFetchState:{}},patch(){},refreshResource:async()=>{}};
const cache=new Map();
function load(path){
 if(cache.has(path))return cache.get(path);const exports={};cache.set(path,exports);
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>{
  if(name==='react')return React;if(name==='react/jsx-runtime')return jsx;
  if(name==='@/state/NFVContext')return {useNFV:()=>context};
  if(name==='@/auth/AuthProvider')return {useAuth:()=>auth};
  if(name==='@/data/account-navigation')return load('src/data/account-navigation.ts');
  if(name==='@/screens/AccountProfile')return load('src/screens/AccountProfile.tsx');
  if(name==='@/data/account-copy')return {copyText:(_locale,key)=>key};
  if(name==='@/auth/site-auth')return {siteAccountHref:()=>'/auth/account'};
  if(name==='@/screens/profile-presentation')return {profileBirthDate:()=>''};
  if(name==='@/components/UI')return {Icon:()=>null,ActionLink:({children,href})=>React.createElement('a',{href},children),DataState:({title,kind})=>React.createElement('p',{'data-state':kind},title),Section:({title,children})=>React.createElement('section',null,React.createElement('h2',null,title),children)};
  if(name==='@/screens/AccountOrders')return {GuestOrderLookup:()=>null};
  if(name==='@/components/auth/GuestAuthActions')return {GuestAuthActions:()=>null};
  if(name==='@/components/auth/LogoutButton')return {LogoutButton:()=>null};
  return {};
 }});return exports;
}
return renderToStaticMarkup(React.createElement(load('src/screens/Account.tsx').Account));
}

test('Account hides old private data until its context owner matches the authenticated subject',()=>{
 const html=renderAccount({status:'authenticated',session:{subject:'user-B'}},'user-A');
 assert.doesNotMatch(html,/user-A@example.com/);assert.match(html,/data-state="loading"/);
});

test('Account displays private data for the matching subject',()=>{
 const html=renderAccount({status:'authenticated',session:{subject:'user-B'}},'user-B');
 assert.match(html,/user-B@example.com/);assert.doesNotMatch(html,/data-state="loading"/);
});

test('checking and guest states do not render the previous profile',()=>{
 for(const status of ['checking','guest'])assert.doesNotMatch(renderAccount({status,session:null},'user-A'),/user-A@example.com/);
});
