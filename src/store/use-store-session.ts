"use client";

import {useCallback,useLayoutEffect,useRef} from "react";
import {useAuth} from "@/auth/AuthProvider";
import {isUnauthorized} from "@/auth/auth-service";

/** Reject late failures without expiring a replacement account or a guest session. */
export function useStoreSession(){
 const auth=useAuth();
 const current=useRef(auth),mounted=useRef(true);
 useLayoutEffect(()=>{mounted.current=true;current.current=auth;return()=>{mounted.current=false}},[auth]);
 return useCallback(async<T,>(task:()=>Promise<T>,onUnauthorized?:()=>void,isCurrent:()=>boolean=()=>true):Promise<T>=>{
  const started=current.current,session=started.status==="authenticated"?started.session:null,owner=session?.subject;
  try{return await task()}
  catch(error){
   const latest=current.current;
   if(isCurrent()&&mounted.current&&owner&&latest.status==="authenticated"&&latest.session===session&&latest.session?.subject===owner&&isUnauthorized(error)){onUnauthorized?.();latest.expire();}
   throw error;
  }
 },[]);
}
