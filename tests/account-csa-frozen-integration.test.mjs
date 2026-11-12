import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),jsx=require('react/jsx-runtime'),{renderToStaticMarkup}=require('react-dom/server');
function load(path,stub){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,require:name=>name==='react'?React:name==='react/jsx-runtime'?jsx:stub(name)});return exports;}
const UI={Section:({title,children})=>React.createElement('section',null,title,children),Button:({children})=>React.createElement('button',null,children),Icon:()=>null,DataState:({title})=>React.createElement('p',null,title),ActionLink:({children,href})=>React.createElement('a',{href},children),localized:(o,k)=>o[k]};
const summary=load('src/screens/account-csa/AccountCsaUpcoming.tsx',name=>name==='@/components/UI'?UI:name==='@/data/account-copy'?{copyText:(_,k)=>k}:name==='@/lib/format'?{dateLabel:v=>v}:{csaMoney:v=>v});
test('membership end is exclusive while extension delivery date remains inclusive',()=>{
 const html=renderToStaticMarkup(React.createElement(summary.AccountCsaPlanSummary,{planName:'Old',statusLabel:'Frozen',statusTone:'processing',locale:'en',startDate:'2026-01-01',endDate:'2026-11-01',extensionEndDate:'2026-11-20'}));
 assert.match(html,/2026-10-31/);assert.match(html,/2026-11-20/);assert.doesNotMatch(html,/2026-11-01/);
});
function benefits(overview){const state={data:{csa:overview},ui:{locale:'en',accountFetchState:{csa:'ready'},busyKeys:[]},setData(){},setUI(){}};return load('src/screens/AccountBenefits.tsx',name=>{
 if(name==='@/state/NFVContext')return {useNFV:()=>state};
 if(name==='@/components/UI')return UI;
 if(name==='@/data/account-copy')return {copyText:(_,key)=>key};
 if(name==='@/screens/account-csa/AccountCsaUpcoming')return summary;
 if(name==='@/screens/account-csa/AccountCsaRounds')return {AccountCsaRounds:()=>React.createElement('div',null,'Round block')};
 if(name==='@/lib/csa-navigation')return {csaLandingHref:()=>'/csa/en'};
 if(name==='@/lib/format')return {dateLabel:v=>v};
 if(name==='@/components/account/PagedList')return {PagedList:({items})=>React.createElement('div',null,items.map(x=>x.productName).join(','))};
 return {};
}).BenefitsView;}
const frozen={id:'old',planName:'Old plan',status:'frozen',endDate:'2026-11-01',extensionEndDate:'2026-11-20',quotas:[],usage:[{productName:'Old usage'}],contract:{number:'OLD'}};
test('frozen-only My CSA keeps history and places rounds before upcoming and summary',()=>{
 const View=benefits({active:null,frozen,upcoming:[]}),html=renderToStaticMarkup(React.createElement(View,{kind:'csa'}));
 assert.match(html,/Old plan/);assert.match(html,/Old usage/);assert.match(html,/OLD/);assert.doesNotMatch(html,/csa.noPackage|csa.noQuota/);assert.ok(html.indexOf('Round block')<html.indexOf('Old plan'));
});
test('active and frozen memberships each keep their own summary',()=>{
 const View=benefits({active:{...frozen,id:'new',planName:'New plan',status:'active',contract:{number:'NEW'}},frozen,upcoming:[]});
 const html=renderToStaticMarkup(React.createElement(View,{kind:'csa'}));assert.match(html,/Old plan/);assert.match(html,/New plan/);assert.match(html,/OLD/);assert.match(html,/NEW/);
});
