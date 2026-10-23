import type {Locale} from "@/types";

export function buildReferralUrl(origin:string,code:string,locale:Locale):string{
  const url=new URL(`/share/ref/${encodeURIComponent(code)}`,origin);
  url.searchParams.set("locale",locale);
  return url.toString();
}

export function messageWithReferralUrl(message:string,referralUrl:string):string{
  const parts=message.split(referralUrl);
  if(parts.length>1)return `${parts[0]}${referralUrl}${parts.slice(1).join("")}`.trimEnd();
  const trimmed=message.trimEnd();
  return trimmed?`${trimmed}\n${referralUrl}`:referralUrl;
}

export function buildReferralShareTargets({origin,code,locale,message,emailSubject}:{
  origin:string;
  code:string;
  locale:Locale;
  message:string;
  emailSubject:string;
}):{facebook:string;whatsapp:string;email:string}{
  const referralUrl=buildReferralUrl(origin,code,locale);
  const shareMessage=messageWithReferralUrl(message,referralUrl);
  const facebook=new URL("https://www.facebook.com/sharer/sharer.php");
  facebook.searchParams.set("u",referralUrl);
  const whatsapp=new URL("https://wa.me/");
  whatsapp.searchParams.set("text",shareMessage);
  const email=`mailto:?${new URLSearchParams({subject:emailSubject,body:shareMessage}).toString()}`;
  return {facebook:facebook.toString(),whatsapp:whatsapp.toString(),email};
}

export async function copyTextToClipboard(value:string):Promise<void>{
  if(navigator.clipboard?.writeText){
    try{
      await navigator.clipboard.writeText(value);
      return;
    }catch{/* Continue with the legacy selection fallback. */}
  }
  const active=document.activeElement;
  const input=document.createElement("textarea");
  input.value=value;
  input.readOnly=true;
  input.style.position="fixed";
  input.style.opacity="0";
  try{
    document.body.appendChild(input);
    input.select();
    if(typeof document.execCommand!=="function"||!document.execCommand("copy"))throw new Error("copy_failed");
  }finally{
    input.remove();
    if(active instanceof HTMLElement&&active.isConnected)active.focus();
  }
}
