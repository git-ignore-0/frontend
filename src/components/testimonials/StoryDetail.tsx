"use client";
import {useEffect,useState,type RefObject} from "react";
import {DataState} from "@/components/UI";
import {ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {StoryImage,StoryTag} from "./StoryPresentation";
import {TESTIMONIALS_COPY} from "@/data/testimonials-copy";
import type {Testimonial} from "@/lib/testimonials";
import type {Locale} from "@/types";

export function StoryDetail({initial,locale,onClose,returnRef}:{initial:Testimonial;locale:Locale;onClose:()=>void;returnRef:RefObject<HTMLElement|null>}){
  const copy=TESTIMONIALS_COPY[locale];
  const [story,setStory]=useState(initial);
  const [loading,setLoading]=useState(!initial.full_story);
  const [error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    setStory(initial);setError(false);
    if(initial.full_story){setLoading(false);return;}
    const controller=new AbortController();setLoading(true);
    fetch(`/api/testimonials/${encodeURIComponent(initial.id)}?locale=${locale}`,{signal:controller.signal})
      .then(async res=>{if(!res.ok)throw new Error("details_failed");return res.json() as Promise<{data:Testimonial}>;})
      .then(data=>{if(!controller.signal.aborted)setStory(data.data);})
      .catch(()=>{if(!controller.signal.aborted)setError(true);})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[initial,locale,retry]);
  return <ResponsiveDialog
    title={copy.detailTitle.replace("{name}",story.display_name)}
    closeLabel={copy.closeDetail} onClose={onClose} returnRef={returnRef} className="story-detail-dialog">
    <div className="testimonials-detail-layout">
      <div className="testimonials-detail-media"><StoryImage story={story} alt={copy.imageAlt.replace("{name}",story.display_name)} sizes="(min-width:768px) 310px, calc(100vw - 32px)"/></div>
      <div className="testimonials-detail-content"><StoryTag story={story} locale={locale}/><q className="testimonials-detail-quote">{story.quote}</q>
        {loading?<DataState kind="loading" title={copy.detailLoading} compact/>:error?<DataState kind="error" compact title={copy.detailError} action={{label:copy.retry,onClick:()=>setRetry(n=>n+1)}}/>:<p className="testimonials-full-story">{story.full_story}</p>}
        <div className="testimonials-detail-person"><strong>{story.display_name}</strong><small>{story.role}{story.location?` · ${story.location}`:""}</small></div>
      </div>
    </div>
  </ResponsiveDialog>;
}
