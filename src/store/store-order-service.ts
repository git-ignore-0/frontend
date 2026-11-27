import {parseStoreDeliveryCalendar} from "./store-delivery.ts";
import {parseStoreProductDetail,type StoreProductDetail} from "./store-model";
import {csaUnits} from "../lib/csa-units.ts";
import {AccountApiError,publicJson} from "../account/account-api.ts";
import {storeOrderTarget} from "./order-bff.ts";
import type {Locale} from "@/types";
import {parseStoreOrder,parseStoreCheckoutQuote,storeOrderUuid,type StoreCheckoutQuote,type StoreOrder,type StoreOrderStatus} from "./store-order-model";
import type {StoreCheckoutPayload} from "./checkout-intent";
import type {StoreQuotaAvailability} from "./store-quote";

type R=Record<string,unknown>;
const invalid=()=>new AccountApiError("invalid_response",502);
function record(value:unknown):R{
 if(!value||typeof value!=="object"||Array.isArray(value))throw invalid();
 return value as R;
}

function api(path:string,init?:RequestInit){
 const target=storeOrderTarget(path.split("?",1)[0].split("/"),init?.method==="POST"?"POST":"GET");
 return publicJson(`/api/store-orders/${path}`,init,!!target&&target.session!=="none");
}

function validate<T>(read:()=>T):T{
 try{return read();}catch{throw invalid();}
}

async function orderResponse(path:string,init?:RequestInit,expectedId?:string){
 const {data}=await api(path,init);
 return validate(()=>{
   const order=parseStoreOrder(data);
   if(expectedId!==undefined&&order.id!==expectedId.toLowerCase())throw invalid();
   return order;
 });
}

const orderPath=(id:string)=>`orders/${encodeURIComponent(id.toLowerCase())}`;
const post=(body:unknown):RequestInit=>({method:"POST",body:JSON.stringify(body)});

export async function createStoreCheckout(body:StoreCheckoutPayload){
 const order=await orderResponse("checkout",post(body));
 const lines=new Map(body.lines.map(line=>[line.product_id.toLowerCase(),line]));
 if(order.locale!==body.locale||order.shippingFeeVnd!==body.expected_shipping_fee_vnd||order.totalVnd!==body.expected_total_vnd||
    (body.delivery_date!==undefined&&order.deliveryDate!==body.delivery_date)||order.lines.length!==lines.size||
    order.lines.some(line=>{
      const expected=lines.get(line.productId);
      return !expected||line.quantity!==expected.quantity||line.unitPriceVnd!==expected.expected_unit_price_vnd||line.quotaQuantity!==expected.expected_quota_quantity;
    }))throw invalid();
 return order;
}
export function getStoreOrder(id:string,signal?:AbortSignal){return orderResponse(orderPath(id),{signal},id);}
export function reportStoreTransfer(id:string){return orderResponse(`${orderPath(id)}/report-transfer`,post({}),id);}
export function cancelStoreOrder(id:string,idempotencyKey:string,requestRefund=false){
 return orderResponse(`${orderPath(id)}/cancel`,post({idempotency_key:idempotencyKey,request_refund:requestRefund}),id);
}
export function requestStoreRefund(id:string,idempotencyKey:string){
 return orderResponse(`${orderPath(id)}/request-refund`,post({idempotency_key:idempotencyKey}),id);
}
export async function lookupStoreOrder(referenceCode:string,phoneNumber:string){
 const order=await orderResponse("lookup",post({reference_code:referenceCode,phone_number:phoneNumber}));
 if(order.referenceCode.toUpperCase()!==referenceCode.trim().toUpperCase())throw invalid();
 return order;
}
export function currentLookupStoreOrder(){return orderResponse("lookup/current");}
export async function getStoreOrders(input:{page:number;status?:StoreOrderStatus},signal?:AbortSignal){
 const pageSize=20;
 const query=new URLSearchParams({page:String(input.page),page_size:String(pageSize)});
 if(input.status)query.set("status",input.status);
 const payload=await api(`user-orders?${query}`,{signal}),meta=record(payload.meta),total=meta.total;
 if(!Array.isArray(payload.data)||payload.data.length>pageSize||meta.page!==input.page||meta.page_size!==pageSize||
    typeof total!=="number"||!Number.isSafeInteger(total)||total<0)throw invalid();
 const rows=payload.data;
 const items=validate(()=>rows.map(parseStoreOrder));
 if(new Set(items.map(order=>order.id)).size!==items.length)throw invalid();
 return {items,meta:{page:input.page,pageSize,total}};
}
export function getUserStoreOrder(id:string,signal?:AbortSignal){
 return orderResponse(`user-orders/${encodeURIComponent(id.toLowerCase())}`,{signal},id);
}
export async function getStoreQuota(locale:Locale,orderId?:string):Promise<{active:boolean;products:StoreQuotaAvailability[]}>{
 const query=new URLSearchParams({locale});
 if(orderId)query.set("store_order_id",orderId);
 const {data}=await api(`quota?${query}`);
 if(data===null)return {active:false,products:[]};
 return validate(()=>{
   const {products}=record(data);
   if(!Array.isArray(products))throw invalid();
   const seen=new Set<string>();
   return {active:true,products:products.map(row=>{
     const item=record(row),productId=storeOrderUuid(item.product_id);
     if(seen.has(productId))throw invalid();
     seen.add(productId);
     return {productId,availableUnits:csaUnits(orderId?item.available_units_for_order:item.available_units)};
   })};
 });
}
export async function getShippingQuote(provinceCode:string,wardCode:string){
 const {data}=await api("shipping-quote",post({province_code:provinceCode,ward_code:wardCode}));
 const {supported,shipping_fee_vnd:fee}=record(data);
 if(supported===false&&fee===null)return {supported,shippingFeeVnd:null};
 if(supported!==true||typeof fee!=="string"||!/^\d+$/.test(fee)||!Number.isSafeInteger(Number(fee)))throw invalid();
 return {supported,shippingFeeVnd:Number(fee)};
}
export function storeOrderHref(order:Pick<StoreOrder,"id"|"locale">){return `/store/orders/${order.id}/${order.locale}`;}

