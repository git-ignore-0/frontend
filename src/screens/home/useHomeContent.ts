"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";

type HomePublicData={workshops:PublicWorkshop[]};
type HomeContentState=HomePublicData&{locale:Locale};
const EMPTY:HomePublicData={workshops:[]};

/** Loads the optional workshop preview without making authentication calls. */
export function useHomeContent(locale:Locale):HomePublicData{
  const [content,setContent]=useState<HomeContentState>(()=>({locale,workshops:[]}));
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/home-content?locale=${locale}`,{signal:controller.signal})
      .then(response=>response.ok?response.json():null)
      .then((payload:Partial<HomePublicData>|null)=>{
        if(controller.signal.aborted||!payload)return;
        setContent({
          locale,
          workshops:Array.isArray(payload.workshops)?payload.workshops.slice(0,3):[]
        });
      })
      .catch(()=>{/* The public content API is optional; Home remains usable without it. */});
    return ()=>controller.abort();
  },[locale]);
  return content.locale===locale?content:EMPTY;
}
