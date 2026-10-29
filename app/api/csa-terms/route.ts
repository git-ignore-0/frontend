import {NextResponse} from "next/server";
import {getPublicContentOrigin} from "@/lib/public-workshop";
import {parseCsaTerms} from "@/screens/account-csa/csa-terms-model";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};

export async function GET(request:Request){
  const locale=new URL(request.url).searchParams.get("locale")==="en"?"en":"vi";
  const origin=getPublicContentOrigin();
  if(!origin)return NextResponse.json({error:"CSA terms API not configured"},{status:503,headers});
  try{
    const response=await fetch(`${origin}/api/v1/public/csa-terms?locale=${locale}`,{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error(`CSA terms upstream ${response.status}`);
    return NextResponse.json({data:parseCsaTerms(await response.json())},{headers});
  }catch{
    return NextResponse.json({error:"CSA terms unavailable"},{status:502,headers});
  }
}