export type BuyAgainLine={productId:string;quantity:number;name:string;reason:"unavailable"|"out_of_stock"|"insufficient_stock"|null;product:StoreProductDetail|null};
export async function prepareBuyAgain(id:string,locale:Locale):Promise<BuyAgainLine[]>{
 const payload=await api(`user-orders/${encodeURIComponent(id.toLowerCase())}/buy-again?locale=${locale}`);
 return validate(()=>{
   const data=record(payload.data);
   if(storeOrderUuid(data.order_id)!==id.toLowerCase()||!Array.isArray(data.lines)||!data.lines.length)throw invalid();
   const seen=new Set<string>();
   return data.lines.map(row=>{
     const {product_id,quantity,name,reason,product:rawProduct}=record(row);
     const productId=storeOrderUuid(product_id);
     if(seen.has(productId)||typeof quantity!=="number"||!Number.isSafeInteger(quantity)||quantity<1||
        typeof name!=="string"||!name.trim()||
        (reason!==null&&reason!=="unavailable"&&reason!=="out_of_stock"&&reason!=="insufficient_stock"))throw invalid();
     seen.add(productId);
     const product=rawProduct===null?null:parseStoreProductDetail({data:rawProduct},{locale});
     if(product&&product.id.toLowerCase()!==productId)throw invalid();
     const stock=product?.available_quantity;
     const expectedReason=stock===undefined?"unavailable":stock===0?"out_of_stock":stock<quantity?"insufficient_stock":null;
     if(reason!==expectedReason)throw invalid();
     return {productId,quantity,name,reason,product};
   });
 });
}

export type {StoreCheckoutQuote,StoreCouponSnapshot,StoreVoucherExpectedLine} from "./store-order-model";
export type StoreQuoteRequest={delivery_date:string;locale:Locale;coupon_code?:string;guest?:{recipient_name:string;phone_number:string;province_code:string;ward_code:string;address:string};lines:{product_id:string;quantity:number;use_quota:boolean}[]};
export async function getStoreQuote(input:StoreQuoteRequest):Promise<StoreCheckoutQuote>{
 const {data}=await api("quote",post(input));
 return validate(()=>{
   const quote=parseStoreCheckoutQuote(data);
   const lines=new Map(input.lines.map(line=>[line.product_id.toLowerCase(),line]));
   if(quote.deliveryDate!==input.delivery_date||quote.lines.length!==lines.size||
      (quote.coupon?.code??undefined)!==(input.coupon_code?.trim().toUpperCase()??undefined)||
      quote.lines.some(line=>{
       const requested=lines.get(line.product_id.toLowerCase());
       return !requested||line.quantity!==requested.quantity||line.use_quota!==requested.use_quota;
      }))throw invalid();
   return quote;
 });
}
export async function getStoreDeliveryDates(){
 const {data}=await api("delivery-dates");
 return validate(()=>parseStoreDeliveryCalendar(data));
}
