import "server-only";
import {unstable_cache} from "next/cache";
import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
import {getPublicContentOrigin,workshopFetchOptions} from "@/lib/public-workshop";
import {parseSettings} from "@/lib/public-settings";

const SITE_SETTINGS_TIMEOUT_MS=750;
type SiteSettingsFetchOptions={fetcher?:typeof fetch;timeoutMs?:number};

/** Loads optional settings without allowing the content API to hold primary HTML open. */
export async function fetchPublicSiteSettings(locale:Locale,{fetcher=fetch,timeoutMs=SITE_SETTINGS_TIMEOUT_MS}:SiteSettingsFetchOptions={}):Promise<PublicSiteSettings|null>{
  const origin=getPublicContentOrigin();
  if(!origin)return null;
  try{
    const response=await fetcher(`${origin}/api/v1/public/site-settings?locale=${locale}`,{
      ...workshopFetchOptions(process.env.NODE_ENV,["site-settings"]),
      signal:AbortSignal.timeout(timeoutMs),
    });
    if(!response.ok)return null;
    const payload=await response.json();
    return parseSettings(payload?.data);
  }catch{return null;}
}

const getCachedPublicSiteSettings=unstable_cache(
  (locale:Locale)=>fetchPublicSiteSettings(locale),
  ["public-site-settings-v1"],
  {revalidate:300,tags:["site-settings"]},
);

/** Production caches success and fallback alike, preventing an unavailable API from delaying every request. */
export function getPublicSiteSettings(locale:Locale):Promise<PublicSiteSettings|null>{
  return process.env.NODE_ENV==="development"?fetchPublicSiteSettings(locale):getCachedPublicSiteSettings(locale);
}
