"use client";
import {useCallback,useEffect,useState} from "react";
import type {Locale} from "@/types";
import {parseCsaPackages,type CsaPackagesPage} from "./csa-packages-model";
type State={status:"loading"|"ready"|"error";page:CsaPackagesPage|null};
/** Each page/locale/retry has its own abort signal; previous results never leak. */
export function useCsaPackages(locale:Locale,page:number){
  const [retryKey,setRetryKey]=useState(0);
  const retry=useCallback(()=>setRetryKey(value=>value+1),[]);
  const [result,setResult]=useState<State>({status:"loading",page:null});
  useEffect(()=>{
    const controller=new AbortController();setResult({status:"loading",page:null});
    fetch(`/api/csa-packages?locale=${locale}&page=${page}`,{cache:"no-store",signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error(`CSA HTTP ${response.status}`);return parseCsaPackages(await response.json())})
      .then(data=>{if(!controller.signal.aborted)setResult({status:"ready",page:data})})
      .catch(()=>{if(!controller.signal.aborted)setResult({status:"error",page:null})});
    return()=>controller.abort();
  },[locale,page,retryKey]);
  return {...result,retry};
}
