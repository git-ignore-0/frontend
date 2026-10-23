import type {Locale} from "@/types";

export function profileBirthDate(value:string|null,locale:Locale):string {
  if(!value)return "";
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return new Intl.DateTimeFormat(locale==="vi"?"vi-VN":"en-GB",{
    day:"2-digit",
    month:locale==="vi"?"2-digit":"short",
    year:"numeric",
    timeZone:"UTC",
  }).format(date);
}
