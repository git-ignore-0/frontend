import {isStoreDeliveryDate} from "./store-delivery.ts";
import {parseCsaRound,parseCsaSelection,type CsaRound,type CsaSelection} from "../account/csa-rounds-model.ts";
import {csaHundredths} from "../lib/csa-units.ts";
import type {StoreLocale} from "./store-model";
export type StoreOrderStatus="payment_pending"|"pending_review"|"payment_review"|"pending_delivery"|"delivered"|"cancelled";
export type StorePaymentStatus="not_required"|"unconfirmed"|"received"|"refund_required"|"refunded";
export type StoreOrderLine={id:string;productId:string;imageUrl?:string|null;sku:string;name:string;unitSize:string;unitLabel:string;unitPriceVnd:number;quantity:number;quotaGroupId:string|null;quotaCost:number;quotaQuantity:number;quotaUnits:number;cashQuantity:number;cashSubtotalVnd:number};
export type StoreOrder={csa?:{round:CsaRound;selection:CsaSelection};canBuyAgain:boolean;id:string;referenceCode:string;workflowVersion:1|2;refundStatus:null|"pending"|"refunded";transferReportedBy:string|null;approvedBy:string|null;paymentReceivedAt:string|null;paymentReceivedBy:string|null;refundRequestedAt:string|null;refundRequestedBy:string|null;refundRequestClosedAt:string|null;refundRequestClosedBy:string|null;refundRequestClosedReason:string|null;refundedAt:string|null;refundedBy:string|null;refundAmountVnd:number|null;refundNote:string;cancelledBy:string|null;deliveredBy:string|null;status:StoreOrderStatus;paymentStatus:StorePaymentStatus;locale:StoreLocale;lines:StoreOrderLine[];shippingAddress:{recipientName:string;phoneNumber:string;provinceCode:string;wardCode:string;address:string};subtotalVnd:number;discountAmountVnd:number;coupon:StoreCouponSnapshot|null;shippingFeeVnd:number;shippingDiscountReason:string|null;deliveryDate:string|null;totalVnd:number;payment:null|{status:StorePaymentStatus;bankBin:string;bankName:string;accountNumber:string;accountName:string;transferContent:string;qrPayload:{acqId:string;accountNo:string;accountName:string;amount:number;addInfo:string};receivedAt:string|null;refundedAt:string|null;refundAmountVnd:number|null;refundNote:string};expiresAt:string|null;serverTime:string;transferReportedAt:string|null;approvedAt:string|null;deliveredAt:string|null;cancelledAt:string|null;cancellationReason:string|null;reconciliationNote:string;createdAt:string;updatedAt:string};
type R=Record<string,unknown>;const rec=(v:unknown):R=>{if(!v||typeof v!=="object"||Array.isArray(v))throw Error("invalid_response");return v as R};
const str=(v:unknown)=>{if(typeof v!=="string")throw Error("invalid_response");return v};const pos=(v:unknown)=>{const n=typeof v==="string"&&/^\d+$/.test(v)?Number(v):v;if(!Number.isSafeInteger(n)||Number(n)<0)throw Error("invalid_response");return Number(n)};const nullable=(v:unknown)=>v===null?null:str(v);
const stamp=(v:unknown)=>{const value=nullable(v);if(value!==null&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(`${value.slice(0,10)}T12:00:00Z`).toISOString().slice(0,10)!==value.slice(0,10)))throw Error("invalid_response");return value};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function storeOrderUuid(value:unknown):string {
 const id=str(value);
 if(!uuidPattern.test(id))throw Error("invalid_response");
 return id.toLowerCase();
}
const actor=(value:unknown)=>value===null?null:storeOrderUuid(value);
function parseOrderLine(value:unknown):StoreOrderLine{
 const row=rec(value),quantity=integer(row.quantity),quotaQuantity=integer(row.quota_quantity),cashQuantity=integer(row.cash_quantity);
 const unitPriceVnd=pos(row.unit_price_vnd),cashSubtotalVnd=pos(row.cash_subtotal_vnd);
 const quotaGroupId=actor(row.quota_group_id),quotaCost=csaHundredths(row.quota_cost),quotaUnits=csaHundredths(row.quota_units);
 if(quantity<1||quotaQuantity+cashQuantity!==quantity||quotaUnits!==quotaCost*quotaQuantity||
    (!quotaGroupId&&quotaQuantity!==0)||cashSubtotalVnd!==unitPriceVnd*cashQuantity)throw Error("invalid_response");
 const unitSize=str(row.unit_size);
 if(!/^\d+\.\d{3}$/.test(unitSize))throw Error("invalid_response");
 return {id:storeOrderUuid(row.id),productId:storeOrderUuid(row.product_id),
   imageUrl:typeof row.image_url==="string"&&/^https?:\/\//i.test(row.image_url)?row.image_url:null,
   sku:nonempty(row.sku),name:nonempty(row.name),unitSize,unitLabel:nonempty(row.unit_label),
   unitPriceVnd,quantity,quotaGroupId,quotaCost:quotaCost/100,quotaQuantity,quotaUnits:quotaUnits/100,cashQuantity,cashSubtotalVnd};
}

