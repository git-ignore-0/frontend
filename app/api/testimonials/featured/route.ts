import {NextResponse} from "next/server";
import {fetchSiteStories} from "@/lib/testimonials-service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale");
  if(locale!=="vi"&&locale!=="en")return NextResponse.json({error:"invalid_request"},{status:400,headers});
  try{return NextResponse.json(await fetchSiteStories("featured",{locale}),{headers});}
  catch{return NextResponse.json({error:"upstream_unavailable"},{status:502,headers});}
}
