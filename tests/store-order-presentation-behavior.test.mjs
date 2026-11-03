import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url),ts=require("typescript"),root=new URL("../",import.meta.url);
const compile=path=>ts.transpileModule(readFileSync(new URL(path,root),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const jsx={jsx:(type,props)=>typeof type==="function"?type(props):({type,props}),jsxs:(type,props)=>typeof type==="function"?type(props):({type,props})};
const all=tree=>!tree||typeof tree!=="object"?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(all)];
const text=tree=>all(tree).flatMap(node=>[node.props?.children].flat(Infinity)).filter(value=>typeof value==="string").join(" ");
const line=(overrides={})=>({id:"l1",productId:"p1",sku:"P1",name:"Rau",unitSize:"1.000",unitLabel:"kg",unitPriceVnd:40000,quantity:3,quotaGroupId:null,quotaCost:0,quotaQuantity:0,quotaUnits:0,cashQuantity:3,cashSubtotalVnd:120000,...overrides});
const order=(overrides={})=>({id:"11111111-1111-4111-8111-111111111111",referenceCode:"SO-1",status:"payment_pending",paymentStatus:"unconfirmed",locale:"vi",lines:[line()],shippingAddress:{recipientName:"An",phoneNumber:"+84901234567",provinceCode:"66",wardCode:"22015",address:"Số 12"},subtotalVnd:120000,shippingFeeVnd:30000,shippingDiscountReason:null,totalVnd:150000,payment:{status:"unconfirmed",bankBin:"970436",bankName:"Vietcombank",accountNumber:"998877",accountName:"NFV",transferContent:"SO-1",qrPayload:{acqId:"970436",accountNo:"998877",accountName:"NFV",amount:150000,addInfo:"SO-1"},receivedAt:null,refundedAt:null,refundAmountVnd:null,refundNote:""},expiresAt:"2026-11-01T01:05:00Z",serverTime:"2026-11-01T01:00:00Z",transferReportedAt:null,approvedAt:null,deliveredAt:null,cancelledAt:null,cancellationReason:null,reconciliationNote:"",createdAt:"2026-11-01T01:00:00Z",updatedAt:"2026-11-01T01:00:00Z",...overrides});

function presentation(){const exports={};vm.runInNewContext(compile("src/store/store-order-presentation.ts"),{exports,URL,URLSearchParams,require:()=>({})});return exports}

test("order totals separate goods value, CSA benefit, cash subtotal, shipping and transfer total from snapshots",()=>{
  const {storeOrderTotals}=presentation();
  const fixtures=[
    {value:order(),want:{goodsValueVnd:120000,quotaValueVnd:0,cashSubtotalVnd:120000,shippingFeeVnd:30000,totalVnd:150000}},
    {value:order({lines:[line({quotaQuantity:2,quotaUnits:2,cashQuantity:1,cashSubtotalVnd:40000})],subtotalVnd:40000,totalVnd:70000}),want:{goodsValueVnd:120000,quotaValueVnd:80000,cashSubtotalVnd:40000,shippingFeeVnd:30000,totalVnd:70000}},
    {value:order({lines:[line({quantity:2,quotaQuantity:2,quotaUnits:2,cashQuantity:0,cashSubtotalVnd:0})],subtotalVnd:0,shippingFeeVnd:0,shippingDiscountReason:"active_csa_with_csa_product",totalVnd:0,payment:null,paymentStatus:"not_required"}),want:{goodsValueVnd:80000,quotaValueVnd:80000,cashSubtotalVnd:0,shippingFeeVnd:0,totalVnd:0}},
  ];
  for(const fixture of fixtures)assert.deepEqual(JSON.parse(JSON.stringify(storeOrderTotals(fixture.value))),fixture.want);
});

test("known cancellation codes are localized while admin and unknown reasons remain truthful",()=>{
  const {storeCancellationReason}=presentation();
  assert.equal(storeCancellationReason("expired","vi"),"Hết thời hạn thanh toán");
  assert.equal(storeCancellationReason("expired","en"),"Payment deadline expired");
  assert.equal(storeCancellationReason("buyer_cancelled","vi"),"Khách hàng đã hủy đơn");
  assert.equal(storeCancellationReason("buyer_cancelled","en"),"Cancelled by buyer");
  assert.equal(storeCancellationReason("Admin: không đủ hàng","vi"),"Admin: không đủ hàng");
  assert.equal(storeCancellationReason("future_code","en"),"future_code");
});

test("address presentation uses resolved locale names and falls back to snapshot codes",()=>{
  const {storeOrderAddressLine}=presentation(),address=order().shippingAddress;
  assert.equal(storeOrderAddressLine(address,{provinceName:"Đắk Lắk",wardName:"Phường Tuy Hoà"}),"Số 12, Phường Tuy Hoà, Đắk Lắk");
  assert.equal(storeOrderAddressLine(address,null),"Số 12, 22015, 66");
});

test("administrative resolver requests the active locale and falls back when a code is unknown",async()=>{
  const calls=[],exports={};
  vm.runInNewContext(compile("src/account/administrative-units-service.ts"),{exports,encodeURIComponent,require:name=>name==="./account-api.ts"?{AccountApiError:class extends Error{},accountApi:async(path,init)=>{calls.push({path,locale:init.headers["Accept-Language"]});return {data:path==="administrative-provinces"?[{code:"66",name:"Dak Lak"}]:[{code:"22015",name:"Tuy Hoa Ward"}]}}}:{}});
  assert.deepEqual(JSON.parse(JSON.stringify(await exports.resolveAdministrativeAddressNames("66","22015","en"))),{provinceName:"Dak Lak",wardName:"Tuy Hoa Ward"});
  assert.deepEqual(calls,[{path:"administrative-provinces",locale:"en"},{path:"administrative-wards?province=66",locale:"en"}]);
  assert.deepEqual(JSON.parse(JSON.stringify(await exports.resolveAdministrativeAddressNames("99","99999","vi"))),{provinceName:"99",wardName:"99999"});
});

function hooks(){let cursor=0,states=[];return {react:{useState(initial){const index=cursor++;if(!(index in states))states[index]=typeof initial==="function"?initial():initial;return [states[index],value=>{states[index]=typeof value==="function"?value(states[index]):value}]},useRef(initial){const index=cursor++;return states[index]??={current:initial}},useEffect(){cursor++}},render(component,props){cursor=0;return component(props)}}}

function detailModule(settings=null){
  const h=hooks(),presentationExports=(()=>{const value={};vm.runInNewContext(compile("src/store/store-order-presentation.ts"),{exports:value,URL,URLSearchParams,require:()=>({})});return value})(),exports={};
  const shared={},format={},primitives={};
  vm.runInNewContext(compile("src/components/store/StorePrimitives.tsx"),{exports:primitives,require:name=>name==="react/jsx-runtime"?jsx:{Icon:"Icon",MoneyLine:"MoneyLine"}});
  vm.runInNewContext(compile("src/store/store-format.ts"),{exports:format,require:()=>({})});
  vm.runInNewContext(compile("src/components/BankTransferPanel.tsx"),{exports:shared,require:name=>name==="@/state/NFVContext"?{useNFV:()=>({copyToClipboard:async()=>true})}:name==="react"?h.react:name==="react/jsx-runtime"?jsx:name==="@/components/UI"?{Icon:"Icon"}:{copyTextToClipboard:async()=>{}}});
  vm.runInNewContext(compile("src/screens/store/StoreOrderDetail.tsx"),{exports,URL,URLSearchParams,Date,crypto,window:{setInterval:()=>1,clearInterval(){}},require:name=>{
    if(name==="@/state/NFVContext")return {useNFV:()=>({copyToClipboard:async()=>true})};
    if(name==="@/components/store/StorePrimitives")return primitives;
    if(name==="@/components/BankTransferPanel")return shared;
    if(name==="@/store/store-format")return format;
    if(name==="@/store/use-buy-again")return {useBuyAgain:()=>({start(){},busy:null,error:""})};
    if(name==="react")return h.react;
    if(name==="react/jsx-runtime")return jsx;
    if(name==="@/store/use-store-session")return {useStoreSession:()=>task=>task()};
    if(name==="@/auth/AuthProvider")return {useAuth:()=>({status:"authenticated",session:{subject:"test-user"}})};
    if(name==="@/components/UI")return Object.fromEntries(["Button","DataState","Icon","MoneyLine","Photo"].map(value=>[value,value]));
    if(name==="@/lib/format")return {money:value=>`${value}đ`};
    if(name==="@/account/referral-share")return {copyTextToClipboard:async()=>{}};
    if(name==="@/store/store-order-service")return {getStoreOrder:async()=>{throw Error()},cancelStoreOrder:async()=>{throw Error()},reportStoreTransfer:async()=>{throw Error()}};
    if(name==="@/store/store-order-presentation")return presentationExports;
    if(name==="@/account/administrative-units-service")return {resolveAdministrativeAddressNames:async()=>({provinceName:"Đắk Lắk",wardName:"Phường Tuy Hoà"})};
    if(name==="@/hooks/useSiteSettings")return {useSiteSettings:()=>settings};
    if(name==="@/lib/contact-settings")return {contactPresentation:value=>value?{phone:"0901234567",phoneHref:"tel:0901234567",email:"hello@example.com"}:{phone:"",phoneHref:"",email:""}};
    return {};
  }});
  return {h,exports};
}

test("QR image failure has an explicit fallback while manual snapshot instructions remain available",()=>{
  const {h,exports}=detailModule(),props={url:"https://img.vietqr.io/qr.png",alt:"QR",locale:"vi"};
  let tree=h.render(exports.StorePaymentQr,props),image=all(tree).find(node=>node.type==="img");
  assert.ok(image);image.props.onError();tree=h.render(exports.StorePaymentQr,props);
  assert.match(text(tree),/Không thể tải mã QR/);
  const detailRuntime=detailModule(),detail=detailRuntime.h.render(detailRuntime.exports.StoreOrderDetail,{id:order().id,locale:"vi",initialOrder:order()});
  assert.match(text(detail),/998877/);
  assert.match(text(detail),/150000đ/);
  assert.match(text(detail),/SO-1/);
});

test("invalid backend payment payload is explained and not rendered as transfer instructions",()=>{
  const invalid=order({payment:{...order().payment,qrPayload:{...order().payment.qrPayload,amount:1}}}),{h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:invalid.id,locale:"vi",initialOrder:invalid});
  assert.match(text(tree),/Thông tin thanh toán không hợp lệ/);
  assert.doesNotMatch(text(tree),/998877/);
});

