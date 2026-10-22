import {NextResponse} from "next/server";
import {getPublicContentOrigin} from "@/lib/public-workshop";
import {parseCsaPackages} from "@/screens/csa/csa-packages-model";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
/** Public CSA feed used by V2; no account authentication is required. */
export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const locale=params.get("locale")==="en"?"en":"vi";
  const page=Number(params.get("page")??1);
  if(!Number.isSafeInteger(page)||page<1||page>1000)return NextResponse.json({error:"Invalid page"},{status:400,headers});
  const origin=getPublicContentOrigin();
  if(!origin)return NextResponse.json({error:"CSA API not configured"},{status:503,headers});
  try{
    const response=await fetch(`${origin}/api/v1/public/membership-packages?locale=${locale}&page=${page}`,{cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error(`CSA upstream ${response.status}`);
    const parsed=parseCsaPackages(await response.json());
    return NextResponse.json(parsed,{headers});
  }catch{return NextResponse.json({error:"CSA packages unavailable"},{status:502,headers});}
}
