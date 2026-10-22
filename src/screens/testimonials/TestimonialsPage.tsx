"use client";
import {useEffect,useRef,useState} from "react";
import {useNFV} from "@/state/NFVContext";
import {Button,DataState,Icon,Tabs} from "@/components/UI";
import {StoryCard} from "@/components/testimonials/StoryPresentation";
import {StoryDetail} from "@/components/testimonials/StoryDetail";
import {TESTIMONIALS_COPY} from "@/data/testimonials-copy";
import type {StoryFilter,Testimonial,TestimonialsPageData} from "@/lib/testimonials";
import {visibleTestimonials,type TestimonialsLoadState} from "@/lib/testimonials-request";

export function TestimonialsPage(){
  const {ui,navigate}=useNFV(),locale=ui.locale,copy=TESTIMONIALS_COPY[ui.locale];
  const [filter,setFilter]=useState<StoryFilter>("all"),[page,setPage]=useState(1);
  // Response state belongs to one locale/filter/page combination, never to a previous tab.
  const queryKey=`${locale}:${filter}:${page}`;
  const [request,setRequest]=useState<TestimonialsLoadState>({key:"",status:"loading",data:null});
  const [retry,setRetry]=useState(0);
  const [selected,setSelected]=useState<Testimonial|null>(null);
  const storyButton=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    const controller=new AbortController();
    setRequest({key:queryKey,status:"loading",data:null});
    fetch(`/api/testimonials?locale=${locale}&type=${filter}&page=${page}&page_size=12`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw new Error("stories_failed");return response.json() as Promise<TestimonialsPageData>;})
      .then(data=>{if(!controller.signal.aborted)setRequest({key:queryKey,status:"success",data});})
      .catch(()=>{if(!controller.signal.aborted)setRequest({key:queryKey,status:"error",data:null});});
    return ()=>controller.abort();
  },[queryKey,locale,filter,page,retry]);

  // Render-time key checking blocks stale results even before the new effect runs.
  const current=request.key===queryKey;
  const loading=!current||request.status==="loading";
  const error=current&&request.status==="error";
  const result=visibleTestimonials(request,queryKey);
  const pageCount=Math.max(1,Math.ceil((result?.meta.total??0)/(result?.meta.page_size||12)));
  const disabled=loading;
  const openStory=(story:Testimonial,button:HTMLButtonElement)=>{storyButton.current=button;setSelected(story);};
  const options=[{value:"all",label:copy.filterAll},{value:"customer",label:copy.filterCustomer},{value:"farmer",label:copy.filterFarmer}];
  return <main className="main-content nfv-testimonials testimonials-page">
    <div className="container testimonials-page-shell">
      <Button variant="plain" className="testimonials-back-link" onClick={()=>navigate("home")}><Icon name="back" size={16}/>{copy.back}</Button>
      <header className="testimonials-page-intro"><span className="eyebrow">{copy.pageEyebrow}</span><h1 className="section-title">{copy.pageTitle}</h1><p>{copy.pageIntro}</p></header>
      <div className="testimonials-filters" aria-busy={disabled}>
        <Tabs value={filter} disabled={disabled} onChange={value=>{if(disabled)return;setFilter(value as StoryFilter);setPage(1);}} items={options} label={copy.filtersLabel}/>
      </div>
      <div className="testimonials-results" aria-busy={loading}>
        {loading?<DataState kind="loading" title={copy.loading}/>:error?<DataState kind="error" title={copy.error} action={{label:copy.retry,onClick:()=>setRetry(n=>n+1)}}/>:
            result?.data.length?<><ul className="testimonials-grid" aria-label={copy.listLabel}>{result!.data.map(story=><li key={story.id}><StoryCard story={story} locale={locale} onOpen={openStory}/></li>)}</ul>
              {pageCount>1&&<nav className="testimonials-pagination" aria-label={copy.pageStatus}>
                <Button variant="outline" small disabled={disabled||page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>{copy.previous}</Button>
                <span>{copy.pageStatus.replace("{page}",String(result!.meta.page)).replace("{pages}",String(pageCount))}</span>
                <Button variant="outline" small disabled={disabled||page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>{copy.next}</Button>
              </nav>}
            </>:<DataState title={copy.emptyTitle} description={copy.emptyBody}/>}
      </div>
    </div>
    {selected&&<StoryDetail locale={locale} initial={selected} onClose={()=>setSelected(null)} returnRef={storyButton}/>}
  </main>;
}
