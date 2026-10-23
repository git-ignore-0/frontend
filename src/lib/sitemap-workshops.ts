import {parsePublicWorkshops,workshopFetchOptions} from "./public-workshop.ts";
import type {Locale} from "../types.ts";

export type SitemapWorkshop={slug:string};
const MAX_SITEMAP_WORKSHOPS=49_982;

async function loadPeriod(origin:string,locale:Locale,period:"upcoming"|"past",fetcher:typeof fetch):Promise<SitemapWorkshop[]>{
  const items:SitemapWorkshop[]=[];
  for(let page=1;items.length<MAX_SITEMAP_WORKSHOPS;page++){
    const url=`${origin}/api/v1/public/workshops?locale=${locale}&period=${period}&page_size=50&page=${page}`;
    const response=await fetcher(url,{...workshopFetchOptions(process.env.NODE_ENV,["workshops"]),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error(`Public workshops returned ${response.status}`);
    const payload=await response.json();
    const records=parsePublicWorkshops(payload,50);
    for(const record of records)if(!record.is_fallback&&items.length<MAX_SITEMAP_WORKSHOPS)items.push({slug:record.slug});
    const meta=payload&&typeof payload==="object"?(payload as {meta?:{total?:number;page_size?:number}}).meta:undefined;
    const pages=meta&&Number.isFinite(meta.total)&&Number.isFinite(meta.page_size)&&Number(meta.page_size)>0?Math.ceil(Number(meta.total)/Number(meta.page_size)):1;
    if(page>=pages||records.length===0)break;
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
