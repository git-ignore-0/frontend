import {csaHundredths} from "../lib/csa-units.ts";
import type {StoreLocale,StoreProductCard} from "./store-model";

export type StoreQuotaAvailability={productId:string;availableUnits:number};
export type StoreQuoteLine={product:StoreProductCard;quantity:number;useQuota:boolean;quotaQuantity:number;quotaUnits:number;cashQuantity:number;cashSubtotalVnd:number};
export type StoreQuote={lines:StoreQuoteLine[];goodsValueVnd:number;quotaValueVnd:number;cashSubtotalVnd:number;shippingFeeVnd:number;shippingDiscountReason:string|null;totalVnd:number};

export function buildStoreQuote(input:{products:StoreProductCard[];quantities:Record<string,number>;useQuota:Record<string,boolean>;quota:StoreQuotaAvailability[];shippingFeeVnd:number;hasActiveCsa:boolean}):StoreQuote{
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
 const freeShipping=input.hasActiveCsa&&lines.some(line=>line.product.csa_quota_group!==null);
 const shippingFeeVnd=freeShipping?0:input.shippingFeeVnd;
 return {lines,goodsValueVnd,quotaValueVnd,cashSubtotalVnd,shippingFeeVnd,shippingDiscountReason:freeShipping?"active_csa_with_csa_product":null,totalVnd:cashSubtotalVnd+shippingFeeVnd};
}

type GuestAddress={recipient_name:string;phone_number:string;province_code:string;ward_code:string;address:string};
export function checkoutPayload(input:{quote:StoreQuote|Pick<StoreQuote,"lines"|"shippingFeeVnd"|"totalVnd">;locale:StoreLocale;idempotencyKey:string;shippingAddressUpdatedAt?:string;guest?:GuestAddress}){
 return {idempotency_key:input.idempotencyKey,locale:input.locale,
  lines:input.quote.lines.map(line=>({product_id:line.product.id,quantity:line.quantity,use_quota:line.useQuota,expected_unit_price_vnd:line.product.retail_price_vnd,expected_available_quantity:line.product.available_quantity,expected_quota_quantity:line.quotaQuantity})),
  expected_shipping_fee_vnd:input.quote.shippingFeeVnd,expected_total_vnd:input.quote.totalVnd,
  ...(input.shippingAddressUpdatedAt?{shipping_address_updated_at:input.shippingAddressUpdatedAt}:{}),...(input.guest?{guest:input.guest}:{})};
}
