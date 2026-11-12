import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function load(file){const exports={};const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports,Date,require(name){if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.css'))return {default:new Proxy({},{get:(_,key)=>key})};if(name==='@/components/UI')return {Photo:'Photo',Quantity:'Quantity',Button:'Button',DataState:'DataState',Icon:'Icon'};if(name.startsWith('.')||name.startsWith('@/')){let target=name.startsWith('@/')?resolve(root,'src',name.slice(2)):resolve(dirname(file),name);if(!existsSync(target))target+=existsSync(target+'.ts')?'.ts':'.tsx';return load(target)}return require(name)}});return exports}
const nodes=t=>!t||typeof t!=='object'?[]:[t,...(typeof t.type==='function'?nodes(t.type(t.props)):[t.props?.children,t.props?.actions].flat(Infinity).flatMap(nodes))];
const p={id:'p',name:'Cải ngọt',quotaGroupId:'g',quotaGroupName:'Rau',quotaCost:1,availableQuantity:10,unitSize:'500',unitLabel:'g',imageUrl:null};
test('produce groups show allowance once without per-product quota warnings',()=>{
 const {CsaRoundProductList}=load(resolve(root,'src/screens/account-csa/CsaRoundProductList.tsx'));const changes=[];
 const tree=CsaRoundProductList({products:[p,{...p,id:'f',name:'Cam',quotaGroupId:'fruit',quotaGroupName:'Trái cây'}],limits:{p:1,f:4},draft:{p:1},quota:[{groupId:'g',availableUnits:1},{groupId:'fruit',availableUnits:4}],used:{g:100},disabled:false,locale:'vi',onChange:(...v)=>changes.push(v)});
 assert.equal(nodes(tree).filter(n=>n.type==='section').length,2);
 assert.equal(JSON.stringify(tree).includes('Không đủ điểm'),false);const q=nodes(tree).find(n=>n.type==='Quantity');q.props.onMinus();assert.deepEqual(changes,[['p',0]]);
});
test('review shows only chosen products without repeating quota or quantity controls',()=>{
 const {CsaRoundSelectionSummary}=load(resolve(root,'src/screens/account-csa/CsaRoundSelectionSummary.tsx'));
 const tree=CsaRoundSelectionSummary({snapshot:{products:[p],quota:[{groupId:'g',availableUnits:5}]},draft:{p:2},products:[p],used:{g:200},locale:'vi',disabled:false,onRemove(){}});
 assert.equal(nodes(tree).filter(n=>n.type==='Quantity'||n.type==='Button').length,0);
 assert.equal(nodes(tree).filter(n=>n.type==='details').length,0,'quota belongs only to the produce group');
 assert.ok(JSON.stringify(tree).includes('Cải ngọt'));assert.ok(JSON.stringify(tree).includes('× '));
});
test('selection keeps schedule, quota and review visible in the shared page layout',()=>{
 const file=resolve(root,'src/screens/account-csa/CsaRoundSelectionPage.tsx');
 const bundle={round:{id:'r',name:'Round',status:'open',opensAt:'2026-11-20T00:00:00Z',closesAt:'2026-11-21T00:00:00Z',deliveryAt:'2026-11-22T00:00:00Z',serverTime:'2026-11-20T12:00:00Z'},products:[],quota:[],selection:null};
 let current=bundle,dirty=false,busy=false,error=null;
 const state=()=>({current,dirty,busy,error,draft:{p:1},draftProducts:[],access:{mode:current?.round.status==='cancelled'?'readonly':'select'},setDraft(){},load(){},submit(){}});
 const out={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports:out,require(name){
  if(name==='react')return {useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect(){}};
  if(name==='react/jsx-runtime')return jsx;
  if(name==='./useCsaRoundSelection')return {useCsaRoundSelection:state};
  if(name==='@/components/auth/AuthGate')return {AuthGate:'AuthGate'};
  if(name==='@/components/overlays/OverlayPrimitives')return {ResponsiveDialog:'Dialog'};
  if(name==='@/components/UI')return {ActionLink:'Link',Button:'Button',Status:'Status',DataState:'DataState'};
  if(name.endsWith('.css'))return {default:new Proxy({},{get:(_,k)=>k})};
  let path=name.startsWith('@/')?resolve(root,'src',name.slice(2)):resolve(dirname(file),name);
  if(!existsSync(path))path+=existsSync(path+'.ts')?'.ts':'.tsx';
  return load(path);
 }});
 for(const value of [bundle,null]){
  current=value;const wrapper=out.CsaRoundSelectionPage({roundId:'r',locale:'vi'});const screen=wrapper.props.children.type(wrapper.props.children.props);
  assert.equal(nodes(screen).filter(n=>n.type==='details'||n.type==='Dialog').length,0,'selection does not hide content behind disclosure controls');
  if(value){assert.equal(nodes(screen).filter(n=>n.type==='Button'&&n.props.children==='Lưu lựa chọn').length,1,'one save action serves the whole page');assert.ok(JSON.stringify(screen).includes('Thời gian chọn'));}
  assert.equal(screen.type,'main');assert.equal(screen.props.className,'main-content');
  assert.ok(nodes(screen).some(n=>typeof n.props?.className==='string'&&n.props.className.split(' ').includes('container')),'page must inherit the same centered width and gutters as Store screens');
 }
 current={...bundle,products:[p],quota:[{groupId:'g',availableUnits:5}]};
 for(const scenario of [{dirty:false,busy:false,disabled:true},{dirty:true,busy:false,disabled:false},{dirty:true,busy:true,disabled:true}]){
  dirty=scenario.dirty;busy=scenario.busy;
  const wrapper=out.CsaRoundSelectionPage({roundId:'r',locale:'vi'}),screen=wrapper.props.children.type(wrapper.props.children.props);
  const save=nodes(screen).find(n=>n.type==='Button'&&n.props.children==='Lưu lựa chọn');
  assert.equal(save.props.disabled,scenario.disabled);
  assert.equal(JSON.stringify(screen).includes('Đã lưu'),false);
 }

 error={status:404};
 current={...bundle,round:{...bundle.round,name:'Đợt đã hủy',status:'cancelled',cancellationReason:'Mưa lớn'},catalogError:error};
 const wrapper=out.CsaRoundSelectionPage({roundId:'r',locale:'vi'}),screen=wrapper.props.children.type(wrapper.props.children.props);
 const cancelledNodes=nodes(screen),cancelledText=JSON.stringify(screen);
 assert.equal(cancelledNodes.find(n=>n.type==='h1').props.children,'Đợt đã hủy');
 assert.equal(cancelledNodes.filter(n=>n.props?.role==='alert').length,0,'expected closed catalog is not a permission error');
 assert.equal(cancelledText.includes('Chưa có lựa chọn đã lưu'),false);
 assert.equal(cancelledText.includes('Lựa chọn của bạn'),false);
 assert.ok(cancelledText.includes('Mưa lớn'));
 current={...current,selection:{state:'cancelled',lines:[{productId:'p',name:'Rau 500g',quantity:2,unitLabel:'g',quotaCost:1,quotaGroupId:'g'}]}};
 const savedWrapper=out.CsaRoundSelectionPage({roundId:'r',locale:'vi'}),savedScreen=savedWrapper.props.children.type(savedWrapper.props.children.props);
 const quantity=nodes(savedScreen).find(n=>n.type==='li').props.children.find(n=>n.type==='strong');
 assert.equal(quantity.props.children.filter(v=>typeof v==='string').join('').trim(),'×');
 error={status:403};
 const deniedWrapper=out.CsaRoundSelectionPage({roundId:'r',locale:'vi'}),denied=deniedWrapper.props.children.type(deniedWrapper.props.children.props);
 assert.equal(nodes(denied).filter(n=>n.props?.role==='alert').length,1,'genuine permission failures remain visible');

});

test('group allowance is visible without expanding a dropdown',()=>{
 const {CsaRoundQuota}=load(resolve(root,'src/screens/account-csa/CsaRoundQuota.tsx'));
 const tree=CsaRoundQuota({name:'Rau',available:5,used:200,locale:'vi'});
 assert.equal(nodes(tree).filter(n=>n.type==='details'||n.type==='summary').length,0);
 const text=JSON.stringify(tree);assert.ok(text.includes('Rau'));assert.ok(text.includes('điểm còn lại'));assert.equal(text.includes('Đang chọn'),false);
});

test('products still identify selections needing a stock or quota correction',()=>{
 const {CsaRoundProductList}=load(resolve(root,'src/screens/account-csa/CsaRoundProductList.tsx'));
 const tree=CsaRoundProductList({products:[p],limits:{p:1},draft:{p:2},quota:[{groupId:'g',availableUnits:1}],used:{g:200},disabled:false,locale:'vi',onChange(){}});
 assert.ok(JSON.stringify(tree).includes('Điểm khả dụng đã thay đổi'));
});
