import {NextRequest,NextResponse} from "next/server";
import {beginOAuth} from "@/auth/server/begin";
import {publicSiteOrigin} from "@/auth/server/config";
import {readSession} from "@/auth/server/session";
import {parseLocale} from "@/auth/server/validation";
import {isReferralCode,normalizeReferralCode} from "@/account/referral-presentation";

export const runtime="nodejs";

export async function GET(request:NextRequest,{params}:{params:Promise<{code:string}>}){
  const locale=parseLocale(request.nextUrl.searchParams.get("locale"));
  const code=normalizeReferralCode((await params).code);
  const origin=publicSiteOrigin();
  if(!isReferralCode(code))return NextResponse.redirect(`${origin}/${locale}`);
  const returnTo=`/account/${locale}?tab=referrals&ref=${encodeURIComponent(code)}`;
  if(!(await readSession()))return beginOAuth(request,{signup:true,referralCode:code,returnTo});
  return NextResponse.redirect(`${origin}${returnTo}`);
}