type StorePayment=NonNullable<StoreOrder["payment"]>;
export function validStorePaymentQr(payment:StorePayment,totalVnd:number):boolean{
 const q=payment.qrPayload;
 return totalVnd>0&&q.amount===totalVnd&&q.acqId===payment.bankBin&&q.accountNo===payment.accountNumber&&
   q.accountName===payment.accountName&&q.addInfo===payment.transferContent&&
   /^[0-9]{6}$/.test(q.acqId)&&/^[0-9]+$/.test(q.accountNo)&&!!q.accountName.trim()&&!!q.addInfo.trim();
}
function parseOrderPayment(value:unknown,paymentStatus:StorePaymentStatus,totalVnd:number):StorePayment|null{
 if(value===null)return null;
 const p=rec(value),q=rec(p.qr_payload);
 if(p.status!==paymentStatus)throw Error("invalid_response");
 const payment:StorePayment={status:paymentStatus,bankBin:str(p.bank_bin),bankName:nonempty(p.bank_name),
   accountNumber:str(p.account_number),accountName:str(p.account_name),transferContent:str(p.transfer_content),
   qrPayload:{acqId:str(q.acqId),accountNo:str(q.accountNo),accountName:str(q.accountName),amount:integer(q.amount),addInfo:str(q.addInfo)},
   receivedAt:stamp(p.received_at),refundedAt:stamp(p.refunded_at),refundAmountVnd:p.refund_amount_vnd===null?null:pos(p.refund_amount_vnd),refundNote:str(p.refund_note)};
 if(!validStorePaymentQr(payment,totalVnd))throw Error("invalid_response");
 return payment;
}
export function parseStoreOrder(value:unknown):StoreOrder{const v=rec(value),id=storeOrderUuid(v.id),address=rec(v.shipping_address);if(!Array.isArray(v.lines))throw Error("invalid_response");
 const status=str(v.status) as StoreOrderStatus,paymentStatus=str(v.payment_status) as StorePaymentStatus;const workflowVersion=v.workflow_version;if(workflowVersion!==1&&workflowVersion!==2)throw Error("invalid_response");const refundStatus=v.refund_status;if(refundStatus!==null&&refundStatus!=="pending"&&refundStatus!=="refunded")throw Error("invalid_response");if(!["payment_pending","pending_review","payment_review","pending_delivery","delivered","cancelled"].includes(status)||!["not_required","unconfirmed","received","refund_required","refunded"].includes(paymentStatus))throw Error("invalid_response");
 const locale=v.locale;if(locale!=="vi"&&locale!=="en")throw Error("invalid_response");
 const csa=v.csa==null?undefined:(()=>{const data=rec(v.csa),round=parseCsaRound(data.round),selection=parseCsaSelection(data.selection);if(selection.roundId!==round.id||selection.orderId!==id)throw Error("invalid_response");return {round,selection}})();
 const lines=v.lines.map(parseOrderLine);
 if(new Set(lines.map(line=>line.id)).size!==lines.length||new Set(lines.map(line=>line.productId)).size!==lines.length)
   throw Error("invalid_response");
 const subtotalVnd=pos(v.subtotal_vnd),discountAmountVnd=v.discount_amount_vnd===undefined?0:pos(v.discount_amount_vnd);
 const shippingFeeVnd=pos(v.shipping_fee_vnd),totalVnd=pos(v.total_vnd);
 if(discountAmountVnd>subtotalVnd||totalVnd-shippingFeeVnd!==subtotalVnd-discountAmountVnd||
    lines.reduce((sum,line)=>sum+line.cashSubtotalVnd,0)!==subtotalVnd)throw Error("invalid_response");
 const coupon=v.coupon===undefined||v.coupon===null?null:parseStoreCouponSnapshot(v.coupon);
 if(coupon&&(coupon.subtotalVnd!==subtotalVnd||coupon.discountAmountVnd!==discountAmountVnd||coupon.totalVnd!==totalVnd))
   throw Error("invalid_response");
 return {...(csa?{csa}:{}),canBuyAgain:!csa&&v.can_buy_again===true,id,referenceCode:nonempty(v.reference_code),workflowVersion,refundStatus,transferReportedBy:actor(v.transfer_reported_by),approvedBy:actor(v.approved_by),paymentReceivedAt:stamp(v.payment_received_at),paymentReceivedBy:actor(v.payment_received_by),refundRequestedAt:stamp(v.refund_requested_at),refundRequestedBy:actor(v.refund_requested_by),refundRequestClosedAt:stamp(v.refund_request_closed_at),refundRequestClosedBy:actor(v.refund_request_closed_by),refundRequestClosedReason:nullable(v.refund_request_closed_reason),refundedAt:stamp(v.refunded_at),refundedBy:actor(v.refunded_by),refundAmountVnd:v.refund_amount_vnd===null?null:pos(v.refund_amount_vnd),refundNote:str(v.refund_note),cancelledBy:actor(v.cancelled_by),deliveredBy:actor(v.delivered_by),status,paymentStatus,locale,lines,shippingAddress:{recipientName:str(address.recipient_name),phoneNumber:str(address.phone_number),provinceCode:str(address.province_code),wardCode:str(address.ward_code),address:str(address.address)},subtotalVnd,discountAmountVnd,coupon,shippingFeeVnd,shippingDiscountReason:nullable(v.shipping_discount_reason),deliveryDate:v.delivery_date==null?null:(isStoreDeliveryDate(v.delivery_date)?v.delivery_date:(()=>{throw Error("invalid_response")})()),totalVnd,payment:parseOrderPayment(v.payment,paymentStatus,totalVnd),expiresAt:stamp(v.expires_at),serverTime:previewTimestamp(v.server_time),transferReportedAt:stamp(v.transfer_reported_at),approvedAt:stamp(v.approved_at),deliveredAt:stamp(v.delivered_at),cancelledAt:stamp(v.cancelled_at),cancellationReason:nullable(v.cancellation_reason),reconciliationNote:str(v.reconciliation_note),createdAt:previewTimestamp(v.created_at),updatedAt:previewTimestamp(v.updated_at)};
}

