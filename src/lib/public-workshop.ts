import type {PublicWorkshop} from "@/types/workshop";
const VALID_STATUSES=new Set(["upcoming","ongoing","completed"]);
/** Parses the backend's {data, meta} envelope and never trusts unvalidated fields. */
export function parsePublicWorkshops(raw:unknown,limit=500):PublicWorkshop[]{
  const source=raw&&typeof raw==="object"&&!Array.isArray(raw)?(raw as {data?:unknown}).data:raw;
  if(!Array.isArray(source))return [];
  const items:PublicWorkshop[]=[];
  for(const value of source){
    if(!value||typeof value!=="object")continue;
    const row=value as Record<string,unknown>;
    if((typeof row.id!=="string"&&typeof row.id!=="number")||typeof row.slug!=="string"||!row.slug.trim()||typeof row.title!=="string"||!row.title.trim()||typeof row.start_at!=="string"||!Number.isFinite(Date.parse(row.start_at)))continue;
    const status=typeof row.status==="string"&&VALID_STATUSES.has(row.status)?row.status:"upcoming";
    items.push({id:String(row.id),slug:row.slug,title:row.title,summary:typeof row.summary==="string"?row.summary:"",
      start_at:row.start_at,end_at:typeof row.end_at==="string"?row.end_at:row.start_at,
      event_timezone:typeof row.event_timezone==="string"?row.event_timezone:"Asia/Ho_Chi_Minh",
      status:status as PublicWorkshop["status"],is_fallback:row.is_fallback===true});
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
