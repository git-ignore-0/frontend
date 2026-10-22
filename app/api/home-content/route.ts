import {NextResponse} from "next/server";
import type {PublicWorkshop} from "@/types/workshop";
import {parsePublicWorkshops,getPublicContentOrigin} from "@/lib/public-workshop";
import type {PublicSiteSettings} from "@/types/site-settings";
import {parseSettings} from "@/lib/public-settings";

type PublicHomeData={workshops:PublicWorkshop[];settings:PublicSiteSettings|null};
const EMPTY:PublicHomeData={workshops:[],settings:null};
const json=(data:PublicHomeData)=>NextResponse.json(data);

/** Optional public CMS content only. Never reads auth cookies or private APIs. */
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale")==="en"?"en":"vi";
  const origin=getPublicContentOrigin();
  if(!origin)return json(EMPTY);
  const options={next:{revalidate:300},signal:AbortSignal.timeout(5000)} as const;
  const requests=[
    `${origin}/api/v1/public/workshops?locale=${locale}&period=upcoming&page_size=50&page=1`,
    `${origin}/api/v1/public/site-settings?locale=${locale}`
  ];
  try{
    const [workshopsResult,settingsResult]=await Promise.allSettled(requests.map(url=>fetch(url,options)));
    const workshopsResponse=workshopsResult.status==="fulfilled"?workshopsResult.value:null;
    const settingsResponse=settingsResult.status==="fulfilled"?settingsResult.value:null;
    const [workshopsBody,settingsBody]=await Promise.all([
      workshopsResponse?.ok?workshopsResponse.json().catch(()=>null):null,
      settingsResponse?.ok?settingsResponse.json().catch(()=>null):null
    ]);
    return json({workshops:parsePublicWorkshops(workshopsBody,3),settings:parseSettings(settingsBody?.data)});
  }catch{return json(EMPTY);}
}
