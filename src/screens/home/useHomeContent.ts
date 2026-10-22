"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import type {PublicSiteSettings} from "@/types/site-settings";

type HomePublicData={workshops:PublicWorkshop[];settings:PublicSiteSettings|null};
const EMPTY:HomePublicData={workshops:[],settings:null};

/** A single optional public request powers Workshops and Contact. No authentication calls. */
export function useHomeContent(locale:Locale):HomePublicData{
  const [content,setContent]=useState<HomePublicData>(EMPTY);
  useEffect(()=>{
    const controller=new AbortController();
    setContent(EMPTY);
    fetch(`/api/home-content?locale=${locale}`,{signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then((payload:Partial<HomePublicData>|null)=>{
        if(controller.signal.aborted||!payload)return;
        setContent({
          workshops:Array.isArray(payload.workshops)?payload.workshops.slice(0,3):[],
          settings:payload.settings??null
        });
      })
      .catch(()=>{/* The public content API is optional; Home remains usable without it. */});
    return ()=>controller.abort();
  },[locale]);
  return content;
}
