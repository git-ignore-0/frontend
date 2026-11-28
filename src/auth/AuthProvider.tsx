"use client";

import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import * as service from "./auth-service";
import type {AuthSnapshot} from "./auth-types";
import {retainBuyAgainOwner} from "@/store/buy-again-session";
import {sameAuthSession} from "./session-equality";
import {onPageSessionRetired,retirePageSession} from "./public-session-context";

type AuthState=AuthSnapshot & {revision:number;lastConfirmedSubject:string|null};
const initial:AuthState={status:"checking",session:null,error:"",revision:0,lastConfirmedSubject:null};
type AuthContextValue=AuthSnapshot & {lastConfirmedSubject:string|null;refresh:()=>Promise<void>;expire:()=>void};
const AuthContext=createContext<AuthContextValue|null>(null);

export function useAuth():AuthContextValue {
  const value=useContext(AuthContext);
  if(!value)throw new Error("AuthProvider is required");
  return value;
}

/** The same-origin BFF is the sole owner of the encrypted OAuth session. */
export function AuthProvider({children}:{children:ReactNode}){
  const [{status,session,error,revision:verifiedRevision,lastConfirmedSubject},setSnapshot]=useState(initial);
  const revision=useRef(0);

  const refresh=useCallback(async(showChecking=true)=>{
    const version=++revision.current;
    // Retain only the owner key for local drafts while the session is unverified.
    setSnapshot(previous=>showChecking||previous.status==="authenticated"?{...previous,status:"checking",session:null,error:"",revision:version}:previous);
    try {
      const session=await service.getSession(()=>version===revision.current);
      if(version===revision.current)setSnapshot(previous=>{
        const status=session?"authenticated":"guest";
        if(!showChecking&&previous.status===status&&sameAuthSession(previous.session,session))return previous;
        return {status,session,error:"",revision:version,lastConfirmedSubject:session?.subject??null};
      });
    } catch(error){
      if(error&&typeof error==="object"&&"code" in error&&error.code==="session_changed"){
        window.location.reload();
        return;
      }
      if(version!==revision.current)return;
      if(service.isUnauthorized(error)){
        retirePageSession();
        setSnapshot({...initial,status:"expired",error:"Phiên đăng nhập đã hết hạn.",revision:version});
        return;
      }
      const message=error instanceof Error?error.message:"Không thể kiểm tra phiên đăng nhập.";
      setSnapshot(previous=>showChecking||previous.status==="checking"?{...previous,status:"error",session:null,error:message,revision:version}:previous);
    }
  },[]);

  useEffect(()=>onPageSessionRetired(()=>{
    const version=++revision.current;
    setSnapshot({...initial,status:"expired",error:"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",revision:version});
  }),[]);

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
  const authenticatedRevision=status==="authenticated"?verifiedRevision:null;
  const expire=useCallback(()=>{
    // A 401 from the previous account cannot cancel or expire a newer verification.
    if(authenticatedRevision!==revision.current)return;
    const version=++revision.current;
    retirePageSession();
    setSnapshot({...initial,status:"expired",error:"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",revision:version});
  },[authenticatedRevision]);
  useEffect(()=>{
    if(status!=="authenticated"&&status!=="guest")return;
    try{retainBuyAgainOwner(window.sessionStorage,status==="authenticated"?session?.subject??null:null)}catch{}
  },[status,session?.subject]);
  const value=useMemo(()=>({status,session,error,lastConfirmedSubject,refresh,expire}),[status,session,error,lastConfirmedSubject,refresh,expire]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
