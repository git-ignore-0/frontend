"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import * as service from "./auth-service";
import type {AuthSnapshot} from "./auth-types";
import {SESSION_ENABLED} from "./auth-config";

const initial:AuthSnapshot={status:SESSION_ENABLED?"checking":"guest",session:null,error:""};
type AuthContextValue=AuthSnapshot & {refresh:()=>Promise<void>;expire:()=>void};
const AuthContext=createContext<AuthContextValue|null>(null);

export function useAuth():AuthContextValue {
  const value=useContext(AuthContext);
  if(!value)throw new Error("AuthProvider is required");
  return value;
}

/** Until session integration is enabled, expose guest UI without hitting any auth API. */
export function AuthProvider({children}:{children:ReactNode}){
  const [snapshot,setSnapshot]=useState<AuthSnapshot>(initial);
  const revision=useRef(0);

  const refresh=useCallback(async()=>{
    if(!SESSION_ENABLED)return; // UI-only: no network requests.
    const version=++revision.current;
    setSnapshot(previous=>({...previous,status:"checking",error:""}));
    try {
      const session=await service.getSession();
      if(version===revision.current)setSnapshot({status:session?"authenticated":"guest",session,error:""});
    } catch(error){
      if(version===revision.current)setSnapshot({status:service.isUnauthorized(error)?"expired":"error",session:null,
        error:service.isUnauthorized(error)?"Phiên đăng nhập đã hết hạn.":error instanceof Error?error.message:"Không thể kiểm tra phiên đăng nhập."});
    }
  },[]);

  useEffect(()=>{
    if(!SESSION_ENABLED)return;
    void refresh();
    return ()=>{revision.current+=1;};
  },[refresh]);
  // A browser Back restore or return from the public website must recheck the session.
  useEffect(()=>{
    if(!SESSION_ENABLED)return;
    const onPageShow=(event:PageTransitionEvent)=>{if(event.persisted)void refresh();};
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh();};
    window.addEventListener("pageshow",onPageShow);
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{window.removeEventListener("pageshow",onPageShow);document.removeEventListener("visibilitychange",onVisible);};
  },[refresh]);
  const expire=useCallback(()=>{
    if(!SESSION_ENABLED)return;
    revision.current+=1;
    setSnapshot(previous=>previous.status==="authenticated"?
      {status:"expired",session:null,error:"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."}:previous);
  },[]);
  const value=useMemo(()=>({...snapshot,refresh,expire}),[snapshot,refresh,expire]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
