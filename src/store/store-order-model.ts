import {isStoreDeliveryDate} from "./store-delivery.ts";
import {parseCsaRound,parseCsaSelection,type CsaRound,type CsaSelection} from "../account/csa-rounds-model.ts";
import {csaUnits} from "../lib/csa-units.ts";
import type {StoreLocale} from "./store-model";
export type StoreOrderStatus="payment_pending"|"pending_review"|"pending_delivery"|"delivered"|"cancelled";
export type StorePaymentStatus="not_required"|"unconfirmed"|"received"|"refund_required"|"refunded";
export type StoreOrderLine={id:string;productId:string;imageUrl?:string|null;sku:string;name:string;unitSize:string;unitLabel:string;unitPriceVnd:number;quantity:number;quotaGroupId:string|null;quotaCost:number;quotaQuantity:number;quotaUnits:number;cashQuantity:number;cashSubtotalVnd:number};
export type StoreOrder={csa?:{round:CsaRound;selection:CsaSelection};canBuyAgain:boolean;id:string;referenceCode:string;status:StoreOrderStatus;paymentStatus:StorePaymentStatus;locale:StoreLocale;lines:StoreOrderLine[];shippingAddress:{recipientName:string;phoneNumber:string;provinceCode:string;wardCode:string;address:string};subtotalVnd:number;discountAmountVnd:number;coupon:StoreCouponSnapshot|null;shippingFeeVnd:number;shippingDiscountReason:string|null;deliveryDate:string|null;totalVnd:number;payment:null|{status:StorePaymentStatus;bankBin:string;bankName:string;accountNumber:string;accountName:string;transferContent:string;qrPayload:{acqId:string;accountNo:string;accountName:string;amount:number;addInfo:string};receivedAt:string|null;refundedAt:string|null;refundAmountVnd:number|null;refundNote:string};expiresAt:string|null;serverTime:string;transferReportedAt:string|null;approvedAt:string|null;deliveredAt:string|null;cancelledAt:string|null;cancellationReason:string|null;reconciliationNote:string;createdAt:string;updatedAt:string};
type R=Record<string,unknown>;const rec=(v:unknown):R=>{if(!v||typeof v!=="object"||Array.isArray(v))throw Error("invalid_response");return v as R};
const str=(v:unknown)=>{if(typeof v!=="string")throw Error("invalid_response");return v};const pos=(v:unknown)=>{const n=typeof v==="string"&&/^\d+$/.test(v)?Number(v):v;if(!Number.isSafeInteger(n)||Number(n)<0)throw Error("invalid_response");return Number(n)};const nullable=(v:unknown)=>v===null?null:str(v);
export function parseStoreOrder(value:unknown):StoreOrder{const v=rec(value),address=rec(v.shipping_address),payment=v.payment===null?null:rec(v.payment);if(!Array.isArray(v.lines))throw Error("invalid_response");
 const status=str(v.status) as StoreOrderStatus,paymentStatus=str(v.payment_status) as StorePaymentStatus;if(!["payment_pending","pending_review","pending_delivery","delivered","cancelled"].includes(status)||!["not_required","unconfirmed","received","refund_required","refunded"].includes(paymentStatus))throw Error("invalid_response");
 const csa=v.csa==null?undefined:(()=>{const data=rec(v.csa),round=parseCsaRound(data.round),selection=parseCsaSelection(data.selection);if(selection.roundId!==round.id)throw Error("invalid_response");return {round,selection}})();
 return {...(csa?{csa}:{}),canBuyAgain:!csa&&v.can_buy_again===true,id:str(v.id),referenceCode:str(v.reference_code),status,paymentStatus,locale:str(v.locale) as StoreLocale,lines:v.lines.map(row=>{const l=rec(row);return {id:str(l.id),productId:str(l.product_id),imageUrl:typeof l.image_url==="string"&&/^https?:\/\//i.test(l.image_url)?l.image_url:null,sku:str(l.sku),name:str(l.name),unitSize:str(l.unit_size),unitLabel:str(l.unit_label),unitPriceVnd:pos(l.unit_price_vnd),quantity:pos(l.quantity),quotaGroupId:nullable(l.quota_group_id),quotaCost:csaUnits(l.quota_cost),quotaQuantity:pos(l.quota_quantity),quotaUnits:csaUnits(l.quota_units),cashQuantity:pos(l.cash_quantity),cashSubtotalVnd:pos(l.cash_subtotal_vnd)}}),shippingAddress:{recipientName:str(address.recipient_name),phoneNumber:str(address.phone_number),provinceCode:str(address.province_code),wardCode:str(address.ward_code),address:str(address.address)},subtotalVnd:pos(v.subtotal_vnd),discountAmountVnd:v.discount_amount_vnd===undefined?0:pos(v.discount_amount_vnd),coupon:v.coupon===undefined||v.coupon===null?null:parseStoreCouponSnapshot(v.coupon),shippingFeeVnd:pos(v.shipping_fee_vnd),shippingDiscountReason:nullable(v.shipping_discount_reason),deliveryDate:v.delivery_date==null?null:(isStoreDeliveryDate(v.delivery_date)?v.delivery_date:(()=>{throw Error("invalid_response")})()),totalVnd:pos(v.total_vnd),payment:payment?{status:str(payment.status) as StorePaymentStatus,bankBin:str(payment.bank_bin),bankName:str(payment.bank_name),accountNumber:str(payment.account_number),accountName:str(payment.account_name),transferContent:str(payment.transfer_content),qrPayload:(()=>{const q=rec(payment.qr_payload);return {acqId:str(q.acqId),accountNo:str(q.accountNo),accountName:str(q.accountName),amount:pos(q.amount),addInfo:str(q.addInfo)}})(),receivedAt:nullable(payment.received_at),refundedAt:nullable(payment.refunded_at),refundAmountVnd:payment.refund_amount_vnd===null?null:pos(payment.refund_amount_vnd),refundNote:str(payment.refund_note)}:null,expiresAt:nullable(v.expires_at),serverTime:str(v.server_time),transferReportedAt:nullable(v.transfer_reported_at),approvedAt:nullable(v.approved_at),deliveredAt:nullable(v.delivered_at),cancelledAt:nullable(v.cancelled_at),cancellationReason:nullable(v.cancellation_reason),reconciliationNote:str(v.reconciliation_note),createdAt:str(v.created_at),updatedAt:str(v.updated_at)};
}

export type StoreCouponSnapshot={id:string;code:string;discountType:"percent"|"fixed";discountValue:string;maximumDiscountAmount:string|null;subtotalVnd:number;eligibleSubtotalVnd:number;discountAmountVnd:number;totalVnd:number};
export type StoreVoucherExpectedLine={product_id:string;quantity:number;use_quota:boolean;expected_unit_price_vnd:number;expected_available_quantity:number;expected_quota_quantity:number};
export type StoreCheckoutQuote={subtotalVnd:number;eligibleSubtotalVnd:number;discountAmountVnd:number;shippingFeeVnd:number;totalVnd:number;deliveryDate:string;shippingDiscountReason:"csa_companion_delivery"|null;coupon:StoreCouponSnapshot|null;voucherQuote:string|null;shippingAddressUpdatedAt:string|null;lines:StoreVoucherExpectedLine[]};
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
const previewUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const previewTimestamp=(v:unknown)=>{const value=str(v);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw Error("invalid_response");return value};
export function parseStoreCheckoutQuote(value:unknown):StoreCheckoutQuote{
 const v=rec(value);
 if(!Array.isArray(v.lines)||!v.lines.length||v.lines.length>50)throw Error("invalid_response");
 if(!isStoreDeliveryDate(v.delivery_date)||![null,"csa_companion_delivery"].includes(v.shipping_discount_reason as string|null))throw Error("invalid_response");
 const money=(value:unknown)=>{if(typeof value!=="string"||!/^\d+$/.test(value))throw Error("invalid_response");return pos(value)};
 const result={deliveryDate:v.delivery_date,shippingDiscountReason:v.shipping_discount_reason as "csa_companion_delivery"|null,subtotalVnd:money(v.subtotal_vnd),eligibleSubtotalVnd:money(v.eligible_subtotal_vnd),discountAmountVnd:money(v.discount_amount_vnd),shippingFeeVnd:money(v.shipping_fee_vnd),totalVnd:money(v.total_vnd),coupon:v.coupon===null?null:parseStoreCouponSnapshot(v.coupon),voucherQuote:v.voucher_quote===null?null:nonempty(v.voucher_quote),shippingAddressUpdatedAt:v.shipping_address_updated_at===null?null:previewTimestamp(v.shipping_address_updated_at),lines:v.lines.map(row=>{
  const l=rec(row),quantity=integer(l.quantity),quota=integer(l.expected_quota_quantity),price=integer(l.expected_unit_price_vnd);
  if(quantity<1||quantity>999||quota>quantity||price<1||typeof l.use_quota!=="boolean"||(!l.use_quota&&quota!==0))throw Error("invalid_response");
  return {product_id:nonempty(l.product_id),quantity,use_quota:l.use_quota,expected_unit_price_vnd:price,expected_available_quantity:integer(l.expected_available_quantity),expected_quota_quantity:quota};
 })};
 const c=result.coupon;
 if(c?(!result.voucherQuote||!result.shippingAddressUpdatedAt||! /^[a-f0-9]{40}$/.test(result.voucherQuote)||!previewUuid.test(c.id)||!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(c.code)):result.voucherQuote!==null||result.discountAmountVnd!==0)throw Error("invalid_response");
 const productIds=new Set<string>();
 for(const line of result.lines){
  const id=line.product_id.toLowerCase();
  if(!previewUuid.test(id)||productIds.has(id)||line.expected_available_quantity>2147483647)throw Error("invalid_response");
  productIds.add(id);
 }
 if((c&&(result.subtotalVnd!==c.subtotalVnd||result.eligibleSubtotalVnd!==c.eligibleSubtotalVnd||result.discountAmountVnd!==c.discountAmountVnd||result.totalVnd!==c.totalVnd))||result.discountAmountVnd>result.subtotalVnd||result.eligibleSubtotalVnd>result.subtotalVnd||result.totalVnd-result.shippingFeeVnd!==result.subtotalVnd-result.discountAmountVnd||result.lines.reduce((sum,line)=>sum+(line.quantity-line.expected_quota_quantity)*line.expected_unit_price_vnd,0)!==result.subtotalVnd)throw Error("invalid_response");
 return result;
}