test("cancelled paid orders show reconciliation guidance and only configured contact links",()=>{
  const cancelled=order({status:"cancelled",cancelledAt:"2026-11-01T01:05:00Z",cancellationReason:"expired",expiresAt:null});
  for(const settings of [null,{enabled:true}]){
    const {h,exports}=detailModule(settings),tree=h.render(exports.StoreOrderDetail,{id:cancelled.id,locale:"vi",initialOrder:cancelled}),links=all(tree).filter(node=>node.type==="a");
    assert.match(text(tree),/Hết thời hạn thanh toán/);
    assert.match(text(tree),/đối soát/);
    assert.equal(links.some(node=>String(node.props.href).startsWith("tel:")),!!settings);
    assert.equal(links.some(node=>String(node.props.href).startsWith("mailto:")),!!settings);
  }
});

 test("cash-only order hides unused CSA and formats the product selling unit",()=>{
 const {h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:order().id,locale:"vi",initialOrder:order()});
 assert.doesNotMatch(text(tree),/Quyền lợi CSA|1\.000/);
 assert.ok(text(tree).includes("kg"));
 });

test("order sections follow status with integrated history, address, products, payment",()=>{
 const {h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:order().id,locale:"vi",initialOrder:order()});
 const headings=all(tree).filter(node=>node.type==="h2").map(node=>node.props.children);
 assert.deepEqual(headings,["Trạng thái đơn hàng","Giao đến","Sản phẩm","Thông tin chuyển khoản","Đơn hàng của bạn"]);
 const history=all(tree).find(node=>node.type==="ol"&&node.props["aria-label"]==="Lịch sử");
 assert.ok(history);
 const times=all(history).filter(node=>node.type==="time");
 assert.equal(times.length,1);
 assert.equal(times[0].props.dateTime,order().createdAt);
});

