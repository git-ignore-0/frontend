"use client";

import {useEffect,useRef,useState} from "react";
import {useNFV} from "@/state/NFVContext";
import {useAuth} from "@/auth/AuthProvider";
import {useStoreSession} from "@/store/use-store-session";
import {Button,DataState,Icon,MoneyLine,Status,Photo} from "@/components/UI";
import {StoreSection,StorePageHeading,StoreProductRow,StoreRecipientSummary,StoreSummaryAmounts} from "@/components/store/StorePrimitives";
import {useBuyAgain} from "@/store/use-buy-again";
import {money} from "@/lib/format";
import {BankTransferPanel,PaymentQr} from "@/components/BankTransferPanel";
import {formatUnitSize} from "@/store/store-format";
import {resolveAdministrativeAddressNames} from "@/account/administrative-units-service";
import {cancelStoreOrder,getStoreOrder,reportStoreTransfer} from "@/store/store-order-service";
import {storeCancellationReason,storeOrderAddressLine,storeOrderTotals,storePaymentQrUrl,type StoreOrderAddressNames} from "@/store/store-order-presentation";
import type {StoreOrder,StoreOrderStatus,StorePaymentStatus} from "@/store/store-order-model";
import type {Locale} from "@/types";
import {useSiteSettings} from "@/hooks/useSiteSettings";
import {contactPresentation} from "@/lib/contact-settings";

const COPY={
 vi:{loading:"Đang tải đơn hàng…",failed:"Không thể tải đơn hàng",retry:"Thử lại",order:"Đơn hàng",products:"Sản phẩm",recipient:"Giao đến",summary:"Tổng kết",goods:"Giá trị sản phẩm",quotaValue:"Quyền lợi CSA",cashSubtotal:"Tiền hàng cần trả",shipping:"Phí giao",freeShipping:"Miễn phí theo quyền lợi CSA",total:"Tổng chuyển khoản",quota:"CSA",cash:"trả tiền",payment:"Thông tin chuyển khoản",bank:"Ngân hàng",account:"Số tài khoản",name:"Tên tài khoản",amount:"Số tiền",content:"Nội dung",copy:"Sao chép",copied:"Đã sao chép",report:"Tôi đã chuyển khoản",cancel:"Hủy đơn",expires:"Thời hạn còn lại",expired:"Đã hết thời hạn",reported:"Bạn đã báo chuyển khoản. Cửa hàng đang kiểm tra, chưa phải xác nhận đã nhận tiền.",zeroReview:"Đơn hàng đã được gửi và đang chờ cửa hàng duyệt.",contact:"Nếu cần thay đổi sau khi gửi đơn, hãy liên hệ cửa hàng",status:"Trạng thái đơn hàng",history:"Lịch sử",created:"Đã tạo",transfer:"Khách báo đã chuyển",approved:"Cửa hàng đã duyệt",delivered:"Đã giao",cancelled:"Đã hủy",reason:"Lý do",paymentStatus:"Thanh toán",refundAmount:"Số tiền hoàn",refundNote:"Ghi chú hoàn tiền",qrLoading:"Đang tải mã QR…",qrFailed:"Không thể tải mã QR. Bạn vẫn có thể chuyển khoản bằng thông tin bên cạnh.",paymentExpired:"Thời hạn thanh toán đã kết thúc. Hãy tải lại trạng thái đơn hàng trước khi tiếp tục.",paymentInvalid:"Thông tin thanh toán không hợp lệ. Vui lòng không chuyển khoản và liên hệ cửa hàng.",cancelledPaid:"Đơn đã hủy. Nếu bạn đã chuyển khoản, hãy liên hệ cửa hàng để đối soát và xử lý hoàn tiền thủ công. "},
 en:{loading:"Loading order…",failed:"Order could not be loaded",retry:"Try again",order:"Order",products:"Products",recipient:"Deliver to",summary:"Summary",goods:"Product value",quotaValue:"CSA benefit",cashSubtotal:"Cash goods subtotal",shipping:"Delivery",freeShipping:"Free with the active CSA benefit",total:"Transfer total",quota:"CSA",cash:"cash",payment:"Bank transfer",bank:"Bank",account:"Account number",name:"Account name",amount:"Amount",content:"Transfer content",copy:"Copy",copied:"Copied",report:"I have transferred",cancel:"Cancel order",expires:"Time remaining",expired:"Expired",reported:"You reported the transfer. The store is reviewing it; this is not confirmation that funds were received.",zeroReview:"Your order has been submitted and is awaiting store review.",contact:"If you need a change after submitting, contact the store",status:"Order status",history:"History",created:"Created",transfer:"Transfer reported",approved:"Store approved",delivered:"Delivered",cancelled:"Cancelled",reason:"Reason",paymentStatus:"Payment",refundAmount:"Refund amount",refundNote:"Refund note",qrLoading:"Loading QR code…",qrFailed:"The QR code could not be loaded. You can still transfer using the details beside it.",paymentExpired:"The payment window has ended. Reload the order status before continuing.",paymentInvalid:"Payment information is invalid. Do not transfer and contact the store.",cancelledPaid:"This order was cancelled. If you transferred funds, contact the store for reconciliation and a manual refund."},
};
export const STORE_STATUS:Record<StoreOrderStatus,Record<Locale,string>>={payment_pending:{vi:"Chờ thanh toán",en:"Awaiting payment"},pending_review:{vi:"Chờ duyệt",en:"Awaiting review"},pending_delivery:{vi:"Chờ giao",en:"Awaiting delivery"},delivered:{vi:"Đã giao",en:"Delivered"},cancelled:{vi:"Đã hủy",en:"Cancelled"}};
export const PAYMENT_STATUS:Record<StorePaymentStatus,Record<Locale,string>>={not_required:{vi:"Đã thanh toán",en:"Paid"},unconfirmed:{vi:"Chưa xác nhận",en:"Unconfirmed"},received:{vi:"Đã nhận tiền",en:"Received"},refund_required:{vi:"Cần hoàn tiền",en:"Refund required"},refunded:{vi:"Đã hoàn tiền",en:"Refunded"}};

