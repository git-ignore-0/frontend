"use client";

import {useLayoutEffect,useMemo,useRef,useState} from "react";
import {useAuth} from "@/auth/AuthProvider";
import {AccountApiError,previewCsaVoucher,type CsaVoucherPreview} from "@/account/csa-service";
import {couponErrorMessage} from "@/lib/voucher-copy";
import type {CsaSelection} from "./csa-selection-model";

export function useCsaVoucher(selection:CsaSelection|null,locale:"vi"|"en"){
 const auth=useAuth(),session=auth.status==="authenticated"?auth.session:null;
 const [code,setCode]=useState("");
 const key=JSON.stringify({selection,locale,code,owner:session?.subject});
 // A context is never reused after leaving a selection, even when its IDs match again.
 const context=useMemo(()=>({key,session}),[key,session]);
 const [result,setResult]=useState<{context:typeof context;value:CsaVoucherPreview}|null>(null);
 const [error,setError]=useState<{context:typeof context;message:string}|null>(null),[pending,setPending]=useState<typeof context|null>(null);
 const current=useRef<typeof context|null>(null),sequence=useRef(0),inFlight=useRef<typeof context|null>(null);
 useLayoutEffect(()=>{current.current=context;return()=>{current.current=null;sequence.current+=1;inFlight.current=null;};},[context]);
 const applied=session&&result?.context===context?result.value:undefined;
 const loading=!!session&&pending===context;
 const ready=!session||!code.trim()||!!applied;
 const apply=async()=>{
  if(!session||!selection||inFlight.current===context)return;
  if(!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code.trim().toUpperCase())){setError({context,message:couponErrorMessage("coupon_invalid",locale,"csa")});return;}
  const request=++sequence.current;inFlight.current=context;setPending(context);setResult(null);setError(null);
  try{
   const value=await previewCsaVoucher({...selection,couponCode:code});
   if(request===sequence.current&&current.current===context)setResult({context,value});
  }catch(reason){if(request===sequence.current&&current.current===context)setError({context,message:couponErrorMessage(reason instanceof AccountApiError?reason.code:"",locale,"csa")});}
  finally{if(request===sequence.current){inFlight.current=null;setPending(null);}}
 };
 return {code,applied,loading,ready,error:error?.context===context?error.message:undefined,
  change:(value:string)=>{setCode(value);setResult(null);setError(null);},
  clear:()=>{setCode("");setResult(null);setError(null);},
  invalidate:(message:string)=>{setResult(null);setError({context,message});},
  apply,
 };
}
