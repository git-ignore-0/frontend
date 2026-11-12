import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript");
const source=readFileSync(new URL("../src/screens/AccountOrders.tsx",import.meta.url),"utf8");
const jsx={jsx:(type,props)=>typeof type==="function"?type(props):({type,props}),jsxs:(type,props)=>typeof type==="function"?type(props):({type,props})};
const statuses=["payment_pending","pending_review","pending_delivery","delivered","cancelled"];
const all=tree=>!tree||typeof tree!=="object"?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(all)];
const label=node=>[node.props?.children].flat(Infinity).filter(value=>typeof value==="string").join("");
const order=(id,status="payment_pending")=>({id,referenceCode:id,status,paymentStatus:"unconfirmed",createdAt:"2026-10-31T00:00:00Z",totalVnd:100000,lines:[{id:"line-1",name:id,quantity:1,unitSize:"1.000",unitLabel:"kg",imageUrl:"https://example.com/produce.webp"}]});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function hookHarness(){
  let cursor=0,states=[],dependencies=[],effects=[],cleanups=[];
  const react={
    useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==="function"?initial():initial;return [states[index],value=>{states[index]=typeof value==="function"?value(states[index]):value}]},
    useRef(initial){const index=cursor++;if(!(index in states))states[index]={current:initial};return states[index]},
    useEffect(effect,next){const index=cursor++;const changed=!dependencies[index]||next.some((value,i)=>value!==dependencies[index][i]);if(changed){dependencies[index]=next;effects.push({index,effect})}},
  };
  return {react,render(component){cursor=0;return component()},flush(){const pending=effects;effects=[];for(const {index,effect} of pending){cleanups[index]?.();cleanups[index]=effect()}},dispose(){cleanups.forEach(cleanup=>cleanup?.())}};
}

function viewHarness(getStoreOrders,storage){
  const hooks=hookHarness(),exports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,console,Date,...(storage?{window:{sessionStorage:storage,addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false})},document:{visibilityState:"visible"}}:{}),require:name=>{
    if(name==="@/store/use-buy-again")return {useBuyAgain:()=>({start(){},busy:null,error:""})};
    if(name==="@/account/orders-view-state"){
      const view={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/account/orders-view-state.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:view,window:storage?{sessionStorage:storage}:undefined});return view;
    }
    if(name==="react")return hooks.react;
    if(name==="react/jsx-runtime")return jsx;
    if(name==="@/store/use-store-session")return {useStoreSession:()=>task=>task()};
    if(name==="@/auth/AuthProvider")return {useAuth:()=>({status:"authenticated",session:{subject:"test-user"}})};
    if(name==="@/components/account/ListPaginationFooter"){
      const footer={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/components/account/ListPaginationFooter.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:footer,require:id=>id==="react/jsx-runtime"?jsx:{Button:"Button"}});return footer;
    }
    if(name==="@/components/store/StorePrimitives")return {StoreSection:"StoreSection"};
    if(name==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi"},navigate(){}})};
    if(name==="@/store/store-order-service")return {getStoreOrders,currentLookupStoreOrder:async()=>{throw Error()},lookupStoreOrder:async()=>{throw Error()}};
    if(name==="@/screens/store/StoreOrderDetail")return {StoreOrderDetail:"StoreOrderDetail",STORE_STATUS:Object.fromEntries(statuses.map(value=>[value,{vi:value,en:value}])),PAYMENT_STATUS:{unconfirmed:{vi:"Chưa xác nhận",en:"Unconfirmed"}}};
    if(name==="@/components/UI")return {Button:"Button",DataState:"DataState",FormInput:"FormInput",Status:"Status",Photo:"Photo",Tabs:({items,value,onChange})=>jsx.jsxs("div",{children:items.map(item=>jsx.jsx("button",{children:item.label,onClick:()=>onChange(item.value),"aria-pressed":value===item.value}))})};
    if(name==="@/store/store-format")return {formatUnitSize:value=>String(Number(value))};
    if(name==="@/lib/format")return {money:value=>String(value)};
    if(name==="@/account/shipping-address-model")return {sanitizeVietnamPhoneInput:value=>value};
    if(name==="@/account/account-api")return {AccountApiError:class extends Error{}};
    return {};
  }});
  let tree;
  const render=()=>tree=hooks.render(exports.OrdersView);
  const settle=async()=>{hooks.flush();await tick();render()};
  const button=text=>all(tree).find(node=>(node.type==="button"||node.type==="Button")&&label(node)===text);
  const dataState=()=>all(tree).find(node=>node.type==="DataState");
  return {render,settle,button,dataState,get tree(){return tree},dispose:hooks.dispose};
}

