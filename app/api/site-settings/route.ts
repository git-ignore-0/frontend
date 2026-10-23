import {NextResponse} from "next/server";
import {getPublicContentOrigin} from "@/lib/public-workshop";
import {parseSettings} from "@/lib/public-settings";
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale")==="en"?"en":"vi";
  const origin=getPublicContentOrigin();
  if(!origin)return NextResponse.json(null);
  try{
    const response=await fetch(`${origin}/api/v1/public/site-settings?locale=${locale}`,{
      cache:"no-store",signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)return NextResponse.json(null);
    const payload=await response.json();
    return NextResponse.json(parseSettings(payload?.data));
  }catch{return NextResponse.json(null)}
}
