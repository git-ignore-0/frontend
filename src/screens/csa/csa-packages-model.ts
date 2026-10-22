import type {Locale} from "@/types";
/** Strict boundary for the public V2 membership package feed. */
export type CsaPackage = {id:string;name:string;description:string;quota_policy:"expire"|"rollover";items:{product_id:string;product_name:string;unit_size:string;unit_label_vi:string;unit_label_en:string;quota_units:number}[];price_options:{id:string;duration_months:number;monthly_price_vnd:string;total_price_vnd:string;sort_order?:number}[]};
export type CsaPackagesPage = {data:CsaPackage[];meta:{page:number;page_size:number;total:number}|null};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const safeMoney=(v:unknown)=>typeof v==="string"&&/^\d+$/.test(v)?v:typeof v==="number"&&Number.isSafeInteger(v)&&v>=0?String(v):null;
export function parseCsaPackages(raw:unknown):CsaPackagesPage{
  if(!record(raw)||!Array.isArray(raw.data))throw Error("Invalid CSA response");
  const meta=raw.meta===undefined||raw.meta===null?null:(()=>{
    if(!record(raw.meta))throw Error("Invalid pagination");
    const page=Number(raw.meta.page),page_size=Number(raw.meta.page_size),total=Number(raw.meta.total);
    if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(page_size)||page_size<1||!Number.isSafeInteger(total)||total<0)throw Error("Invalid pagination");
    return {page,page_size,total};
  })();
  const data:CsaPackage[]=raw.data.map((item:unknown)=>{
    if(!record(item)||typeof item.id!=="string"||typeof item.name!=="string"||!Array.isArray(item.items)||!Array.isArray(item.price_options))throw Error("Invalid CSA package");
    return {id:item.id,name:item.name,description:typeof item.description==="string"?item.description:"",quota_policy:item.quota_policy==="rollover"?"rollover":"expire",
      items:item.items.map((v:unknown)=>{if(!record(v)||typeof v.product_id!=="string"||typeof v.product_name!=="string"||typeof v.unit_size!=="string"||typeof v.quota_units!=="number"||!Number.isSafeInteger(v.quota_units)||v.quota_units<0)throw Error("Invalid CSA allocation");return {product_id:v.product_id,product_name:v.product_name,unit_size:v.unit_size,unit_label_vi:typeof v.unit_label_vi==="string"?v.unit_label_vi:"",unit_label_en:typeof v.unit_label_en==="string"?v.unit_label_en:"",quota_units:Number(v.quota_units)};}),
      price_options:item.price_options.map((v:unknown,index:number)=>{if(!record(v)||typeof v.id!=="string"||typeof v.duration_months!=="number"||!Number.isSafeInteger(v.duration_months)||v.duration_months<1)throw Error("Invalid CSA duration");const monthly=safeMoney(v.monthly_price_vnd),totalPrice=safeMoney(v.total_price_vnd);if(monthly===null||totalPrice===null)throw Error("Invalid CSA amount");return{id:v.id,duration_months:Number(v.duration_months),monthly_price_vnd:monthly,total_price_vnd:totalPrice,sort_order:typeof v.sort_order==="number"?v.sort_order:index};}).sort((a,b)=>(a.sort_order??Infinity)-(b.sort_order??Infinity)||a.duration_months-b.duration_months)};
  });
  return {data,meta};
}
export function csaMoney(value:string,locale:Locale){try{return new Intl.NumberFormat(locale==="vi"?"vi-VN":"en-US",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(BigInt(value));}catch{return value;}}
/** Exact decimal multiplication; avoid floating point drift for quota units. */
export function csaQuantity(unit:string,count:number,locale:Locale){
  const m=unit.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if(!m||!Number.isSafeInteger(count))return `${count} × ${unit}`;
  const fractional=(m[2]??"").replace(/0+$/,"");
  const scale=fractional.length;
  const scaled=BigInt(m[1]+fractional)*BigInt(count);
  const value=scaled.toString().padStart(scale+1,"0");
  const integer=scale?value.slice(0,-scale):value;
  const fraction=scale?value.slice(-scale).replace(/0+$/,""):"";
  const separator=locale==="vi"?".":",";
  const decimal=locale==="vi"?",":".";
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g,separator)}${fraction?decimal+fraction:""}`;
}
export function csaSavings(option:CsaPackage["price_options"][number],oneMonth:CsaPackage["price_options"][number]|undefined){if(!oneMonth||option.duration_months<=1)return BigInt(0);try{const value=BigInt(oneMonth.monthly_price_vnd)*BigInt(option.duration_months)-BigInt(option.total_price_vnd);return value>BigInt(0)?value:BigInt(0);}catch{return BigInt(0)}}
