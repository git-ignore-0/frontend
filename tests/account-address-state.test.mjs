import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),fs=require('fs'),vm=require('vm'),root=new URL('..',import.meta.url).pathname,ts=require(root+'/node_modules/typescript');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
let cursor=0;const state=[];const react={useState(v){const i=cursor++;if(!(i in state))state[i]=v;return [state[i],x=>state[i]=typeof x==='function'?x(state[i]):x]}};
const areas=[{code:'P',name:'Province',wards:[{code:'W',name:'Ward',shippingFeeVnd:'0'}]}];
const model={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/account/shipping-address-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:model});
const out={};const source=fs.readFileSync(root+'/src/screens/AccountProfile.tsx','utf8')+'\nexport {AddressEditor};';
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,require(n){if(n==='react')return react;if(n==='react/jsx-runtime')return jsx;if(n==='@/state/NFVContext')return {useNFV:()=>({ui:{locale:'vi'}})};if(n==='@/components/UI')return {Button:'Button'};if(n==='@/account/shipping-address-model')return model;if(n==='@/hooks/useSupportedShippingAreas')return {useSupportedShippingAreas:()=>({areas,loading:false,error:false})};if(n==='@/components/account/ShippingAddressFields')return {ShippingAddressFields:'Fields'};return {}}});
const nodes=t=>!t||typeof t!=='object'?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)];
const initial={name:'Name',phone:'0901234567',provinceCode:'P',wardCode:'W',city:'Province',ward:'Ward',detail:'House',isSupported:true};
function render(busy=false){cursor=0;return out.AddressEditor({initial,isNew:false,busy,cancel(){},save(){},saveError:''})}
test('address save stays disabled until all changed fields are valid',()=>{
 let t=render();assert.equal(nodes(t).find(n=>n.type==='Button'&&n.props.type==='submit').props.disabled,true);
 nodes(t).find(n=>n.type==='Fields').props.onChange({...state[0],phone:''});t=render();assert.equal(nodes(t).find(n=>n.type==='Button'&&n.props.type==='submit').props.disabled,true);
 nodes(t).find(n=>n.type==='Fields').props.onChange({...state[0],phone:'0912345678'});t=render();assert.equal(nodes(t).find(n=>n.type==='Button'&&n.props.type==='submit').props.disabled,false);
});
test('address fields are locked while saving',()=>{
 const t=render(true);assert.ok(nodes(t).some(n=>n.type==='fieldset'&&n.props.disabled));
 assert.equal(nodes(t).find(n=>n.type==='Button'&&n.props.type==='submit').props.disabled,true);
});