export function vietQrUrl(order:StoreOrder){return storePaymentQrUrl(order)}

export function StorePaymentQr({url,alt,locale}:{url:string;alt:string;locale:Locale}){
 return <PaymentQr url={url} alt={alt} fallback={COPY[locale].qrFailed}/>;
}

function remaining(order:StoreOrder,receivedAt:number,now:number){
 if(order.csa||!order.expiresAt)return null;
 const server=Date.parse(order.serverTime),deadline=Date.parse(order.expiresAt);
 if(!Number.isFinite(server)||!Number.isFinite(deadline))return 0;
 return Math.max(0,deadline-(now+(server-receivedAt)));
}
const duration=(ms:number)=>`${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms%3600000/60000)).padStart(2,"0")}:${String(Math.floor(ms%60000/1000)).padStart(2,"0")}`;

export function StoreOrderDetail({id,locale,initialOrder,onLoaded,loadOrder=getStoreOrder,readOnly=false,returnTo="orders"}:{id:string;locale:Locale;initialOrder?:StoreOrder;onLoaded?:(order:StoreOrder)=>void;loadOrder?:(id:string)=>Promise<StoreOrder>;readOnly?:boolean;returnTo?:"csa"|"orders"}){
 const storeRequest=useStoreSession();
 const {copyToClipboard}=useNFV();
 const copy=COPY[locale],settings=useSiteSettings(locale),contact=contactPresentation(settings),auth=useAuth();
 const buyAgain=useBuyAgain(locale,!readOnly);
 const owner=auth.status==="authenticated"?auth.session?.subject??"":auth.status,key=`${owner}:${id}`;
 const [initialOwner]=useState(owner),[orderKey,setOrderKey]=useState(key);
 const [order,setOrder]=useState(initialOrder),[state,setState]=useState(initialOrder?"ready":"loading"),[error,setError]=useState(""),[busy,setBusy]=useState(""),[now,setNow]=useState(0),[receivedAt,setReceivedAt]=useState(0),[addressNames,setAddressNames]=useState<{key:string;value:StoreOrderAddressNames}|null>(null);
 const initialSnapshot=useRef(initialOrder),expiredRefresh=useRef(false),requestSeq=useRef(0),cancelKey=useRef(""),activeRequest=useRef<"load"|"mutation"|null>(null);
 const accept=(value:StoreOrder)=>{const time=Date.now();setReceivedAt(time);setNow(time);setOrder(value);setOrderKey(key);onLoaded?.(value);setState("ready");setError("")};
 const load=async(background=false)=>{if(activeRequest.current==="mutation"||background&&activeRequest.current)return;const seq=++requestSeq.current;activeRequest.current="load";if(!background)setState("loading");try{const value=await storeRequest(()=>loadOrder(id));if(seq===requestSeq.current)accept(value)}catch{if(seq===requestSeq.current)setState("error")}finally{if(seq===requestSeq.current)activeRequest.current=null}};
 // Order identity starts one sequenced load; stale completions are rejected by requestSeq.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{expiredRefresh.current=false;cancelKey.current="";requestSeq.current+=1;activeRequest.current=null;if(auth.status!=="checking"){if(initialSnapshot.current?.id===id&&owner===initialOwner){accept(initialSnapshot.current);initialSnapshot.current=undefined}else{setOrder(undefined);setOrderKey(key);setState("loading");setBusy("");void load()}}return()=>{requestSeq.current+=1}},[id,owner]);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 const addressKey=order?`${locale}:${order.shippingAddress.provinceCode}:${order.shippingAddress.wardCode}`:"";
 // addressKey captures locale and both snapshot codes; the async result is keyed before display.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!order)return;let active=true;resolveAdministrativeAddressNames(order.shippingAddress.provinceCode,order.shippingAddress.wardCode,locale).then(value=>{if(active)setAddressNames({key:addressKey,value})}).catch(()=>{});return()=>{active=false}},[addressKey]);
 const left=order&&orderKey===key?remaining(order,receivedAt||now,now):null;
 // Crossing the server deadline triggers one refresh; requestSeq still owns stale protection.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(order&&left===0&&!expiredRefresh.current&&activeRequest.current!=="mutation"&&(order.status==="payment_pending"||order.status==="pending_review")){expiredRefresh.current=true;void load()}},[left,order,busy]);
 // Keep the snapshot visible while tracking remote progress; mutations take priority over reads.
 useEffect(()=>{
  if(!order||orderKey!==key||auth.status==="checking")return;
  const refresh=()=>{if(document.visibilityState!=="hidden")void load(true)};
  const polling=["payment_pending","pending_review","pending_delivery"].includes(order.status)||order.paymentStatus==="refund_required";
  const timer=polling?window.setInterval(refresh,30000):null;
  window.addEventListener("focus",refresh);
  return()=>{if(timer!==null)window.clearInterval(timer);window.removeEventListener("focus",refresh)};
 // Restart for identity/status changes, not the snapshot rerendered by each clock tick.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id,owner,orderKey,key,auth.status,order?.status,order?.paymentStatus]);
 const mutationReady=state==="ready"&&orderKey===key&&auth.status!=="checking"&&!!order&&left!==0;
 const mutate=async(kind:"report"|"cancel")=>{if(!order||busy||!mutationReady||activeRequest.current==="mutation")return;const seq=++requestSeq.current;activeRequest.current="mutation";setBusy(kind);setError("");try{if(kind==="cancel"&&!cancelKey.current)cancelKey.current=crypto.randomUUID();const value=await storeRequest(()=>kind==="report"?reportStoreTransfer(order.id):cancelStoreOrder(order.id,cancelKey.current));if(seq!==requestSeq.current)return;accept(value);if(kind==="cancel")cancelKey.current=""}catch{if(seq===requestSeq.current){setError(copy.failed);setBusy("");activeRequest.current=null;void load()}}finally{if(seq===requestSeq.current){activeRequest.current=null;setBusy("")}}};
 if(auth.status==="checking"||orderKey!==key||state==="loading"&&!order)return <DataState kind="loading" title={copy.loading}/>;
 if(!order)return <DataState kind="error" title={copy.failed} action={{label:copy.retry,onClick:()=>{setState("loading");void load()}}}/>;
 const qr=storePaymentQrUrl(order),totals=storeOrderTotals(order),events=[{label:copy.created,time:order.createdAt},{label:copy.transfer,time:order.transferReportedAt},{label:copy.approved,time:order.approvedAt},{label:copy.delivered,time:order.deliveredAt},{label:copy.cancelled,time:order.cancelledAt}].filter(item=>item.time);
 const contactLine=(contact.phone||contact.email)&&<p className="store-order-contact">{copy.contact}: {contact.phone&&<a href={contact.phoneHref}>{contact.phone}</a>}{contact.phone&&contact.email?" · ":null}{contact.email&&<a href={`mailto:${contact.email}`}>{contact.email}</a>}</p>;
 const resolvedAddress=addressNames?.key===addressKey?addressNames.value:null;
 const csaCanReselect=!!order.csa&&order.status!=="cancelled"&&order.status!=="delivered"&&order.csa.round.status!=="cancelled"&&order.csa.selection.state==="reselecting"&&!!order.csa.selection.reopenUntil&&Date.parse(order.csa.selection.reopenUntil)>Date.parse(order.serverTime)+(now-receivedAt);
 const paymentPending=!order.csa&&order.payment&&order.status==="payment_pending",paymentExpired=!!paymentPending&&left===0;
 return <div className="container order-detail-page store-commerce">
  <StorePageHeading title={`${copy.order} ${order.referenceCode}`} locale={locale} parent={{href:returnTo==="csa"?`/account/${locale}?tab=csa#csa-points-history`:`/account/${locale}?tab=orders`,label:returnTo==="csa"?(locale==="vi"?"Lịch sử điểm":"Points history"):(locale==="vi"?"Đơn hàng của tôi":"My orders")}} titleAction={<button type="button" className="icon-btn" aria-label={locale==="vi"?"Sao chép mã đơn hàng":"Copy order code"} title={locale==="vi"?"Sao chép mã đơn hàng":"Copy order code"} onClick={()=>void copyToClipboard(order.referenceCode)}><Icon name="copy" size={15}/></button>}/>
  <div className="store-order-flow">
   {order.csa&&<StoreSection title={locale==="vi"?"Đợt CSA":"CSA round"} className="store-order-csa"><strong>{order.csa.round.name}</strong><p>{locale==="vi"?"Ngày giao":"Delivery"}: <strong><time dateTime={order.csa.round.deliveryAt}>{new Date(order.csa.round.deliveryAt).toLocaleString(locale,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time></strong></p>{order.csa.selection.state==="reselecting"&&order.csa.selection.reopenUntil&&<p>{locale==="vi"?"Hạn chọn lại":"Choose again by"}: <time dateTime={order.csa.selection.reopenUntil}>{new Date(order.csa.selection.reopenUntil).toLocaleString(locale)}</time></p>}<a className="acc-text-link" href={`/account/csa-rounds/${order.csa.round.id}/${locale}`}>{csaCanReselect?(locale==="vi"?"Chọn lại":"Choose again"):(locale==="vi"?"Xem đợt CSA":"View CSA round")}</a></StoreSection>}
   <StoreSection title={copy.status} className="store-order-status">
    <details className="store-order-history-toggle">
     <summary><span className="store-order-current-status"><Status status={order.status==="payment_pending"||order.status==="pending_review"?"pending":order.status==="cancelled"?"cancelled":"confirmed"} label={STORE_STATUS[order.status][locale]}/>{events.at(-1)?.time&&<time dateTime={events.at(-1)!.time!}>{new Date(events.at(-1)!.time!).toLocaleString(locale,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time>}</span><span className="store-history-control"><span className="store-history-expand">{locale==="vi"?"Xem lịch sử":"View history"}</span><span className="store-history-collapse">{locale==="vi"?"Thu gọn":"Collapse"}</span><Icon name="chev" size={14}/></span></summary>
     <ol className="store-order-history" aria-label={copy.history}>{events.map(item=><li key={item.label}><span>{item.label}</span><time dateTime={item.time!}>{new Date(item.time!).toLocaleString(locale,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time></li>)}</ol>
    </details>
    {order.cancellationReason&&<p className="store-status-note"><strong>{copy.reason}:</strong> {storeCancellationReason(order.cancellationReason,locale)}</p>}
    {order.status==="pending_review"&&<><p className="store-status-note">{order.transferReportedAt?copy.reported:copy.zeroReview}</p>{left!==null&&<p className="store-status-note">{copy.expires}: <strong>{left>0?duration(left):copy.expired}</strong></p>}{contactLine}</>}
    {order.status==="cancelled"&&order.totalVnd>0&&<><p className="store-status-note">{copy.cancelledPaid}</p>{contactLine}</>}
   </StoreSection>
   <StoreSection title={copy.recipient} className="store-order-address"><StoreRecipientSummary name={order.shippingAddress.recipientName} phone={order.shippingAddress.phoneNumber} address={storeOrderAddressLine(order.shippingAddress,resolvedAddress)}/></StoreSection>
   <StoreSection title={copy.products} className="store-order-products">{order.lines.map(line=><StoreProductRow key={line.id} name={line.name} image={<Photo src={line.imageUrl??undefined} alt={line.name} locale={locale}/>} meta={<>{line.quantity} × {formatUnitSize(line.unitSize)} {line.unitLabel}</>} amount={money(line.quantity*line.unitPriceVnd)} actions={line.quotaQuantity>0?<span className="store-csa-usage">{locale==="vi"?`Dùng ${line.quotaUnits} điểm CSA`:`Use ${line.quotaUnits} CSA points`}</span>:undefined}/>)}</StoreSection>
   {paymentPending&&<StoreSection title={copy.payment} className="store-order-transfer">{paymentExpired?<DataState compact kind={state==="loading"?"loading":"error"} title={copy.expired} description={copy.paymentExpired} action={state==="loading"||busy?undefined:{label:copy.retry,onClick:()=>void load()}}/>:qr?<><BankTransferPanel appearance="store" qrUrl={qr} bankName={order.payment!.bankName} accountNumber={order.payment!.accountNumber} accountName={order.payment!.accountName} transferContent={order.payment!.transferContent} amount={money(order.totalVnd)} busy={!!busy} labels={{bank:copy.bank,account:copy.account,name:copy.name,content:copy.content,amount:copy.amount,copyAccount:locale==="vi"?"Sao chép số tài khoản":"Copy account number",copyContent:locale==="vi"?"Sao chép nội dung chuyển khoản":"Copy transfer content",copied:copy.copied,qrAlt:copy.payment,qrFailed:copy.qrFailed}}/>{left!==null&&<p>{copy.expires}: <strong>{left>0?duration(left):copy.expired}</strong></p>}{!readOnly&&<div className="checkout-flow-actions"><Button loading={busy==="report"} disabled={!!busy||!mutationReady} onClick={()=>void mutate("report")}>{copy.report}</Button><Button variant="outline" loading={busy==="cancel"} disabled={!!busy||!mutationReady} onClick={()=>void mutate("cancel")}>{copy.cancel}</Button></div>}</>:<><div className="callout" role="alert">{copy.paymentInvalid}</div>{contactLine}{!readOnly&&<Button variant="outline" loading={busy==="cancel"} disabled={!!busy||!mutationReady} onClick={()=>void mutate("cancel")}>{copy.cancel}</Button>}</>}</StoreSection>}
   <StoreSection title={locale==="vi"?"Đơn hàng của bạn":"Your order"} className="store-order-payment store-summary"><StoreSummaryAmounts locale={locale} goods={money(totals.goodsValueVnd)} shipping={totals.shippingFeeVnd===0?(locale==="vi"?"Miễn phí":"Free"):money(totals.shippingFeeVnd)} benefit={totals.quotaValueVnd>0?`−${money(totals.quotaValueVnd)}`:undefined} cashSubtotal={order.coupon?money(order.subtotalVnd):undefined} voucher={order.coupon?{code:order.coupon.code,discount:`−${money(order.discountAmountVnd)}`}:undefined} total={money(totals.totalVnd)}/><div className="store-order-payment-state"><MoneyLine label={copy.paymentStatus} value={PAYMENT_STATUS[order.paymentStatus][locale]}/>{order.payment?.refundAmountVnd!==null&&order.payment?.refundAmountVnd!==undefined&&<MoneyLine label={copy.refundAmount} value={money(order.payment.refundAmountVnd)}/>} {order.payment?.refundNote&&<p className="sm muted"><strong>{copy.refundNote}:</strong> {order.payment.refundNote}</p>}</div><div className="store-order-buy-again">{auth.status==="authenticated"&&!readOnly&&!order.csa&&order.canBuyAgain&&<Button small className="store-buy-again" loading={!!buyAgain.busy} disabled={!!buyAgain.busy} onClick={()=>void buyAgain.start(order.id)}><Icon name="refresh" size={15}/>{locale==="vi"?"Mua lại":"Buy again"}</Button>}{buyAgain.error&&<div className="callout" role="alert">{buyAgain.error}</div>}</div>{state==="error"&&!paymentExpired?<DataState kind="error" title={copy.failed} action={{label:copy.retry,onClick:()=>void load()}}/>:error&&<p className="help-error" role="alert">{error}</p>}</StoreSection></div>
 </div>;
}
