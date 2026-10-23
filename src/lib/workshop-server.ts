import "server-only";
import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {fetchPublicWorkshopJson,getPublicContentOrigin,parsePublicWorkshop} from "@/lib/public-workshop";

/** Server-only detail reader; public failures resolve to null so the route can return a clean 404. */
export async function getPublicWorkshop(slug:string,locale:Locale):Promise<PublicWorkshop|null>{
  const origin=getPublicContentOrigin();
  if(!origin)return null;
  try{
    const payload=await fetchPublicWorkshopJson(`${origin}/api/v1/public/workshops/${encodeURIComponent(slug)}?locale=${locale}`,
      {tags:["workshops",`workshop:${slug}`]});
    const data=payload&&typeof payload==="object"?(payload as {data?:unknown}).data:undefined;
    return parsePublicWorkshop(data);
  }catch{return null}
}