export type StoreCouponSnapshot={id:string;code:string;discountType:"percent"|"fixed";discountValue:string;maximumDiscountAmount:string|null;subtotalVnd:number;eligibleSubtotalVnd:number;discountAmountVnd:number;totalVnd:number};
export type StoreVoucherExpectedLine={product_id:string;quantity:number;use_quota:boolean;expected_unit_price_vnd:number;expected_available_quantity:number;expected_quota_quantity:number};
export type StoreCheckoutQuote={subtotalVnd:number;eligibleSubtotalVnd:number;discountAmountVnd:number;shippingFeeVnd:number;totalVnd:number;deliveryDate:string;shippingDiscountReason:"csa_companion_delivery"|null;coupon:StoreCouponSnapshot|null;voucherQuote:string|null;shippingAddressUpdatedAt:string|null;shippingAddressVersion?:string;lines:StoreVoucherExpectedLine[]};
/** Parsed quotes have a canonical shape; include date/token even when the displayed money is equal. */
export function sameStoreCheckoutQuote(previous:StoreCheckoutQuote,next:StoreCheckoutQuote){
 return JSON.stringify(previous)===JSON.stringify(next);
}
const integer=(v:unknown)=>{if(typeof v!=="number")throw Error("invalid_response");return pos(v)};
const nonempty=(v:unknown)=>{const value=str(v);if(!value.trim())throw Error("invalid_response");return value};
const decimal=(v:unknown)=>{const value=str(v);if(!/^\d+(?:\.\d{1,2})?$/.test(value))throw Error("invalid_response");return value};
export function parseStoreCouponSnapshot(value:unknown):StoreCouponSnapshot{
 const v=rec(value),discountType=str(v.discount_type);
 if(discountType!=="percent"&&discountType!=="fixed")throw Error("invalid_response");
 const snapshot:StoreCouponSnapshot={id:nonempty(v.id),code:nonempty(v.code),discountType,discountValue:decimal(v.discount_value),maximumDiscountAmount:v.maximum_discount_amount===null?null:decimal(v.maximum_discount_amount),subtotalVnd:integer(v.subtotal_vnd),eligibleSubtotalVnd:integer(v.eligible_subtotal_vnd),discountAmountVnd:integer(v.discount_amount_vnd),totalVnd:integer(v.total_vnd)};
 if(snapshot.discountAmountVnd>snapshot.eligibleSubtotalVnd||snapshot.eligibleSubtotalVnd>snapshot.subtotalVnd)throw Error("invalid_response");
 return snapshot;
}
const previewTimestamp=(v:unknown)=>{const value=str(v);stamp(value);return value};
export function parseStoreCheckoutQuote(value:unknown):StoreCheckoutQuote{
 const v=rec(value);
 if(!Array.isArray(v.lines)||!v.lines.length||v.lines.length>50)throw Error("invalid_response");
 if(!isStoreDeliveryDate(v.delivery_date)||![null,"csa_companion_delivery"].includes(v.shipping_discount_reason as string|null))throw Error("invalid_response");
 const addressVersion=v.shipping_address_version??undefined;
 if(addressVersion!==undefined&&(typeof addressVersion!=="string"||!/^[a-f0-9]{64}$/.test(addressVersion)||!v.shipping_address_updated_at))throw Error("invalid_response");
 const money=(value:unknown)=>{if(typeof value!=="string"||!/^\d+$/.test(value))throw Error("invalid_response");return pos(value)};
 const result={deliveryDate:v.delivery_date,shippingDiscountReason:v.shipping_discount_reason as "csa_companion_delivery"|null,subtotalVnd:money(v.subtotal_vnd),eligibleSubtotalVnd:money(v.eligible_subtotal_vnd),discountAmountVnd:money(v.discount_amount_vnd),shippingFeeVnd:money(v.shipping_fee_vnd),totalVnd:money(v.total_vnd),coupon:v.coupon===null?null:parseStoreCouponSnapshot(v.coupon),voucherQuote:v.voucher_quote===null?null:nonempty(v.voucher_quote),shippingAddressUpdatedAt:v.shipping_address_updated_at===null?null:previewTimestamp(v.shipping_address_updated_at),lines:v.lines.map(row=>{
  const l=rec(row),quantity=integer(l.quantity),quota=integer(l.expected_quota_quantity),price=integer(l.expected_unit_price_vnd);
  if(quantity<1||quantity>999||quota>quantity||price<1||typeof l.use_quota!=="boolean"||(!l.use_quota&&quota!==0))throw Error("invalid_response");
  return {product_id:nonempty(l.product_id),quantity,use_quota:l.use_quota,expected_unit_price_vnd:price,expected_available_quantity:integer(l.expected_available_quantity),expected_quota_quantity:quota};
 })};
 const c=result.coupon;
 if(c?(!result.voucherQuote||!result.shippingAddressUpdatedAt||! /^[a-f0-9]{40}$/.test(result.voucherQuote)||!uuidPattern.test(c.id)||!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(c.code)):result.voucherQuote!==null||result.discountAmountVnd!==0)throw Error("invalid_response");
 const productIds=new Set<string>();
 for(const line of result.lines){
  const id=line.product_id.toLowerCase();
  if(!uuidPattern.test(id)||productIds.has(id))throw Error("invalid_response");
  productIds.add(id);
 }
 if((c&&(result.subtotalVnd!==c.subtotalVnd||result.eligibleSubtotalVnd!==c.eligibleSubtotalVnd||result.discountAmountVnd!==c.discountAmountVnd||result.totalVnd!==c.totalVnd))||result.discountAmountVnd>result.subtotalVnd||result.eligibleSubtotalVnd>result.subtotalVnd||result.totalVnd-result.shippingFeeVnd!==result.subtotalVnd-result.discountAmountVnd||result.lines.reduce((sum,line)=>sum+(line.quantity-line.expected_quota_quantity)*line.expected_unit_price_vnd,0)!==result.subtotalVnd)throw Error("invalid_response");
 return {...result,...(addressVersion?{shippingAddressVersion:addressVersion}:{})};
}
