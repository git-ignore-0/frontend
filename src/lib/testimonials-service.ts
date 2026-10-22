import { SITE_ORIGIN } from "@/config/site-brand";
import {parseTestimonialsPage,parseFeaturedTestimonials,parseTestimonialDetail} from "@/lib/testimonials";
/** Public server-to-server gateway to the site's existing testimonials API. */
export async function fetchSiteStories(kind:"list"|"featured"|"detail", options:{locale:"vi"|"en";type?:"all"|"customer"|"farmer";page?:number;id?:string}) {
  const endpoint= kind==="featured"?"/api/testimonials/featured":kind==="detail"?`/api/testimonials/${encodeURIComponent(options.id??"")}`:"/api/testimonials";
  const upstreamOrigin=/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(SITE_ORIGIN)
    ? "https://naturalfarmingvietnam.com" : SITE_ORIGIN;
  const target=new URL(endpoint,upstreamOrigin);
  target.searchParams.set("locale",options.locale);
  if(kind==="list"){
    target.searchParams.set("type",options.type??"all");
    target.searchParams.set("page",String(options.page??1));
    target.searchParams.set("page_size","12");
  }
  const response=await fetch(target,{cache:"no-store",signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error(`site_stories_status_${response.status}`);
  const body:unknown=await response.json();
  if(kind==="featured")return {data:parseFeaturedTestimonials(body)};
  if(kind==="detail")return {data:parseTestimonialDetail(body)};
  return parseTestimonialsPage(body);
}
