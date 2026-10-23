import type {PublicSiteSettings} from "@/types/site-settings";

export type ContactPresentation={
  email:string;
  phone:string;
  phoneHref:string;
  facebook:string;
  youtube:string;
};

function telephoneHref(value:string):string{
  const trimmed=value.trim();
  const digits=trimmed.replace(/\D/g,"");
  if(digits.length<7||digits.length>15)return "";
  return `tel:${trimmed.startsWith("+")?`+${digits}`:digits}`;
}

export function contactPresentation(settings:PublicSiteSettings|null):ContactPresentation{
  if(!settings)return {email:"",phone:"",phoneHref:"",facebook:"",youtube:""};
  const email=settings.is_email_enabled?settings.email.trim():"";
  const phone=settings.is_phone_enabled?settings.phone_display.trim():"";
  const phoneHref=telephoneHref(phone);
  const social=(kind:"facebook"|"youtube")=>settings.links.find(link=>link.kind===kind)?.url||"";
  return {
    email,
    phone:phoneHref?phone:"",
    phoneHref,
    facebook:social("facebook"),
    youtube:social("youtube"),
  };
}
