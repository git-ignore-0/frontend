import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {DEFAULT_DATE_TIME_ZONE,formatDate,formatTime} from "./date-format";
function zoneFor(value:string){try{new Intl.DateTimeFormat("en",{timeZone:value});return value}catch{return DEFAULT_DATE_TIME_ZONE}}
/** Stable labels even when optional CMS data has a malformed date/timezone. */
export function formatWorkshopDate(item:PublicWorkshop,locale:Locale){
  void locale;
  const start=new Date(item.start_at);
  const end=new Date(item.end_at);
  if(!Number.isFinite(start.getTime()))return {day:"--",month:"",label:""};
  const endDate=Number.isFinite(end.getTime())?end:start;
  const timeZone=zoneFor(item.event_timezone),from=formatDate(start,timeZone),to=formatDate(endDate,timeZone);
  const [day,month]=from.split("/");
  return {day,month,label:from===to?`${from} · ${formatTime(start,timeZone)}–${formatTime(endDate,timeZone)}`:`${from} · ${formatTime(start,timeZone)} – ${to} · ${formatTime(endDate,timeZone)}`};
}
