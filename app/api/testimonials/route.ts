import {NextResponse} from "next/server";
import {fetchSiteStories} from "@/lib/testimonials-service";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const locale=params.get("locale"),type=params.get("type")??"all",page=Number(params.get("page")??"1");
  if((locale!=="vi"&&locale!=="en")||(type!=="all"&&type!=="customer"&&type!=="farmer")||!Number.isInteger(page)||page<1||page>10000||params.get("page_size")!=="12")
    return NextResponse.json({error:"invalid_request"},{status:400,headers});
  try{return NextResponse.json(await fetchSiteStories("list",{locale,type,page}),{headers});}
  catch{return NextResponse.json({error:"upstream_unavailable"},{status:502,headers});}
}
