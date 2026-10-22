import type {PublicSiteSettings} from "@/types/site-settings";

export function parseSettings(raw:unknown):PublicSiteSettings|null{
  if(!raw||typeof raw!=="object")return null;
  const value=raw as Record<string,unknown>;
  return {
    email:typeof value.email==="string"?value.email:"",
    is_email_enabled:value.is_email_enabled===true,
    phone_display:typeof value.phone_display==="string"?value.phone_display:"",
    is_phone_enabled:value.is_phone_enabled===true,
    links:Array.isArray(value.links)?value.links.flatMap((link:unknown)=>{
      if(!link||typeof link!=="object")return [];
      const item=link as Record<string,unknown>;
      if(typeof item.kind!=="string"||typeof item.url!=="string")return [];
      try{const url=new URL(item.url);return ["http:","https:"].includes(url.protocol)?[{kind:item.kind,url:url.href}]:[];}
      catch{return [];}
    }):[]
  };
}

