import type {StoreLocale} from './store-model';
export function isStoreDeliveryDate(value:unknown):value is string{
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(`${value}T12:00:00Z`);
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function vietnamDate(time:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
export type StoreDeliveryCalendar={serverTime:string;dates:{date:string;freeShipping:boolean}[]};
export function parseStoreDeliveryCalendar(value:unknown):StoreDeliveryCalendar{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error('invalid_response');
 const v=value as Record<string,unknown>;
 if(typeof v.server_time!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v.server_time)||!Number.isFinite(Date.parse(v.server_time))||!Array.isArray(v.dates)||v.dates.length!==8)throw Error('invalid_response');
 const first=vietnamDate(Date.parse(v.server_time));
 const dates=v.dates.map((row,i)=>{
  if(!row||typeof row!=="object"||Array.isArray(row))throw Error('invalid_response');
  const r=row as Record<string,unknown>;
  const expected=new Date(Date.parse(`${first}T12:00:00Z`)+i*86400000).toISOString().slice(0,10);
  if(!isStoreDeliveryDate(r.delivery_date)||r.delivery_date!==expected||typeof r.free_shipping!=="boolean")throw Error('invalid_response');
  return {date:r.delivery_date,freeShipping:r.free_shipping};
 });
 return {serverTime:v.server_time,dates};
}
export function deliveryWeekdayLabel(value:string,locale:StoreLocale){
 if(!isStoreDeliveryDate(value))return '—';
 return new Intl.DateTimeFormat(locale==='vi'?'vi-VN':'en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
}
export function deliveryDayLabel(value:string,locale:StoreLocale){
 if(!isStoreDeliveryDate(value))return '—';
 return `${deliveryWeekdayLabel(value,locale)} ${value.slice(8,10)}/${value.slice(5,7)}`;
}
export function deliveryDateLabel(value:string|null|undefined){return isStoreDeliveryDate(value)?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:'—';}
