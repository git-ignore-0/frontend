"use client";
import {useEffect,useState,type RefObject} from "react";
import {DataState} from "@/components/UI";
import {ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {StoryImage,StoryTag} from "./StoryPresentation";
import {TESTIMONIALS_COPY} from "@/data/testimonials-copy";
import type {Testimonial} from "@/lib/testimonials";
import {nextTestimonialsRetry,testimonialsRetryNumber,testimonialsRetrySuffix,type TestimonialsRetryState} from "@/lib/testimonials-request";
import type {Locale} from "@/types";

export function StoryDetail({initial,locale,onClose,returnRef}:{initial:Testimonial;locale:Locale;onClose:()=>void;returnRef:RefObject<HTMLElement|null>}){
  const copy=TESTIMONIALS_COPY[locale];
  const retryKey=`${initial.id}:${locale}`;
  const [retry,setRetry]=useState<TestimonialsRetryState>(null);
  const retryNumber=testimonialsRetryNumber(retry,retryKey);
  const requestKey=`${retryKey}:${retryNumber}`;
  const [request,setRequest]=useState<{key:string;status:"loading"|"success"|"error";story:Testimonial|null}>({key:"",status:"loading",story:null});
  useEffect(()=>{
    if(initial.full_story)return;
    const controller=new AbortController();
    fetch(`/api/testimonials/${encodeURIComponent(initial.id)}?locale=${locale}${testimonialsRetrySuffix(retryNumber)}`,{cache:"no-store",signal:controller.signal})
      .then(async res=>{if(!res.ok)throw new Error("details_failed");return res.json() as Promise<{data:Testimonial}>;})
      .then(data=>{if(!controller.signal.aborted)setRequest({key:requestKey,status:"success",story:data.data});})
      .catch(()=>{if(!controller.signal.aborted)setRequest({key:requestKey,status:"error",story:null});});
    return ()=>controller.abort();
  },[initial,locale,retryNumber,requestKey]);
  const current=request.key===requestKey;
  const story=initial.full_story||!current||request.status!=="success"||!request.story?initial:request.story;
  const loading=!initial.full_story&&(!current||request.status==="loading");
  const error=!initial.full_story&&current&&request.status==="error";
  return <ResponsiveDialog
    title={copy.detailTitle.replace("{name}",story.display_name)}
    closeLabel={copy.closeDetail} onClose={onClose} returnRef={returnRef} className="story-detail-dialog">
    <div className="testimonials-detail-layout">
      <div className="testimonials-detail-media"><StoryImage story={story} alt={copy.imageAlt.replace("{name}",story.display_name)} sizes="(min-width:768px) 310px, calc(100vw - 32px)"/></div>
      <div className="testimonials-detail-content"><StoryTag story={story} locale={locale}/><q className="testimonials-detail-quote">{story.quote}</q>
        {loading?<DataState kind="loading" title={copy.detailLoading} compact/>:error?<DataState kind="error" compact title={copy.detailError} action={{label:copy.retry,onClick:()=>setRetry(current=>nextTestimonialsRetry(current,retryKey))}}/>:<p className="testimonials-full-story">{story.full_story}</p>}
        <div className="testimonials-detail-person"><strong>{story.display_name}</strong><small>{story.role}{story.location?` · ${story.location}`:""}</small></div>
      </div>
    </div>
  </ResponsiveDialog>;
}
