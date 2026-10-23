import {ImageResponse} from "next/og";
import {NextRequest} from "next/server";
import {isReferralCode,normalizeReferralCode} from "@/account/referral-presentation";
import {referralShareContent} from "@/account/referral-share-content";
import type {Locale} from "@/types";

export const runtime="nodejs";

export async function GET(request:NextRequest,{params}:{params:Promise<{code:string}>}){
  const code=normalizeReferralCode((await params).code);
  if(!isReferralCode(code))return new Response(null,{status:404});
  const locale:Locale=request.nextUrl.searchParams.get("locale")==="en"?"en":"vi";
  const copy=referralShareContent(locale);
  return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",background:"#f7f7f0",color:"#243629",fontFamily:"sans-serif"}}>
    <div style={{width:"64%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"72px 76px"}}>
      <div style={{display:"flex",marginBottom:26,color:"#376c4a",fontSize:22,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>{copy.eyebrow}</div>
      <div style={{display:"flex",maxWidth:720,fontFamily:"serif",fontSize:64,fontWeight:600,letterSpacing:"-0.035em",lineHeight:1.05}}>{copy.title}</div>
      <div style={{display:"flex",marginTop:38,fontSize:24,fontWeight:700}}>Natural Farming Vietnam</div>
    </div>
    <div style={{position:"relative",width:"36%",display:"flex",overflow:"hidden",background:"#244b34"}}>
      <div style={{position:"absolute",top:68,right:62,width:128,height:128,display:"flex",borderRadius:"50%",background:"#d6a35a"}}/>
      <div style={{position:"absolute",right:-80,bottom:-120,width:560,height:380,display:"flex",borderRadius:"50% 50% 0 0",background:"#6f8b62",transform:"rotate(-7deg)"}}/>
      <div style={{position:"absolute",right:-130,bottom:-220,width:620,height:390,display:"flex",borderRadius:"50% 50% 0 0",background:"#755846",transform:"rotate(8deg)"}}/>
      <div style={{position:"absolute",bottom:52,left:48,display:"flex",color:"#fffefb",fontSize:18,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>{copy.visualNote}</div>
    </div>
  </div>,{width:1200,height:630,headers:{"Cache-Control":"public, max-age=86400, immutable"}});
}
