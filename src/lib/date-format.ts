export const DEFAULT_DATE_TIME_ZONE="Asia/Ho_Chi_Minh";

type DateValue=string|number|Date|null|undefined;

const DATE_ONLY=/^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE=/^(\d{2})\/(\d{2})\/(\d{4})$/;

function validTimeZone(value:string):string{
  try{new Intl.DateTimeFormat("en-GB",{timeZone:value});return value;}catch{return DEFAULT_DATE_TIME_ZONE;}
}

function calendarDate(value:string):Date|null{
  const match=value.match(DATE_ONLY);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day?date:null;
}

function displayedDate(value:string):string|null{
  const match=value.match(DISPLAY_DATE);if(!match)return null;
  const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day?value:null;
}

function parsedDate(value:DateValue):Date|null{
  if(value===null||value===undefined||value==="")return null;
  const date=value instanceof Date?new Date(value.getTime()):new Date(value);
  return Number.isNaN(date.getTime())?null:date;
}

function parts(date:Date,timeZone:string,withTime:boolean){
  const values=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{
    day:"2-digit",month:"2-digit",year:"numeric",
    ...(withTime?{hour:"2-digit" as const,minute:"2-digit" as const,hourCycle:"h23" as const}:{}),
    timeZone:validTimeZone(timeZone),
  }).formatToParts(date).map(part=>[part.type,part.value]));
  return values;
}

export function formatDate(value:DateValue,timeZone=DEFAULT_DATE_TIME_ZONE):string{
  if(typeof value==="string"){
    const normalized=value.trim(),date=calendarDate(normalized);
    if(DATE_ONLY.test(normalized))return date?`${normalized.slice(8,10)}/${normalized.slice(5,7)}/${normalized.slice(0,4)}`:"—";
    if(DISPLAY_DATE.test(normalized))return displayedDate(normalized)??"—";
  }
  const date=parsedDate(value);if(!date)return "—";
  const valueParts=parts(date,timeZone,false);
  return `${valueParts.day}/${valueParts.month}/${valueParts.year}`;
}

export function formatDateTime(value:DateValue,timeZone=DEFAULT_DATE_TIME_ZONE):string{
  const date=parsedDate(value);if(!date)return "—";
  const valueParts=parts(date,timeZone,true);
  return `${valueParts.day}/${valueParts.month}/${valueParts.year} ${valueParts.hour}:${valueParts.minute}`;
}

export function formatTime(value:DateValue,timeZone=DEFAULT_DATE_TIME_ZONE):string{
  const date=parsedDate(value);if(!date)return "—";
  const valueParts=parts(date,timeZone,true);
  return `${valueParts.hour}:${valueParts.minute}`;
}

export function formatExclusiveEndDate(value:DateValue):string{
  if(typeof value!=="string")return formatDate(value);
  const date=calendarDate(value);if(!date)return "—";
  date.setUTCDate(date.getUTCDate()-1);
  return `${String(date.getUTCDate()).padStart(2,"0")}/${String(date.getUTCMonth()+1).padStart(2,"0")}/${String(date.getUTCFullYear()).padStart(4,"0")}`;
}
