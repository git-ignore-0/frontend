import "server-only";
import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {fetchPublicWorkshopJson,getPublicContentOrigin,parsePublicWorkshop,PublicWorkshopFetchError} from "@/lib/public-workshop";

/** Server-only detail reader; only a real upstream 404 becomes a local not-found. */
export async function getPublicWorkshop(slug:string,locale:Locale):Promise<PublicWorkshop|null>{
  const origin=getPublicContentOrigin();
  if(!origin)throw Error("CONTENT_API_ORIGIN is not configured");
  try{
    const payload=await fetchPublicWorkshopJson(`${origin}/api/v1/public/workshops/${encodeURIComponent(slug)}?locale=${locale}`,
      {tags:["workshops",`workshop:${slug}`]});
    const data=payload&&typeof payload==="object"?(payload as {data?:unknown}).data:undefined;
    const workshop=parsePublicWorkshop(data);
    if(!workshop)throw Error("Invalid public workshop payload");
    return workshop;
  }catch(error){
    if(error instanceof PublicWorkshopFetchError&&error.status===404)return null;
    throw error;
  }
}
