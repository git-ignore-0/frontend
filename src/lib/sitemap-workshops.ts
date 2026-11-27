import {parsePublicWorkshopPage,workshopFetchOptions} from "./public-workshop.ts";
import type {Locale} from "../types.ts";

export type SitemapWorkshop={slug:string};
const MAX_SITEMAP_WORKSHOPS=49_982;
const MAX_PAGES=1000;

async function loadPeriod(origin:string,locale:Locale,period:"upcoming"|"past",fetcher:typeof fetch):Promise<SitemapWorkshop[]>{
  const items:SitemapWorkshop[]=[];
  for(let page=1;page<=MAX_PAGES&&items.length<MAX_SITEMAP_WORKSHOPS;page++){
    const url=`${origin}/api/v1/public/workshops?locale=${locale}&period=${period}&page_size=50&page=${page}`;
    const response=await fetcher(url,{...workshopFetchOptions(process.env.NODE_ENV,["workshops"]),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error(`Public workshops returned ${response.status}`);
    const payload=await response.json();
    const {items:records,pageCount}=parsePublicWorkshopPage(payload,page,50,locale);
    for(const record of records)if(!record.is_fallback&&items.length<MAX_SITEMAP_WORKSHOPS)items.push({slug:record.slug});
    if(page>=pageCount||records.length===0)break;
  }
  return items;
}

export async function getSitemapWorkshops(origin:string,locale:Locale,fetcher:typeof fetch=fetch):Promise<SitemapWorkshop[]>{
  const periods=await Promise.allSettled([
    loadPeriod(origin,locale,"upcoming",fetcher),
    loadPeriod(origin,locale,"past",fetcher),
  ]);
  const unique=new Map<string,SitemapWorkshop>();
  for(const result of periods)if(result.status==="fulfilled")for(const item of result.value)unique.set(item.slug,item);
  return [...unique.values()].slice(0,MAX_SITEMAP_WORKSHOPS);
}
