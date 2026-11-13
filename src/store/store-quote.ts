import {csaHundredths} from "../lib/csa-units.ts";
import type {StoreLocale,StoreProductCard} from "./store-model";
import type {StoreCheckoutQuote} from "./store-order-service";

export type StoreQuotaAvailability={productId:string;availableUnits:number};
export type StoreQuoteLine={product:StoreProductCard;quantity:number;useQuota:boolean;quotaQuantity:number;quotaUnits:number;cashQuantity:number;cashSubtotalVnd:number};
export type StoreQuote={lines:StoreQuoteLine[];goodsValueVnd:number;quotaValueVnd:number;cashSubtotalVnd:number};

export function buildStoreQuote(input:{products:StoreProductCard[];quantities:Record<string,number>;useQuota:Record<string,boolean>;quota:StoreQuotaAvailability[];hasActiveCsa:boolean}):StoreQuote{
 const balances=new Map(input.quota.map(item=>[item.productId,csaHundredths(item.availableUnits)]));
 let goodsValueVnd=0,quotaValueVnd=0;
 const lines=input.products.flatMap(product=>{
  const quantity=input.quantities[product.id]??0;
  if(!Number.isSafeInteger(quantity)||quantity<=0)return [];
  const group=product.csa_quota_group,useQuota=!!input.useQuota[product.id]&&!!group&&input.hasActiveCsa;
  const available=group?balances.get(group.id)??0:0;
  const cost=group?csaHundredths(group.cost):0;
  if(group&&cost===0)throw Error("invalid_response");
  const quotaQuantity=useQuota&&group?Math.min(quantity,Math.floor(available/cost)):0;
  const quotaHundredths=quotaQuantity*cost;
  if(group&&quotaQuantity)balances.set(group.id,available-quotaHundredths);
  const cashQuantity=quantity-quotaQuantity,cashSubtotalVnd=cashQuantity*product.retail_price_vnd;
  goodsValueVnd+=quantity*product.retail_price_vnd;quotaValueVnd+=quotaQuantity*product.retail_price_vnd;
  return [{product,quantity,useQuota,quotaQuantity,quotaUnits:quotaHundredths/100,cashQuantity,cashSubtotalVnd}];
 });
 const cashSubtotalVnd=lines.reduce((sum,line)=>sum+line.cashSubtotalVnd,0);
 return {lines,goodsValueVnd,quotaValueVnd,cashSubtotalVnd};
}

type GuestAddress={recipient_name:string;phone_number:string;province_code:string;ward_code:string;address:string};
export function checkoutPayload(input:{quote:StoreCheckoutQuote;locale:StoreLocale;idempotencyKey:string;guest?:GuestAddress}){
 const q=input.quote;
 if(input.guest&&(q.coupon||q.shippingAddressUpdatedAt)||!input.guest&&!q.shippingAddressUpdatedAt)throw Error("invalid_checkout_intent");
 return {idempotency_key:input.idempotencyKey,locale:input.locale,delivery_date:q.deliveryDate,
  lines:q.lines.map(line=>({...line})),expected_shipping_fee_vnd:q.shippingFeeVnd,expected_total_vnd:q.totalVnd,
  ...(q.shippingAddressUpdatedAt?{shipping_address_updated_at:q.shippingAddressUpdatedAt}:{}),...(input.guest?{guest:input.guest}:{}),
  ...(q.coupon&&q.voucherQuote?{coupon_code:q.coupon.code,expected_voucher_quote:q.voucherQuote}:{})};
}

// Compare the values the buyer reviewed, not the opaque voucher token or only the final total.
export function matchesCheckoutEstimate(server:StoreCheckoutQuote,input:{quote:StoreQuote;deliveryDate:string;shippingFeeVnd:number;discountAmountVnd:number;totalVnd:number;voucherCode:string}){
 return server.deliveryDate===input.deliveryDate&&server.subtotalVnd===input.quote.cashSubtotalVnd&&server.shippingFeeVnd===input.shippingFeeVnd&&server.discountAmountVnd===input.discountAmountVnd&&server.totalVnd===input.totalVnd&&(server.coupon?.code??'')===input.voucherCode&&server.lines.length===input.quote.lines.length&&server.lines.every(line=>{
  const shown=input.quote.lines.find(item=>item.product.id===line.product_id);
  return !!shown&&line.quantity===shown.quantity&&line.use_quota===shown.useQuota&&line.expected_unit_price_vnd===shown.product.retail_price_vnd&&line.expected_available_quantity===shown.product.available_quantity&&line.expected_quota_quantity===shown.quotaQuantity;
 });
}
