"use client";

import {useCallback,useEffect,useState} from "react";
import type {Locale} from "@/types";
import {fetchCsaTerms} from "./csa-terms-client";
import type {CsaTermsDocument} from "./csa-terms-model";

type State={key:string;status:"ready"|"error";document:CsaTermsDocument|null};

export function useCsaTerms(locale:Locale,enabled:boolean){
  const [retryKey,setRetryKey]=useState(0);
  const [result,setResult]=useState<State>({key:"",status:"error",document:null});
  const retry=useCallback(()=>setRetryKey(value=>value+1),[]);
  const requestKey=`${locale}:${retryKey}`;
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    void fetchCsaTerms(locale,controller.signal)
      .then(document=>{if(!controller.signal.aborted)setResult({key:requestKey,status:"ready",document});})
      .catch(()=>{if(!controller.signal.aborted)setResult({key:requestKey,status:"error",document:null});});
    return()=>controller.abort();
  },[enabled,locale,requestKey]);
  return result.key===requestKey?{status:result.status,document:result.document,retry}:{status:"loading" as const,document:null,retry};
}
