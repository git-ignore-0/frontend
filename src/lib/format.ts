export const money = (value: number) => Math.max(0, Math.round(value)).toLocaleString("vi-VN") + "đ";
export const digits = (value: string) => value.replace(/\D/g, "").slice(0, 10);
export const validPhone = (phone: string) => /^(0[35789])\d{8}$/.test(digits(phone));
export const formatAddress = (a: {detail?: string; ward?: string; city?: string}) =>
  [a.detail, a.ward, a.city].map(x => String(x ?? "").trim()).filter(Boolean).join(", ");
export function dateLabel(date?: string | number | null): string {
  if (date===undefined||date===null||date==="") return "—";
  let year:number,month:number,day:number;
  if(typeof date==="string"){
    const raw=date.trim(),iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](?:.*))?$/);
    const displayed=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(iso){year=+iso[1];month=+iso[2];day=+iso[3];}
    else if(displayed){day=+displayed[1];month=+displayed[2];year=+displayed[3];}
    else return "—";
  }else{
    const d=new Date(date);if(Number.isNaN(d.getTime()))return "—";
    year=d.getUTCFullYear();month=d.getUTCMonth()+1;day=d.getUTCDate();
  }
  const time=Date.UTC(year,month-1,day),verify=new Date(time);
  if(year<100||year>9999||month<1||month>12||day<1||day>31
    ||verify.getUTCFullYear()!==year||verify.getUTCMonth()+1!==month||verify.getUTCDate()!==day)return "—";
  return `${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}/${String(year).padStart(4,"0")}`;
}
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
