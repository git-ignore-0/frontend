import "server-only";
import {seal,unseal} from "@/auth/server/session";

export const STORE_GUEST_COOKIE="nfv_store_guest_orders";
export const STORE_LOOKUP_COOKIE="nfv_store_lookup";
type GuestOrders={orders:Record<string,string>};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readGuestOrders(value:string|undefined):GuestOrders{
 const result=unseal<GuestOrders>(value);
 if(!result||!result.orders||typeof result.orders!=="object")return {orders:{}};
 const orders=Object.fromEntries(Object.entries(result.orders).filter(([id,token])=>UUID.test(id)&&typeof token==="string"&&token.length>0&&token.length<=128).slice(-5));
 return {orders};
}



/** Independent cookie names prevent parallel checkouts from replacing another order's authority. */
export function guestOrderCookieName(orderId:string){return `${STORE_GUEST_COOKIE}_${orderId.toLowerCase()}`;}
export function guestOrderCookiePath(orderId:string){return `/api/store-orders/orders/${orderId.toLowerCase()}`;}
export function writeGuestOrderToken(orderId:string,token:string){return seal({orderId:orderId.toLowerCase(),token});}
export function readGuestOrderToken(value:string|undefined,orderId:string):string{
 const payload=unseal<{orderId?:unknown;token?:unknown}>(value);
 return payload?.orderId===orderId.toLowerCase()&&typeof payload.token==="string"&&payload.token.length>0&&payload.token.length<=128?payload.token:"";
}
