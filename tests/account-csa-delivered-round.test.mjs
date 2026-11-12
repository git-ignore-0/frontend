import test from 'node:test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),__dirname=fileURLToPath(new URL('.',import.meta.url));
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const id='11111111-1111-4111-8111-111111111111';
const round={id,sequence:1,name:'Đợt giao hỗn hợp',status:'cancelled',opensAt:'2026-11-01T00:00:00Z',closesAt:'2026-11-02T00:00:00Z',deliveryAt:'2026-11-03T00:00:00Z',serverTime:'2026-11-04T00:00:00Z',cancellationReason:'Hủy các đơn còn lại'};
const selection={id,roundId:id,membershipId:id,state:'delivered',revision:3,orderId:id,reopenUntil:null,serverTime:round.serverTime,lines:[{productId:id,name:'Rau',quantity:1,unitLabel:'kg',quotaGroupId:id,quotaCost:1}]};
const snapshot={round,selection,products:[],quota:[]};
const h={current:snapshot,draft:{[id]:1},draftProducts:[],access:{mode:'readonly'},loading:false,busy:false,error:null,needsReload:false,dirty:false,setDraft(){},load(){},submit(){}};
function load(file){const out={};file=path.resolve(file);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,Date,URL,URLSearchParams,require(name){
 if(name==='react/jsx-runtime')return jsx;
 if(name==='react')return {useRef:v=>({current:v}),useEffect(){}};
 if(name.endsWith('.css'))return {default:{}};
 if(name==='@/components/UI')return {ActionLink:'ActionLink',Button:'Button',DataState:'DataState',Status:'Status'};
 if(name==='@/components/store/StorePrimitives')return {StorePageHeading:'StorePageHeading',StoreSection:'StoreSection'};
 if(name==='@/components/auth/AuthGate')return {AuthGate:'AuthGate'};
 if(name==='./useCsaServerClock')return {useCsaServerClock:()=>Date.parse(round.serverTime)};
 if(name==='./useCsaRoundSelection')return {useCsaRoundSelection:()=>h};
 let p=name.startsWith('@/')?path.resolve(root,'src',name.slice(2)):path.resolve(path.dirname(file),name);
 if(!fs.existsSync(p))p+=fs.existsSync(p+'.ts')?'.ts':'.tsx';
 return load(p);
}});return out;}
const nodes=t=>!t||typeof t!=='object'?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)];
test('delivered selections retain their status in the list and detail after round cancellation',()=>{
const {CsaRoundItem}=load(root+'/src/screens/account-csa/CsaRoundItem.tsx');
const item=CsaRoundItem({round,selection,eligible:true,loading:false,locale:'vi',onRetry(){}});
const itemStatus=nodes(item).find(n=>n.type==='Status').props;
assert.equal(itemStatus.label,'Đã giao');assert.equal(selection.state,'delivered');
const {CsaRoundSelectionPage}=load(root+'/src/screens/account-csa/CsaRoundSelectionPage.tsx');
const auth=CsaRoundSelectionPage({roundId:id,locale:'vi'}),inner=auth.props.children,screen=inner.type(inner.props);
const detailStatus=nodes(screen).find(n=>n.type==='Status').props;
assert.equal(detailStatus.label,'Đã giao');

});
