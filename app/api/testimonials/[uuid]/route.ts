import {NextResponse} from "next/server";
import {fetchSiteStories} from "@/lib/testimonials-service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request,{params}:{params:Promise<{uuid:string}>}){
  const {uuid}=await params;
  const locale=new URL(request.url).searchParams.get("locale");
  if((locale!=="vi"&&locale!=="en")||!/^[a-zA-Z0-9_-]{1,100}$/.test(uuid))return NextResponse.json({error:"invalid_request"},{status:400,headers});
  try{return NextResponse.json(await fetchSiteStories("detail",{locale,id:uuid}),{headers});}
  catch{return NextResponse.json({error:"upstream_unavailable"},{status:502,headers});}
}
