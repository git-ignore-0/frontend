import type {StoreOrder} from "./store-order-model";
import type {StoreLocale} from "./store-model";

export type StoreOrderAddressNames={provinceName:string;wardName:string};

export const HISTORICAL_ORDER_DATES={
  vi:{delivery:"Ngày giao thực tế",recorded:"Ngày ghi nhận"},
  en:{delivery:"Actual delivery date",recorded:"Recorded on"},
} as const;

export function storeOrderTotals(order:StoreOrder){
  return {
    goodsValueVnd:order.lines.reduce((sum,line)=>sum+line.quantity*line.unitPriceVnd,0),
    quotaValueVnd:order.lines.reduce((sum,line)=>sum+line.quotaQuantity*line.unitPriceVnd,0),
    cashSubtotalVnd:order.subtotalVnd,
    shippingFeeVnd:order.shippingFeeVnd,
    totalVnd:order.totalVnd,
  };
}

const CANCELLATION_REASONS={
  delivery_date_expired:{vi:"Quá ngày giao hàng",en:"Delivery date expired"},
  payment_expired:{vi:"Quá hạn thanh toán",en:"Payment deadline expired"},
  payment_review_expired:{vi:"Quá hạn xác nhận thanh toán",en:"Payment confirmation deadline expired"},
  expired:{vi:"Hết thời hạn thanh toán",en:"Payment deadline expired"},
  buyer_cancelled:{vi:"Khách hàng đã hủy đơn",en:"Cancelled by buyer"},
  reselection_expired:{vi:"Đã hết hạn chọn lại sản phẩm",en:"Reselection deadline expired"},
} as const;

export function storeCancellationReason(reason:string,locale:StoreLocale){
  return Object.prototype.hasOwnProperty.call(CANCELLATION_REASONS,reason)
    ? CANCELLATION_REASONS[reason as keyof typeof CANCELLATION_REASONS][locale]
    : reason;
}

export function storeOrderAddressLine(address:StoreOrder["shippingAddress"],names:StoreOrderAddressNames|null){
  return [address.address,names?.wardName||address.wardCode,names?.provinceName||address.provinceCode].filter(Boolean).join(", ");
}

export function storePaymentQrUrl(order:StoreOrder){
  if(order.csa||order.status!=="payment_pending"||(order.workflowVersion===2&&!order.approvedAt))return "";
  const payment=order.payment,q=payment?.qrPayload;
  if(!payment||!q||order.totalVnd<=0||q.amount!==order.totalVnd
    ||q.acqId!==payment.bankBin||q.accountNo!==payment.accountNumber
    ||q.accountName!==payment.accountName||q.addInfo!==payment.transferContent
    ||!/^[0-9]{6}$/.test(q.acqId)||!/^[0-9]+$/.test(q.accountNo)
    ||!q.accountName.trim()||!q.addInfo.trim())return "";
  return `https://img.vietqr.io/image/${q.acqId}-${q.accountNo}-qr_only.png?${new URLSearchParams({amount:String(q.amount),addInfo:q.addInfo,accountName:q.accountName})}`;
}

export function storeShippingDiscountReason(reason:string,locale:StoreLocale){
 const reasons:Record<string,{vi:string;en:string}>={csa_companion_delivery:{vi:"Miễn phí giao kèm CSA",en:"Free delivery with CSA"},csa_round:{vi:"Giao hàng trong gói CSA",en:"Delivery included in CSA"},active_csa_with_csa_product:{vi:"Miễn phí theo quyền lợi CSA đã áp dụng",en:"Free delivery under saved CSA benefits"}};
 return Object.hasOwn(reasons,reason)?reasons[reason][locale]:'';
}

export function storeOrderActions(order:StoreOrder){
 const money=order.totalVnd>0,retail=!order.csa,v2=order.workflowVersion===2,canPay=retail&&money&&order.status==="payment_pending"&&!!storePaymentQrUrl(order);
 return {pay:canPay,report:canPay,cancel:retail&&(v2?order.status==="pending_review":order.status==="payment_pending"),cancelRefund:retail&&money&&(order.status==="payment_pending"||(v2?order.status==="payment_review":order.status==="pending_review")),requestRefund:retail&&!v2&&money&&order.status==="cancelled"&&order.refundStatus===null};
}
const ORDER_LABELS={pending_review:{vi:"Chờ xác nhận đơn",en:"Awaiting order confirmation"},payment_pending:{vi:"Chờ thanh toán",en:"Awaiting payment"},payment_review:{vi:"Chờ xác nhận thanh toán",en:"Awaiting payment confirmation"},pending_delivery:{vi:"Chờ giao",en:"Awaiting delivery"},delivered:{vi:"Đã giao",en:"Delivered"},cancelled:{vi:"Đã hủy",en:"Cancelled"}} as const;
export function storeOrderStatusLabel(order:Pick<StoreOrder,"status"|"workflowVersion">,locale:StoreLocale){return order.status==="pending_review"&&order.workflowVersion===1?(locale==="vi"?"Chờ duyệt":"Awaiting review"):ORDER_LABELS[order.status][locale]}
export function storeRefundStatusLabel(order:Pick<StoreOrder,"refundStatus"|"workflowVersion"|"paymentStatus">,locale:StoreLocale){return order.refundStatus==="pending"?(order.workflowVersion===2&&order.paymentStatus==="unconfirmed"?(locale==="vi"?"Chờ đối soát":"Awaiting reconciliation"):(locale==="vi"?"Chờ hoàn":"Awaiting refund")):order.refundStatus==="refunded"?(locale==="vi"?"Đã hoàn":"Refunded"):""}
export function storeOrderStatusSummary(order:Pick<StoreOrder,"status"|"workflowVersion"|"refundStatus"|"paymentStatus">,locale:StoreLocale){
 const status=storeOrderStatusLabel(order,locale),refund=order.status==="cancelled"?storeRefundStatusLabel(order,locale):"";
 return refund?`${status} · ${refund}`:status;
}
export function storeOrderHasDeadline(order:Pick<StoreOrder,"status"|"expiresAt"|"csa">){return !order.csa&&!!order.expiresAt&&["pending_review","payment_pending","payment_review"].includes(order.status)}
export function storeOrderDeadlineLabel(order:Pick<StoreOrder,"status"|"workflowVersion">,locale:StoreLocale){if(order.status==="pending_review")return order.workflowVersion===2?(locale==="vi"?"Hạn xác nhận đơn":"Order confirmation deadline"):(locale==="vi"?"Hạn duyệt":"Review deadline");return order.status==="payment_review"?(locale==="vi"?"Hạn xác nhận thanh toán":"Payment confirmation deadline"):(locale==="vi"?"Hạn thanh toán":"Payment deadline")}
