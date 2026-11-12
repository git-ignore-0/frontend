import test from 'node:test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),__dirname=fileURLToPath(new URL('.',import.meta.url));
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const id='11111111-1111-4111-8111-111111111111';
const round={id,sequence:1,name:'Round',status:'open',opensAt:'2026-11-01T00:00:00Z',closesAt:'2026-11-03T00:00:00Z',deliveryAt:'2026-11-04T00:00:00Z',serverTime:'2026-11-02T00:00:00Z',cancellationReason:null};
const products=Array.from({length:101},(_,i)=>({id:`${(i+1).toString(16).padStart(8,'0')}-1111-4111-8111-111111111111`,name:'Produce'+i,unitSize:'1',unitLabel:'kg',availableQuantity:100,quotaGroupId:id,quotaGroupName:'Vegetables',quotaCost:1,imageUrl:null}));
const snapshot={round,selection:null,products,quota:[{groupId:id,availableUnits:200}]};
const h={current:snapshot,draft:Object.fromEntries(products.map(p=>[p.id,1])),draftProducts:products,access:{mode:'select'},loading:false,busy:false,error:null,needsReload:false,dirty:true,setDraft(){},load(){},submit(){}};
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
test('more than 100 distinct products cannot be saved',()=>{
const {CsaRoundSelectionPage}=load(root+'/src/screens/account-csa/CsaRoundSelectionPage.tsx');
const auth=CsaRoundSelectionPage({roundId:id,locale:'vi'}),inner=auth.props.children,screen=inner.type(inner.props);
const save=nodes(screen).find(n=>n.type==='Button'&&n.props.children==='Lưu lựa chọn');
assert.equal(save.props.disabled,true);
 delete h.draft[products[100].id];
 const validAuth=CsaRoundSelectionPage({roundId:id,locale:'vi'}),validInner=validAuth.props.children,validScreen=validInner.type(validInner.props);
 assert.equal(nodes(validScreen).find(n=>n.type==='Button'&&n.props.children==='Lưu lựa chọn').props.disabled,false);

});
