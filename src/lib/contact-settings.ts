import type {PublicSiteSettings} from "@/types/site-settings";
import {formatVietnamPhone,normalizeTelephoneNumber} from "./phone-number.ts";

export type ContactPresentation={
  email:string;
  phone:string;
  phoneHref:string;
  facebook:string;
  youtube:string;
};

export function contactPresentation(settings:PublicSiteSettings|null):ContactPresentation{
  if(!settings)return {email:"",phone:"",phoneHref:"",facebook:"",youtube:""};
  const email=settings.is_email_enabled?settings.email.trim():"";
  const phone=settings.is_phone_enabled?settings.phone_display.trim():"";
  const callablePhone=normalizeTelephoneNumber(phone);
  const social=(kind:"facebook"|"youtube")=>settings.links.find(link=>link.kind===kind)?.url||"";
  return {
    email,
    phone:callablePhone?formatVietnamPhone(phone):"",
    phoneHref:callablePhone?`tel:${callablePhone}`:"",
    facebook:social("facebook"),
    youtube:social("youtube"),
  };
}
