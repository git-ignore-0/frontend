import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const ts=createRequire(import.meta.url)('typescript');
const nodes=t=>!t||typeof t!=='object'?[]:[t,...[t.props?.children].flat(Infinity).flatMap(nodes)];
function harness(file,context,extra={}){
 let index=0;const states=[],deps=[];let effects=[];
 const react={useState(initial){const i=index++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef(v){const i=index++;return states[i]??={current:v}},useMemo(fn){index++;return fn()},useId(){index++;return 'id'},useSyncExternalStore(_s,get){index++;return get()},useEffect(fn,next){const i=index++;if(!deps[i]||next.some((v,n)=>v!==deps[i][n])){deps[i]=next;effects.push(fn)}}};
 const exports={},jsx=(type,props)=>({type,props});
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8')+(file.endsWith('AccountBenefits.tsx')?'\nexport {RewardsGifts};':'');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,window:{location:{origin:'https://example.test'},matchMedia:()=>({matches:false})},navigator:{},require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/state/NFVContext')return {useNFV:()=>context};if(name==='@/components/UI')return {Button:'Button'};if(name==='@/data/account-copy')return {copyText:(_l,k)=>k};return extra[name]??{}}});
 return {render(name,props){index=0;const tree=exports[name](props);const pending=effects;effects=[];pending.forEach(fn=>fn());return tree}};
}
function context(){const ctx={data:{rewards:{gifts:[]}},ui:{locale:'vi',giftIntent:{giftId:'gift',idempotencyKey:'same-intent',phase:'confirm'},busyKeys:[],visible:{}},patch:change=>{ctx.ui={...ctx.ui,...change}}};return ctx}
test('redeem overlay unmounts when hidden, retaining pending intent until mutation finishes',()=>{
 const ctx=context(),h=harness('src/screens/AccountBenefits.tsx',ctx);
 let tree=h.render('RewardsGifts',{active:true});assert.ok(nodes(tree).some(n=>n.type?.name==='GiftModal'));
 ctx.ui.busyKeys=['gift:redeem'];const key=ctx.ui.giftIntent.idempotencyKey;
 tree=h.render('RewardsGifts',{active:false});assert.ok(!nodes(tree).some(n=>n.type?.name==='GiftModal'));assert.equal(ctx.ui.giftIntent.idempotencyKey,key);
 ctx.ui.busyKeys=[];ctx.ui.giftIntent.phase='success';h.render('RewardsGifts',{active:false});assert.equal(ctx.ui.giftIntent,null);
 tree=h.render('RewardsGifts',{active:true});assert.ok(!nodes(tree).some(n=>n.type?.name==='GiftModal'));
});
test('share overlay closes on pane hide and stays closed when returning',()=>{
 const h=harness('src/components/account/ReferralShareDialog.tsx',context(),{'@/account/referral-share':{buildReferralUrl:()=>'/ref/code',messageWithReferralUrl:()=>'',buildReferralShareTargets:()=>({})}});
 const render=active=>h.render('ReferralShareDialog',{active,code:'ABCDEF2345',locale:'vi'});
 nodes(render(true)).find(n=>n.type==='Button'&&n.props?.onClick).props.onClick({currentTarget:{}});
 assert.ok(nodes(render(true)).some(n=>n.props?.className==='referral-share-dialog'));
 assert.ok(!nodes(render(false)).some(n=>n.props?.className==='referral-share-dialog'));
 assert.ok(!nodes(render(true)).some(n=>n.props?.className==='referral-share-dialog'));
});

test('hiding an ambiguous failed redemption retains its intent for an idempotent retry',()=>{
 const ctx=context(),h=harness('src/screens/AccountBenefits.tsx',ctx);ctx.ui.busyKeys=['gift:redeem'];
 h.render('RewardsGifts',{active:false});const key=ctx.ui.giftIntent.idempotencyKey;
 ctx.ui.busyKeys=[];ctx.ui.giftIntent={...ctx.ui.giftIntent,phase:'error'};h.render('RewardsGifts',{active:false});
 assert.equal(ctx.ui.giftIntent?.idempotencyKey,key);
 assert.ok(nodes(h.render('RewardsGifts',{active:true})).some(n=>n.type?.name==='GiftModal'));
});

test('a submitted intent survives hidden remount after busyKeys is reset by session refresh',()=>{
 const ctx=context();ctx.ui.giftIntent.phase='pending';ctx.ui.busyKeys=[];
 const h=harness('src/screens/AccountBenefits.tsx',ctx);h.render('RewardsGifts',{active:false});
 assert.equal(ctx.ui.giftIntent?.idempotencyKey,'same-intent');
 assert.ok(nodes(h.render('RewardsGifts',{active:true})).some(n=>n.type?.name==='GiftModal'));
});
