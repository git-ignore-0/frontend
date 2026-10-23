import type {PublicWorkshop} from "@/types/workshop";
const VALID_STATUSES=new Set(["upcoming","ongoing","completed"]);
const VALID_LOCALES=new Set(["vi","en"]);
function locale(value:unknown):"vi"|"en"|undefined{return typeof value==="string"&&VALID_LOCALES.has(value)?value as "vi"|"en":undefined}
function httpUrl(value:unknown):string|null{
  if(typeof value!=="string"||!value.trim())return null;
  try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.toString():null}catch{return null}
}
/** Parse one public projection. Detail-only fields remain optional for list payloads. */
export function parsePublicWorkshop(value:unknown):PublicWorkshop|null{
  if(!value||typeof value!=="object")return null;
  const row=value as Record<string,unknown>;
  if((typeof row.id!=="string"&&typeof row.id!=="number")||typeof row.slug!=="string"||!row.slug.trim()||typeof row.title!=="string"||!row.title.trim()||typeof row.start_at!=="string"||!Number.isFinite(Date.parse(row.start_at)))return null;
  if(typeof row.status!=="string"||!VALID_STATUSES.has(row.status))return null;
  const availableLocales=Array.isArray(row.available_locales)?row.available_locales.map(locale).filter((item):item is "vi"|"en"=>Boolean(item)):undefined;
  return {id:String(row.id),slug:row.slug,title:row.title,summary:typeof row.summary==="string"?row.summary:"",
    start_at:row.start_at,end_at:typeof row.end_at==="string"&&Number.isFinite(Date.parse(row.end_at))?row.end_at:row.start_at,
    event_timezone:typeof row.event_timezone==="string"?row.event_timezone:"Asia/Ho_Chi_Minh",
    status:row.status as PublicWorkshop["status"],is_fallback:row.is_fallback===true,
    requested_locale:locale(row.requested_locale),content_locale:locale(row.content_locale),default_locale:locale(row.default_locale),
    available_locales:availableLocales,registration_url:httpUrl(row.registration_url),
    body:row.body&&typeof row.body==="object"&&!Array.isArray(row.body)?row.body as Record<string,unknown>:undefined};
}
/** Parses the backend's {data, meta} envelope and never trusts unvalidated fields. */
export function parsePublicWorkshops(raw:unknown,limit=500):PublicWorkshop[]{
  const source=raw&&typeof raw==="object"&&!Array.isArray(raw)?(raw as {data?:unknown}).data:raw;
  if(!Array.isArray(source))return [];
  const items:PublicWorkshop[]=[];
  for(const value of source){
    const item=parsePublicWorkshop(value);if(!item)continue;
    items.push(item);
    if(items.length>=limit)break;
  }
  return items;
}
/** Only a fixed, configured HTTP(S) origin may be used by public content routes. */
export function getPublicContentOrigin():string|null{
  const value=process.env.CONTENT_API_ORIGIN;
  if(!value)return null;
  try{const url=new URL(value);return ["http:","https:"].includes(url.protocol)&&!url.username&&!url.password&&url.pathname==="/"&&!url.search&&!url.hash?url.origin:null}catch{return null}
}
/** Local CMS edits must be visible immediately; production keeps the public list cacheable. */
export function workshopFetchOptions(environment:string|undefined=process.env.NODE_ENV,tags:string[]=[]){
  return environment==="development"?{cache:"no-store" as const}:{next:{revalidate:300,...(tags.length?{tags}:{})}};
}

type PublicWorkshopFetchOptions={environment?:string;tags?:string[];fetcher?:typeof fetch;signal?:AbortSignal};
/** One transport path keeps Home, list and detail freshness consistent. */
export async function fetchPublicWorkshopJson(url:string,options:PublicWorkshopFetchOptions={}):Promise<unknown>{
  const {environment=process.env.NODE_ENV,tags=[],fetcher=fetch,signal=AbortSignal.timeout(5000)}=options;
  const response=await fetcher(url,{...workshopFetchOptions(environment,tags),signal});
  if(!response.ok)throw new Error(`Public workshops returned ${response.status}`);
  return response.json();
}
