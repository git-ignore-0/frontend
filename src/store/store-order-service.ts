import {parseStoreDeliveryCalendar} from "./store-delivery.ts";
import {parseStoreProductDetail} from "./store-model";
import {csaUnits} from "../lib/csa-units.ts";
import {AccountApiError} from "@/account/account-api";
import type {Locale} from "@/types";
import {parseStoreOrder,parseStoreCheckoutQuote,type StoreCheckoutQuote,type StoreOrder,type StoreOrderStatus} from "./store-order-model";
import type {StoreQuotaAvailability} from "./store-quote";
type R=Record<string,unknown>;
async function api(path:string,init?:RequestInit){let response:Response;try{response=await fetch(`/api/store-orders/${path}`,{...init,credentials:"same-origin",cache:"no-store",headers:{...(init?.body?{"Content-Type":"application/json","X-NFV-Public-Request":"1"}:{}),...init?.headers}})}catch{throw new AccountApiError("network_error",0)}const payload=await response.json().catch(()=>null) as R|null;if(!response.ok){const errors=Array.isArray(payload?.errors)?payload?.errors:[],first=errors[0] as R|undefined,context=first?.context&&typeof first.context==="object"&&!Array.isArray(first.context)?first.context as R:undefined;throw new AccountApiError(typeof first?.code==="string"?first.code:typeof payload?.error==="string"?payload.error:"request_failed",response.status,context)}if(!payload||typeof payload!=="object")throw new AccountApiError("invalid_response",502);return payload}
export async function createStoreCheckout(body:unknown){return parseStoreOrder((await api("checkout",{method:"POST",body:JSON.stringify(body)})).data)}
export async function getStoreOrder(id:string){return parseStoreOrder((await api(`orders/${encodeURIComponent(id.toLowerCase())}`)).data)}
export async function reportStoreTransfer(id:string){return parseStoreOrder((await api(`orders/${encodeURIComponent(id.toLowerCase())}/report-transfer`,{method:"POST",body:"{}"})).data)}
export async function cancelStoreOrder(id:string,idempotencyKey:string){return parseStoreOrder((await api(`orders/${encodeURIComponent(id.toLowerCase())}/cancel`,{method:"POST",body:JSON.stringify({idempotency_key:idempotencyKey})})).data)}
export async function lookupStoreOrder(referenceCode:string,phoneNumber:string){return parseStoreOrder((await api("lookup",{method:"POST",body:JSON.stringify({reference_code:referenceCode,phone_number:phoneNumber})})).data)}
export async function currentLookupStoreOrder(){return parseStoreOrder((await api("lookup/current")).data)}
export async function getStoreOrders(input:{page:number;status?:StoreOrderStatus}){const query=new URLSearchParams({page:String(input.page),page_size:"20"});if(input.status)query.set("status",input.status);const payload=await api(`user-orders?${query}`),meta=payload.meta as R;if(!Array.isArray(payload.data)||!meta)throw new AccountApiError("invalid_response",502);return {items:payload.data.map(parseStoreOrder),meta:{page:Number(meta.page),pageSize:Number(meta.page_size),total:Number(meta.total)}}}
export async function getUserStoreOrder(id:string){return parseStoreOrder((await api(`user-orders/${id}`)).data)}
export async function getStoreQuota(locale:Locale,orderId?:string):Promise<{active:boolean;products:StoreQuotaAvailability[]}>{
 const query=new URLSearchParams({locale});if(orderId)query.set("store_order_id",orderId);
 const data=(await api(`quota?${query}`)).data;
 if(data===null)return {active:false,products:[]};
 try{
  const value=data as R;if(!Array.isArray(value.products))throw Error();
  const products=value.products.map(row=>{
   const item=row as R;
   return {productId:String(item.product_id),availableUnits:csaUnits(orderId?item.available_units_for_order:item.available_units)};
  });
  return {active:true,products};
 }catch{throw new AccountApiError("invalid_response",502)}
}
export async function getShippingQuote(provinceCode:string,wardCode:string){const data=(await api("shipping-quote",{method:"POST",body:JSON.stringify({province_code:provinceCode,ward_code:wardCode})})).data as R;return {supported:data.supported===true,shippingFeeVnd:data.shipping_fee_vnd===null?null:Number(data.shipping_fee_vnd)}}
export function storeOrderHref(order:Pick<StoreOrder,"id"|"locale">){return `/store/orders/${order.id}/${order.locale}`}

export type BuyAgainLine={productId:string;quantity:number;name:string;reason:"unavailable"|"out_of_stock"|"insufficient_stock"|null;product:import("./store-model").StoreProductDetail|null};
export async function prepareBuyAgain(id:string,locale:Locale):Promise<BuyAgainLine[]>{
 const data=(await api(`user-orders/${encodeURIComponent(id)}/buy-again?locale=${locale}`)).data as R;
 if(!data||!Array.isArray(data.lines)||!data.lines.length)throw new AccountApiError("invalid_response",502);
 return data.lines.map((row:unknown)=>{
  if(!row||typeof row!=="object")throw new AccountApiError("invalid_response",502);
  const value=row as R;
  if(typeof value.product_id!=="string"||!Number.isSafeInteger(value.quantity)||Number(value.quantity)<=0||typeof value.name!=="string"||![null,"unavailable","out_of_stock","insufficient_stock"].includes(value.reason as string|null))throw new AccountApiError("invalid_response",502);
  const product=value.product===null?null:parseStoreProductDetail({data:value.product});
  if(product&&product.id!==value.product_id||value.reason===null&&(!product||product.available_quantity<Number(value.quantity)))throw new AccountApiError("invalid_response",502);
  return {productId:value.product_id,quantity:Number(value.quantity),name:value.name,reason:value.reason as BuyAgainLine["reason"],product};
 });
}

export type {StoreCheckoutQuote,StoreCouponSnapshot,StoreVoucherExpectedLine} from "./store-order-model";
export type StoreQuoteRequest={delivery_date:string;locale:Locale;coupon_code?:string;guest?:{recipient_name:string;phone_number:string;province_code:string;ward_code:string;address:string};lines:{product_id:string;quantity:number;use_quota:boolean}[]};
export async function getStoreQuote(input:StoreQuoteRequest):Promise<StoreCheckoutQuote>{
 const payload=await api("quote",{method:"POST",body:JSON.stringify(input)});
 try{return parseStoreCheckoutQuote(payload.data)}catch{throw new AccountApiError("invalid_response",502)}
}
export async function getStoreDeliveryDates(){
 const payload=await api("delivery-dates");
 try{return parseStoreDeliveryCalendar(payload.data)}catch{throw new AccountApiError("invalid_response",502)}
}
