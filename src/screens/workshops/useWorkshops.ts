"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {WorkshopCollection} from "@/types/workshop";
const EMPTY:WorkshopCollection={upcoming:[],past:[]};
type Result=WorkshopCollection&{state:"loading"|"ready"|"error"};
/** Public list only. No auth/session requests; abort previous locale requests on switch. */
export function useWorkshops(locale:Locale):Result{
  const [result,setResult]=useState<Result>({...EMPTY,state:"loading"});
  useEffect(()=>{
    const controller=new AbortController();
    setResult({...EMPTY,state:"loading"});
    fetch(`/api/workshops?locale=${locale}`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error(`Workshops ${response.status}`);return response.json()})
      .then((body:unknown)=>{
        if(controller.signal.aborted)return;
        const data=body&&typeof body==="object"?body as Partial<WorkshopCollection>:{};
        setResult({upcoming:Array.isArray(data.upcoming)?data.upcoming:[],past:Array.isArray(data.past)?data.past:[],state:"ready"});
      })
      .catch(()=>{if(!controller.signal.aborted)setResult({...EMPTY,state:"error"})});
    return ()=>controller.abort();
  },[locale]);
  return result;
}
