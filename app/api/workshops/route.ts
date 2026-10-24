import {NextResponse} from "next/server";
import {fetchPublicWorkshopJson,getPublicContentOrigin,parsePublicWorkshops} from "@/lib/public-workshop";
import {parseRetryCacheBypass} from "@/lib/public-request";
import type {PublicWorkshop,WorkshopCollection} from "@/types/workshop";
const MAX_PAGES=1000;
function workshopPageCount(payload:unknown):number{
  const meta=payload&&typeof payload==="object"?(payload as {meta?:{total?:unknown;page_size?:unknown}}).meta:null;
  const total=meta?.total,pageSize=meta?.page_size;
  if(!Number.isSafeInteger(total)||Number(total)<0||!Number.isSafeInteger(pageSize)||Number(pageSize)<1)throw Error("Invalid workshop pagination");
  const pages=Math.max(1,Math.ceil(Number(total)/Number(pageSize)));
  if(pages>MAX_PAGES)throw Error("Workshop pagination exceeds the safety limit");
  return pages;
}
async function loadPeriod(origin:string,locale:string,period:"upcoming"|"past",bypassCache:boolean){
  const all:PublicWorkshop[]=[];
  for(let page=1;page<=MAX_PAGES;page++){
    const url=`${origin}/api/v1/public/workshops?locale=${locale}&period=${period}&page_size=50&page=${page}`;
    const payload=await fetchPublicWorkshopJson(url,{tags:["workshops"],bypassCache});
    const result=parsePublicWorkshops(payload,50);
    all.push(...result);
    const pageCount=workshopPageCount(payload);
    if(page>=pageCount)break;
    if(!result.length)throw Error("Workshop pagination ended before the advertised total");
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
