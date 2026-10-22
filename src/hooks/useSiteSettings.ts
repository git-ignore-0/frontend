"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
/** Lightweight public contact information; independent of workshop scheduling. */
export function useSiteSettings(locale:Locale){
  const [settings,setSettings]=useState<PublicSiteSettings|null>(null);
  useEffect(()=>{
    const controller=new AbortController();setSettings(null);
    fetch(`/api/site-settings?locale=${locale}`,{signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then(value=>{if(!controller.signal.aborted&&value&&typeof value==="object")setSettings(value)})
      .catch(()=>{/* Public contact info is optional; Contacts has a safe fallback. */});
    return ()=>controller.abort();
  },[locale]);
  return settings;
}
