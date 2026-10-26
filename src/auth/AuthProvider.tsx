"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import * as service from "./auth-service";
import type {AuthSnapshot} from "./auth-types";
import {sameAuthSession} from "./session-equality";

const initial:AuthSnapshot={status:"checking",session:null,error:""};
type AuthContextValue=AuthSnapshot & {refresh:()=>Promise<void>;expire:()=>void};
const AuthContext=createContext<AuthContextValue|null>(null);

export function useAuth():AuthContextValue {
  const value=useContext(AuthContext);
  if(!value)throw new Error("AuthProvider is required");
  return value;
}

/** The same-origin BFF is the sole owner of the encrypted OAuth session. */
export function AuthProvider({children}:{children:ReactNode}){
  const [snapshot,setSnapshot]=useState<AuthSnapshot>(initial);
  const revision=useRef(0);

  const refresh=useCallback(async(showChecking=true)=>{
    const version=++revision.current;
    if(showChecking)setSnapshot(previous=>({...previous,status:"checking",error:""}));
    try {
      const session=await service.getSession();
      if(version===revision.current)setSnapshot(previous=>{
        const status=session?"authenticated":"guest";
        if(!showChecking&&previous.status===status&&sameAuthSession(previous.session,session))return previous;
        return {status,session,error:""};
      });
    } catch(error){
      if(version!==revision.current)return;
      if(service.isUnauthorized(error)){
        setSnapshot({status:"expired",session:null,error:"Phiên đăng nhập đã hết hạn."});
        return;
      }
      const failed:AuthSnapshot={status:"error",session:null,error:error instanceof Error?error.message:"Không thể kiểm tra phiên đăng nhập."};
      setSnapshot(previous=>showChecking||previous.status==="checking"?failed:previous);
    }
  },[]);

  useEffect(()=>{
    let active=true;
    queueMicrotask(()=>{if(active)void refresh();});
    return ()=>{active=false;revision.current+=1;};
  },[refresh]);
  // A browser Back restore or return from the public website must recheck the session.
  useEffect(()=>{
    const onPageShow=(event:PageTransitionEvent)=>{if(event.persisted)void refresh(false);};
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh(false);};
    window.addEventListener("pageshow",onPageShow);
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{window.removeEventListener("pageshow",onPageShow);document.removeEventListener("visibilitychange",onVisible);};
  },[refresh]);
  const expire=useCallback(()=>{
    revision.current+=1;
    setSnapshot(previous=>previous.status==="authenticated"?
      {status:"expired",session:null,error:"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."}:previous);
  },[]);
  const value=useMemo(()=>({...snapshot,refresh,expire}),[snapshot,refresh,expire]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
