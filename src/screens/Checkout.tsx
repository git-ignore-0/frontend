"use client";
import {useRef, useState, type FormEvent} from "react";
import {SideDrawer} from "@/components/overlays/OverlayPrimitives";
import {useWardOptions} from "@/hooks/useWardOptions";
import {Button,DataState,FormInput,FormSelect,Icon,MoneyLine,Photo,Quantity} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {digits,formatAddress,money,validPhone} from "@/lib/format";
import type {Locale,Recipient,Order} from "@/types";

const CHECKOUT_COPY={
 vi:{cart:"Giỏ đi chợ",closeCart:"Đóng giỏ hàng",perUnit:"đơn vị",csaEligible:"Có thể dùng CSA*",remove:"Xóa",goods:"Tiền hàng",checkout:"Tiến hành đặt hàng",continueShopping:"Tiếp tục mua sắm",emptyCart:"Chiếc giỏ đang trống",emptyCartBody:"Chọn nông sản để thêm vào giỏ hàng.",explore:"Khám phá nông sản",name:"Họ và tên *",namePlaceholder:"Họ tên người nhận",phone:"Số điện thoại *",province:"Tỉnh / thành phố *",chooseProvince:"Chọn tỉnh/thành phố",ward:"Xã / phường *",chooseProvinceFirst:"Chọn tỉnh/thành phố trước",loadingWards:"Đang tải xã/phường...",chooseWard:"Chọn xã/phường",invalidWard:"không còn hợp lệ",wardsError:"Không tải được danh sách xã/phường.",retry:"Thử lại",detail:"Địa chỉ cụ thể *",detailPlaceholder:"Số nhà, ngõ/ngách, đường, thôn/xóm",note:"Ghi chú (không bắt buộc)",notePlaceholder:"Lưu ý khi nhận hàng...",nameError:"Họ tên tối thiểu 2 ký tự.",phoneError:"Số điện thoại phải gồm 10 chữ số hợp lệ.",provinceError:"Hãy chọn tỉnh/thành phố.",wardError:"Hãy chọn xã/phường hợp lệ.",detailError:"Hãy nhập số nhà, ngõ/ngách hoặc địa chỉ cụ thể.",couponUnavailable:"Không kiểm tra được mã giảm giá.",coupon:"Mã giảm giá",discounted:"Đã giảm",removeCoupon:"Bỏ mã",couponPlaceholder:"Nhập mã giảm giá",apply:"Áp dụng",yourOrder:"Đơn hàng của bạn",useCsa:"Dùng quyền lợi CSA",discount:"Giảm giá",shipping:"Phí giao",unconfirmed:"Chưa xác nhận",provisionalTotal:"Tổng tiền hàng tạm tính",csaNotDeducted:"Chưa trừ quyền lợi CSA. Tổng thanh toán sẽ được backend xác nhận khi đặt hàng.",shippingExcluded:"Phí giao hàng chưa được tính vào số tiền trên.",backStore:"Về cửa hàng",store:"CỬA HÀNG",title:"Đặt nông sản",recipient:"Người nhận",reviewPayment:"Xác nhận & thanh toán",step:"Bước",nextReview:"Tiếp: Xác nhận & thanh toán",reviewBeforeOrder:"Kiểm tra trước khi đặt hàng",recipientInfo:"Thông tin người nhận",savedIntro:"Thông tin nhận hàng lấy từ tài khoản của bạn.",missingSavedIntro:"Chưa có địa chỉ đã lưu. Vui lòng bổ sung thông tin giao hàng.",guestIntro:"Nhập thông tin để nhận nông sản.",savedAddress:"Địa chỉ đã lưu",change:"Thay đổi",reuseSaved:"Dùng lại địa chỉ đã lưu",reviewIntro:"Kiểm tra thông tin trước khi đặt hàng.",edit:"Sửa",checkingWard:"Đang kiểm tra xã/phường của địa chỉ giao hàng...",wardCheckFailed:"Chưa kiểm tra được địa chỉ giao hàng.",fixRecipient:"Vui lòng sửa thông tin người nhận trước khi đặt hàng.",notePrefix:"Ghi chú",payment:"Thanh toán",paymentPending:"Phương thức thanh toán sẽ được hiển thị khi NFV kết nối hệ thống thanh toán.",navigation:"Điều hướng đặt hàng",backOrder:"Quay lại đơn",backCart:"Về giỏ hàng",next:"Tiếp tục",confirm:"Xác nhận & thanh toán"},
 en:{cart:"Shopping cart",closeCart:"Close cart",perUnit:"unit",csaEligible:"CSA eligible*",remove:"Remove",goods:"Goods",checkout:"Proceed to checkout",continueShopping:"Continue shopping",emptyCart:"Your cart is empty",emptyCartBody:"Choose farm products to add to your cart.",explore:"Explore products",name:"Full name *",namePlaceholder:"Recipient name",phone:"Phone number *",province:"Province / city *",chooseProvince:"Choose a province/city",ward:"Ward / commune *",chooseProvinceFirst:"Choose a province/city first",loadingWards:"Loading wards/communes...",chooseWard:"Choose a ward/commune",invalidWard:"no longer valid",wardsError:"The ward/commune list could not be loaded.",retry:"Try again",detail:"Detailed address *",detailPlaceholder:"House number, street, village or neighborhood",note:"Note (optional)",notePlaceholder:"Delivery instructions...",nameError:"The name must contain at least 2 characters.",phoneError:"Enter a valid 10-digit phone number.",provinceError:"Choose a province/city.",wardError:"Choose a valid ward/commune.",detailError:"Enter a house number, street or detailed address.",couponUnavailable:"The discount code could not be checked.",coupon:"Discount code",discounted:"Discount",removeCoupon:"Remove code",couponPlaceholder:"Enter discount code",apply:"Apply",yourOrder:"Your order",useCsa:"Use CSA benefit",discount:"Discount",shipping:"Delivery fee",unconfirmed:"Not confirmed",provisionalTotal:"Provisional goods total",csaNotDeducted:"CSA benefits have not been deducted. Backend will confirm the payment total when the order is placed.",shippingExcluded:"The delivery fee is not included in the amount above.",backStore:"Back to Store",store:"STORE",title:"Order farm products",recipient:"Recipient",reviewPayment:"Review & payment",step:"Step",nextReview:"Next: Review & payment",reviewBeforeOrder:"Review before placing your order",recipientInfo:"Recipient information",savedIntro:"Delivery information is taken from your account.",missingSavedIntro:"No saved address was found. Add delivery information to continue.",guestIntro:"Enter the information needed to receive your order.",savedAddress:"Saved address",change:"Change",reuseSaved:"Use saved address",reviewIntro:"Review the information before placing your order.",edit:"Edit",checkingWard:"Checking the ward/commune for this delivery address...",wardCheckFailed:"The delivery address could not be verified.",fixRecipient:"Update the recipient information before placing the order.",notePrefix:"Note",payment:"Payment",paymentPending:"Payment methods will appear when NFV connects the payment system.",navigation:"Order navigation",backOrder:"Back to order",backCart:"Back to cart",next:"Continue",confirm:"Confirm & pay"}
} satisfies Record<Locale,Record<string,string>>;

