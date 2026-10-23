"use client";
import {useEffect,useState} from "react";
import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";

const cache=new Map<Locale,PublicSiteSettings>();
type PendingRequest={promise:Promise<PublicSiteSettings|null>;refresh:boolean};
const pending=new Map<Locale,PendingRequest>();
const queuedRefresh=new Map<Locale,Promise<PublicSiteSettings|null>>();

function requestSiteSettings(locale:Locale,refresh:boolean):Promise<PublicSiteSettings|null>{
  const request=fetch(`/api/site-settings?locale=${locale}`)
    .then(response=>response.ok?response.json():null)
    .then(value=>{
      const settings=value&&typeof value==="object"?value as PublicSiteSettings:null;
      if(settings)cache.set(locale,settings);
      return settings??cache.get(locale)??null;
    })
    .catch(()=>cache.get(locale)??null);
  pending.set(locale,{promise:request,refresh});
  void request.finally(()=>{
    if(pending.get(locale)?.promise===request)pending.delete(locale);
  });
  return request;
}

/** Shares requests per locale while preserving a refresh requested behind an older fetch. */
export function fetchSiteSettings(locale:Locale,{refresh=false}:{refresh?:boolean}={}):Promise<PublicSiteSettings|null>{
  const queued=queuedRefresh.get(locale);
  if(queued)return queued;

  const active=pending.get(locale);
  if(active){
    if(!refresh||active.refresh)return active.promise;
    const followUp=active.promise.then(()=>requestSiteSettings(locale,true));
    queuedRefresh.set(locale,followUp);
    void followUp.finally(()=>{
      if(queuedRefresh.get(locale)===followUp)queuedRefresh.delete(locale);
    });
    return followUp;
  }

  const cached=cache.get(locale);
  if(cached&&!refresh)return Promise.resolve(cached);
  return requestSiteSettings(locale,refresh);
}

export function useSiteSettings(locale:Locale){
  const [state,setState]=useState<{locale:Locale;settings:PublicSiteSettings|null}>(()=>({
    locale,
    settings:cache.get(locale)??null
  }));
  useEffect(()=>{
    let mounted=true;
    const update=(refresh=false)=>{
      void fetchSiteSettings(locale,{refresh}).then(settings=>{
        if(mounted)setState({locale,settings});
      });
    };
    const refresh=()=>update(true);
    update();
    window.addEventListener("focus",refresh);
    return ()=>{
      mounted=false;
      window.removeEventListener("focus",refresh);
    };
  },[locale]);
  return state.locale===locale?state.settings:null;
}
