import {getPublicContentOrigin} from "@/lib/public-workshop";
import {parseTestimonialsPage,parseFeaturedTestimonials,parseTestimonialDetail} from "@/lib/testimonials";

type StoryKind="list"|"featured"|"detail";
type StoryOptions={locale:"vi"|"en";type?:"all"|"customer"|"farmer";page?:number;pageSize?:number;id?:string;bypassCache?:boolean};

export class TestimonialsConfigurationError extends Error {}
export class TestimonialsUpstreamError extends Error {
  constructor(public readonly status:number){
    super(`testimonials_upstream_status_${status}`);
    this.name="TestimonialsUpstreamError";
  }
}

/** Local CMS edits stay immediate; production uses the same five-minute policy as v2. */
export function testimonialsFetchOptions(environment:string|undefined=process.env.NODE_ENV,bypassCache=false,tags:string[]=["testimonials"]){
  return environment==="development"||bypassCache?{cache:"no-store" as const}:{next:{revalidate:300,tags}};
}

/** Server-to-server gateway to the backend public Testimonials API. */
export async function fetchSiteStories(kind:StoryKind,options:StoryOptions){
  const origin=getPublicContentOrigin();
  if(!origin)throw new TestimonialsConfigurationError("content_api_not_configured");
  const endpoint=kind==="featured"?"/api/v1/public/testimonials/featured":kind==="detail"?`/api/v1/public/testimonials/${encodeURIComponent(options.id??"")}`:"/api/v1/public/testimonials";
  const target=new URL(endpoint,origin);
  target.searchParams.set("locale",options.locale);
  if(kind==="list"){
    target.searchParams.set("type",options.type??"all");
    target.searchParams.set("page",String(options.page??1));
    target.searchParams.set("page_size",String(options.pageSize??12));
  }
  const tags=kind==="detail"&&options.id?["testimonials",`testimonial:${options.id}`]:["testimonials"];
  const response=await fetch(target,{...testimonialsFetchOptions(process.env.NODE_ENV,options.bypassCache===true,tags),signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
  if(!response.ok)throw new TestimonialsUpstreamError(response.status);
  const body:unknown=await response.json();
  if(kind==="featured")return {data:parseFeaturedTestimonials(body)};
  if(kind==="detail")return {data:parseTestimonialDetail(body)};
  return parseTestimonialsPage(body);
}
