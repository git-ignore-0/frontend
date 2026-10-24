import {SITE_ORIGIN} from "../config/site-brand.ts";
import type {PublicSiteSettings} from "../types/site-settings.ts";

type OrganizationJsonLd={
  "@context":"https://schema.org";
  "@type":"Organization";
  name:string;
  url:string;
  email?:string;
  telephone?:string;
  sameAs?:string[];
};

function validEmail(value:string):string{
  const email=value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:"";
}

function normalizedPhone(value:string):string{
  const trimmed=value.trim();
  const digits=trimmed.replace(/\D/g,"");
  if(digits.length<7||digits.length>15)return "";
  return trimmed.startsWith("+")?`+${digits}`:digits;
}

function platformHost(kind:"facebook"|"youtube",hostname:string):boolean{
  const host=hostname.toLowerCase();
  const matches=(domain:string)=>host===domain||host.endsWith(`.${domain}`);
  return kind==="facebook"?matches("facebook.com"):matches("youtube.com")||host==="youtu.be";
}

function socialUrl(kind:"facebook"|"youtube",value:string):string{
  try{
    const url=new URL(value);
    return ["http:","https:"].includes(url.protocol)&&!url.username&&!url.password&&platformHost(kind,url.hostname)?url.toString().replace(/\/$/,""):"";
  }catch{return "";}
}

export function organizationJsonLd(settings:PublicSiteSettings|null):OrganizationJsonLd{
  const value:OrganizationJsonLd={"@context":"https://schema.org","@type":"Organization",name:"Natural Farming Vietnam",url:SITE_ORIGIN};
  if(!settings)return value;
  const email=settings.is_email_enabled?validEmail(settings.email):"";
  const telephone=settings.is_phone_enabled?normalizedPhone(settings.phone_display):"";
  const sameAs=settings.links.flatMap(link=>{
    if(link.kind!=="facebook"&&link.kind!=="youtube")return [];
    const url=socialUrl(link.kind,link.url);
    return url?[url]:[];
  });
  if(email)value.email=email;
  if(telephone)value.telephone=telephone;
  if(sameAs.length)value.sameAs=[...new Set(sameAs)];
  return value;
}

export function serializeJsonLd(value:unknown):string{
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,character=>({"<":"\\u003c",">":"\\u003e","&":"\\u0026","\u2028":"\\u2028","\u2029":"\\u2029"})[character]||character);
}
