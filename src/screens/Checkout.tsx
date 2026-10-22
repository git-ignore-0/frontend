"use client";
import {useRef, useState, type FormEvent} from "react";
import {SideDrawer} from "@/components/overlays/OverlayPrimitives";
import {useWardOptions} from "@/hooks/useWardOptions";
import {Button,DataState,FormInput,FormSelect,Icon,MoneyLine,Photo,Quantity} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {digits,formatAddress,money,validPhone} from "@/lib/format";
import type {Recipient,Order} from "@/types";

export function CartDrawer(){
 const {data,ui,patch,updateCart,beginCheckout}=useNFV();
 if(!ui.cartOpen)return null;
 const items=data.products.filter(p=>(ui.cart[p.id]||0)>0);
 const subtotal=items.reduce((n,p)=>n+p.price*ui.cart[p.id],0);
 return <SideDrawer title={`Giỏ đi chợ (${Object.values(ui.cart).reduce((a,b)=>a+b,0)})`} closeLabel="Đóng giỏ hàng" onClose={()=>patch({cartOpen:false})} className="cart-overlay">
   {items.length?<><div className="drawer-body">
     {items.map(p=><div className="drawer-item" data-cart-row={p.id} key={p.id}><div className="drawer-thumb"><Photo src={p.image} alt={p.name}/></div>
       <div><div className="flex" style={{alignItems:"start",gap:5}}><div className="grow"><div className="item-name">{p.name}</div><div className="item-meta">{p.unit} · {money(p.price)}/đơn vị</div>{p.csa&&<span className="status" style={{marginTop:5}}>Có thể dùng CSA*</span>}</div>
       <button className="remove-link" onClick={()=>updateCart(p.id,-ui.cart[p.id])}>Xóa</button></div>
       <div className="drawer-row-bottom"><Quantity id={p.name} min={0} count={ui.cart[p.id]} onMinus={()=>updateCart(p.id,-1)} onPlus={()=>updateCart(p.id,1)}/><strong className="cart-line-total">{money(p.price*ui.cart[p.id])}</strong></div></div></div>)}
    </div><div className="drawer-foot"><MoneyLine label="Tiền hàng" value={money(subtotal)}/><Button className="grow" style={{width:"100%"}} onClick={beginCheckout}>Tiến hành đặt hàng <Icon name="arrow" size={17}/></Button>
      <Button variant="plain" style={{width:"100%",marginTop:4}} onClick={()=>patch({cartOpen:false})}>Tiếp tục mua sắm</Button></div></>:
    <div className="drawer-body cart-empty"><DataState icon="bag" title="Chiếc giỏ đang trống" description="Chọn nông sản để thêm vào giỏ hàng." action={{label:"Khám phá nông sản",onClick:()=>patch({cartOpen:false})}}/></div>}
 </SideDrawer>;
}
function AddressFields({value,onChange}:{value:Recipient;onChange:(value:Recipient)=>void}){
 const {data}=useNFV();
 const wardOptions=useWardOptions(value.city);
 const update=(key:keyof Recipient,v:string)=>onChange({...value,[key]:v,...(["city","ward","detail"].includes(key)?{address:formatAddress({...value,[key]:v})}:{})});
 return <div className="form-grid">
   <div><label className="label" htmlFor="receiverName">Họ và tên *</label><FormInput id="receiverName" autoComplete="name" placeholder="Họ tên người nhận" value={value.name} onChange={e=>update("name",e.target.value)} required/></div>
   <div><label className="label" htmlFor="receiverPhone">Số điện thoại *</label><FormInput id="receiverPhone" type="tel" inputMode="numeric" autoComplete="tel" pattern="[0-9]*" minLength={10} maxLength={10} placeholder="09xxxxxxxx" value={value.phone} onChange={e=>update("phone",digits(e.target.value))} required/></div>
   <div><label className="label" htmlFor="receiverCity">Tỉnh / thành phố *</label><FormSelect id="receiverCity" value={value.city} required onChange={e=>{const city=e.target.value;onChange({...value,city,ward:"",address:formatAddress({...value,city,ward:""})});}}><option value="">Chọn tỉnh/thành phố</option>{data.provinces.map(n=><option key={n} value={n}>{n}</option>)}</FormSelect></div>
   <div><label className="label" htmlFor="receiverWard">Xã / phường *</label><FormSelect id="receiverWard" value={value.ward} disabled={!value.city||wardOptions.loading||!wardOptions.options.length} required onChange={e=>update("ward",e.target.value)}><option value="">{!value.city?"Chọn tỉnh/thành phố trước":wardOptions.loading?"Đang tải xã/phường...":"Chọn xã/phường"}</option>
      {value.ward&&!wardOptions.loading&&!wardOptions.options.includes(value.ward)&&<option value={value.ward} disabled>{value.ward} (không còn hợp lệ)</option>}
      {wardOptions.options.map(n=><option key={n}>{n}</option>)}</FormSelect>
      {wardOptions.error&&<div className="help-error" role="alert">Không tải được danh sách xã/phường. <Button small variant="outline" onClick={()=>void wardOptions.retry()}>Thử lại</Button></div>}</div>
   <div className="wide"><label className="label" htmlFor="receiverDetail">Địa chỉ cụ thể *</label><FormInput id="receiverDetail" maxLength={180} autoComplete="address-line1" placeholder="Số nhà, ngõ/ngách, đường, thôn/xóm" value={value.detail} required onChange={e=>update("detail",e.target.value)}/></div>
   <div className="wide"><label className="label" htmlFor="receiverNote">Ghi chú (không bắt buộc)</label><textarea className="nfv-control" id="receiverNote" rows={3} placeholder="Lưu ý khi nhận hàng..." value={value.note} onChange={e=>update("note",e.target.value)}/></div>
 </div>;
}
export function validateRecipient(value:Recipient,provinces:string[],wards:Record<string,string[]>){
 const errors:string[]=[];
 if(value.name.trim().length<2)errors.push("Họ tên tối thiểu 2 ký tự.");
 if(!validPhone(value.phone))errors.push("Số điện thoại phải gồm 10 chữ số hợp lệ.");
 if(!provinces.includes(value.city))errors.push("Hãy chọn tỉnh/thành phố.");
 if(!(wards[value.city]||[]).includes(value.ward))errors.push("Hãy chọn xã/phường hợp lệ.");
 if(value.detail.trim().length<3)errors.push("Hãy nhập số nhà, ngõ/ngách hoặc địa chỉ cụ thể.");
 return errors;
}
function Coupon(){
 const {data,ui,patch,call,act}=useNFV();const items=data.products.filter(p=>ui.cart[p.id]>0);
 if(ui.checkoutStep!==1)return null;
 const apply=async(e:FormEvent)=>{
   e.preventDefault();const code=ui.couponDraft.trim().toUpperCase();if(!code)return;
   const result=await act("coupon:apply",()=>call<{valid:boolean;amount:number;message?:string}>("validateCoupon",{code,items:items.map(p=>({id:p.id,quantity:ui.cart[p.id]})),recipient:ui.recipient,useCSA:ui.applyCSA}));
   if(result?.valid===true&&Number.isFinite(Number(result.amount)))patch({couponCode:code,couponAmount:Math.max(0,Number(result.amount)),couponError:""});
   else patch({couponCode:"",couponAmount:0,couponError:result?.message||"Không kiểm tra được mã giảm giá."});
 };
 return <section className="nfv-coupon" id="couponField" aria-label="Mã giảm giá"><div className="nfv-coupon-head"><strong>Mã giảm giá</strong></div>
   {ui.couponCode?<div className="nfv-coupon-applied"><div className="nfv-coupon-applied-left"><span className="nfv-coupon-applied-code"><Icon name="check" size={14}/> {ui.couponCode}</span><span className="nfv-coupon-applied-caption">Đã giảm {money(ui.couponAmount)}</span></div><Button small variant="plain" disabled={ui.busyKeys.length>0} onClick={()=>patch({couponCode:"",couponAmount:0,couponDraft:"",couponError:""})}>Bỏ mã</Button></div>:
   <form className="nfv-coupon-row" onSubmit={apply} noValidate><FormInput id="couponInput" disabled={ui.busyKeys.length>0} aria-label="Mã giảm giá" placeholder="Nhập mã giảm giá" maxLength={24} autoComplete="off" value={ui.couponDraft} onChange={e=>patch({couponDraft:e.target.value.toUpperCase(),couponError:""})}/><Button type="submit" small variant="outline" loading={ui.busyKeys.includes("coupon:apply")} disabled={!ui.couponDraft.trim()||ui.busyKeys.length>0}>Áp dụng</Button></form>}
   {ui.couponError&&<p className="nfv-coupon-error" role="alert">{ui.couponError}</p>}</section>;
}
function OrderSummary(){
 const {data,ui,patch}=useNFV();
 const items=data.products.filter(p=>ui.cart[p.id]>0);
 const subtotal=items.reduce((n,p)=>n+p.price*ui.cart[p.id],0);
 return <aside className="checkout-summary"><div className="flex" style={{justifyContent:"space-between",gap:10}}><h3>Đơn hàng của bạn</h3></div>
   {items.map(p=><div className="order-mini" key={p.id}><span className="thumb"><Photo src={p.image} alt={p.name}/></span>
     <div className="grow"><strong>{p.name}</strong><div className="muted">{ui.cart[p.id]} × {p.unit}</div>
       {ui.checkoutStep===1&&data.authenticated&&data.hasCSA&&p.csa&&<label className="csa-apply"><input type="checkbox" disabled={ui.busyKeys.length>0} checked={!!ui.applyCSA[p.id]} onChange={e=>patch({applyCSA:{...ui.applyCSA,[p.id]:e.target.checked},couponCode:"",couponAmount:0})}/>Dùng quyền lợi CSA</label>}</div>
     <strong className="sm">{money(p.price*ui.cart[p.id])}</strong></div>)}
   <hr className="summary-divider"/><Coupon/><MoneyLine label="Tiền hàng" value={money(subtotal)}/>
   {ui.couponAmount>0&&<div className="money-line nfv-coupon-discount"><span>Giảm giá ({ui.couponCode})</span><strong>−{money(ui.couponAmount)}</strong></div>}
   <div className="money-line"><span>Phí giao</span><strong className="muted" style={{fontSize:11}}>Chưa xác nhận</strong></div>
   <hr className="summary-divider"/><MoneyLine label="Tổng tiền hàng tạm tính" value={money(Math.max(0,subtotal-ui.couponAmount))} large/>
   {Object.values(ui.applyCSA).some(Boolean)&&<p className="sm muted">Chưa trừ quyền lợi CSA. Tổng thanh toán sẽ được backend xác nhận khi đặt hàng.</p>}
   <p className="sm muted">Phí giao hàng chưa được tính vào số tiền trên.</p></aside>;
}
export function Checkout(){
 const {data,ui,patch,navigate,setData,call,act}=useNFV();
 const [validation,setValidation]=useState<string[]>([]);
 const reviewRecipient=useRef<Recipient|null>(null);
 // Also load saved-address wards when checkout starts directly on step 2.
 const wardOptions=useWardOptions(ui.recipient.city);
 const recipientErrors=validateRecipient(ui.recipient,data.provinces,data.wards);
 const items=data.products.filter(p=>ui.cart[p.id]>0);
 if(!items.length)return <main className="main-content"><div className="container"><DataState title="Chiếc giỏ đang trống" action={{label:"Về cửa hàng",onClick:()=>navigate("store")}}/></div></main>;
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
 return <main className="main-content"><div className="container"><div className="checkout-top"><span className="eyebrow">CỬA HÀNG</span><h1>Đặt nông sản</h1></div>
   <div className="checkout-steps">{["Người nhận","Xác nhận & thanh toán"].map((name,i)=><div className={`step-pill ${ui.checkoutStep===i?"active":ui.checkoutStep>i?"done":""}`} key={i}>{i>0&&<span className="step-divider"/>}<span className="step-num">{ui.checkoutStep>i?<Icon name="check" size={12}/>:i+1}</span>{name}</div>)}</div>
   <div className="checkout-mobile-progress" aria-label={`Bước ${ui.checkoutStep+1} trên 2`}><div className="checkout-mobile-label"><strong>Bước {ui.checkoutStep+1}/2 · {ui.checkoutStep===0?"Người nhận":"Xác nhận & thanh toán"}</strong><span>{ui.checkoutStep===0?"Tiếp: Xác nhận & thanh toán":"Kiểm tra trước khi đặt hàng"}</span></div><div className="checkout-mobile-track"><span style={{width:`${(ui.checkoutStep+1)*50}%`}}/></div></div>
   <div className="checkout-layout checkout-flow-layout"><div className="checkout-flow-main">{ui.checkoutStep===0?
     <div className="box"><h2>Thông tin người nhận</h2><p className="box-intro">{saved?"Thông tin nhận hàng lấy từ tài khoản của bạn.":data.authenticated?"Chưa có địa chỉ đã lưu. Vui lòng bổ sung thông tin giao hàng.":"Nhập thông tin để nhận nông sản."}</p>
       {saved?<div className="checkout-recipient-saved"><div className="checkout-recipient-heading"><span className="status neutral"><Icon name="check" size={12}/> Địa chỉ đã lưu</span><Button small variant="outline" onClick={()=>patch({checkoutEditRecipient:true})}>Thay đổi</Button></div><strong>{ui.recipient.name}</strong><div className="sm">{ui.recipient.phone}</div><p>{ui.recipient.address}</p></div>:
       <form id="receiverForm" onSubmit={e=>{e.preventDefault();next();}}><AddressFields value={ui.recipient} onChange={recipient=>{patch({recipient,couponCode:"",couponAmount:0,couponError:""});setValidation([]);}}/>
       {data.authenticated&&data.addresses[0]&&<Button variant="plain" small onClick={()=>{patch({recipient:{...ui.recipient,...data.addresses[0],address:formatAddress(data.addresses[0])},checkoutEditRecipient:false,couponCode:"",couponAmount:0,couponError:""});setValidation([]);}}>Dùng lại địa chỉ đã lưu</Button>}</form>}
       {validation.length>0&&<div className="callout" role="alert" style={{color:"#963d32",borderColor:"#e0bab3",background:"#fcf2f0",marginTop:14}}>{validation.map((x,i)=><div key={i}>{x}</div>)}</div>}</div>:
     <div className="box"><h2>Xác nhận & thanh toán</h2><p className="box-intro">Kiểm tra thông tin trước khi đặt hàng.</p>
       <div className="nfv-review-address-head"><h3>Thông tin người nhận</h3><Button small variant="outline" disabled={ui.busyKeys.length>0} onClick={()=>{reviewRecipient.current={...ui.recipient};patch({checkoutStep:0,checkoutEditRecipient:true,checkoutEditFromReview:true});}}>Sửa</Button></div>
       {wardOptions.loading&&<div className="callout" role="status">Đang kiểm tra xã/phường của địa chỉ giao hàng...</div>}
       {wardOptions.error&&<div className="callout" role="alert">Chưa kiểm tra được địa chỉ giao hàng. <Button small variant="outline" onClick={()=>void wardOptions.retry()}>Thử lại</Button></div>}
       {!wardOptions.loading&&!wardOptions.error&&recipientErrors.length>0&&<div className="callout" role="alert">{recipientErrors.join(" ")} Vui lòng sửa thông tin người nhận trước khi đặt hàng.</div>}
       <div className="sm">{ui.recipient.name} · {ui.recipient.phone}<br/>{ui.recipient.address}</div>{ui.recipient.note&&<div className="sm muted">Ghi chú: {ui.recipient.note}</div>}
       <hr className="summary-divider"/><h3 style={{marginBottom:6}}>Thanh toán</h3><div className="callout">Phương thức thanh toán sẽ được hiển thị khi NFV kết nối hệ thống thanh toán.</div></div>}</div>
      <OrderSummary/><nav className="checkout-flow-actions" aria-label="Điều hướng đặt hàng">
        <Button variant="outline" disabled={ui.busyKeys.length>0} onClick={()=>{
          if(ui.checkoutStep===0&&ui.checkoutEditFromReview){
            // Cancel means discard edits, never return to review with an invalid draft.
            patch({recipient:reviewRecipient.current??ui.recipient,checkoutStep:1,checkoutEditRecipient:false,checkoutEditFromReview:false});
            reviewRecipient.current=null;
            setValidation([]);
          }else{navigate("store");patch({cartOpen:true});}
        }}> <Icon name="back" size={16}/> {ui.checkoutStep===0&&ui.checkoutEditFromReview?"Quay lại đơn":"Về giỏ hàng"}</Button>
        {ui.checkoutStep===0?<Button onClick={next} disabled={ui.busyKeys.length>0||wardOptions.loading}><span>Tiếp tục</span> <Icon name="arrow" size={16}/></Button>:
         <Button onClick={submit} disabled={ui.busyKeys.length>0||wardOptions.loading} loading={ui.busyKeys.includes("place-order")}><Icon name="check" size={16}/> Xác nhận & thanh toán</Button>}
      </nav></div>
   {ui.error&&<div className="callout" role="alert" style={{color:"#963d32",marginTop:12}}>{ui.error}</div>}
 </div></main>;
}