test("order history is collapsed by default with a native keyboard-accessible toggle",()=>{
 const {h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:order().id,locale:"vi",initialOrder:order()});
 const toggle=all(tree).find(node=>node.type==="details");
 assert.ok(toggle);
 assert.equal(toggle.props.open,undefined);
 assert.ok(all(toggle).some(node=>node.type==="summary"));
 assert.ok(all(toggle).some(node=>node.type==="ol"));
 assert.match(text(toggle),/Xem lịch sử/);
 assert.match(text(toggle),/Thu gọn/);
});


test("order shares the checkout recipient and totals layout and renders the API product image",()=>{
 const value=order({lines:[line({imageUrl:"https://example.com/rau.webp",quotaQuantity:2,quotaUnits:4,cashQuantity:1,cashSubtotalVnd:40000})],subtotalVnd:40000,totalVnd:70000});
 const {h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:value.id,locale:"vi",initialOrder:value});
 assert.ok(all(tree).some(n=>n.props?.className==="store-recipient-summary"));
 assert.ok(all(tree).some(n=>n.type==="Photo"&&n.props.src==="https://example.com/rau.webp"));
 const labels=all(tree).filter(n=>n.type==="MoneyLine").map(n=>n.props.label);
 assert.deepEqual(labels.slice(0,4),["Tiền hàng","Phí giao","CSA thanh toán","Tổng chuyển khoản"]);
 assert.ok(text(tree).includes("Dùng 4 điểm CSA"));
});


