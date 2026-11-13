import type {StoreOrder} from "./store-order-model";
import type {StoreLocale} from "./store-model";

export type StoreOrderAddressNames={provinceName:string;wardName:string};

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
  if(order.csa)return "";
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
