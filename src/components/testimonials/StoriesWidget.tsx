"use client";
import {useEffect,useRef,useState,type RefObject} from "react";
import {useNFV} from "@/state/NFVContext";
import {Button,DataState,Icon} from "@/components/UI";
import {SideDrawer} from "@/components/overlays/OverlayPrimitives";
import {StoryCard} from "./StoryPresentation";
import {StoryDetail} from "./StoryDetail";
import {TESTIMONIALS_COPY} from "@/data/testimonials-copy";
import type {Testimonial} from "@/lib/testimonials";
import {nextTestimonialsRetry,testimonialsRetryNumber,testimonialsRetrySuffix,type TestimonialsRetryState} from "@/lib/testimonials-request";
import type {Locale} from "@/types";

function StoriesDrawer({locale,close,returnRef}:{locale:Locale;close:()=>void;returnRef:RefObject<HTMLButtonElement|null>}){
  const {navigate}=useNFV();
  const copy=TESTIMONIALS_COPY[locale];
  const retryKey=locale;
  const [retry,setRetry]=useState<TestimonialsRetryState>(null);
  const retryNumber=testimonialsRetryNumber(retry,retryKey);
  const requestKey=`${retryKey}:${retryNumber}`;
  const [request,setRequest]=useState<{key:string;status:"loading"|"success"|"error";data:Testimonial[]}>({key:"",status:"loading",data:[]});
  const [selected,setSelected]=useState<Testimonial|null>(null);
  const storyRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    const controller=new AbortController();
    fetch(`/api/testimonials/featured?locale=${locale}${testimonialsRetrySuffix(retryNumber)}`,{cache:"no-store",signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error("featured_failed");return response.json() as Promise<{data:Testimonial[]}>;})
      .then(body=>{if(!controller.signal.aborted)setRequest({key:requestKey,status:"success",data:body.data});})
      .catch(()=>{if(!controller.signal.aborted)setRequest({key:requestKey,status:"error",data:[]});});
    return ()=>controller.abort();
  },[locale,retryNumber,requestKey]);

  const current=request.key===requestKey;
  const loading=!current||request.status==="loading",error=current&&request.status==="error";
  const stories=current&&request.status==="success"?request.data:[];
  const openStory=(story:Testimonial,button:HTMLButtonElement)=>{storyRef.current=button;setSelected(story);};
  return <>
    <SideDrawer title={copy.drawerTitle} closeLabel={copy.closeDrawer} onClose={close} returnRef={returnRef} className="stories-side-drawer">
      <div className="drawer-body stories-drawer-body">
        <p className="stories-drawer-description">{copy.drawerDescription}</p>
        {loading?<DataState kind="loading" title={copy.loading} compact/>:
          error?<DataState kind="error" title={copy.error} action={{label:copy.retry,onClick:()=>setRetry(current=>nextTestimonialsRetry(current,retryKey))}} compact/>:
          stories.length===0?<DataState title={copy.emptyTitle} description={copy.emptyBody} compact/>:<>
            <StoryCard story={stories[0]} locale={locale} onOpen={openStory} variant="featured"/>
            {stories.length>1&&<div className="testimonials-preview-list">{stories.slice(1,3).map(story=><StoryCard key={story.id} story={story} locale={locale} onOpen={openStory} variant="preview"/>)}</div>}
          </>}
      </div>
      <div className="drawer-foot"><Button className="stories-view-all" onClick={()=>{close();navigate("testimonials");}}>{copy.viewAll} <Icon name="arrow" size={16}/></Button></div>
    </SideDrawer>
    {selected&&<StoryDetail locale={locale} initial={selected} onClose={()=>setSelected(null)} returnRef={storyRef}/>}
  </>;
}

/** Floating entry is only mounted on public content pages. */
export function StoriesWidget(){
  const {ui}=useNFV();const copy=TESTIMONIALS_COPY[ui.locale];
  const [open,setOpen]=useState(false);
  const returnRef=useRef<HTMLButtonElement>(null);
  const launch=(button:HTMLButtonElement)=>{returnRef.current=button;setOpen(true);};
  return <div className="nfv-stories-widget">
    <Button
      className="testimonials-launcher"
      onClick={event=>launch(event.currentTarget)}
      aria-label={copy.launcher}
      aria-expanded={open}
      data-drawer-mounted={open}
    >
      <Icon name="message" size={18}/>
      <span>{copy.launcher}</span>
    </Button>
    {open&&<StoriesDrawer locale={ui.locale} close={()=>setOpen(false)} returnRef={returnRef}/>}
  </div>;
}
