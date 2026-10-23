import {NextResponse} from "next/server";
import {fetchPublicWorkshopJson,getPublicContentOrigin,parsePublicWorkshops} from "@/lib/public-workshop";
import type {PublicWorkshop,WorkshopCollection} from "@/types/workshop";
const EMPTY:WorkshopCollection={upcoming:[],past:[]};
async function loadPeriod(origin:string,locale:string,period:"upcoming"|"past"){
  const all:PublicWorkshop[]=[];
  for(let page=1;page<=10;page++){
    const url=`${origin}/api/v1/public/workshops?locale=${locale}&period=${period}&page_size=50&page=${page}`;
    const payload=await fetchPublicWorkshopJson(url);
    const result=parsePublicWorkshops(payload,50);
    all.push(...result);
    const meta=payload&&typeof payload==="object"?((payload as {meta?:{total?:number;page_size?:number}}).meta):null;
    const pageCount=meta&&Number.isFinite(meta.total)&&Number.isFinite(meta.page_size)&&Number(meta.page_size)>0?Math.ceil(Number(meta.total)/Number(meta.page_size)):1;
    if(page>=pageCount||!result.length)break;
  }
  return all;
}
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale")==="en"?"en":"vi";
  const origin=getPublicContentOrigin();
  if(!origin)return NextResponse.json({...EMPTY,configured:false});
  const [upcoming,past]=await Promise.allSettled([loadPeriod(origin,locale,"upcoming"),loadPeriod(origin,locale,"past")]);
  const success=upcoming.status==="fulfilled"||past.status==="fulfilled";
  return NextResponse.json({upcoming:upcoming.status==="fulfilled"?upcoming.value:[],past:past.status==="fulfilled"?past.value:[],configured:true,error:!success},{status:success?200:502});
}
