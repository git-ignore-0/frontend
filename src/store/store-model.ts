import {SITE_ORIGIN} from "@/config/site-brand";

export type StoreLocale="vi"|"en";
export type StoreImage={id:string;url:string;width:number;height:number;variants:Array<{url:string;width:number;height:number}>};
export type StoreCategory={id:string;parent_id:string|null;slug:string;sort_order:number;name:string;requested_locale:StoreLocale;content_locale:StoreLocale;is_fallback:boolean};
export type StoreSupplier={id:string;name:string;location?:string};
export type StoreProductCard={id:string;slug:string;sku:string;name:string;alternate_name:string|null;short_description:string;retail_price_vnd:number;unit_size:string;unit_label:string;category:{id:string;slug:string;name:string};primary_image:StoreImage|null;csa_eligible:boolean;suppliers:StoreSupplier[];requested_locale:StoreLocale;content_locale:StoreLocale;available_locales:StoreLocale[];is_fallback:boolean};
export type StoreProductDetail=StoreProductCard&{description:string;suppliers:Array<StoreSupplier&{location:string}>};
export type StorePage={data:StoreProductCard[];meta:{page:number;page_size:number;total:number}};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG=/^[a-z0-9_-]+$/i;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value)}
function locale(value:unknown):value is StoreLocale{return value==="vi"||value==="en"}
function nonEmpty(value:unknown,max:number):value is string{return typeof value==="string"&&value.length>0&&value.length<=max}
function uuid(value:unknown):value is string{return typeof value==="string"&&UUID.test(value)}
function slug(value:unknown):value is string{return typeof value==="string"&&value.length<=180&&SLUG.test(value)}
function safeUrl(value:unknown):string|null{
 if(typeof value!=="string")return null;
 try{const url=new URL(value,SITE_ORIGIN);return url.protocol==="http:"||url.protocol==="https:"?url.toString():null}catch{return null}
}
function image(value:unknown):StoreImage|null{
 if(value===null)return null;
 if(!record(value)||!uuid(value.id)||!Number.isInteger(value.width)||Number(value.width)<=0||!Number.isInteger(value.height)||Number(value.height)<=0)return null;
 const url=safeUrl(value.url);if(!url||!Array.isArray(value.variants))return null;
 const variants=value.variants.map(item=>{
  if(!record(item)||!Number.isInteger(item.width)||Number(item.width)<=0||!Number.isInteger(item.height)||Number(item.height)<=0)return null;
  const src=safeUrl(item.url);return src?{url:src,width:Number(item.width),height:Number(item.height)}:null;
 });
 return variants.some(item=>item===null)?null:{id:value.id,url,width:Number(value.width),height:Number(value.height),variants:variants as StoreImage["variants"]};
}
function localeFields(value:Record<string,unknown>){
 if(!locale(value.requested_locale)||!locale(value.content_locale)||typeof value.is_fallback!=="boolean")return null;
 return {requested_locale:value.requested_locale,content_locale:value.content_locale,is_fallback:value.is_fallback};
}
function parseCategory(value:unknown):StoreCategory|null{
 if(!record(value)||!uuid(value.id)||!(value.parent_id===null||uuid(value.parent_id))||!slug(value.slug)||!Number.isInteger(value.sort_order)||Number(value.sort_order)<0||!nonEmpty(value.name,200))return null;
 const localized=localeFields(value);return localized?{id:value.id,parent_id:value.parent_id as string|null,slug:value.slug,sort_order:Number(value.sort_order),name:value.name,...localized}:null;
}
function parseSupplier(value:unknown,detail:boolean):StoreSupplier|null{
 if(!record(value)||!uuid(value.id)||!nonEmpty(value.name,240)||detail&&!nonEmpty(value.location,240))return null;
 return {id:value.id,name:value.name,...(detail?{location:value.location as string}:{})};
}
function parseProduct(value:unknown,detail:boolean):StoreProductCard|StoreProductDetail|null{
 if(!record(value)||!uuid(value.id)||!slug(value.slug)||!nonEmpty(value.sku,80)||!nonEmpty(value.name,200)||!(value.alternate_name===null||nonEmpty(value.alternate_name,200))||typeof value.short_description!=="string"||value.short_description.length>800||!Number.isSafeInteger(value.retail_price_vnd)||Number(value.retail_price_vnd)<=0||typeof value.unit_size!=="string"||!/^\d{1,7}\.\d{3}$/.test(value.unit_size)||!nonEmpty(value.unit_label,40)||typeof value.csa_eligible!=="boolean"||!Array.isArray(value.suppliers)||!Array.isArray(value.available_locales)||value.available_locales.some(item=>!locale(item))||detail&&typeof value.description!=="string")return null;
 const localized=localeFields(value);if(!localized||!record(value.category)||!uuid(value.category.id)||!slug(value.category.slug)||!nonEmpty(value.category.name,200))return null;
 const primary=image(value.primary_image);if(value.primary_image!==null&&!primary)return null;
 const suppliers=value.suppliers.map(item=>parseSupplier(item,detail));if(suppliers.some(item=>item===null))return null;
 const base:StoreProductCard={id:value.id,slug:value.slug,sku:value.sku,name:value.name,alternate_name:value.alternate_name as string|null,short_description:value.short_description,retail_price_vnd:Number(value.retail_price_vnd),unit_size:value.unit_size,unit_label:value.unit_label,category:{id:value.category.id,slug:value.category.slug,name:value.category.name},primary_image:primary,csa_eligible:value.csa_eligible,suppliers:suppliers as StoreSupplier[],available_locales:[...new Set(value.available_locales as StoreLocale[])],...localized};
 return detail?{...base,description:value.description as string,suppliers:suppliers as Array<StoreSupplier&{location:string}>}:base;
}

export function parseStoreCategories(payload:unknown):StoreCategory[]{
 if(!record(payload)||!Array.isArray(payload.data))throw Error("Invalid Store categories envelope");
 const rows=payload.data.map(parseCategory);if(rows.some(row=>row===null))throw Error("Invalid Store category");return rows as StoreCategory[];
}
export function parseStorePage(payload:unknown):StorePage{
 if(!record(payload)||!Array.isArray(payload.data)||!record(payload.meta)||!Number.isInteger(payload.meta.page)||Number(payload.meta.page)<1||!Number.isInteger(payload.meta.page_size)||Number(payload.meta.page_size)<1||Number(payload.meta.page_size)>48||!Number.isInteger(payload.meta.total)||Number(payload.meta.total)<0)throw Error("Invalid Store page envelope");
 const rows=payload.data.map(item=>parseProduct(item,false));if(rows.some(row=>row===null))throw Error("Invalid Store product");
 return {data:rows as StoreProductCard[],meta:{page:Number(payload.meta.page),page_size:Number(payload.meta.page_size),total:Number(payload.meta.total)}};
}
export function parseStoreProductDetail(payload:unknown):StoreProductDetail{
 if(!record(payload)){throw Error("Invalid Store detail envelope")};const row=parseProduct(payload.data,true);if(!row)throw Error("Invalid Store product detail");return row as StoreProductDetail;
}
