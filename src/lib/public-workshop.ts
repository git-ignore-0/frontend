import type {PublicWorkshop,WorkshopCollection} from "@/types/workshop";

const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const locale=(value:unknown)=>value==="vi"||value==="en"?value:null;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==="object"&&!Array.isArray(value);
const timestamp=(value:unknown):value is string=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));

function httpUrl(value:unknown):string|null{
  if(typeof value!=="string")return null;
  try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)&&!url.username&&!url.password?url.toString():null}catch{return null}
}

export function parsePublicWorkshop(value:unknown):PublicWorkshop|null{
  if(!record(value))return null;
  const {id,slug,title,summary,start_at,end_at,event_timezone,status,is_fallback,body}=value;
  const requested=locale(value.requested_locale),content=locale(value.content_locale),defaultLocale=locale(value.default_locale);
  const available=Array.isArray(value.available_locales)?value.available_locales.map(locale):null;
  const registration=httpUrl(value.registration_url);
  if(typeof id!=="string"||!ID.test(id)||typeof slug!=="string"||!/^[\w-]+$/.test(slug)||
     typeof title!=="string"||!title.trim()||typeof summary!=="string"||
     !timestamp(start_at)||!timestamp(end_at)||Date.parse(end_at)<Date.parse(start_at)||
     typeof event_timezone!=="string"||!event_timezone.trim()||
     (status!=="upcoming"&&status!=="ongoing"&&status!=="completed")||
     !requested||!content||!defaultLocale||!available||available.some(value=>value===null)||
     new Set(available).size!==available.length||!available.includes(content)||
     is_fallback!==(content!==requested)||(value.registration_url!==null&&!registration)||
     (body!==undefined&&!record(body)))return null;
  return {id:id.toLowerCase(),slug,title,summary,start_at,end_at,event_timezone,status,is_fallback,
    requested_locale:requested,content_locale:content,default_locale:defaultLocale,
    available_locales:available as Array<"vi"|"en">,registration_url:registration,
    ...(body===undefined?{}:{body})};
}

function workshopRows(value:unknown,requestedLocale:"vi"|"en"):PublicWorkshop[]{
  if(!Array.isArray(value))throw Error("Invalid public workshop list");
  const ids=new Set<string>(),slugs=new Set<string>();
  return value.map(row=>{
    const workshop=parsePublicWorkshop(row);
    if(!workshop||workshop.requested_locale!==requestedLocale||ids.has(workshop.id)||slugs.has(workshop.slug))
      throw Error("Invalid public workshop record");
    ids.add(workshop.id);
    slugs.add(workshop.slug);
    return workshop;
  });
}

export function parsePublicWorkshopPage(value:unknown,page:number,pageSize:number,requestedLocale:"vi"|"en"){
  if(!record(value)||!record(value.meta)||value.meta.page!==page||value.meta.page_size!==pageSize)
    throw Error("Invalid public workshop page");
  const {total}=value.meta;
  if(typeof total!=="number"||!Number.isSafeInteger(total)||total<0||!Array.isArray(value.data)||value.data.length>pageSize)
    throw Error("Invalid public workshop pagination");
  return {items:workshopRows(value.data,requestedLocale),pageCount:Math.max(1,Math.ceil(total/pageSize))};
}

export function parseWorkshopCollection(value:unknown,requestedLocale:"vi"|"en"):WorkshopCollection{
  if(!record(value))throw Error("Invalid public workshop collection");
  return {upcoming:workshopRows(value.upcoming,requestedLocale),past:workshopRows(value.past,requestedLocale)};
}

/** Only a fixed, configured HTTP(S) origin may be used by public content routes. */
export function getPublicContentOrigin():string|null{
  const value=process.env.CONTENT_API_ORIGIN;
  if(!value)return null;
  try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==="/"&&!url.search&&!url.hash?url.origin:null}catch{return null}
}
/** Local CMS edits must be visible immediately; production keeps the public list cacheable. */
export function workshopFetchOptions(environment:string|undefined=process.env.NODE_ENV,tags:string[]=[],bypassCache=false){
  return environment==="development"||bypassCache?{cache:"no-store" as const}:{next:{revalidate:300,...(tags.length?{tags}:{})}};
}

export class PublicWorkshopFetchError extends Error{
  readonly status:number;
  constructor(status:number){super(`Public workshops returned ${status}`);this.name="PublicWorkshopFetchError";this.status=status;}
}

type PublicWorkshopFetchOptions={environment?:string;tags?:string[];bypassCache?:boolean;fetcher?:typeof fetch;signal?:AbortSignal};
/** One transport path keeps Home, list and detail freshness consistent. */
export async function fetchPublicWorkshopJson(url:string,options:PublicWorkshopFetchOptions={}):Promise<unknown>{
  const {environment=process.env.NODE_ENV,tags=[],bypassCache=false,fetcher=fetch,signal=AbortSignal.timeout(5000)}=options;
  const response=await fetcher(url,{...workshopFetchOptions(environment,tags,bypassCache),signal});
  if(!response.ok)throw new PublicWorkshopFetchError(response.status);
  return response.json();
}
