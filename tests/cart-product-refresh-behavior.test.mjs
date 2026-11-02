import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript");
const root=new URL("../",import.meta.url);
const compile=path=>ts.transpileModule(readFileSync(new URL(path,root),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const product=(overrides={})=>({id:"11111111-1111-4111-8111-111111111111",slug:"rau",sku:"RAU",name:"Rau",alternate_name:null,short_description:"",description:"",retail_price_vnd:30000,available_quantity:3,unit_size:"1.000",unit_label:"kg",category:{id:"22222222-2222-4222-8222-222222222222",slug:"rau",name:"Rau"},primary_image:null,csa_quota_group:null,suppliers:[],requested_locale:"vi",content_locale:"vi",available_locales:["vi"],is_fallback:false,...overrides});
const envelope=value=>({data:value});

function loadCoordinator(fetcher,events){
  const storeModel={};vm.runInNewContext(compile("src/store/store-model.ts"),{exports:storeModel,URL,require:()=>({})});
  const exports={};vm.runInNewContext(compile("src/store/cart-product-refresh.ts"),{exports,AbortController,fetch:fetcher,require:name=>name==="./store-model"?storeModel:{}});
  return exports.createCartProductRefreshCoordinator({
    fetcher,
    onState:(id,state)=>events.push({type:"state",id,state}),
    onReady:(id,next,notice)=>events.push({type:"ready",id,product:next,notice}),
  });
}

test("cart refresh can recover from network error without removing cart-owned state",async()=>{
  const events=[],cart={p:2},applyCSA={p:true};let attempts=0;
  const coordinator=loadCoordinator(async()=>{attempts++;if(attempts===1)throw Error("offline");return new Response(JSON.stringify(envelope(product({retail_price_vnd:35000}))),{status:200})},events);
  await coordinator.refresh({id:"p",cached:product({id:"p"}),locale:"vi"});
  assert.deepEqual(events.map(event=>event.state),["loading","error"]);
  await coordinator.refresh({id:"p",cached:product({id:"p"}),locale:"vi"});
  assert.equal(events.at(-1).type,"ready");
  assert.equal(events.at(-1).notice,"price_changed");
  assert.deepEqual(cart,{p:2});
  assert.deepEqual(applyCSA,{p:true});
});

test("cart refresh distinguishes repeated errors and 404 unavailable responses",async()=>{
  for(const fixture of [
    {fetcher:async()=>{throw Error("offline")},expected:"error"},
    {fetcher:async()=>new Response("{}",{status:404}),expected:"unavailable"},
  ]){
    const events=[],coordinator=loadCoordinator(fixture.fetcher,events);
    await coordinator.refresh({id:"p",cached:product({id:"p"}),locale:"en"});
    assert.deepEqual(events.map(event=>event.state),["loading",fixture.expected]);
    assert.equal(events.some(event=>event.type==="ready"),false);
  }
});

test("successful retry reports stock changes for acknowledgement",async()=>{
  const events=[],coordinator=loadCoordinator(async()=>new Response(JSON.stringify(envelope(product({available_quantity:1}))),{status:200}),events);
  await coordinator.refresh({id:"p",cached:product({id:"p",available_quantity:3}),locale:"vi"});
  assert.equal(events.at(-1).type,"ready");
  assert.equal(events.at(-1).notice,"stock_changed");
  assert.equal(events.at(-1).product.available_quantity,1);
});

test("a stale refresh response cannot overwrite the latest retry",async()=>{
  const pending=[],events=[],coordinator=loadCoordinator((_url,{signal})=>new Promise(resolve=>pending.push({resolve,signal})),events);
  const first=coordinator.refresh({id:"p",cached:product({id:"p"}),locale:"vi"});
  const second=coordinator.refresh({id:"p",cached:product({id:"p"}),locale:"vi"});
  pending[1].resolve(new Response(JSON.stringify(envelope(product({retail_price_vnd:32000}))),{status:200}));await second;
  pending[0].resolve(new Response(JSON.stringify(envelope(product({retail_price_vnd:99000}))),{status:200}));await first;
  const ready=events.filter(event=>event.type==="ready");
  assert.equal(ready.length,1);
  assert.equal(ready[0].product.retail_price_vnd,32000);
  assert.equal(pending[0].signal.aborted,true);
});

test("cart drawer retry handler targets the failed row and keeps checkout blocked while loading",()=>{
  const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},calls=[];
  const all=tree=>!tree||typeof tree!=="object"?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(all)];
  const label=node=>[node.props?.children].flat(Infinity).filter(value=>typeof value==="string").join("");
  const exports={};
  vm.runInNewContext(compile("src/screens/Checkout.tsx"),{exports,URL,URLSearchParams,console,require:name=>{
    if(name==="react/jsx-runtime")return jsx;
    if(name==="@/state/NFVContext")return {useNFV:()=>({data:{storeProducts:{p:product({id:"p"}),other:product({id:"other",slug:"other"})}},ui:{locale:"vi",cartOpen:true,cart:{p:2,other:1},cartProductState:{p:"error",other:"ready"},cartProductNotice:{}},patch(){},updateCart(){},acknowledgeCartProduct(){},retryCartProduct:id=>calls.push(id),beginCheckout(){calls.push("checkout")}})};
    if(name==="@/components/UI")return Object.fromEntries(["Button","DataState","FormInput","FormSelect","Icon","MoneyLine","Photo","Quantity"].map(value=>[value,value]));
    if(name==="@/components/overlays/OverlayPrimitives")return {SideDrawer:"SideDrawer"};
    if(name==="@/store/store-format")return {formatUnitSize:value=>String(Number(value))};
    if(name==="@/lib/format")return {money:value=>String(value)};
    return {};
  }});
  const tree=exports.CartDrawer(),retry=all(tree).find(node=>node.type==="Button"&&/Thử lại|Tải lại/.test(label(node))),checkout=all(tree).find(node=>node.type==="Button"&&label(node).includes("Tiến hành đặt hàng"));
  assert.ok(retry);
  retry.props.onClick();
  assert.deepEqual(calls,["p"]);
  assert.equal(checkout.props.disabled,true);
});
