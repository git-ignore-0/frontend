import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
const require=createRequire(import.meta.url),ts=require('typescript'),root=resolve(new URL('..',import.meta.url).pathname);
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
function load(file,stubs={},globals={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URLSearchParams,URL,...globals,require(name){if(name in stubs)return stubs[name];if(name==='react/jsx-runtime')return jsx;if(name.startsWith('@/')||name.startsWith('.')){let path=name.startsWith('@/')?resolve(root,'src',name.slice(2)):resolve(dirname(resolve(root,file)),name);if(!existsSync(path))path+=existsSync(path+'.ts')?'.ts':'.tsx';return load(path,stubs,globals)}return require(name)}});return exports}
function browser(){const location={pathname:'/account/vi',search:'?tab=profile',hash:''},entries=['/account/vi?tab=profile'];let index=0;
 const apply=href=>{const url=new URL(href,'https://example.test');Object.assign(location,{pathname:url.pathname,search:url.search,hash:url.hash})};
 const history={state:{next:'preserved'},pushState(state,_,href){this.state=state;entries.splice(++index);entries.push(href);apply(href)},replaceState(state,_,href){this.state=state;entries[index]=href;apply(href)}};
 return {location,history,back(){apply(entries[--index])},forward(){apply(entries[++index])},entries};
}
test('Account tab history restores both tab and mobile hub without replacing the document',()=>{
 const {syncAccountRoute,accountRouteState}=load('src/lib/account-navigation.ts');const b=browser();
 syncAccountRoute(b,'vi','csa');assert.equal(b.location.search,'?tab=csa');assert.equal(b.history.state.next,'preserved');
 syncAccountRoute(b,'vi',null);assert.equal(b.location.search,'');assert.equal(accountRouteState(b.location).accountHubOpen,true);
 b.back();assert.equal(accountRouteState(b.location).accountTab,'csa');assert.equal(accountRouteState(b.location).accountHubOpen,false);
 b.back();assert.equal(accountRouteState(b.location).accountTab,'profile');b.forward();assert.equal(accountRouteState(b.location).accountTab,'csa');
 const count=b.entries.length;syncAccountRoute(b,'vi','csa');assert.equal(b.entries.length,count);
 assert.equal(accountRouteState({pathname:'/store/vi',search:''}),null);
 for(const search of ['?tab=bad','?tab=csa&tab=profile'])assert.equal(accountRouteState({pathname:'/account/vi',search}).accountHubOpen,true);
});
test('actual Account tab click updates the URL used by refresh and locale navigation',()=>{
 const b=browser(),context={ui:{locale:'vi',accountTab:'profile',accountHubOpen:false,accountFetchState:{}},accountSessionKey:'m',refreshResource:async()=>{},patch:change=>Object.assign(context.ui,change)};
 let index=0;const states=[];const react={useEffect(){},useRef:v=>({current:v}),useState(v){const i=index++;if(!(i in states))states[i]=typeof v==='function'?v():v;return [states[i],n=>states[i]=typeof n==='function'?n(states[i]):n]}};
 const {Account}=load('src/screens/Account.tsx',{react,'@/state/NFVContext':{useNFV:()=>context},'@/auth/AuthProvider':{useAuth:()=>({status:'authenticated',session:{subject:'m'}})},'@/data/account-copy':{copyText:(_,k)=>k},'@/components/UI':{Icon:'Icon',Section:'Section'},'@/screens/AccountOrders':{OrdersView:'Orders'},'@/screens/AccountProfile':{ProfileView:'Profile',AddressView:'Address'},'@/screens/AccountBenefits':{BenefitsView:'Benefits'},'@/components/auth/LogoutButton':{LogoutButton:'Logout'},'@/components/auth/GuestAuthActions':{}},{window:b});
 const nodes=t=>!t||typeof t!=='object'?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)];
 const tree=Account();nodes(tree).find(n=>n.type==='button'&&n.props.className?.startsWith('account-link')&&JSON.stringify(n.props.children).includes('nav.csa')).props.onClick();
 assert.equal(context.ui.accountTab,'csa');assert.equal(b.location.search,'?tab=csa');
 const {syncLocaleRoute}=load('src/lib/browser-navigation.ts');let target;b.location.replace=href=>{target=href};syncLocaleRoute(b,'en');assert.equal(target,'/account/en?tab=csa');
});