test("order breadcrumbs return to the entry source instead of the Store catalogue",()=>{
 for(const [returnTo,href,label] of [["csa","/account/vi?tab=csa#csa-points-history","Lịch sử điểm"],["orders","/account/vi?tab=orders","Đơn hàng của tôi"]]){
  const {h,exports}=detailModule(),tree=h.render(exports.StoreOrderDetail,{id:order().id,locale:"vi",initialOrder:order(),returnTo});
  const link=all(tree).find(node=>node.type==="a"&&node.props.href===href);
  assert.ok(link);assert.equal(link.props.children,label);
 }
});

test("order route restores the points origin after reload and only accepts known origins",async()=>{
 const exports={};vm.runInNewContext(compile("app/store/orders/[id]/[locale]/page.tsx"),{exports,require:name=>{
  if(name==="react/jsx-runtime")return jsx;
  if(name==="next/navigation")return {notFound:()=>{throw Error("404")}};
  if(name==="../../../../NFVApp")return {NFVApp:"NFVApp"};
  return {StoreOrderDetail:"StoreOrderDetail"};
 }});
 for(const [from,want] of [["csa","csa"],[undefined,"orders"],["https://example.com","orders"],[["csa"],"orders"]]){
  const tree=await exports.default({params:Promise.resolve({id:order().id,locale:"vi"}),searchParams:Promise.resolve({from})});
  assert.equal(all(tree).find(node=>node.type==="StoreOrderDetail").props.returnTo,want);
 }
});


test("admin-entered prototype property names remain literal cancellation reasons",()=>{
 const {storeCancellationReason}=presentation();
 for(const locale of ["vi","en"])for(const reason of ["__proto__","constructor","toString","hasOwnProperty"])assert.equal(storeCancellationReason(reason,locale),reason);
});
