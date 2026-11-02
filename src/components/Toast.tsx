"use client";
import {useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {Icon} from "@/components/UI";
import type {ToastTone} from "@/lib/copy-feedback";

const subscribe=()=>()=>{};
const client=()=>true;
const server=()=>false;

/** One live region, above dialogs and outside their inert background. */
export function Toast({message,tone="success",sequence=0}:{message:string;tone?:ToastTone;sequence?:number}){
 const mounted=useSyncExternalStore(subscribe,client,server);
 if(!mounted)return null;
 return createPortal(<div className="nfv-toast-region" role="status" aria-live="polite" aria-atomic="true">{message&&<div key={sequence} className="nfv-toast" data-tone={tone}><Icon name={tone==="error"?"alert":"check"} size={18}/><span>{message}</span></div>}</div>,document.body);
}
