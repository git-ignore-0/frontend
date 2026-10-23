"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {WorkshopCollection} from "@/types/workshop";
const EMPTY:WorkshopCollection={upcoming:[],past:[]};
type Result=WorkshopCollection&{state:"loading"|"ready"|"error"};
type StoredResult=Result&{locale:Locale};
/** Public list only. No auth/session requests; abort previous locale requests on switch. */
export function useWorkshops(locale:Locale):Result{
  const [result,setResult]=useState<StoredResult>({...EMPTY,state:"loading",locale});
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/workshops?locale=${locale}`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error(`Workshops ${response.status}`);return response.json()})
      .then((body:unknown)=>{
        if(controller.signal.aborted)return;
        const data=body&&typeof body==="object"?body as Partial<WorkshopCollection>:{};
        setResult({upcoming:Array.isArray(data.upcoming)?data.upcoming:[],past:Array.isArray(data.past)?data.past:[],state:"ready",locale});
      })
      .catch(()=>{if(!controller.signal.aborted)setResult({...EMPTY,state:"error",locale})});
    return ()=>controller.abort();
  },[locale]);
  return result.locale===locale?result:{...EMPTY,state:"loading"};
}