export function CartDrawer(){
 const {data,ui,patch,updateCart,beginCheckout}=useNFV();
 const copy=CHECKOUT_COPY[ui.locale];
 if(!ui.cartOpen)return null;
 const items=data.products.filter(p=>(ui.cart[p.id]||0)>0);
 const subtotal=items.reduce((n,p)=>n+p.price*ui.cart[p.id],0);
 return <SideDrawer title={`${copy.cart} (${Object.values(ui.cart).reduce((a,b)=>a+b,0)})`} closeLabel={copy.closeCart} onClose={()=>patch({cartOpen:false})} className="cart-overlay">
   {items.length?<><div className="drawer-body">
     {items.map(p=><div className="drawer-item" data-cart-row={p.id} key={p.id}><div className="drawer-thumb"><Photo src={p.image} alt={p.name} locale={ui.locale}/></div>
       <div><div className="flex" style={{alignItems:"start",gap:5}}><div className="grow"><div className="item-name">{p.name}</div><div className="item-meta">{p.unit} · {money(p.price)}/{copy.perUnit}</div>{p.csa&&<span className="status" style={{marginTop:5}}>{copy.csaEligible}</span>}</div>
       <button className="remove-link" onClick={()=>updateCart(p.id,-ui.cart[p.id])}>{copy.remove}</button></div>
       <div className="drawer-row-bottom"><Quantity id={p.name} min={0} count={ui.cart[p.id]} locale={ui.locale} onMinus={()=>updateCart(p.id,-1)} onPlus={()=>updateCart(p.id,1)}/><strong className="cart-line-total">{money(p.price*ui.cart[p.id])}</strong></div></div></div>)}
    </div><div className="drawer-foot"><MoneyLine label={copy.goods} value={money(subtotal)}/><Button className="grow" style={{width:"100%"}} onClick={beginCheckout}>{copy.checkout} <Icon name="arrow" size={17}/></Button>
      <Button variant="plain" style={{width:"100%",marginTop:4}} onClick={()=>patch({cartOpen:false})}>{copy.continueShopping}</Button></div></>:
    <div className="drawer-body cart-empty"><DataState icon="bag" title={copy.emptyCart} description={copy.emptyCartBody} action={{label:copy.explore,onClick:()=>patch({cartOpen:false})}}/></div>}
 </SideDrawer>;
}
function AddressFields({value,onChange}:{value:Recipient;onChange:(value:Recipient)=>void}){
 const {data,ui}=useNFV(),copy=CHECKOUT_COPY[ui.locale];
 const wardOptions=useWardOptions(value.city);
 const update=(key:keyof Recipient,v:string)=>onChange({...value,[key]:v,...(["city","ward","detail"].includes(key)?{address:formatAddress({...value,[key]:v})}:{})});
 return <div className="form-grid">
   <div><label className="label" htmlFor="receiverName">{copy.name}</label><FormInput id="receiverName" autoComplete="name" placeholder={copy.namePlaceholder} value={value.name} onChange={e=>update("name",e.target.value)} required/></div>
   <div><label className="label" htmlFor="receiverPhone">{copy.phone}</label><FormInput id="receiverPhone" type="tel" inputMode="numeric" autoComplete="tel" pattern="[0-9]*" minLength={10} maxLength={10} placeholder="09xxxxxxxx" value={value.phone} onChange={e=>update("phone",digits(e.target.value))} required/></div>
   <div><label className="label" htmlFor="receiverCity">{copy.province}</label><FormSelect id="receiverCity" value={value.city} required onChange={e=>{const city=e.target.value;onChange({...value,city,ward:"",address:formatAddress({...value,city,ward:""})});}}><option value="">{copy.chooseProvince}</option>{data.provinces.map(n=><option key={n} value={n}>{n}</option>)}</FormSelect></div>
   <div><label className="label" htmlFor="receiverWard">{copy.ward}</label><FormSelect id="receiverWard" value={value.ward} disabled={!value.city||wardOptions.loading||!wardOptions.options.length} required onChange={e=>update("ward",e.target.value)}><option value="">{!value.city?copy.chooseProvinceFirst:wardOptions.loading?copy.loadingWards:copy.chooseWard}</option>
      {value.ward&&!wardOptions.loading&&!wardOptions.options.includes(value.ward)&&<option value={value.ward} disabled>{value.ward} ({copy.invalidWard})</option>}
      {wardOptions.options.map(n=><option key={n}>{n}</option>)}</FormSelect>
      {wardOptions.error&&<div className="help-error" role="alert">{copy.wardsError} <Button small variant="outline" onClick={()=>void wardOptions.retry()}>{copy.retry}</Button></div>}</div>
   <div className="wide"><label className="label" htmlFor="receiverDetail">{copy.detail}</label><FormInput id="receiverDetail" maxLength={180} autoComplete="address-line1" placeholder={copy.detailPlaceholder} value={value.detail} required onChange={e=>update("detail",e.target.value)}/></div>
   <div className="wide"><label className="label" htmlFor="receiverNote">{copy.note}</label><textarea className="nfv-control" id="receiverNote" rows={3} placeholder={copy.notePlaceholder} value={value.note} onChange={e=>update("note",e.target.value)}/></div>
 </div>;
}
export function validateRecipient(value:Recipient,provinces:string[],wards:Record<string,string[]>,locale:Locale="vi"){
 const copy=CHECKOUT_COPY[locale];
 const errors:string[]=[];
 if(value.name.trim().length<2)errors.push(copy.nameError);
 if(!validPhone(value.phone))errors.push(copy.phoneError);
 if(!provinces.includes(value.city))errors.push(copy.provinceError);
 if(!(wards[value.city]||[]).includes(value.ward))errors.push(copy.wardError);
 if(value.detail.trim().length<3)errors.push(copy.detailError);
 return errors;
}
function Coupon(){
 const {data,ui,patch,call,act}=useNFV();const copy=CHECKOUT_COPY[ui.locale],items=data.products.filter(p=>ui.cart[p.id]>0);
 if(ui.checkoutStep!==1)return null;
 const apply=async(e:FormEvent)=>{
   e.preventDefault();const code=ui.couponDraft.trim().toUpperCase();if(!code)return;
   const result=await act("coupon:apply",()=>call<{valid:boolean;amount:number;message?:string}>("validateCoupon",{code,items:items.map(p=>({id:p.id,quantity:ui.cart[p.id]})),recipient:ui.recipient,useCSA:ui.applyCSA}));
   if(result?.valid===true&&Number.isFinite(Number(result.amount)))patch({couponCode:code,couponAmount:Math.max(0,Number(result.amount)),couponError:""});
   else patch({couponCode:"",couponAmount:0,couponError:result?.message||copy.couponUnavailable});
 };
 return <section className="nfv-coupon" id="couponField" aria-label={copy.coupon}><div className="nfv-coupon-head"><strong>{copy.coupon}</strong></div>
   {ui.couponCode?<div className="nfv-coupon-applied"><div className="nfv-coupon-applied-left"><span className="nfv-coupon-applied-code"><Icon name="check" size={14}/> {ui.couponCode}</span><span className="nfv-coupon-applied-caption">{copy.discounted} {money(ui.couponAmount)}</span></div><Button small variant="plain" disabled={ui.busyKeys.length>0} onClick={()=>patch({couponCode:"",couponAmount:0,couponDraft:"",couponError:""})}>{copy.removeCoupon}</Button></div>:
   <form className="nfv-coupon-row" onSubmit={apply} noValidate><FormInput id="couponInput" disabled={ui.busyKeys.length>0} aria-label={copy.coupon} placeholder={copy.couponPlaceholder} maxLength={24} autoComplete="off" value={ui.couponDraft} onChange={e=>patch({couponDraft:e.target.value.toUpperCase(),couponError:""})}/><Button type="submit" small variant="outline" loading={ui.busyKeys.includes("coupon:apply")} disabled={!ui.couponDraft.trim()||ui.busyKeys.length>0}>{copy.apply}</Button></form>}
   {ui.couponError&&<p className="nfv-coupon-error" role="alert">{ui.couponError}</p>}</section>;
}
function OrderSummary(){
 const {data,ui,patch}=useNFV();
 const copy=CHECKOUT_COPY[ui.locale];
 const items=data.products.filter(p=>ui.cart[p.id]>0);
 const subtotal=items.reduce((n,p)=>n+p.price*ui.cart[p.id],0);
 return <aside className="checkout-summary"><div className="flex" style={{justifyContent:"space-between",gap:10}}><h3>{copy.yourOrder}</h3></div>
   {items.map(p=><div className="order-mini" key={p.id}><span className="thumb"><Photo src={p.image} alt={p.name} locale={ui.locale}/></span>
     <div className="grow"><strong>{p.name}</strong><div className="muted">{ui.cart[p.id]} × {p.unit}</div>
       {ui.checkoutStep===1&&data.authenticated&&data.hasCSA&&p.csa&&<label className="csa-apply"><input type="checkbox" disabled={ui.busyKeys.length>0} checked={!!ui.applyCSA[p.id]} onChange={e=>patch({applyCSA:{...ui.applyCSA,[p.id]:e.target.checked},couponCode:"",couponAmount:0})}/>{copy.useCsa}</label>}</div>
     <strong className="sm">{money(p.price*ui.cart[p.id])}</strong></div>)}
   <hr className="summary-divider"/><Coupon/><MoneyLine label={copy.goods} value={money(subtotal)}/>
   {ui.couponAmount>0&&<div className="money-line nfv-coupon-discount"><span>{copy.discount} ({ui.couponCode})</span><strong>−{money(ui.couponAmount)}</strong></div>}
   <div className="money-line"><span>{copy.shipping}</span><strong className="muted" style={{fontSize:11}}>{copy.unconfirmed}</strong></div>
   <hr className="summary-divider"/><MoneyLine label={copy.provisionalTotal} value={money(Math.max(0,subtotal-ui.couponAmount))} large/>
   {Object.values(ui.applyCSA).some(Boolean)&&<p className="sm muted">{copy.csaNotDeducted}</p>}
   <p className="sm muted">{copy.shippingExcluded}</p></aside>;
}
export function Checkout(){
 const {data,ui,patch,navigate,setData,call,act}=useNFV();
 const copy=CHECKOUT_COPY[ui.locale];
 const [validation,setValidation]=useState<string[]>([]);
 const reviewRecipient=useRef<Recipient|null>(null);
 // Also load saved-address wards when checkout starts directly on step 2.
 const wardOptions=useWardOptions(ui.recipient.city);
 const recipientErrors=validateRecipient(ui.recipient,data.provinces,data.wards,ui.locale);
 const items=data.products.filter(p=>ui.cart[p.id]>0);
 if(!items.length)return <main className="main-content"><div className="container"><DataState title={copy.emptyCart} action={{label:copy.backStore,onClick:()=>navigate("store")}}/></div></main>;
 const saved=data.authenticated&&data.addresses.length>0&&!ui.checkoutEditRecipient;
 const next=()=>{
   const errors=recipientErrors;setValidation(errors);
   if(errors.length)return;
   reviewRecipient.current=null;
   patch({recipient:{...ui.recipient,address:formatAddress(ui.recipient)},checkoutStep:1,checkoutEditFromReview:false});
 };
 const submit=async()=>{
   if(ui.busyKeys.length>0)return;
   if(recipientErrors.length){
     setValidation(recipientErrors);
     patch({checkoutStep:0,checkoutEditRecipient:true,checkoutEditFromReview:false});
     return;
   }
   const result=await act("place-order",()=>call<Order>("placeOrder",{items:items.map(p=>({id:p.id,quantity:ui.cart[p.id]})),recipient:ui.recipient,couponCode:ui.couponCode||null,useCSA:ui.applyCSA}));
   if(!result?.id)return;
   setData(s=>({...s,orders:[result,...s.orders]}));
   patch({cart:{},applyCSA:{},couponCode:"",couponAmount:0,accountTab:"orders",accountHubOpen:false});
   navigate("account",{tab:"orders",hub:false});
 };
 return <main className="main-content"><div className="container"><div className="checkout-top"><span className="eyebrow">{copy.store}</span><h1>{copy.title}</h1></div>
   <div className="checkout-steps">{[copy.recipient,copy.reviewPayment].map((name,i)=><div className={`step-pill ${ui.checkoutStep===i?"active":ui.checkoutStep>i?"done":""}`} key={i}>{i>0&&<span className="step-divider"/>}<span className="step-num">{ui.checkoutStep>i?<Icon name="check" size={12}/>:i+1}</span>{name}</div>)}</div>
   <div className="checkout-mobile-progress" aria-label={`${copy.step} ${ui.checkoutStep+1}/2`}><div className="checkout-mobile-label"><strong>{copy.step} {ui.checkoutStep+1}/2 · {ui.checkoutStep===0?copy.recipient:copy.reviewPayment}</strong><span>{ui.checkoutStep===0?copy.nextReview:copy.reviewBeforeOrder}</span></div><div className="checkout-mobile-track"><span style={{width:`${(ui.checkoutStep+1)*50}%`}}/></div></div>
   <div className="checkout-layout checkout-flow-layout"><div className="checkout-flow-main">{ui.checkoutStep===0?
     <div className="box"><h2>{copy.recipientInfo}</h2><p className="box-intro">{saved?copy.savedIntro:data.authenticated?copy.missingSavedIntro:copy.guestIntro}</p>
       {saved?<div className="checkout-recipient-saved"><div className="checkout-recipient-heading"><span className="status neutral"><Icon name="check" size={12}/> {copy.savedAddress}</span><Button small variant="outline" onClick={()=>patch({checkoutEditRecipient:true})}>{copy.change}</Button></div><strong>{ui.recipient.name}</strong><div className="sm">{ui.recipient.phone}</div><p>{ui.recipient.address}</p></div>:
       <form id="receiverForm" onSubmit={e=>{e.preventDefault();next();}}><AddressFields value={ui.recipient} onChange={recipient=>{patch({recipient,couponCode:"",couponAmount:0,couponError:""});setValidation([]);}}/>
       {data.authenticated&&data.addresses[0]&&<Button variant="plain" small onClick={()=>{patch({recipient:{...ui.recipient,...data.addresses[0],address:formatAddress(data.addresses[0])},checkoutEditRecipient:false,couponCode:"",couponAmount:0,couponError:""});setValidation([]);}}>{copy.reuseSaved}</Button>}</form>}
       {validation.length>0&&<div className="callout" role="alert" style={{color:"#963d32",borderColor:"#e0bab3",background:"#fcf2f0",marginTop:14}}>{validation.map((x,i)=><div key={i}>{x}</div>)}</div>}</div>:
     <div className="box"><h2>{copy.reviewPayment}</h2><p className="box-intro">{copy.reviewIntro}</p>
       <div className="nfv-review-address-head"><h3>{copy.recipientInfo}</h3><Button small variant="outline" disabled={ui.busyKeys.length>0} onClick={()=>{reviewRecipient.current={...ui.recipient};patch({checkoutStep:0,checkoutEditRecipient:true,checkoutEditFromReview:true});}}>{copy.edit}</Button></div>
       {wardOptions.loading&&<div className="callout" role="status">{copy.checkingWard}</div>}
       {wardOptions.error&&<div className="callout" role="alert">{copy.wardCheckFailed} <Button small variant="outline" onClick={()=>void wardOptions.retry()}>{copy.retry}</Button></div>}
       {!wardOptions.loading&&!wardOptions.error&&recipientErrors.length>0&&<div className="callout" role="alert">{recipientErrors.join(" ")} {copy.fixRecipient}</div>}
       <div className="sm">{ui.recipient.name} · {ui.recipient.phone}<br/>{ui.recipient.address}</div>{ui.recipient.note&&<div className="sm muted">{copy.notePrefix}: {ui.recipient.note}</div>}
       <hr className="summary-divider"/><h3 style={{marginBottom:6}}>{copy.payment}</h3><div className="callout">{copy.paymentPending}</div></div>}</div>
      <OrderSummary/><nav className="checkout-flow-actions" aria-label={copy.navigation}>
        <Button variant="outline" disabled={ui.busyKeys.length>0} onClick={()=>{
          if(ui.checkoutStep===0&&ui.checkoutEditFromReview){
            // Cancel means discard edits, never return to review with an invalid draft.
            patch({recipient:reviewRecipient.current??ui.recipient,checkoutStep:1,checkoutEditRecipient:false,checkoutEditFromReview:false});
            reviewRecipient.current=null;
            setValidation([]);
          }else{navigate("store");patch({cartOpen:true});}
        }}> <Icon name="back" size={16}/> {ui.checkoutStep===0&&ui.checkoutEditFromReview?copy.backOrder:copy.backCart}</Button>
        {ui.checkoutStep===0?<Button onClick={next} disabled={ui.busyKeys.length>0||wardOptions.loading}><span>{copy.next}</span> <Icon name="arrow" size={16}/></Button>:
         <Button onClick={submit} disabled={ui.busyKeys.length>0||wardOptions.loading} loading={ui.busyKeys.includes("place-order")}><Icon name="check" size={16}/> {copy.confirm}</Button>}
      </nav></div>
   {ui.error&&<div className="callout" role="alert" style={{color:"#963d32",marginTop:12}}>{ui.error}</div>}
 </div></main>;
}
