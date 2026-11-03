"use client";
import {useLayoutEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/auth/AuthProvider";
import {useNFV} from "@/state/NFVContext";
import {useStoreSession} from "./use-store-session";
import {prepareBuyAgain,type BuyAgainLine} from "./store-order-service";
import {pendingCheckoutOwner} from "./checkout-intent";
import {saveBuyAgain} from "./buy-again-session";
import type {Locale} from "@/types";

export function buyAgainMessage(lines:BuyAgainLine[],locale:Locale){
 return lines.filter(line=>line.reason!==null).map(line=>{
  const name=line.product?.name??line.name,available=line.product?.available_quantity??0;
  if(locale==="vi")return `Không thể mua lại: ${name} ${line.reason==="unavailable"?"không còn được bán.":line.reason==="out_of_stock"?"đã hết hàng.":`chỉ còn ${available}, đơn cũ cần ${line.quantity}.`}`;
  return `Cannot buy again: ${name} ${line.reason==="unavailable"?"is no longer available.":line.reason==="out_of_stock"?"is out of stock.":`has only ${available} available; the previous order needs ${line.quantity}.`}`;
 }).join(" ");
}

export function useBuyAgain(locale:Locale,active=true){
 const auth=useAuth(),{ui}=useNFV(),router=useRouter(),request=useStoreSession();
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState("");
 const scopeKey=JSON.stringify([auth.status,auth.session?.subject,ui.page,ui.productId,ui.accountTab,locale,active]);
 const [scope,setScope]=useState("");
 const generation=useRef(0),locked=useRef(false);
 useLayoutEffect(()=>{generation.current+=1;locked.current=false;return()=>{generation.current+=1}},[auth.status,auth.session?.subject,ui.page,ui.productId,ui.accountTab,locale,active]);
 const start=async(orderId:string)=>{
  const owner=auth.status==="authenticated"?auth.session?.subject:null;
  if(!owner||!active||locked.current)return;
  const current=++generation.current;locked.current=true;setScope(scopeKey);setBusy(orderId);setError("");
  try{
   if(pendingCheckoutOwner(window.sessionStorage,owner)!==null){
    setError(locale==="vi"?"Lần đặt hàng trước chưa rõ kết quả. Mở checkout để kiểm tra trước khi mua lại.":"The previous checkout is unresolved. Open checkout to check it before buying again.");return;
   }
   const lines=await request(()=>prepareBuyAgain(orderId,locale));
   if(current!==generation.current)return;
   const message=buyAgainMessage(lines,locale);
   if(message){setError(message);return;}
   // Recheck after the network request; another checkout may have started meanwhile.
   if(pendingCheckoutOwner(window.sessionStorage,owner)!==null)throw Error("pending_checkout");
   saveBuyAgain(window.sessionStorage,{owner,orderId,sessionId:crypto.randomUUID()});
   router.push(`/store/checkout/${locale}?source=buy-again`);
  }catch{if(current===generation.current)setError(locale==="vi"?"Chưa thể kiểm tra sản phẩm. Vui lòng thử lại.":"Products could not be checked. Please try again.")}
  finally{if(current===generation.current){locked.current=false;setBusy(null)}}
 };
 return {start,busy:scope===scopeKey?busy:null,error:scope===scopeKey?error:""};
}
