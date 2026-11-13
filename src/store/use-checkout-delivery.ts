"use client";
import {AccountApiError} from "@/account/account-api";
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {getStoreDeliveryDates,getStoreQuote,type StoreQuoteRequest,type StoreCheckoutQuote} from './store-order-service';
import {vietnamDate,type StoreDeliveryCalendar} from './store-delivery.ts';
import {sameStoreCheckoutQuote} from './store-order-model';

type Input={buyer:string;session:unknown;locale:'vi'|'en';enabled:boolean;ready:boolean;locked:boolean;request:Omit<StoreQuoteRequest,'delivery_date'>;context:string;run:<T>(work:()=>Promise<T>,onUnauthorized?:()=>void,isCurrent?:()=>boolean)=>Promise<T>};
export function useCheckoutDelivery(input:Input){
 const {buyer,session,locale,enabled,ready,locked,run}=input;
 const [selection,setSelection]=useState({buyer,date:''});
 const date=selection.buyer===buyer?selection.date:'';
 const [rejectedDate,setRejectedDate]=useState<{date:string;session:unknown}|null>(null);
 const [version,setVersion]=useState(0),[calendarVersion,setCalendarVersion]=useState(0);
 const [calendar,setCalendar]=useState<{key:string;identity:string;session:unknown;value:StoreDeliveryCalendar;receivedAt:number}|null>(null);
 const [calendarError,setCalendarError]=useState<{key:string;session:unknown;error:unknown}|null>(null);
 const [result,setResult]=useState<{key:object;presentationKey:string;session:unknown;value:StoreCheckoutQuote}|null>(null);
 const [pending,setPending]=useState<object|null>(null);
 const sequence=useRef(0);
 const [quoteError,setQuoteError]=useState<{key:object;session:unknown;error:unknown}|null>(null);
 const identity=JSON.stringify({buyer,session,locale});
 const calendarKey=JSON.stringify({identity,calendarVersion});
 const currentCalendar=calendar?.identity===identity&&calendar.session===session?calendar.value:null;
 const calendarReceivedAt=calendar?.receivedAt??null;
 const calendarFailure=calendarError?.key===calendarKey&&calendarError.session===session?calendarError.error:null;
 const validDate=!!date&&!!currentCalendar?.dates.some(day=>day.date===date)&&!(rejectedDate?.date===date&&rejectedDate.session===session);
 const body=JSON.stringify({...input.request,delivery_date:date});
 const presentationKey=JSON.stringify({identity,request:input.request,context:input.context});
 const keyText=JSON.stringify({identity,body,context:input.context,version,calendarKey,calendar:currentCalendar,enabled,ready});
 const key=useMemo(()=>({text:keyText,session}),[keyText,session]);
 const currentKey=useRef<typeof key|null>(key);
 useLayoutEffect(()=>{currentKey.current=key;return()=>{currentKey.current=null}},[key]);
 const refresh=useCallback(()=>{setCalendarVersion(v=>v+1);setVersion(v=>v+1)},[]);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void run(getStoreDeliveryDates,undefined,()=>active).then(value=>{if(active)setCalendar({key:calendarKey,identity,session,value,receivedAt:performance.now()})}).catch(error=>{if(active)setCalendarError({key:calendarKey,session,error})});
  return()=>{active=false};
 },[enabled,calendarKey,identity,session,run]);
 useEffect(()=>{
  if(!enabled||locked)return;
  const focus=()=>refresh();
  window.addEventListener('focus',focus);
  return()=>window.removeEventListener('focus',focus);
 },[enabled,locked,refresh]);
 useEffect(()=>{
  if(!enabled||locked||!currentCalendar||calendarReceivedAt===null)return;
  const start=Date.parse(currentCalendar.serverTime);
  const next=Date.parse(`${vietnamDate(start)}T00:00:00+07:00`)+86400000;
  // Locking pauses refresh, not the elapsed server clock.
  const elapsed=Math.max(0,performance.now()-calendarReceivedAt);
  const timer=window.setTimeout(refresh,Math.max(1,next-start-elapsed));
  return()=>window.clearTimeout(timer);
 },[enabled,locked,currentCalendar,calendarReceivedAt,refresh]);
 const requestQuote=useCallback(async()=>{
  if(!enabled||!ready||!validDate||currentKey.current!==key)return null;
  const id=++sequence.current,request:StoreQuoteRequest={...input.request,delivery_date:date};
  const current=()=>currentKey.current===key&&sequence.current===id;
  setPending(key);setQuoteError(null);
  try{
   const value=await run(()=>getStoreQuote(request),undefined,current);
   if(!current())return null;
   if(value.deliveryDate!==date||value.lines.length!==request.lines.length||value.lines.some(line=>!request.lines.some(item=>item.product_id===line.product_id&&item.quantity===line.quantity&&item.use_quota===line.use_quota))||request.coupon_code!==value.coupon?.code||!!request.guest!==!value.shippingAddressUpdatedAt)throw Error('invalid_response');
   setResult(previous=>{
    const accepted=previous&&previous.session===session&&previous.presentationKey===presentationKey&&sameStoreCheckoutQuote(previous.value,value)?previous.value:value;
    return previous&&previous.key===key&&previous.value===accepted?previous:{key,presentationKey,session,value:accepted};
   });
   return value;
  }catch(error){
   if(!current())return null;
   setQuoteError({key,session,error});
   setResult(null);
   if(error instanceof AccountApiError&&error.code==='store_delivery_date_invalid'){setRejectedDate({date,session});setCalendarVersion(v=>v+1);}
   throw error;
  }finally{if(current())setPending(null)}
 // The key captures the complete request, context and session without unstable object dependencies.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[enabled,ready,validDate,key,session,run]);
 const quote=enabled&&ready&&validDate&&result?.key===key&&result.session===session?result.value:null;
 const error=quoteError?.key===key&&quoteError.session===session?quoteError.error:null;
 // Reuse verified item/voucher amounts only for the same basket and identity; checkout always fetches again.
 const previousQuote=enabled&&ready&&validDate&&result?.presentationKey===presentationKey&&result.session===session?result.value:null;
 return useMemo(()=>({date,calendar:currentCalendar,calendarLoading:enabled&&!currentCalendar&&!calendarFailure,calendarError:calendarFailure,quote,previousQuote,error,quoteLoading:pending===key,invalidDate:!!date&&!!currentCalendar&&!validDate,select:(value:string)=>{if(!locked&&(value!==date||!validDate)){setSelection({buyer,date:value});setRejectedDate(null);setVersion(v=>v+1)}},refresh,requestQuote}),[date,currentCalendar,enabled,calendarFailure,quote,previousQuote,error,validDate,locked,buyer,refresh,pending,key,requestQuote]);
}
