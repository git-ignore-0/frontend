"use client";
import {deliveryDateLabel} from "@/store/store-delivery";
import {storeOrderActions,storeOrderStatusLabel,storeRefundStatusLabel,storeOrderDeadlineLabel,storeOrderHasDeadline,storeShippingDiscountReason} from "@/store/store-order-presentation";

import {ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {useEffect,useRef,useState} from "react";
import {useNFV} from "@/state/NFVContext";
import {useAuth} from "@/auth/AuthProvider";
import {useStoreSession} from "@/store/use-store-session";
import {Button,DataState,Icon,MoneyLine,Status,Photo} from "@/components/UI";
import {StoreSection,StorePageHeading,StoreProductRow,StoreRecipientSummary,StoreSummaryAmounts} from "@/components/store/StorePrimitives";
import {useBuyAgain} from "@/store/use-buy-again";
import {money} from "@/lib/format";
import {formatDateTime} from "@/lib/date-format";
import {BankTransferPanel} from "@/components/BankTransferPanel";
import {formatUnitSize} from "@/store/store-format";
import {resolveAdministrativeAddressNames} from "@/account/administrative-units-service";
import {cancelStoreOrder,getStoreOrder,reportStoreTransfer,requestStoreRefund} from "@/store/store-order-service";
import {storeCancellationReason,storeOrderAddressLine,storeOrderTotals,storePaymentQrUrl,type StoreOrderAddressNames} from "@/store/store-order-presentation";
import type {StoreOrder,StorePaymentStatus} from "@/store/store-order-model";
import type {Locale} from "@/types";
import {useSiteSettings} from "@/hooks/useSiteSettings";
import {contactPresentation} from "@/lib/contact-settings";

const COPY={
 vi:{loading:"Đang tải đơn hàng…",failed:"Không thể tải đơn hàng",unknownMutation:"Kết quả thao tác chưa rõ. Thử lại để kiểm tra yêu cầu trước đó.",retry:"Thử lại",order:"Đơn hàng",products:"Sản phẩm",recipient:"Giao đến",summary:"Tổng kết",goods:"Giá trị sản phẩm",quotaValue:"Quyền lợi CSA",cashSubtotal:"Tiền hàng cần trả",shipping:"Phí giao",freeShipping:"Miễn phí theo quyền lợi CSA",total:"Tổng chuyển khoản",quota:"CSA",cash:"trả tiền",payment:"Thông tin chuyển khoản",bank:"Ngân hàng",account:"Số tài khoản",name:"Tên tài khoản",amount:"Số tiền",content:"Nội dung",copy:"Sao chép",copied:"Đã sao chép",report:"Tôi đã chuyển khoản",cancel:"Hủy đơn",expires:"Thời hạn còn lại",expired:"Đã hết thời hạn",reported:"Bạn đã báo chuyển khoản. Cửa hàng đang kiểm tra, chưa phải xác nhận đã nhận tiền.",zeroReview:"Đơn hàng đã được gửi và đang chờ cửa hàng duyệt.",contact:"Nếu cần thay đổi sau khi gửi đơn, hãy liên hệ cửa hàng",status:"Trạng thái đơn hàng",history:"Lịch sử",created:"Đã tạo",transfer:"Khách báo đã chuyển",approved:"Cửa hàng đã duyệt",delivered:"Đã giao",cancelled:"Đã hủy",reason:"Lý do",paymentStatus:"Thanh toán",refundAmount:"Số tiền hoàn",refundNote:"Ghi chú hoàn tiền",qrLoading:"Đang tải mã QR…",qrFailed:"Không thể tải mã QR. Bạn vẫn có thể chuyển khoản bằng thông tin bên cạnh.",paymentExpired:"Thời hạn thanh toán đã kết thúc. Hãy tải lại trạng thái đơn hàng trước khi tiếp tục.",paymentInvalid:"Thông tin thanh toán không hợp lệ. Vui lòng không chuyển khoản và liên hệ cửa hàng.",cancelledPaid:"Đơn đã hủy. Nếu bạn đã chuyển khoản, hãy liên hệ cửa hàng để đối soát và xử lý hoàn tiền thủ công. "},
 en:{loading:"Loading order…",failed:"Order could not be loaded",unknownMutation:"The action result is unknown. Retry to check the previous request.",retry:"Try again",order:"Order",products:"Products",recipient:"Deliver to",summary:"Summary",goods:"Product value",quotaValue:"CSA benefit",cashSubtotal:"Cash goods subtotal",shipping:"Delivery",freeShipping:"Free with the active CSA benefit",total:"Transfer total",quota:"CSA",cash:"cash",payment:"Bank transfer",bank:"Bank",account:"Account number",name:"Account name",amount:"Amount",content:"Transfer content",copy:"Copy",copied:"Copied",report:"I have transferred",cancel:"Cancel order",expires:"Time remaining",expired:"Expired",reported:"You reported the transfer. The store is reviewing it; this is not confirmation that funds were received.",zeroReview:"Your order has been submitted and is awaiting store review.",contact:"If you need a change after submitting, contact the store",status:"Order status",history:"History",created:"Created",transfer:"Transfer reported",approved:"Store approved",delivered:"Delivered",cancelled:"Cancelled",reason:"Reason",paymentStatus:"Payment",refundAmount:"Refund amount",refundNote:"Refund note",qrLoading:"Loading QR code…",qrFailed:"The QR code could not be loaded. You can still transfer using the details beside it.",paymentExpired:"The payment window has ended. Reload the order status before continuing.",paymentInvalid:"Payment information is invalid. Do not transfer and contact the store.",cancelledPaid:"This order was cancelled. If you transferred funds, contact the store for reconciliation and a manual refund."},
};
export const PAYMENT_STATUS:Record<StorePaymentStatus,Record<Locale,string>>={not_required:{vi:"Không cần thanh toán",en:"No payment required"},unconfirmed:{vi:"Chưa xác nhận",en:"Unconfirmed"},received:{vi:"Đã nhận tiền",en:"Received"},refund_required:{vi:"Cần hoàn tiền",en:"Refund required"},refunded:{vi:"Đã hoàn tiền",en:"Refunded"}};

function remaining(order:StoreOrder,receivedAt:number,now:number){
 if(!storeOrderHasDeadline(order))return null;
 const server=Date.parse(order.serverTime),deadline=Date.parse(order.expiresAt!);
 if(!Number.isFinite(server)||!Number.isFinite(deadline))return 0;
 return Math.max(0,deadline-(now+(server-receivedAt)));
}
const duration=(ms:number)=>`${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms%3600000/60000)).padStart(2,"0")}:${String(Math.floor(ms%60000/1000)).padStart(2,"0")}`;

const deadlineKey=(order:StoreOrder)=>`${order.id}:${order.status}:${order.expiresAt}`;

export function StoreOrderDetail({id,locale,initialOrder,onLoaded,loadOrder=getStoreOrder,readOnly=false,returnTo="orders"}:{id:string;locale:Locale;initialOrder?:StoreOrder;onLoaded?:(order:StoreOrder)=>void;loadOrder?:(id:string)=>Promise<StoreOrder>;readOnly?:boolean;returnTo?:"csa"|"orders"}){
 const storeRequest=useStoreSession();
 const {copyToClipboard}=useNFV();
 const copy=COPY[locale],settings=useSiteSettings(locale),contact=contactPresentation(settings),auth=useAuth();
 const buyAgain=useBuyAgain(locale,!readOnly);
 const owner=auth.status==="authenticated"?auth.session?.subject??"":auth.status,key=`${owner}:${id}`;
 const [initialOwner]=useState(owner),[orderKey,setOrderKey]=useState(key);
 const [order,setOrder]=useState(initialOrder),[state,setState]=useState(initialOrder?"ready":"loading"),[error,setError]=useState(""),[busy,setBusy]=useState(""),[now,setNow]=useState(0),[receivedAt,setReceivedAt]=useState(0),[addressNames,setAddressNames]=useState<{key:string;value:StoreOrderAddressNames|null}|null>(null);
 const initialSnapshot=useRef(initialOrder),expiredRefresh=useRef<string|null>(null),requestSeq=useRef(0),mutationSeq=useRef(0),activeRequest=useRef<"load"|"mutation"|null>(null);
 const clock=()=>typeof performance!=="undefined"?performance.now():Date.now();
 const [dialog,setDialog]=useState<"cancel"|"claim"|"request"|null>(null),[unresolved,setUnresolved]=useState(false);
 const [retryIntent,setRetryIntent]=useState<{kind:"report"|"cancel"|"request";refund:boolean}|null>(null);
 const intent=useRef<{kind:"report"|"cancel"|"request";refund:boolean;key:string}|null>(null);
 const accept=(value:StoreOrder)=>{const time=clock();setReceivedAt(time);setNow(time);setOrder(value);setOrderKey(key);onLoaded?.(value);setState("ready");setError("")};
 const load=async(background=false)=>{if(activeRequest.current==="mutation"||background&&activeRequest.current)return;const seq=++requestSeq.current;activeRequest.current="load";if(!background)setState("loading");try{const value=await storeRequest(()=>loadOrder(id));if(seq===requestSeq.current)accept(value)}catch{if(seq===requestSeq.current)setState("error")}finally{if(seq===requestSeq.current)activeRequest.current=null}};
 // Order identity starts one sequenced load; stale completions are rejected by requestSeq.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{expiredRefresh.current=null;intent.current=null;requestSeq.current+=1;mutationSeq.current+=1;activeRequest.current=null;if(auth.status!=="checking"){if(initialSnapshot.current?.id===id&&owner===initialOwner){accept(initialSnapshot.current);initialSnapshot.current=undefined}else{setOrder(undefined);setOrderKey(key);setState("loading");setBusy("");void load()}}const identitySeq=requestSeq.current;Promise.resolve().then(()=>{if(identitySeq===requestSeq.current){setRetryIntent(null);setUnresolved(false);setDialog(null)}});return()=>{requestSeq.current+=1;mutationSeq.current+=1}},[id,owner]);
 useEffect(()=>{if(!order||!(storeOrderHasDeadline(order)||order.csa?.selection.state==="reselecting"))return;const timer=window.setInterval(()=>setNow(clock()),1000);return()=>window.clearInterval(timer)},[order]);
 const addressKey=order?`${locale}:${order.shippingAddress.provinceCode}:${order.shippingAddress.wardCode}`:"";
 // addressKey captures locale and both snapshot codes; the async result is keyed before display.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!order)return;let active=true;resolveAdministrativeAddressNames(order.shippingAddress.provinceCode,order.shippingAddress.wardCode,locale).then(value=>{if(active)setAddressNames({key:addressKey,value})}).catch(()=>{if(active)setAddressNames({key:addressKey,value:null})});return()=>{active=false}},[addressKey]);
 const left=order&&orderKey===key?remaining(order,receivedAt,now):null;
 // Crossing the server deadline triggers one refresh; requestSeq still owns stale protection.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(order&&left===0&&expiredRefresh.current!==deadlineKey(order)&&!busy&&activeRequest.current===null&&(["payment_pending","pending_review","payment_review"].includes(order.status))){expiredRefresh.current=deadlineKey(order);void load()}},[left,order,busy]);
 // Keep the snapshot visible while tracking remote progress; mutations take priority over reads.
 useEffect(()=>{
  if(!order||orderKey!==key||auth.status==="checking")return;
  const refresh=()=>{if(document.visibilityState!=="hidden")void load(true)};
  const polling=["payment_pending","pending_review","payment_review","pending_delivery"].includes(order.status)||order.refundStatus==="pending";
  const timer=polling?window.setInterval(refresh,30000):null;
  window.addEventListener("focus",refresh);
  return()=>{if(timer!==null)window.clearInterval(timer);window.removeEventListener("focus",refresh)};
 // Restart for identity/status changes, not the snapshot rerendered by each clock tick.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[id,owner,orderKey,key,auth.status,order?.status,order?.paymentStatus,order?.refundStatus]);
 const mutationReady=state==="ready"&&orderKey===key&&auth.status!=="checking"&&!!order;
 const mutate=async(kind:"report"|"cancel"|"request",refund=false)=>{
  if(!order||readOnly||order.csa||busy||!mutationReady||activeRequest.current==="mutation")return;
  if(intent.current&&(intent.current.kind!==kind||intent.current.refund!==refund))return;
  const allowed=storeOrderActions(order);if(!intent.current&&!(kind==="report"?allowed.report:kind==="request"?allowed.requestRefund:refund?allowed.cancelRefund:allowed.cancel))return;
  if(!intent.current&&kind!=="request"&&remaining(order,receivedAt,clock())===0){expiredRefresh.current=deadlineKey(order);void load(true);return;}
  const mutation=++mutationSeq.current,seq=++requestSeq.current;activeRequest.current="mutation";setBusy(kind);setError("");
  const pending=intent.current??{kind,refund,key:kind==="report"?"":crypto.randomUUID()};intent.current=pending;
  try{const value=await storeRequest(()=>kind==="report"?reportStoreTransfer(order.id):kind==="request"?requestStoreRefund(order.id,pending.key):cancelStoreOrder(order.id,pending.key,pending.refund));if(seq!==requestSeq.current)return;accept(value);intent.current=null;setRetryIntent(null);setUnresolved(false);setDialog(null);}
  catch(caught){if(seq!==requestSeq.current)return;const status=(caught as {status?:number}).status;setError(copy.failed);if(!status||status>=500){setUnresolved(true);setRetryIntent(pending)}else{intent.current=null;setRetryIntent(null);setUnresolved(false);if(status===409){setDialog(null);if(remaining(order,receivedAt,clock())===0)expiredRefresh.current=deadlineKey(order);activeRequest.current=null;await load(true);}}}
  // Read sequencing must not strand this mutation lock or unlock a replacement order.
  finally{if(mutation===mutationSeq.current){if(activeRequest.current==="mutation")activeRequest.current=null;setBusy("");}}
 };

 // A direct load waits for address labels; supplied snapshots keep their existing entry behavior.
 const initialLoading=auth.status==="checking"||orderKey!==key||state==="loading"&&!order||!initialOrder&&!!order&&addressNames?.key!==addressKey;
 const paymentAreaRef=useRef<HTMLDivElement>(null);
 const hasPaymentArea=!!order&&!readOnly&&!order.csa&&order.totalVnd>0&&order.status==="payment_pending";
 // Retain only the transfer area; history disclosure must remain free to shrink.
 useEffect(()=>{
  if(initialLoading)return;
  const cleanups=[paymentAreaRef.current].map(element=>{
   if(!element)return ()=>{};
   let width=0,height=0;
   const measure=()=>{
    const nextWidth=element.getBoundingClientRect().width;
    if(nextWidth!==width){width=nextWidth;height=0;element.style.minHeight=""}
    height=Math.max(height,element.getBoundingClientRect().height);
    element.style.minHeight=`${height}px`;
   };
   measure();
   const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;
   observer?.observe(element);
   return()=>{observer?.disconnect();element.style.minHeight=""};
  });
  return()=>cleanups.forEach(cleanup=>cleanup());
 },[key,initialLoading,hasPaymentArea]);
 if(initialLoading)return <div className="container order-detail-page store-commerce"><div className="order-detail-initial-loading"><DataState kind="loading" title={copy.loading}/></div></div>;
 if(!order)return <div className="container order-detail-page store-commerce"><div className="order-detail-initial-loading"><DataState kind="error" title={copy.failed} action={{label:copy.retry,onClick:()=>{setState("loading");void load()}}}/></div></div>;
 const actions=storeOrderActions(order),qr=storePaymentQrUrl(order),totals=storeOrderTotals(order),events=[{label:copy.created,time:order.createdAt},{label:copy.transfer,time:order.transferReportedAt},{label:copy.approved,time:order.approvedAt},{label:locale==="vi"?"Đã nhận tiền":"Payment received",time:order.paymentReceivedAt},{label:order.workflowVersion===2?(locale==="vi"?"Mở đối soát":"Reconciliation opened"):(locale==="vi"?"Yêu cầu hoàn tiền":"Refund requested"),time:order.refundRequestedAt},{label:locale==="vi"?"Kết thúc yêu cầu hoàn":"Refund request closed",time:order.refundRequestClosedAt},{label:locale==="vi"?"Đã hoàn tiền":"Refunded",time:order.refundedAt},{label:copy.delivered,time:order.deliveredAt},{label:copy.cancelled,time:order.cancelledAt}].filter(item=>item.time).sort((a,b)=>Date.parse(a.time!)-Date.parse(b.time!));
 const contactLine=(contact.phone||contact.email)&&<p className="store-order-contact">{copy.contact}: {contact.phone&&<a href={contact.phoneHref}>{contact.phone}</a>}{contact.phone&&contact.email?" · ":null}{contact.email&&<a href={`mailto:${contact.email}`}>{contact.email}</a>}</p>;
 const resolvedAddress=addressNames?.key===addressKey?addressNames.value:null;
 const csaCanReselect=!!order.csa&&order.status!=="cancelled"&&order.status!=="delivered"&&order.csa.round.status!=="cancelled"&&order.csa.selection.state==="reselecting"&&!!order.csa.selection.reopenUntil&&Date.parse(order.csa.selection.reopenUntil)>Date.parse(order.serverTime)+(now-receivedAt)&&Date.parse(`${order.csa.round.deliveryDate}T00:00:00+07:00`)>Date.parse(order.serverTime)+(now-receivedAt);
 const paymentPending=!readOnly&&!order.csa&&order.totalVnd>0&&order.status==="payment_pending",paymentExpired=!!paymentPending&&left===0;
 const canManageOrder=!readOnly&&!order.csa,canBuyAgain=canManageOrder&&auth.status==="authenticated"&&order.canBuyAgain&&!(order.workflowVersion===2&&(order.status==="payment_pending"||order.status==="payment_review"));
 const mutationError=unresolved?copy.unknownMutation:error;
 const cancelRefundLabel=order.workflowVersion===2?(locale==="vi"?"Hủy đơn và yêu cầu hoàn tiền":"Cancel order and request refund"):(locale==="vi"?"Hủy và yêu cầu hoàn tiền":"Cancel and request refund");
 return <div className="container order-detail-page store-commerce">
  <a className="mobile-order-back" href={returnTo==="csa"?`/account/${locale}?tab=csa#csa-points-history`:`/account/${locale}?tab=orders`}><Icon name="back" size={16}/>{returnTo==="csa"?(locale==="vi"?"Lịch sử điểm":"Points history"):(locale==="vi"?"Đơn hàng của tôi":"My orders")}</a>
  <StorePageHeading title={`${copy.order} ${order.referenceCode}`} locale={locale} parent={{href:returnTo==="csa"?`/account/${locale}?tab=csa#csa-points-history`:`/account/${locale}?tab=orders`,label:returnTo==="csa"?(locale==="vi"?"Lịch sử điểm":"Points history"):(locale==="vi"?"Đơn hàng của tôi":"My orders")}} titleAction={<button type="button" className="icon-btn" aria-label={locale==="vi"?"Sao chép mã đơn hàng":"Copy order code"} title={locale==="vi"?"Sao chép mã đơn hàng":"Copy order code"} onClick={()=>void copyToClipboard(order.referenceCode)}><Icon name="copy" size={15}/></button>}/>
  <div className="store-order-flow">
   <StoreSection title={copy.status} className="store-order-status">
    <details className="store-order-history-toggle">
     <summary>
      <span className="store-order-current-status">
       <Status status={["payment_pending","pending_review","payment_review"].includes(order.status)?"pending":order.status==="cancelled"?"cancelled":"confirmed"} label={storeOrderStatusLabel(order,locale)}/>
       {order.status==="cancelled"&&order.refundStatus&&<Status status={order.refundStatus==="pending"?"pending":"confirmed"} label={storeRefundStatusLabel(order,locale)}/>}
       {events.at(-1)?.time&&<time dateTime={events.at(-1)!.time!}>{formatDateTime(events.at(-1)!.time!)}</time>}
      </span>
      <span className="store-history-control"><span className="store-history-expand">{locale==="vi"?"Xem lịch sử":"View history"}</span><span className="store-history-collapse">{locale==="vi"?"Thu gọn":"Collapse"}</span><Icon name="chev" size={14}/></span>
     </summary>
     <ol className="store-order-history" aria-label={copy.history}>{events.map(item=><li key={item.label}><span>{item.label}</span><time dateTime={item.time!}>{formatDateTime(item.time!)}</time></li>)}</ol>
    </details>
    <dl className="store-order-meta">
     <div className="store-info-row"><dt>{locale==="vi"?"Ngày giao hàng":"Delivery date"}</dt><dd><time dateTime={order.csa?.round.deliveryDate??order.deliveryDate??undefined}>{deliveryDateLabel(order.csa?.round.deliveryDate??order.deliveryDate)}</time></dd></div>
     {left!==null&&<div className="store-info-row"><dt>{storeOrderDeadlineLabel(order,locale)}</dt><dd>{left>0?duration(left):copy.expired}</dd></div>}
    </dl>
    {order.csa&&<div className="store-order-csa">
     <div className="store-order-round"><strong>{order.csa.round.name}</strong><a className="acc-text-link" href={`/account/csa-rounds/${order.csa.round.id}/${locale}`}>{csaCanReselect?(locale==="vi"?"Chọn lại":"Choose again"):(locale==="vi"?"Xem đợt CSA":"View CSA round")}</a></div>
     {order.csa.selection.state==="reselecting"&&order.csa.selection.reopenUntil&&<p className="store-status-note">{locale==="vi"?"Hạn chọn lại":"Choose again by"}: <time dateTime={order.csa.selection.reopenUntil}>{formatDateTime(order.csa.selection.reopenUntil)}</time></p>}
    </div>}
    {order.cancellationReason&&<p className="store-status-note"><strong>{copy.reason}:</strong> {storeCancellationReason(order.cancellationReason,locale)}</p>}
    {(order.status==="pending_review"||order.status==="payment_review")&&<><p className="store-status-note">{order.workflowVersion===2&&order.status==="pending_review"?copy.zeroReview:order.transferReportedAt?copy.reported:copy.zeroReview}</p>{contactLine}</>}
    {actions.requestRefund&&<><p className="store-status-note">{copy.cancelledPaid}</p>{contactLine}</>}
    {order.refundRequestClosedReason&&<p className="store-status-note">{order.refundRequestClosedReason}</p>}
   </StoreSection>
   <StoreSection title={copy.recipient} className="store-order-address"><StoreRecipientSummary name={order.shippingAddress.recipientName} phone={order.shippingAddress.phoneNumber} address={storeOrderAddressLine(order.shippingAddress,resolvedAddress)}/></StoreSection>
   <StoreSection title={copy.products} className="store-order-products">{order.lines.map(line=><StoreProductRow key={line.id} name={line.name} image={<Photo src={line.imageUrl??undefined} alt={line.name} locale={locale}/>} meta={<>{line.quantity} × {formatUnitSize(line.unitSize)} {line.unitLabel}</>} amount={money(line.quantity*line.unitPriceVnd)} actions={line.quotaQuantity>0?<span className="store-csa-usage">{locale==="vi"?`Dùng ${line.quotaUnits} điểm CSA`:`Use ${line.quotaUnits} CSA points`}</span>:undefined}/>)}</StoreSection>
   {paymentPending&&<StoreSection title={copy.payment} className="store-order-transfer">
    <div ref={paymentAreaRef} className="order-detail-transfer-body">
    {paymentExpired?<DataState compact kind={state==="loading"?"loading":"error"} title={copy.expired} description={copy.paymentExpired} action={state==="loading"||busy?undefined:{label:copy.retry,onClick:()=>void load()}}/>:qr&&order.payment?<BankTransferPanel appearance="store" qrUrl={qr} bankName={order.payment!.bankName} accountNumber={order.payment!.accountNumber} accountName={order.payment!.accountName} transferContent={order.payment!.transferContent} amount={money(order.totalVnd)} busy={!!busy} labels={{bank:copy.bank,account:copy.account,name:copy.name,content:copy.content,amount:copy.amount,copyAccount:locale==="vi"?"Sao chép số tài khoản":"Copy account number",copyContent:locale==="vi"?"Sao chép nội dung chuyển khoản":"Copy transfer content",copied:copy.copied,qrAlt:copy.payment,qrFailed:copy.qrFailed}}/>:<><div className="callout" role="alert">{copy.paymentInvalid}</div>{contactLine}</>}
    </div>
   </StoreSection>}
   <StoreSection title={locale==="vi"?"Đơn hàng của bạn":"Your order"} className="store-order-payment store-summary">
    <StoreSummaryAmounts totalLabel={locale==="vi"?"Tổng đơn hàng":"Order total"} locale={locale} goods={money(totals.goodsValueVnd)} shipping={totals.shippingFeeVnd===0?(locale==="vi"?"Miễn phí":"Free"):money(totals.shippingFeeVnd)} benefit={totals.quotaValueVnd>0?`−${money(totals.quotaValueVnd)}`:undefined} cashSubtotal={order.coupon?money(order.subtotalVnd):undefined} voucher={order.coupon?{code:order.coupon.code,discount:`−${money(order.discountAmountVnd)}`}:undefined} total={money(totals.totalVnd)}/>
    {order.shippingDiscountReason&&<p className="sm muted">{storeShippingDiscountReason(order.shippingDiscountReason,locale)}</p>}
    <div className="store-order-payment-state">
     <MoneyLine label={copy.paymentStatus} value={PAYMENT_STATUS[order.paymentStatus][locale]}/>
     {order.refundAmountVnd!==null&&order.refundAmountVnd!==undefined&&<MoneyLine label={copy.refundAmount} value={money(order.refundAmountVnd)}/>}
     {order.refundNote&&<p className="sm muted"><strong>{copy.refundNote}:</strong> {order.refundNote}</p>}
    </div>
    {canManageOrder&&(actions.pay||actions.cancel||actions.cancelRefund||actions.requestRefund||unresolved||canBuyAgain)&&<div className="store-order-actions">
     {paymentPending&&!paymentExpired&&qr&&order.payment&&<Button loading={busy==="report"} disabled={!!busy||unresolved||!mutationReady||left===0} onClick={()=>void mutate("report")}>{order.workflowVersion===2?(locale==="vi"?"Xác nhận đã chuyển khoản":"Report bank transfer"):copy.report}</Button>}
     {!unresolved&&actions.cancel&&<Button variant="outline" loading={busy==="cancel"} disabled={!!busy||!mutationReady||left===0} onClick={()=>order.status==="payment_pending"?setDialog("cancel"):void mutate("cancel",false)}>{copy.cancel}</Button>}
     {!unresolved&&actions.cancelRefund&&(order.workflowVersion===2||order.status!=="payment_pending")&&<Button variant="outline" disabled={!!busy||!mutationReady||left===0} onClick={()=>setDialog("claim")}>{cancelRefundLabel}</Button>}
     {!unresolved&&actions.requestRefund&&<Button variant="outline" disabled={!!busy||!mutationReady} onClick={()=>setDialog("request")}>{locale==="vi"?"Yêu cầu hoàn tiền":"Request refund"}</Button>}
     {unresolved&&retryIntent&&!dialog&&<Button loading={!!busy} disabled={!!busy||!mutationReady} onClick={()=>void mutate(retryIntent.kind,retryIntent.refund)}>{copy.retry}</Button>}
     {canBuyAgain&&<Button variant="outline" className="store-buy-again" loading={!!buyAgain.busy} disabled={!!buyAgain.busy} onClick={()=>void buyAgain.start(order.id)}><Icon name="refresh" size={15}/>{locale==="vi"?"Mua lại":"Buy again"}</Button>}
    </div>}
    {buyAgain.error&&<div className="callout" role="alert">{buyAgain.error}</div>}
    {state==="error"&&!paymentExpired?<DataState kind="error" title={copy.failed} action={{label:copy.retry,onClick:()=>void load()}}/>:mutationError&&<p className="help-error" role="alert">{mutationError}</p>}
   </StoreSection>
  </div>
  {dialog&&!readOnly&&<ResponsiveDialog title={locale==="vi"?(dialog==="cancel"?"Bạn đã chuyển khoản chưa?":dialog==="claim"?cancelRefundLabel:"Yêu cầu hoàn tiền"):(dialog==="cancel"?"Have you transferred?":dialog==="claim"?cancelRefundLabel:"Request refund")} closeLabel={locale==="vi"?"Đóng":"Close"} onClose={()=>{if(!busy)setDialog(null)}}>
    {dialog!=="cancel"&&<p>{locale==="vi"?"Khoản chuyển sẽ chờ cửa hàng đối soát.":"The store will reconcile the transfer."}</p>}
    <div className="store-order-dialog-actions">
    {dialog==="cancel"&&<Button variant="outline" loading={busy==="cancel"} disabled={!!busy||unresolved||!mutationReady||!actions.cancel||left===0} onClick={()=>void mutate("cancel",false)}>{locale==="vi"?"Chưa chuyển — Hủy đơn":"Not transferred — Cancel order"}</Button>}
    <Button loading={!!busy} disabled={!!busy||unresolved||!mutationReady||!(dialog==="request"?actions.requestRefund:actions.cancelRefund)||dialog!=="request"&&left===0} onClick={()=>void mutate(dialog==="request"?"request":"cancel",dialog!=="request")}>{locale==="vi"?(dialog==="cancel"?"Đã chuyển — Hủy và yêu cầu hoàn tiền":dialog==="request"?"Yêu cầu hoàn tiền":cancelRefundLabel):(dialog==="cancel"?"Transferred — Cancel and request refund":dialog==="request"?"Request refund":cancelRefundLabel)}</Button>
    {unresolved&&retryIntent&&<Button loading={!!busy} disabled={!!busy||!mutationReady} onClick={()=>void mutate(retryIntent.kind,retryIntent.refund)}>{copy.retry}</Button>}
    </div>
    {state!=="ready"&&<DataState kind={state==="loading"?"loading":"error"} title={state==="loading"?copy.loading:copy.failed} action={state==="error"?{label:copy.retry,onClick:()=>void load()}:undefined}/>}
    {mutationError&&<p role="alert" className="help-error">{mutationError}</p>}
  </ResponsiveDialog>}
 </div>;
}
