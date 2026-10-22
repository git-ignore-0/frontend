import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
const DEFAULT_ZONE="Asia/Ho_Chi_Minh";
function zoneFor(value:string){try{new Intl.DateTimeFormat("en",{timeZone:value});return value}catch{return DEFAULT_ZONE}}
/** Stable labels even when optional CMS data has a malformed date/timezone. */
export function formatWorkshopDate(item:PublicWorkshop,locale:Locale){
  const start=new Date(item.start_at);
  const end=new Date(item.end_at);
  if(!Number.isFinite(start.getTime()))return {day:"--",month:"",label:""};
  const endDate=Number.isFinite(end.getTime())?end:start;
  const language=locale==="vi"?"vi-VN":"en-US",timeZone=zoneFor(item.event_timezone);
  const date=new Intl.DateTimeFormat(language,{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone});
  const time=new Intl.DateTimeFormat(language,{hour:"2-digit",minute:"2-digit",timeZone});
  const from=date.format(start),to=date.format(endDate);
  return {day:new Intl.DateTimeFormat(language,{day:"2-digit",timeZone}).format(start),
    month:new Intl.DateTimeFormat(language,{month:"short",timeZone}).format(start),
    label:from===to?`${from} · ${time.format(start)}–${time.format(endDate)}`:`${from} · ${time.format(start)} – ${to} · ${time.format(endDate)}`};
}