test("clicking All again on page one preserves ready data and does not start a phantom request",async()=>{
  const calls=[],h=viewHarness(async input=>{calls.push(input);return {items:[],meta:{total:0}}});
  h.render();await h.settle();
  assert.equal(h.dataState().props.title,"Chưa có đơn hàng");
  h.button("Tất cả").props.onClick();
  h.render();h.hooks?.flush?.();await tick();h.render();
  assert.equal(h.dataState().props.title,"Chưa có đơn hàng");
  assert.equal(calls.length,1);
  h.dispose();
});

test("clicking the selected status again preserves the ready list without another request",async()=>{
  const calls=[],h=viewHarness(async input=>{calls.push({...input});return {items:[order(`page-${input.page}`,input.status)],meta:{total:60}}});
  h.render();await h.settle();
  h.button("pending_review").props.onClick();h.render();await h.settle();
  const afterSelect=calls.length;
  h.button("pending_review").props.onClick();h.render();await tick();h.render();
  assert.equal(calls.length,afterSelect);
  assert.equal(h.dataState(),undefined);
  assert.ok(all(h.tree).some(n=>n.props?.className==="store-order-id"&&label(n)==="page-1"));
  h.dispose();
});

test("changing status from page two resets the server query to page one",async()=>{
  const calls=[],h=viewHarness(async input=>{calls.push({...input});return {items:[order(`page-${input.page}`,input.status)],meta:{total:60}}});
  h.render();await h.settle();
  h.button("pending_review").props.onClick();h.render();await h.settle();
  h.button("Xem thêm 20 mục").props.onClick();h.render();await h.settle();
  assert.deepEqual(calls.at(-1),{page:2,status:"pending_review"});
  h.button("pending_delivery").props.onClick();h.render();await h.settle();
  assert.deepEqual(calls.at(-1),{page:1,status:"pending_delivery"});
  h.dispose();
});

test("failed order request exposes a retry that performs a new request",async()=>{
  let calls=0;
  const h=viewHarness(async()=>{calls++;if(calls===1)throw Error("offline");return {items:[],meta:{total:0}}});
  h.render();await h.settle();
  assert.equal(h.dataState().props.title,"Không thể tải đơn hàng");
  h.dataState().props.action.onClick();h.render();await tick();h.render();
  assert.equal(calls,2);
  assert.equal(h.dataState().props.title,"Chưa có đơn hàng");
  h.dispose();
});

test("an older page response cannot overwrite the newer filter response",async()=>{
  const pending=[];
  const h=viewHarness(input=>new Promise(resolve=>pending.push({input:{...input},resolve})));
  h.render();const initialSettling=h.settle();
  pending.shift().resolve({items:[order("initial")],meta:{total:60}});await initialSettling;
  h.button("Xem thêm 20 mục").props.onClick();h.render();const oldSettling=h.settle();
  const old=pending.shift();
  h.button("pending_review").props.onClick();h.render();const freshSettling=h.settle();
  const fresh=pending.shift();
  fresh.resolve({items:[order("fresh","pending_review")],meta:{total:1}});await freshSettling;
  old.resolve({items:[order("stale")],meta:{total:60}});await oldSettling;h.render();
  assert.ok(all(h.tree).some(n=>n.props?.className==="store-order-id"&&label(n)==="fresh"));
  assert.ok(!all(h.tree).some(n=>n.props?.className==="store-order-id"&&label(n)==="stale"));
  h.dispose();
});


