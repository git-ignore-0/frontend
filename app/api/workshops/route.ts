import {NextResponse} from "next/server";
import {fetchPublicWorkshopJson,getPublicContentOrigin,parsePublicWorkshopPage} from "@/lib/public-workshop";
import {parseRetryCacheBypass} from "@/lib/public-request";
import type {PublicWorkshop,WorkshopCollection} from "@/types/workshop";
const MAX_PAGES=1000;
async function loadPeriod(origin:string,locale:"vi"|"en",period:"upcoming"|"past",bypassCache:boolean){
  const all:PublicWorkshop[]=[];
  const ids=new Set<string>(),slugs=new Set<string>();
  for(let page=1;page<=MAX_PAGES;page++){
    const url=`${origin}/api/v1/public/workshops?locale=${locale}&period=${period}&page_size=50&page=${page}`;
    const payload=await fetchPublicWorkshopJson(url,{tags:["workshops"],bypassCache});
    const {items,pageCount}=parsePublicWorkshopPage(payload,page,50,locale);
    if(pageCount>MAX_PAGES)throw Error("Workshop pagination exceeds the safety limit");
    for(const item of items){
      if(ids.has(item.id)||slugs.has(item.slug))throw Error("Duplicate public workshop");
      ids.add(item.id);
      slugs.add(item.slug);
      all.push(item);
    }
    if(page>=pageCount)break;
    if(!items.length)throw Error("Workshop pagination ended before the advertised total");
  }
  return all;
}
export async function GET(request:Request){
  const searchParams=new URL(request.url).searchParams;
  const locale=searchParams.get("locale")==="en"?"en":"vi";
  const bypassCache=parseRetryCacheBypass(searchParams);
  if(bypassCache===null)return NextResponse.json({error:"invalid_request"},{status:400});
  const origin=getPublicContentOrigin();
  if(!origin)return NextResponse.json({error:"configuration"},{status:503});
  const [upcoming,past]=await Promise.allSettled([
    loadPeriod(origin,locale,"upcoming",bypassCache),
    loadPeriod(origin,locale,"past",bypassCache),
  ]);
  if(upcoming.status==="rejected"||past.status==="rejected")return NextResponse.json({error:"upstream_unavailable"},{status:502});
  const result:WorkshopCollection={upcoming:upcoming.value,past:past.value};
  return NextResponse.json(result);
}
