"use client";

import {useCallback,useEffect,useState} from "react";
import {getSupportedShippingAreas} from "@/account/shipping-service";
import type {SupportedShippingProvince} from "@/account/shipping-address-model";
import type {Locale} from "@/types";

export function useSupportedShippingAreas(locale:Locale,enabled=true){
  const [result,setResult]=useState<{key:string;areas:SupportedShippingProvince[];error:boolean}>({key:"",areas:[],error:false});
  const [attempt,setAttempt]=useState(0);
  const retry=useCallback(()=>setAttempt(value=>value+1),[]);
  const key=enabled?`${locale}:${attempt}`:"disabled";

  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    void getSupportedShippingAreas(locale,controller.signal).then(value=>{
      if(!controller.signal.aborted)setResult({key,areas:value,error:false});
    }).catch(()=>{
      if(!controller.signal.aborted)setResult({key,areas:[],error:true});
    });
    return()=>controller.abort();
  },[enabled,key,locale]);

  if(!enabled)return {areas:[],loading:false,error:false,retry};
  if(result.key!==key)return {areas:[],loading:true,error:false,retry};
  return {areas:result.areas,loading:false,error:result.error,retry};
}