test("order cards link to detail with identity, product preview and payment, without action buttons",async()=>{
 const h=viewHarness(async()=>({items:[order("SO-1","pending_review")],meta:{total:1}}));
 h.render();await h.settle();
 const card=all(h.tree).find(n=>n.type==="article");
 const link=all(card).find(n=>n.type==="a");
 assert.equal(link.props.href,"/store/orders/SO-1/vi");
 const sections=link.props.children;
 assert.deepEqual(Array.from(sections,n=>n.props.className),["store-order-top","store-order-body","store-order-footer"]);
 assert.equal(all(card).find(n=>n.type==="Photo").props.src,"https://example.com/produce.webp");
 assert.ok(all(card).some(n=>n.type==="span"&&[n.props.children].flat().join("")==="1 × 1 kg"));
 assert.equal(all(card).filter(n=>n.type==="Button").length,0);
 assert.equal(link.props["aria-label"],"Xem chi tiết SO-1");
 h.dispose();
});


test("load more appends orders, keeps the list visible and retries the failed page",async()=>{
 const calls=[];let fail=true;
 const h=viewHarness(async input=>{calls.push(input.page);if(input.page===2&&fail)throw Error("offline");return {items:[order(`page-${input.page}`)],meta:{total:60}}});
 h.render();await h.settle();
 h.button("Xem thêm 20 mục").props.onClick();h.render();await h.settle();
 assert.ok(all(h.tree).some(n=>n.type==="article"));
 assert.ok(h.button("Thử lại"));
 fail=false;h.button("Thử lại").props.onClick();h.render();await h.settle();
 assert.deepEqual(calls,[1,2,2]);
 assert.equal(all(h.tree).filter(n=>n.type==="article").length,2);
 h.dispose();
});

test("complete All data filters immediately without requests or a loading state",async()=>{
 const calls=[],h=viewHarness(async input=>{calls.push({...input});return {items:[order("pending","pending_review"),order("done","delivered")],meta:{total:2}}});
 h.render();await h.settle();
 h.button("pending_review").props.onClick();h.render();
 assert.equal(h.dataState(),undefined);
 assert.deepEqual(all(h.tree).filter(n=>n.props?.className==="store-order-id").map(label),["pending"]);
 await h.settle();assert.equal(calls.length,1);
 h.button("cancelled").props.onClick();h.render();await h.settle();
 assert.equal(h.dataState().props.title,"Chưa có đơn hàng");assert.equal(calls.length,1);
 h.button("Tất cả").props.onClick();h.render();await h.settle();
 assert.equal(all(h.tree).filter(n=>n.type==="article").length,2);assert.equal(calls.length,1);
 h.dispose();
});

test("partial All data fetches a new filter once and reuses both cached lists",async()=>{
 const calls=[],h=viewHarness(async input=>{calls.push({...input});return {items:[order(input.status??"all",input.status??"delivered")],meta:{total:60}}});
 h.render();await h.settle();
 h.button("pending_review").props.onClick();h.render();await h.settle();
 assert.equal(calls.length,2);
 h.button("Tất cả").props.onClick();h.render();assert.equal(h.dataState(),undefined);await h.settle();
 h.button("pending_review").props.onClick();h.render();assert.equal(h.dataState(),undefined);await h.settle();
 assert.equal(calls.length,2);
 h.dispose();
});

test('returning from detail restores the selected filter and reloads every previously loaded page',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const calls=[],get=async input=>{calls.push({...input});return {items:[order(`page-${input.page}`,input.status??'payment_pending')],meta:{total:60}}};
 let h=viewHarness(get,storage);h.render();await h.settle();h.button('pending_review').props.onClick();h.render();await h.settle();
 h.button('Xem thêm 20 mục').props.onClick();h.render();await h.settle();await h.settle();h.dispose();calls.length=0;
 h=viewHarness(get,storage);h.render();for(let i=0;i<5;i++)await h.settle();
 assert.deepEqual(calls,[{page:1,status:'pending_review'},{page:2,status:'pending_review'}]);
 assert.deepEqual(all(h.tree).filter(n=>n.props?.className==='store-order-id').map(label),['page-1','page-2']);h.dispose();
});
