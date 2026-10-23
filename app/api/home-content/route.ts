import {NextResponse} from "next/server";
import type {PublicWorkshop} from "@/types/workshop";
import {fetchPublicWorkshopJson,parsePublicWorkshops,getPublicContentOrigin} from "@/lib/public-workshop";

type PublicHomeData={workshops:PublicWorkshop[]};
const EMPTY:PublicHomeData={workshops:[]};
const json=(data:PublicHomeData)=>NextResponse.json(data);

/** Optional public CMS content only. Never reads auth cookies or private APIs. */
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale")==="en"?"en":"vi";
  const origin=getPublicContentOrigin();
  if(!origin)return json(EMPTY);
  const workshopUrl=`${origin}/api/v1/public/workshops?locale=${locale}&period=upcoming&page_size=50&page=1`;
  try{
    const workshopsBody=await fetchPublicWorkshopJson(workshopUrl,{tags:["workshops"]});
    return json({workshops:parsePublicWorkshops(workshopsBody,3)});
  }catch{return json(EMPTY);}
}
